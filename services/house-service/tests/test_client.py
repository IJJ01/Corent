import uuid
import grpc
from google.protobuf import wrappers_pb2

from shared.generated import house_pb2, house_pb2_grpc


def main():
    channel = grpc.insecure_channel("127.0.0.1:50052")
    stub = house_pb2_grpc.HouseServiceStub(channel)

    OWNER_ID = str(uuid.uuid4())

    print("\n=== 1) CreateHouse ===")
    created = stub.CreateHouse(
        house_pb2.CreateHouseRequest(
            owner_id=OWNER_ID,
            title="Sunny apartment near campus",
            description="2 rooms, quiet area",
            location="Casablanca",
            price_per_room=1500.0,
            total_rooms=2,
            occupied_rooms=0,
            status=house_pb2.AVAILABLE,
        )
    )
    house_id = created.house.id  # string UUID
    print("Created house_id:", house_id)
    print("Owner_id:", OWNER_ID)

    print("\n=== 2) GetHouse ===")
    got = stub.GetHouse(house_pb2.GetHouseRequest(id=house_id))
    print("GetHouse title:", got.house.title, "| occupied:", got.house.occupied_rooms, "/", got.house.total_rooms)

    print("\n=== 2.5) UpdateHouse (wrappers partial update) ===")
    updated = stub.UpdateHouse(
        house_pb2.UpdateHouseRequest(
            id=house_id,
            owner_id=OWNER_ID,
            title=wrappers_pb2.StringValue(value="UPDATED TITLE"),
            price_per_room=wrappers_pb2.DoubleValue(value=999.0),
            rating=wrappers_pb2.Int32Value(value=0),  # sets rating to NULL in DB
        )
    )
    print("Updated title:", updated.house.title, "| price:", updated.house.price_per_room, "| rating:", updated.house.rating)

    print("\n=== 3) ListHouses ===")
    listed = stub.ListHouses(house_pb2.ListHousesRequest(page=1, page_size=10))
    print("Total houses:", listed.total)
    for h in listed.houses:
        print("-", h.id, h.title, "| location:", h.location)

    print("\n=== 4) AddHouseImage ===")
    img = stub.AddHouseImage(
        house_pb2.AddHouseImageRequest(
            house_id=house_id,
            owner_id=OWNER_ID,
            image_url="https://example.com/house1.jpg",
        )
    )
    image_id = img.image.id
    print("Added image id:", image_id)

    print("\n=== 5) UpdateOccupancy (INCREMENT) ===")
    occ = stub.UpdateOccupancy(
        house_pb2.UpdateOccupancyRequest(
            house_id=house_id,
            action=house_pb2.INCREMENT,
            value=1,
            reason="application_123",
        )
    )
    print("Occupancy:", occ.occupied_rooms, "/", occ.total_rooms, "| available:", occ.available)

    print("\n=== 6) UpdateOccupancy (OVERFLOW should FAIL) ===")
    try:
        stub.UpdateOccupancy(
            house_pb2.UpdateOccupancyRequest(
                house_id=house_id,
                action=house_pb2.INCREMENT,
                value=5,
                reason="overflow_test",
            )
        )
        print("❌ ERROR: overflow increment should have failed but it passed")
    except grpc.RpcError as e:
        print("✅ Expected failure:", e.code().name, "-", e.details())

    print("\n=== 7) GetHouse again (should include image + updated occupancy) ===")
    got2 = stub.GetHouse(house_pb2.GetHouseRequest(id=house_id))
    print("Occupied:", got2.house.occupied_rooms, "/", got2.house.total_rooms)
    print("Images count:", len(got2.house.images))
    if got2.house.images:
        print("First image url:", got2.house.images[0].image_url)

    print("\n=== 8) RemoveHouseImage ===")
    rem = stub.RemoveHouseImage(
        house_pb2.RemoveHouseImageRequest(
            image_id=image_id,
            owner_id=OWNER_ID,
        )
    )
    print("Remove image:", rem.success, "-", rem.message)

    print("\n=== 8) ListHousesByOwner ===")
    mine = stub.ListHousesByOwner(
    house_pb2.ListHousesByOwnerRequest(owner_id=OWNER_ID, page=1, page_size=10)
    )
    print("My houses:", mine.total)
    for h in mine.houses:
        print("-", h.id, h.title)


    print("\n✅ All tests completed.")


if __name__ == "__main__":
    main()
