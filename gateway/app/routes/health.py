from fastapi import APIRouter, Depends
import grpc

from app.deps import get_grpc
from app.grpc_clients import GrpcClients

router = APIRouter(tags=["health"])


@router.get("/health")
def health():
    return {"ok": True}


@router.get("/health/grpc")
def health_grpc(grpc_clients: GrpcClients = Depends(get_grpc)):
    """
    Quick gRPC connectivity sanity check.
    We call ListAdmins with INTERNAL_GRPC_KEY if provided.
    If your user service doesn't require it, it will still work.
    """
    md = []
    # Lazy import to avoid issues if proto name differs
    from shared.generated import user_pb2

    # optional internal key
    from app.config import settings
    if settings.INTERNAL_GRPC_KEY:
        md.append(("x-internal-key", settings.INTERNAL_GRPC_KEY))

    try:
        res = grpc_clients.users.ListAdmins(user_pb2.ListAdminsRequest(), metadata=md)
        # Don’t assume schema; just show count if present
        users = getattr(res, "users", [])
        return {"ok": True, "list_admins_count": len(users)}
    except grpc.RpcError as e:
        return {
            "ok": False,
            "code": str(e.code()),
            "details": e.details(),
        }
