from concurrent import futures
import grpc

from .settings import GRPC_HOST, GRPC_PORT
from .init_db import init_db
from .grpc_server import NotificationService
from .generated import notification_pb2_grpc


def serve():
    # create tables if not exist
    init_db()

    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    notification_pb2_grpc.add_NotificationServiceServicer_to_server(NotificationService(), server)

    addr = f"{GRPC_HOST}:{GRPC_PORT}"
    server.add_insecure_port(addr)
    print(f"[notification-service] gRPC listening on {addr}")

    server.start()
    server.wait_for_termination()


if __name__ == "__main__":
    serve()
