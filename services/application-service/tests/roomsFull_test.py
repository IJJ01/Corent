import uuid
import grpc

from shared.generated import (application_pb2, application_pb2_grpc,
                              house_pb2, house_pb2_grpc)


APP_ADDR = "127.0.0.1:50051"
HOUSE_ADDR = "127.0.0.1:50052"


def safe_call(title, fn):
    print(f"\n=== {title} ===")
    try:
        resp = fn()
        return resp
    except grpc.RpcError as e:
        print("grpc code:", e.code())
        print("grpc details:", e.details())
        return None


def status_name_app(s):
    # Application Status enum: 0..3
    try:
        return application_pb2.Status.Name(s)
    except Exception:
        return str(s)


def main():
    app_channel = grpc.insecure_channel(APP_ADDR)
    app_stub = application_pb2_grpc.AppServiceStub(app_channel)

    house_channel = grpc.insecure_channel(HOUSE_ADDR)
    house_stub = house_pb2_grpc.HouseServiceStub(house_channel)

    print("Connecting to Applications:", APP_ADDR)
    print("Connecting to House:", HOUSE_ADDR)

    # 1) Create house with 3 rooms
    owner_id = str(uuid.uuid4())
    create_house = safe_call("1) CreateHouse (total_rooms=3, occupied_rooms=0)", lambda: house_stub.CreateHouse(
        house_pb2.CreateHouseRequest(
            owner_id=owner_id,
            title="Full-house test (3 rooms)",
            description="3 applicants will be accepted",
            location="Rabat",
            price_per_room=1200.0,
            total_rooms=3,
            occupied_rooms=0,
        )
    ))

    if not create_house or not getattr(create_house, "house", None) or not create_house.house.id:
        print("❌ CreateHouse failed. Stop.")
        return

    house_id = create_house.house.id
    print(f"✅ house_id={house_id} total_rooms={create_house.house.total_rooms} occupied={create_house.house.occupied_rooms}")

    # 2) 3 different applicants apply
    applicants = [str(uuid.uuid4()) for _ in range(3)]
    application_ids = []

    for i, applicant_id in enumerate(applicants, start=1):
        resp = safe_call(f"2.{i}) ApplyForHouse applicant#{i}", lambda a=applicant_id: app_stub.ApplyForHouse(
            application_pb2.ApplyForHouseRequest(
                applicant_id=a,
                house_id=house_id,
                message=f"Applicant #{i} applying",
            )
        ))
        if not resp or resp.error or not resp.application.id:
            print(f"❌ ApplyForHouse failed for applicant#{i}. error={getattr(resp, 'error', None)}")
            return

        application_ids.append(resp.application.id)
        print(f"✅ applicant#{i} application_id={resp.application.id} status={status_name_app(resp.application.status)}")

    # 3) Owner accepts all 3 (your service should call UpdateOccupancy each time)
    for i, app_id in enumerate(application_ids, start=1):
        resp = safe_call(f"3.{i}) AcceptApplication #{i}", lambda x=app_id: app_stub.AcceptApplication(
            application_pb2.ChangeApplicationStatusRequest(application_id=x)
        ))
        if not resp or resp.error:
            print(f"❌ AcceptApplication failed for #{i}. error={getattr(resp, 'error', None)}")
            return
        print(f"✅ accepted #{i}: status={status_name_app(resp.application.status)}")

    # 4) Verify house now full
    house_after = safe_call("4) GetHouse (verify occupancy/full)", lambda: house_stub.GetHouse(
        house_pb2.GetHouseRequest(id=house_id)
    ))
    if not house_after or not getattr(house_after, "house", None):
        print("❌ GetHouse failed.")
        return

    h = house_after.house
    print("\n=== RESULT ===")
    print("occupied_rooms =", h.occupied_rooms)
    print("total_rooms    =", h.total_rooms)

    # Depending on Mohamed B proto you might have:
    # - h.status (enum)
    # - h.available (bool) in OccupancyResponse
    # We'll check what exists.
    if hasattr(h, "status"):
        try:
            print("status         =", house_pb2.HouseStatus.Name(h.status))
        except Exception:
            print("status         =", h.status)

    # Expect full:
    if h.occupied_rooms >= h.total_rooms:
        print("\n✅ House is FULL (occupied_rooms == total_rooms).")
        print("✅ This confirms: 3 AcceptApplication calls => 3 UpdateOccupancy increments.")
    else:
        print("\n❌ House is NOT full — occupancy did not reach total_rooms.")
        print("Check that AcceptApplication calls HouseService.UpdateOccupancy and HouseService saves occupancy.")

    app_channel.close()
    house_channel.close()


if __name__ == "__main__":
    main()
