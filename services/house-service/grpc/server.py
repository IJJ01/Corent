import os
import grpc
from concurrent import futures

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

from shared.generated import house_pb2_grpc
from grpc.servicers.house_servicer import HouseServiceServicer


def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    house_pb2_grpc.add_HouseServiceServicer_to_server(HouseServiceServicer(), server)

    server.add_insecure_port("[::]:50052")
    server.start()
    print("House gRPC server running on port 50052")
    server.wait_for_termination()


if __name__ == "__main__":
    serve()
