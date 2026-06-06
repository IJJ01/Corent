from fastapi import Request

from app.grpc_clients import GrpcClients


def get_grpc(request: Request) -> GrpcClients:
    return request.app.state.grpc
