import grpc
from django.db import transaction


from shared.generated import (admin_service_pb2, admin_service_pb2_grpc,
                              application_pb2, application_pb2_grpc,
                              house_pb2, house_pb2_grpc, user_pb2, user_pb2_grpc)


from google.protobuf.wrappers_pb2 import Int32Value

from app.models import ReportLog, HouseRatingLog
import uuid

STATUS_MAP = {
    "available": house_pb2.AVAILABLE,
    "unavailable": house_pb2.UNAVAILABLE,
    "archived": house_pb2.ARCHIVED,
}

class AppServiceClient:
    def __init__(self, target: str):
        self.target = target
        self.channel = grpc.insecure_channel(target)
        self.stub = application_pb2_grpc.AppServiceStub(self.channel)

    def list_reports(self, status: str, page_size: int, page_token: str):
        return self.stub.ListReports(
            application_pb2.ListReportsRequest(
                status=status,
                page_size=page_size,
                page_token=page_token,
            )
        )

    def get_report(self, report_id: str):
        return self.stub.GetReport(
            application_pb2.GetReportRequest(report_id=report_id)
        )

    def update_report_status(self, report_id: str, status: str):
        return self.stub.UpdateReportStatus(
            application_pb2.UpdateReportStatusRequest(
                report_id=report_id,
                status=status,
            )
        )

    def close(self):
        self.channel.close()
class HouseServiceClient:
    def __init__(self, target: str):
        self.target = target
        self.channel = grpc.insecure_channel(target)
        self.stub = house_pb2_grpc.HouseServiceStub(self.channel)

    def list_houses(self, page: int, page_size: int):
        return self.stub.ListHouses(
            house_pb2.ListHousesRequest(page=page, page_size=page_size)
        )

    def search_houses(self, location: str, min_price: float, max_price: float,
                    min_total_rooms: int, only_available: bool,
                    page: int, page_size: int):
        return self.stub.SearchHouses(
            house_pb2.SearchHousesRequest(
                location=location or "",
                min_price=min_price or 0,
                max_price=max_price or 0,
                min_total_rooms=min_total_rooms or 0,
                only_available=bool(only_available),
                page=page,
                page_size=page_size,
            )
        )
    def get_house(self, house_id: str):
        return self.stub.GetHouse(house_pb2.GetHouseRequest(id=house_id))

    def update_house_rating(self, house_id: str, owner_id: str, rating: int):
        return self.stub.UpdateHouse(
            house_pb2.UpdateHouseRequest(
                id=house_id,
                owner_id=owner_id,
                rating=Int32Value(value=rating),
            )
        )

    def update_house_status(self, house_id: str, owner_id: str, status_enum_value: int):
        return self.stub.UpdateHouse(
            house_pb2.UpdateHouseRequest(
                id=house_id,
                owner_id=owner_id,
                status=status_enum_value,  # HouseStatus enum value
            )
        )
    def delete_house(self, house_id: str, owner_id: str):
        return self.stub.DeleteHouse(
            house_pb2.DeleteHouseRequest(
                id=house_id,
                owner_id=owner_id,
            )
    )
    def close(self):
        self.channel.close()
class UserServiceClient:
    def __init__(self, target: str):
        self.target = target
        self.channel = grpc.insecure_channel(target)
        self.stub = user_pb2_grpc.UserServiceStub(self.channel)

    def _md(self):
        key = os.environ.get("INTERNAL_GRPC_KEY", "").strip()
        return (("x-internal-key", key),) if key else None

    def ban_user(self, user_id: str):
        return self.stub.BanUser(
            user_pb2.UserIdRequest(user_id=user_id),
            metadata=self._md(),
        )

    def unban_user(self, user_id: str):
        return self.stub.UnbanUser(
            user_pb2.UserIdRequest(user_id=user_id),
            metadata=self._md(),
        )

    # ✅ NEW: get total users (if your proto supports it)
    def count_users(self) -> int:
        # If your proto has ListAllUsers, we count results or use total_count if present.
        if not hasattr(self.stub, "ListAllUsers"):
            return 0

        try:
            # adapt request name if yours differs
            req = user_pb2.ListAllUsersRequest()
            resp = self.stub.ListAllUsers(req, metadata=self._md())
            if hasattr(resp, "total_count") and resp.total_count:
                return int(resp.total_count)
            if hasattr(resp, "users"):
                return len(resp.users)
            return 0
        except grpc.RpcError:
            return 0

    # ✅ NEW: get total banned users (if your proto supports it)
    def count_banned_users(self) -> int:
        if not hasattr(self.stub, "ListBannedUsers"):
            return 0

        try:
            req = user_pb2.ListBannedUsersRequest()
            resp = self.stub.ListBannedUsers(req, metadata=self._md())
            if hasattr(resp, "total_count") and resp.total_count:
                return int(resp.total_count)
            if hasattr(resp, "users"):
                return len(resp.users)
            return 0
        except grpc.RpcError:
            return 0

    def close(self):
        self.channel.close()






