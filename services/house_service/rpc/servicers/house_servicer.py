import uuid
import grpc
from django.db import transaction
from django.db.models import F
from django.conf import settings
from app.models import House, HouseImage
from shared.generated import house_pb2, house_pb2_grpc


def status_to_proto(status: str) -> int:
    return {
        "available": house_pb2.AVAILABLE,
        "unavailable": house_pb2.UNAVAILABLE,
        "archived": house_pb2.ARCHIVED,
    }.get(status, house_pb2.HOUSE_STATUS_UNSPECIFIED)


def status_from_proto(v: int) -> str:
    return {
        house_pb2.AVAILABLE: "available",
        house_pb2.UNAVAILABLE: "unavailable",
        house_pb2.ARCHIVED: "archived",
    }.get(v, "available")


def parse_uuid(value: str, context, field_name="id") -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except (ValueError, AttributeError, TypeError):
        context.abort(grpc.StatusCode.INVALID_ARGUMENT, f"Invalid {field_name} UUID")


def house_to_proto(h: House) -> house_pb2.House:
    images = [
        house_pb2.HouseImage(
            id=str(img.id),
            house_id=str(h.id),
            image_url=img.image_url,
        )
        for img in h.images.all()
    ]

    return house_pb2.House(
        id=str(h.id),
        owner_id=str(h.owner_id),
        title=h.title,
        description=h.description or "",
        location=h.location,
        rating=h.rating or 0,
        price_per_room=float(h.price_per_room),
        total_rooms=h.total_rooms,
        occupied_rooms=h.occupied_rooms,
        status=status_to_proto(h.status),
        created_at=h.created_at.isoformat(),
        images=images,
    )


