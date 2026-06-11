import sys
import os
from concurrent import futures

import grpc
import django

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from shared.generated import user_pb2_grpc  # noqa
from rpc.servicers.user_servicer import UserServicer  # noqa


def main():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    user_pb2_grpc.add_UserServiceServicer_to_server(UserServicer(), server)

    port = os.getenv("GRPC_PORT", "50053")
    server.add_insecure_port(f"[::]:{port}")

    print(f"[UserService gRPC] running on port {port}")
    server.start()
    server.wait_for_termination()


if __name__ == "__main__":
    main()
