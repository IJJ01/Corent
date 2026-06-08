import grpc
from concurrent import futures
import django
import os
import sys


sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from shared.generated import application_pb2_grpc
from grpc.servicers.application_servicer import AppServicer


def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    application_pb2_grpc.add_AppServiceServicer_to_server(
        AppServicer(), server
    )
    
    server.add_insecure_port('[::]:50051')
    print('🚀 Application gRPC Server running on port 50051')
    server.start()
    server.wait_for_termination()


if __name__ == '__main__':
    serve()