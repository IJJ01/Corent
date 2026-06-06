import os
import sys
from concurrent import futures

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, ROOT_DIR)

import grpc
from app.init_db import init_db
from shared.generated import notification_pb2_grpc
from grpc.servicers.notification_servicer import NotificationService


def serve():
    init_db()

    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    notification_pb2_grpc.add_NotificationServiceServicer_to_server(NotificationService(), server)

    host = os.environ.get("GRPC_HOST", "0.0.0.0")
    port = os.environ.get("GRPC_PORT", "50056")
    addr = f"{host}:{port}"

    server.add_insecure_port(addr)
    print(f"[notification-service] gRPC listening on {addr}")
    server.start()
    server.wait_for_termination()


if __name__ == "__main__":
    serve()