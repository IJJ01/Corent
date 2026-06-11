import os
import sys
from concurrent import futures

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

import grpc
from shared.generated import admin_service_pb2_grpc
from rpc.servicers.admin_servicer import AdminService


def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=20))
    admin_service_pb2_grpc.add_AdminServiceServicer_to_server(AdminService(), server)

    listen_addr = os.environ.get("ADMIN_GRPC_ADDR", "0.0.0.0:50054")
    server.add_insecure_port(listen_addr)

    print(f"[Admin gRPC] listening on {listen_addr}")
    server.start()
    server.wait_for_termination()


if __name__ == "__main__":
    serve()