import grpc
from users.utils.jwt_tokens import verify_access_token
from users.repositories.user_repository import UserRepository


def get_user_from_metadata(context):
    """
    Extract Bearer token from gRPC metadata, verify it,
    and return the corresponding User.
    """
    meta = dict(context.invocation_metadata())
    auth = meta.get("authorization") or meta.get("Authorization")
    if not auth or not auth.startswith("Bearer "):
        context.abort(grpc.StatusCode.UNAUTHENTICATED, "Missing or invalid Authorization header")

    token = auth.split(" ", 1)[1]
    payload = verify_access_token(token)
    if not payload:
        context.abort(grpc.StatusCode.UNAUTHENTICATED, "Invalid or expired token")

    user_id = payload.get("user_id")
    repo = UserRepository()
    user = repo.get_by_id(user_id)
    if not user:
        context.abort(grpc.StatusCode.UNAUTHENTICATED, "User not found")

    # block banned users globally
    if user.banned_at is not None:
        context.abort(grpc.StatusCode.PERMISSION_DENIED, "User is banned")

    return user
