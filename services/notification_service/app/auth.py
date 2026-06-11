import grpc
from typing import Tuple, Optional


def get_identity(context: grpc.ServicerContext) -> Tuple[Optional[str], Optional[str]]:
    """
    Extract identity from gRPC metadata.
    Expected metadata:
      x-user-id
      x-user-role
    """
    metadata = dict(context.invocation_metadata())
    return metadata.get("x-user-id"), metadata.get("x-user-role")


def require_user(context: grpc.ServicerContext) -> Tuple[str, Optional[str]]:
    """
    Enforce that x-user-id is present.
    Abort request if missing.
    """
    user_id, role = get_identity(context)
    if not user_id:
        context.abort(grpc.StatusCode.UNAUTHENTICATED, "Missing x-user-id")
    return user_id, role
