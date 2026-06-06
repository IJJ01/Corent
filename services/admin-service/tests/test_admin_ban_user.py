import grpc
from shared.generated import admin_service_pb2, admin_service_pb2_grpc

def main():
    channel = grpc.insecure_channel("127.0.0.1:50054")
    stub = admin_service_pb2_grpc.AdminServiceStub(channel)

    # Mets des UUIDs réels
    user_id = "2571d347-9c29-4002-9704-de22233147ce"
    admin_id = "11111111-1111-1111-1111-111111111111"

    res = stub.BanUser(admin_service_pb2.BanUserRequest(
        user_id=user_id,
        admin_id=admin_id,
        ban=True,
        reason="Spam / fake profile",
    ))
    print("BanUser:", res.success, res.message)

    res2 = stub.BanUser(admin_service_pb2.BanUserRequest(
        user_id=user_id,
        admin_id=admin_id,
        ban=False,
        reason="Unban after review",
    ))
    print("UnbanUser:", res2.success, res2.message)

if __name__ == "__main__":
    main()
