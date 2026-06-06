import os
import sys
import grpc
import django
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

# admin_backend/
ADMIN_BACKEND_DIR = os.path.dirname(os.path.dirname(CURRENT_DIR))
sys.path.insert(0, ADMIN_BACKEND_DIR)

# admin_backend/admin_service/
ADMIN_SERVICE_DIR = os.path.join(ADMIN_BACKEND_DIR, "admin_service")
sys.path.insert(0, ADMIN_SERVICE_DIR)

# Django settings
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

# proto (d'après ton screenshot: admin_backend/proto)
PROTO_DIR = os.path.join(ADMIN_BACKEND_DIR, "proto")
sys.path.insert(0, PROTO_DIR)
from shared.generated import admin_service_pb2 as pb2
from shared.generated import admin_service_pb2_grpc as pb2_grpc

ADDRESS = "localhost:50051"  # <-- change si ton server.py utilise un autre port

def main():
    channel = grpc.insecure_channel(ADDRESS)
    stub = pb2_grpc.AdminServiceStub(channel)

    # Ping logique: Overview
    ov = stub.GetAdminOverview(pb2.AdminOverviewRequest(recent_limit=5))
    print("✅ Overview:", ov)

    # List houses
    res = stub.ListHouses(pb2.ListHousesRequest(page=1, page_size=5, order_by="newest"))
    print("✅ Houses total:", res.total, "pages:", res.total_pages)
    for h in res.houses:
        print("-", h.id, h.title, h.city, h.status)

    # Details + rating si y'a au moins une house
    if res.houses:
        house_id = res.houses[0].id
        det = stub.GetHouseDetails(pb2.GetHouseDetailsRequest(house_id=house_id))
        print("✅ Details found:", det.found, "images:", len(det.image_urls))

        rate = stub.SetHouseRating(pb2.SetHouseRatingRequest(
            house_id=house_id,
            admin_id="1",
            rating=5
        ))
        print("✅ Rate:", rate.success, rate.message)

if __name__ == "__main__":
    main()