# -------------------------------------------------------------------
# AdminService
# -------------------------------------------------------------------
class AdminService(admin_service_pb2_grpc.AdminServiceServicer):
    def __init__(self):
        app_addr = os.environ.get("APP_GRPC_ADDR", "127.0.0.1:50051")
        self.app_client = AppServiceClient(app_addr)
        house_addr = os.environ.get("HOUSE_GRPC_ADDR", "127.0.0.1:50052")
        self.house_client = HouseServiceClient(house_addr)
        user_addr = os.environ.get("USER_GRPC_ADDR", "127.0.0.1:50053")
        self.user_client = UserServiceClient(user_addr)


    def ListReports(self, request, context):
        # ✅ PLUS DE "page" : on respecte le flow gRPC "page_token"
        page_size = request.page_size if getattr(request, "page_size", 0) > 0 else 10
        page_token = request.page_token if getattr(request, "page_token", "") else "0"

        # 1) Appel AppService (source de vérité)
        resp = self.app_client.list_reports(
            status=getattr(request, "status", ""),
            page_size=page_size,
            page_token=page_token,
        )

        # ✅ Gestion d'erreur si ton proto renvoie "error"
        if getattr(resp, "error", ""):
            context.abort(grpc.StatusCode.INTERNAL, resp.error)

        reports = []
        for r in resp.reports:

            # 3) Réponse admin
            reports.append(
                admin_service_pb2.ReportItem(
                    id=r.id,
                    status=r.status,
                    reason=r.reason,
                    details=r.details,
                    # NOTE: garde ça seulement si dans ton admin proto c'est un string
                    created_at=r.created_at.ToJsonString(),
                    reporter_id=r.reporter_id,
                    house_id=r.house_id,
                )
            )

        # ✅ Retour sans page/total/total_pages
        # (Si ton admin proto a next_page_token, renvoie-le. Sinon supprime la ligne.)
        return admin_service_pb2.ListReportsResponse(
            reports=reports,
            next_page_token=getattr(resp, "next_page_token", ""),
        )

    def ResolveReport(self, request, context):
        if request.status not in ("reviewed", "dismissed"):
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "Invalid status")

        # 0) Get report details (pour house_id / reporter_id)
        detail = self.app_client.get_report(request.report_id)
        if getattr(detail, "error", ""):
            context.abort(grpc.StatusCode.INTERNAL, detail.error)

        r = detail.report

        # 1) Update status
        resp = self.app_client.update_report_status(
            report_id=request.report_id,
            status=request.status,
        )
        if getattr(resp, "error", ""):
            context.abort(grpc.StatusCode.INTERNAL, resp.error)

        # 2) Log
        ReportLog.objects.create(
            report_id=request.report_id,
            house_id=getattr(r, "house_id", None),
            reporter_id=getattr(r, "reporter_id", None),
            admin_id=request.admin_id,
            action=request.status.upper(),
        )

        return admin_service_pb2.ActionResponse(
            success=True,
            message="Report resolved and logged successfully",
        )
    def BanUser(self, request, context):
        try:
            uuid.UUID(request.user_id)
            uuid.UUID(request.admin_id)
        except ValueError:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "user_id/admin_id must be valid UUID")

        try:
            if bool(request.ban):
                resp = self.user_client.ban_user(request.user_id)
            else:
                resp = self.user_client.unban_user(request.user_id)
        except grpc.RpcError as e:
            context.abort(e.code(), e.details() or "User service error")

        if not getattr(resp, "ok", False):
            context.abort(grpc.StatusCode.INTERNAL, getattr(resp, "message", "") or "Ban/Unban failed")

        return admin_service_pb2.ActionResponse(success=True, message=resp.message)

    def GetReportDetails(self, request, context):
        # 1) Get report from AppService (source of truth)
        detail = self.app_client.get_report(request.report_id)
        if getattr(detail, "error", ""):
            context.abort(grpc.StatusCode.INTERNAL, detail.error)

        r = detail.report
        if not getattr(r, "id", ""):
            return admin_service_pb2.ReportDetailsResponse(found=False)

        # 2) Enrich with House details (optional but matches your proto fields)
        house_item = None
        image_urls = []
        description = ""

        try:
            hresp = self.house_client.get_house(r.house_id)
            h = hresp.house
            if getattr(h, "id", ""):
                image_urls = [img.image_url for img in getattr(h, "images", [])]
                description = getattr(h, "description", "") or ""

                house_item = admin_service_pb2.HouseItem(
                    id=h.id,
                    title=h.title,
                    location=h.location,
                    city="",
                    status=house_pb2.HouseStatus.Name(h.status),
                    price_per_room=h.price_per_room,
                    total_rooms=h.total_rooms,
                    occupied_rooms=h.occupied_rooms,
                    owner_id=h.owner_id,
                    created_at=h.created_at,
                    cover_image_url=image_urls[0] if image_urls else "",
                    rating=getattr(h, "rating", 0),
                )
        except grpc.RpcError:
            # Don't crash if HouseService is down; still return the report
            pass

        report_item = admin_service_pb2.ReportItem(
            id=r.id,
            status=r.status,
            reason=r.reason,
            details=r.details,
            created_at=r.created_at.ToJsonString(),
            reporter_id=r.reporter_id,
            house_id=r.house_id,
        )

        return admin_service_pb2.ReportDetailsResponse(
            found=True,
            report=report_item,
            house=house_item if house_item else admin_service_pb2.HouseItem(),
            image_urls=image_urls,
            description=description,
        )


    def GetHouseDetails(self, request, context):
        resp = self.house_client.get_house(request.house_id)
        h = resp.house

        if not getattr(h, "id", ""):
            return admin_service_pb2.HouseDetailsResponse(found=False)

        image_urls = [img.image_url for img in getattr(h, "images", [])]

        house_item = admin_service_pb2.HouseItem(
            id=h.id,
            title=h.title,
            location=h.location,
            city="",  # house proto n'a pas city séparé
            status=house_pb2.HouseStatus.Name(h.status) if hasattr(h, "status") else "",
            price_per_room=h.price_per_room,
            total_rooms=h.total_rooms,
            occupied_rooms=h.occupied_rooms,
            owner_id=h.owner_id,
            created_at=h.created_at,
            cover_image_url=image_urls[0] if image_urls else "",
            rating=h.rating,
        )

        return admin_service_pb2.HouseDetailsResponse(
            found=True,
            house=house_item,
            image_urls=image_urls,
            description=h.description,
        )
    from django.db import transaction
    def GetAdminOverview(self, request, context):
            """
            AdminOverviewResponse:
            - total_users
            - total_houses
            - total_banned_users
            - total_ban_logs
            - total_rating_logs
            - recent_events (BAN_LOG / RATING_LOG)
            """

            recent_limit = int(getattr(request, "recent_limit", 10) or 10)
            if recent_limit <= 0:
                recent_limit = 10
            if recent_limit > 50:
                recent_limit = 50  # avoid abuse

            # -------------------------
            # 1) Totals from services
            # -------------------------
            # Users + Banned users (fallback -> 0 if RPC not available)
            total_users = 0
            total_banned_users = 0
            try:
                total_users = int(self.user_client.count_users())
                total_banned_users = int(self.user_client.count_banned_users())
            except Exception:
                total_users = 0
                total_banned_users = 0

            # Houses (fallback -> 0 if house service down)
            total_houses = 0
            try:
                resp = self.house_client.list_houses(page=1, page_size=100000)
                total_houses = len(getattr(resp, "houses", []))
            except Exception:
                total_houses = 0

            # -------------------------
            # 2) Totals from Admin DB
            # -------------------------
            total_rating_logs = 0
            total_ban_logs = 0

            try:
                total_rating_logs = HouseRatingLog.objects.count()
            except Exception:
                total_rating_logs = 0

            # Ban logs: try to load a model named "BanLog" if it exists in admin_service app
            BanLog = None
            try:
                BanLog = apps.get_model("admin_service", "BanLog")
            except Exception:
                BanLog = None

            if BanLog:
                try:
                    total_ban_logs = BanLog.objects.count()
                except Exception:
                    total_ban_logs = 0
            else:
                total_ban_logs = 0

            # -------------------------
            # 3) Recent events (merge)
            # -------------------------
            recent_events = []

            # a) rating events
            try:
                rating_qs = HouseRatingLog.objects.all().order_by("-created_at")[:recent_limit]
                for log in rating_qs:
                    created_at = ""
                    if hasattr(log, "created_at") and log.created_at:
                        created_at = log.created_at.isoformat()

                    msg = f"House {getattr(log, 'house_id', '')} rated {getattr(log, 'rating', '')}/5 by admin {getattr(log, 'admin_id', '')}"
                    recent_events.append(
                        {
                            "type": "RATING_LOG",
                            "id": str(getattr(log, "id", "")) or str(getattr(log, "pk", "")),
                            "message": msg,
                            "created_at": created_at,
                        }
                    )
            except Exception:
                pass

            # b) ban events (if BanLog exists)
            if BanLog:
                try:
                    ban_qs = BanLog.objects.all().order_by("-created_at")[:recent_limit]
                    for log in ban_qs:
                        created_at = ""
                        if hasattr(log, "created_at") and log.created_at:
                            created_at = log.created_at.isoformat()

                        # Try common fields (adapt automatically)
                        user_id = getattr(log, "user_id", "") or getattr(log, "target_user_id", "")
                        admin_id = getattr(log, "admin_id", "")
                        action = getattr(log, "action", "") or getattr(log, "event", "") or ""
                        reason = getattr(log, "reason", "") or ""

                        msg = f"{action or 'BAN_ACTION'}: user {user_id} by admin {admin_id}"
                        if reason:
                            msg += f" (reason: {reason})"

                        recent_events.append(
                            {
                                "type": "BAN_LOG",
                                "id": str(getattr(log, "id", "")) or str(getattr(log, "pk", "")),
                                "message": msg,
                                "created_at": created_at,
                            }
                        )
                except Exception:
                    pass

            # sort recent events by created_at desc (strings isoformat compare ok)
            recent_events.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            recent_events = recent_events[:recent_limit]

            # map to proto RecentEvent
            proto_recent = []
            for e in recent_events:
                proto_recent.append(
                    admin_service_pb2.RecentEvent(
                        type=e["type"],
                        id=e["id"],
                        message=e["message"],
                        created_at=e["created_at"],
                    )
                )

            return admin_service_pb2.AdminOverviewResponse(
                total_users=total_users,
                total_houses=total_houses,
                total_banned_users=total_banned_users,
                total_ban_logs=total_ban_logs,
                total_rating_logs=total_rating_logs,
                recent_events=proto_recent,
            )
    def SetHouseRating(self, request, context):
        # validation rating
        if request.rating < 1 or request.rating > 5:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "rating must be between 1 and 5")

        # 1) get house to know owner_id (proto House impose owner_id pour UpdateHouse)
        detail = self.house_client.get_house(request.house_id)
        h = detail.house
        if not getattr(h, "id", ""):
            context.abort(grpc.StatusCode.NOT_FOUND, "house not found")

        # 2) update rating in HouseService + log in DB admin atomically
        try:
            with transaction.atomic():
                # update rating in HouseService
                self.house_client.update_house_rating(
                    house_id=request.house_id,
                    owner_id=h.owner_id,
                    rating=request.rating,
                )

                # log in Admin DB
                HouseRatingLog.objects.create(
                    house_id=request.house_id,
                    admin_id=request.admin_id,
                    rating=request.rating,
                    category="OFFICIAL_RATING",  # tu peux changer le label si tu veux
                )

        except grpc.RpcError as e:
            # si HouseService échoue
            context.abort(e.code(), e.details() or "House service error")
        except Exception as e:
            context.abort(grpc.StatusCode.INTERNAL, f"Failed to log rating: {str(e)}")

        return admin_service_pb2.ActionResponse(
            success=True,
            message="House rating updated and logged successfully",
        )

    def ListHouses(self, request, context):
        # Quick default (tu peux augmenter si besoin)
        page = 1
        page_size = 200

        # Utilise SearchHouses si le user a mis des filtres simples
        has_filters = any([
            getattr(request, "search", ""),
            getattr(request, "min_price", 0) > 0,
            getattr(request, "max_price", 0) > 0,
            getattr(request, "min_rooms", 0) > 0,
        ])

        if has_filters:
            resp = self.house_client.search_houses(
                location=getattr(request, "search", ""),  # on map search->location contains
                min_price=getattr(request, "min_price", 0),
                max_price=getattr(request, "max_price", 0),
                min_total_rooms=getattr(request, "min_rooms", 0),
                only_available=(getattr(request, "status", "") == "AVAILABLE"),
                page=page,
                page_size=page_size,
            )
            houses = resp.houses
        else:
            resp = self.house_client.list_houses(page=page, page_size=page_size)
            houses = resp.houses

        items = []
        for h in houses:
            image_urls = [img.image_url for img in getattr(h, "images", [])]
            items.append(
                admin_service_pb2.HouseItem(
                    id=h.id,
                    title=h.title,
                    location=h.location,
                    city="",
                    status=house_pb2.HouseStatus.Name(h.status),
                    price_per_room=h.price_per_room,
                    total_rooms=h.total_rooms,
                    occupied_rooms=h.occupied_rooms,
                    owner_id=h.owner_id,
                    created_at=h.created_at,
                    cover_image_url=image_urls[0] if image_urls else "",
                    rating=h.rating,
                )
            )

        # (Optionnel) filtrage status si request.status est donné
        req_status = getattr(request, "status", "")
        if req_status:
            items = [x for x in items if x.status == req_status]

        return admin_service_pb2.ListHousesResponse(houses=items)
    def SetHouseStatus(self, request, context):
        # validate UUIDs
        try:
            uuid.UUID(request.house_id)
            uuid.UUID(request.admin_id)
        except ValueError:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "house_id/admin_id must be valid UUID")

        # validate status
        status_str = (request.status or "").strip().lower()
        if status_str not in STATUS_MAP:
            context.abort(
                grpc.StatusCode.INVALID_ARGUMENT,
                "status must be one of: available, unavailable, archived"
            )

        # 1) Get house to retrieve owner_id (proto House requires it)
        try:
            detail = self.house_client.get_house(request.house_id)
        except grpc.RpcError as e:
            context.abort(e.code(), e.details() or "House service error")

        h = detail.house
        if not getattr(h, "id", ""):
            context.abort(grpc.StatusCode.NOT_FOUND, "house not found")

        # 2) Update status
        try:
            self.house_client.update_house_status(
                house_id=request.house_id,
                owner_id=h.owner_id,
                status_enum_value=STATUS_MAP[status_str],
            )
        except grpc.RpcError as e:
            context.abort(e.code(), e.details() or "House service error")

        return admin_service_pb2.ActionResponse(
            success=True,
            message=f"House status updated to {status_str}",
        )
    
    def DeleteHouse(self, request, context):
        try:
            uuid.UUID(request.house_id)
            uuid.UUID(request.admin_id)
        except ValueError:
            context.abort(grpc.StatusCode.INVALID_ARGUMENT, "house_id/admin_id must be valid UUID")
        # 1) Get house to retrieve owner_id
        try:
            detail = self.house_client.get_house(request.house_id)
        except grpc.RpcError as e:
            context.abort(e.code(), e.details() or "House service error")
        h = detail.house
        if not getattr(h, "id", ""):
            context.abort(grpc.StatusCode.NOT_FOUND, "house not found")
        # 2) Delete
        try:
            resp = self.house_client.delete_house(
                house_id=request.house_id,
                owner_id=h.owner_id,
            )
        except grpc.RpcError as e:
            context.abort(e.code(), e.details() or "House service error")
        # House proto returns success/message
        success = getattr(resp, "success", False)
        message = getattr(resp, "message", "")
        if not success:
            context.abort(grpc.StatusCode.INTERNAL, message or "Delete failed")

        return admin_service_pb2.ActionResponse(
            success=True,
            message="House deleted successfully",
        )

