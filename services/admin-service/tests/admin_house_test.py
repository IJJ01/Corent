import grpc
from shared.generated import admin_service_pb2, admin_service_pb2_grpc

ADMIN_ADDR = "127.0.0.1:50054"

def test_list_houses(stub):
    print("\n=== TEST: ListHouses (no filters) ===")
    resp = stub.ListHouses(admin_service_pb2.ListHousesRequest())
    print(f"houses returned: {len(resp.houses)}")
    if resp.houses:
        h = resp.houses[0]
        print("first house:", h.id, "|", h.title, "|", h.location, "|", h.status, "| rating:", h.rating)

def test_list_houses_filtered(stub):
    print("\n=== TEST: ListHouses (filters) ===")
    req = admin_service_pb2.ListHousesRequest(
        status="AVAILABLE",        # depends on how you map status string
        min_rooms=2,
        min_price=100.0,
        search="Casa",             # mapped to location contains in your quick impl
        order_by="newest",
    )
    resp = stub.ListHouses(req)
    print(f"filtered houses returned: {len(resp.houses)}")
    for h in resp.houses[:5]:
        print("-", h.id, h.title, h.status, h.price_per_room, "rooms:", h.total_rooms)

def test_get_house_details(stub, house_id: str):
    print("\n=== TEST: GetHouseDetails ===")
    resp = stub.GetHouseDetails(admin_service_pb2.GetHouseDetailsRequest(house_id=house_id))

    print("found:", resp.found)
    if not resp.found:
        return

    h = resp.house
    print("id:", h.id)
    print("title:", h.title)
    print("location:", h.location)
    print("status:", h.status)
    print("price_per_room:", h.price_per_room)
    print("rooms:", h.occupied_rooms, "/", h.total_rooms)
    print("owner_id:", h.owner_id)
    print("rating:", h.rating)
    print("cover:", h.cover_image_url)
    print("images count:", len(resp.image_urls))
    print("description:", (resp.description[:120] + "...") if len(resp.description) > 120 else resp.description)

def test_set_house_rating(stub, house_id: str, admin_id: str, rating: int):
    print("\n=== TEST: SetHouseRating ===")
    resp = stub.SetHouseRating(
        admin_service_pb2.SetHouseRatingRequest(
            house_id=house_id,
            admin_id=admin_id,
            rating=rating,
        )
    )
    print(resp.success, resp.message)
def test_set_house_status(stub, house_id: str, admin_id: str, status: str):
    print("\n=== TEST: SetHouseStatus ===")
    resp = stub.SetHouseStatus(
        admin_service_pb2.SetHouseStatusRequest(
            house_id=house_id,
            admin_id=admin_id,
            status=status,
            reason="moderation",
        )
    )
    print(resp.success, resp.message)

def test_delete_house(stub, house_id: str, admin_id: str):
    print("\n=== TEST: DeleteHouse ===")
    resp = stub.DeleteHouse(
        admin_service_pb2.DeleteHouseRequest(
            house_id=house_id,
            admin_id=admin_id,
            reason="fraud",
        )
    )
    print(resp.success, resp.message)


def main():
    channel = grpc.insecure_channel(ADMIN_ADDR)
    stub = admin_service_pb2_grpc.AdminServiceStub(channel)

    HOUSE_ID = "3041b332-bc26-41a0-992b-37c9f62d1881"
    ADMIN_ID = "11111111-1111-1111-1111-111111111111"  # ou n'importe quel uuid valide


    # 1) list
    test_list_houses(stub)

    # 2) list with filters
    test_list_houses_filtered(stub)

    # 3) get details
    test_get_house_details(stub, HOUSE_ID)

    # 4) set rating then re-check details
    test_set_house_rating(stub, HOUSE_ID, ADMIN_ID, 5)
    test_get_house_details(stub, HOUSE_ID)
    test_set_house_status(stub, HOUSE_ID, ADMIN_ID, "archived")
    test_get_house_details(stub, HOUSE_ID) 
    # ⚠️ après delete, GetHouseDetails devrait found=False ou NOT_FOUND
    test_delete_house(stub, HOUSE_ID, ADMIN_ID) 

if __name__ == "__main__":
    main()
