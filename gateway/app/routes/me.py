from fastapi import APIRouter, Depends, Header, HTTPException
import grpc

from app.deps import get_grpc
from app.grpc_clients import GrpcClients
from shared.generated import user_pb2

router = APIRouter(tags=["me"])


def get_current_user_id(x_user_id: str | None = Header(default=None)) -> str:
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Missing x-user-id header")
    return x_user_id


def _grpc_err(e: grpc.RpcError):
    code = e.code()
    detail = e.details() or "gRPC error"
    if code in (grpc.StatusCode.UNAUTHENTICATED, grpc.StatusCode.PERMISSION_DENIED):
        raise HTTPException(status_code=401, detail=detail)
    if code == grpc.StatusCode.NOT_FOUND:
        raise HTTPException(status_code=404, detail=detail)
    if code == grpc.StatusCode.INVALID_ARGUMENT:
        raise HTTPException(status_code=400, detail=detail)
    raise HTTPException(status_code=500, detail=f"{code}: {detail}")


def _user_to_dict(u):
    return {
        "user_id": u.user_id,
        "email": u.email,
        "phone_number": u.phone_number,
        "CIN": u.CIN,
        "first_name": u.first_name,
        "last_name": u.last_name,
        "birth_date": u.birth_date,
        "profile_pic_url": u.profile_pic_url,
        "adress": u.adress,
        "city": u.city,
        "is_admin": u.is_admin,
        "banned_at": u.banned_at,
        "deleted_at": u.deleted_at,
        "edited_at": u.edited_at,
        "created_at": u.created_at,
    }


@router.get("/me")
def me(
    user_id: str = Depends(get_current_user_id),
    grpc_clients: GrpcClients = Depends(get_grpc),
):
    try:
        res = grpc_clients.users.ListAllUserInfos(
            user_pb2.UserIdRequest(user_id=user_id)
        )
    except grpc.RpcError as e:
        _grpc_err(e)

    if hasattr(res, "ok") and not res.ok:
        raise HTTPException(status_code=400, detail=res.message or "Failed to load user")

    return {
        "ok": bool(getattr(res, "ok", True)),
        "message": getattr(res, "message", ""),
        "user": _user_to_dict(res.user),
    }


@router.put("/me")
def update_me(
    payload: dict,
    user_id: str = Depends(get_current_user_id),
    grpc_clients: GrpcClients = Depends(get_grpc),
):
    """
    REST:
      PUT /me
    Uses gRPC:
      EditUserInfos(EditUserInfosRequest) -> UserResponse

    Safe behavior:
      - merge missing fields from current user (prevents overwriting with empty strings)
    """
    # 1) load current user
    try:
        cur_res = grpc_clients.users.ListAllUserInfos(
            user_pb2.UserIdRequest(user_id=user_id)
        )
    except grpc.RpcError as e:
        _grpc_err(e)

    if hasattr(cur_res, "ok") and not cur_res.ok:
        raise HTTPException(status_code=400, detail=cur_res.message or "Failed to load user")

    cur = cur_res.user

    def pick(key, fallback):
        v = payload.get(key, None)
        return fallback if v is None else str(v)

    req = user_pb2.EditUserInfosRequest(
        user_id=user_id,
        phone_number=pick("phone_number", cur.phone_number),
        CIN=pick("CIN", cur.CIN),
        first_name=pick("first_name", cur.first_name),
        last_name=pick("last_name", cur.last_name),
        birth_date=pick("birth_date", cur.birth_date),
        profile_pic_url=pick("profile_pic_url", cur.profile_pic_url),
        adress=pick("adress", cur.adress),
        city=pick("city", cur.city),
    )

    # 2) call edit rpc
    try:
        res = grpc_clients.users.EditUserInfos(req)
    except grpc.RpcError as e:
        _grpc_err(e)

    if hasattr(res, "ok") and not res.ok:
        raise HTTPException(status_code=400, detail=res.message or "Update failed")

    return {
        "ok": True,
        "message": getattr(res, "message", ""),
        "user": _user_to_dict(res.user),
    }