class HouseServiceServicer(house_pb2_grpc.HouseServiceServicer):

    def CreateHouse(self, request, context):
        if request.total_rooms < 0:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "total_rooms must be >= 0")

        occupied = request.occupied_rooms if request.occupied_rooms else 0
        if occupied < 0 or occupied > request.total_rooms:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "occupied_rooms out of range")

        owner_uuid = parse_uuid(request.owner_id, context, "owner_id")

        h = House.objects.create(
            owner_id=owner_uuid,
            title=request.title,
            description=request.description or None,
            location=request.location,
            price_per_room=request.price_per_room,
            total_rooms=request.total_rooms,
            occupied_rooms=occupied,
            status=status_from_proto(request.status) if request.status else "available",
        )
        h = House.objects.prefetch_related("images").get(id=h.id)
        return house_pb2.HouseResponse(house=house_to_proto(h))

    def UpdateHouse(self, request, context):
        house_id = parse_uuid(request.id, context, "house_id")
        owner_uuid = parse_uuid(request.owner_id, context, "owner_id")

        try:
            h = House.objects.get(id=house_id)
        except House.DoesNotExist:
            context.abort(grpc.StatusCode.NOT_FOUND, "House not found")

        if h.owner_id != owner_uuid:
            context.abort(grpc.StatusCode.PERMISSION_DENIED, "Not house owner")

        # Wrapper fields: only update when present, even if value is 0/empty
        if request.HasField("title"):
            h.title = request.title.value

        if request.HasField("description"):
            h.description = request.description.value

        if request.HasField("location"):
            h.location = request.location.value

        if request.HasField("price_per_room"):
            if request.price_per_room.value < 0:
                context.abort(grpc.StatusCode.INVALID_ARGUMENT, "price_per_room must be >= 0")
            h.price_per_room = request.price_per_room.value

        if request.HasField("total_rooms"):
            if request.total_rooms.value < 0:
                context.abort(grpc.StatusCode.INVALID_ARGUMENT, "total_rooms must be >= 0")
            h.total_rooms = request.total_rooms.value

        if request.HasField("occupied_rooms"):
            if request.occupied_rooms.value < 0:
                context.abort(grpc.StatusCode.INVALID_ARGUMENT, "occupied_rooms must be >= 0")
            h.occupied_rooms = request.occupied_rooms.value

        if request.HasField("rating"):
            r = request.rating.value
            if r != 0 and (r < 1 or r > 5):
                context.abort(grpc.StatusCode.INVALID_ARGUMENT, "rating must be between 1 and 5")
            h.rating = None if r == 0 else r

        # status: 0 = UNSPECIFIED → ignore
        if request.status and request.status != house_pb2.HOUSE_STATUS_UNSPECIFIED:
            h.status = status_from_proto(request.status)

        if h.occupied_rooms > h.total_rooms:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "occupied_rooms cannot exceed total_rooms")

        h.save()
        h = House.objects.prefetch_related("images").get(id=h.id)
        return house_pb2.HouseResponse(house=house_to_proto(h))

    def DeleteHouse(self, request, context):
        house_id = parse_uuid(request.id, context, "house_id")
        owner_uuid = parse_uuid(request.owner_id, context, "owner_id")

        try:
            h = House.objects.get(id=house_id)
        except House.DoesNotExist:
            return house_pb2.DeleteHouseResponse(success=False, message="House not found")

        if h.owner_id != owner_uuid:
            context.abort(grpc.StatusCode.PERMISSION_DENIED, "Not house owner")

        h.delete()
        return house_pb2.DeleteHouseResponse(success=True, message="Deleted")

    def GetHouse(self, request, context):
        house_id = parse_uuid(request.id, context, "house_id")
        try:
            h = House.objects.prefetch_related("images").get(id=house_id)
        except House.DoesNotExist:
            context.abort(grpc.StatusCode.NOT_FOUND, "House not found")
        return house_pb2.HouseResponse(house=house_to_proto(h))

    def ListHouses(self, request, context):
        page = max(request.page, 1) if request.page else 1
        size = min(max(request.page_size, 1), 50) if request.page_size else 10

        qs = House.objects.prefetch_related("images").all().order_by("-created_at")
        total = qs.count()
        items = qs[(page - 1) * size: page * size]

        return house_pb2.ListHousesResponse(
            houses=[house_to_proto(h) for h in items],
            page=page,
            page_size=size,
            total=total,
        )
    
    def ListHousesByOwner(self, request, context):
        owner_uuid = parse_uuid(request.owner_id, context, "owner_id")

        page = max(request.page, 1) if request.page else 1
        size = min(max(request.page_size, 1), 50) if request.page_size else 10

        qs = (
            House.objects.prefetch_related("images")
            .filter(owner_id=owner_uuid)
            .order_by("-created_at")
        )

        total = qs.count()
        items = qs[(page - 1) * size: page * size]

        return house_pb2.ListHousesResponse(
            houses=[house_to_proto(h) for h in items],
            page=page,
            page_size=size,
            total=total,
    )


    def SearchHouses(self, request, context):
        page = max(request.page, 1) if request.page else 1
        size = min(max(request.page_size, 1), 50) if request.page_size else 10

        qs = House.objects.prefetch_related("images").all()

        if request.location:
            qs = qs.filter(location__icontains=request.location)

        if request.min_price:
            qs = qs.filter(price_per_room__gte=request.min_price)
        if request.max_price:
            qs = qs.filter(price_per_room__lte=request.max_price)

        if request.min_total_rooms:
            qs = qs.filter(total_rooms__gte=request.min_total_rooms)

        if request.only_available:
            qs = qs.filter(occupied_rooms__lt=F("total_rooms")).exclude(status="archived")

        qs = qs.order_by("-created_at")
        total = qs.count()
        items = qs[(page - 1) * size: page * size]

        return house_pb2.ListHousesResponse(
            houses=[house_to_proto(h) for h in items],
            page=page,
            page_size=size,
            total=total,
        )

    def AddHouseImage(self, request, context):
        house_id = parse_uuid(request.house_id, context, "house_id")
        owner_uuid = parse_uuid(request.owner_id, context, "owner_id")

        try:
            h = House.objects.get(id=house_id)
        except House.DoesNotExist:
            context.abort(grpc.StatusCode.NOT_FOUND, "House not found")

        if h.owner_id != owner_uuid:
            context.abort(grpc.StatusCode.PERMISSION_DENIED, "Not house owner")

        img = HouseImage.objects.create(house=h, image_url=request.image_url)
        return house_pb2.HouseImageResponse(
            image=house_pb2.HouseImage(
                id=str(img.id),
                house_id=str(h.id),
                image_url=img.image_url
            )
        )

    def RemoveHouseImage(self, request, context):
        image_id = parse_uuid(request.image_id, context, "image_id")
        owner_uuid = parse_uuid(request.owner_id, context, "owner_id")

        try:
            img = HouseImage.objects.select_related("house").get(id=image_id)
        except HouseImage.DoesNotExist:
            return house_pb2.DeleteHouseResponse(success=False, message="Image not found")

        if img.house.owner_id != owner_uuid:
            context.abort(grpc.StatusCode.PERMISSION_DENIED, "Not house owner")

        img.delete()
        return house_pb2.DeleteHouseResponse(success=True, message="Removed")

    @transaction.atomic
    def UpdateOccupancy(self, request, context):
        house_id = parse_uuid(request.house_id, context, "house_id")

        try:
            h = House.objects.select_for_update().get(id=house_id)
        except House.DoesNotExist:
            context.abort(grpc.StatusCode.NOT_FOUND, "House not found")

        # Debug (real BEFORE)
        print("[HouseService] DB NAME:", settings.DATABASES["default"]["NAME"])
        print("[HouseService] Before:", h.id, h.occupied_rooms, "/", h.total_rooms, "status=", h.status)

        # Optional: clearer guard (still consistent with your existing out-of-range check)
        if request.action == house_pb2.INCREMENT and h.occupied_rooms >= h.total_rooms:
            context.abort(grpc.StatusCode.FAILED_PRECONDITION, "House is already full")

        # Compute new occupancy
        if request.action == house_pb2.INCREMENT:
            amount = request.value if request.value > 0 else 1
            new_val = h.occupied_rooms + amount
        elif request.action == house_pb2.DECREMENT:
            amount = request.value if request.value > 0 else 1
            new_val = h.occupied_rooms - amount
        elif request.action == house_pb2.SET:
            new_val = request.value
        else:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "Invalid occupancy action")

        if new_val < 0 or new_val > h.total_rooms:
            context.abort(grpc.StatusCode.FAILED_PRECONDITION, "Occupancy out of range")

        # Apply
        h.occupied_rooms = new_val

        # ✅ NEW: keep status in sync (do not override archived)
        if h.status != "archived":
            h.status = "unavailable" if h.occupied_rooms >= h.total_rooms else "available"

        h.save()

        # Debug (AFTER)
        print("[HouseService] After:", h.id, h.occupied_rooms, "/", h.total_rooms, "status=", h.status)

        available = (h.occupied_rooms < h.total_rooms) and (h.status != "archived")
        return house_pb2.OccupancyResponse(
            success=True,
            message="OK",
            occupied_rooms=h.occupied_rooms,
            total_rooms=h.total_rooms,
            available=available,
        )
