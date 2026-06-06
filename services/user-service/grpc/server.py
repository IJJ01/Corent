import sys
import os
from concurrent import futures

import grpc
import django

# Ensure project root is on sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

# Configure Django BEFORE importing modules that use models
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from app_grpc import user_pb2_grpc  # noqa: E402
from grpc_server.servicers.user_servicer import UserServicer  # noqa: E402


def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    user_pb2_grpc.add_UserServiceServicer_to_server(UserServicer(), server)

    port = os.getenv("GRPC_PORT", "50053")
    server.add_insecure_port(f"[::]:{port}")

    print(f"[UserService gRPC] running on port {port}")
    server.start()
    server.wait_for_termination()


if __name__ == "__main__":
    serve()
