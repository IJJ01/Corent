from fastapi import APIRouter, HTTPException, status, Depends
import grpc
from pydantic import BaseModel, Field

from app.deps import get_grpc
from app.grpc_clients import GrpcClients
from shared.generated import user_pb2


router = APIRouter(prefix="/auth", tags=["auth"])


class LoginIn(BaseModel):
    email: str
    password: str


class SignupIn(BaseModel):
    email: str
    password: str
    phone_number: str = "0600000000"
    CIN: str = "CINTEST"
    first_name: str = "Test"
    last_name: str = "User"
    birth_date: str = "2000-01-01"
    profile_pic_url: str = ""
    adress: str = "Test Address"
    city: str = "Test City"


def _grpc_to_http_error(e: grpc.RpcError) -> HTTPException:
    code = e.code()
    detail = e.details() or "gRPC error"

    if code == grpc.StatusCode.INVALID_ARGUMENT:
        return HTTPException(status_code=400, detail=detail)
    if code == grpc.StatusCode.NOT_FOUND:
        return HTTPException(status_code=404, detail=detail)
    if code == grpc.StatusCode.ALREADY_EXISTS:
        return HTTPException(status_code=409, detail=detail)
    if code == grpc.StatusCode.UNAUTHENTICATED:
        return HTTPException(status_code=401, detail=detail)
    if code == grpc.StatusCode.PERMISSION_DENIED:
        return HTTPException(status_code=403, detail=detail)
    if code == grpc.StatusCode.FAILED_PRECONDITION:
        return HTTPException(status_code=412, detail=detail)

    return HTTPException(status_code=500, detail=f"{code}: {detail}")


@router.post("/login")
def login(payload: LoginIn, grpc_clients: GrpcClients = Depends(get_grpc)):
    try:
        res = grpc_clients.users.LoginProcess(
            user_pb2.LoginRequest(email=payload.email, password=payload.password)
        )
    except grpc.RpcError as e:
        raise _grpc_to_http_error(e)

    # Your proto returns ok/message/access_token/user
    if hasattr(res, "ok") and not res.ok:
        raise HTTPException(status_code=401, detail=res.message or "Invalid credentials")

    return {
        "ok": bool(getattr(res, "ok", True)),
        "message": getattr(res, "message", ""),
        "access_token": getattr(res, "access_token", ""),
        "user": {
            "user_id": res.user.user_id,
            "email": res.user.email,
            "phone_number": res.user.phone_number,
            "CIN": res.user.CIN,
            "first_name": res.user.first_name,
            "last_name": res.user.last_name,
            "birth_date": res.user.birth_date,
            "profile_pic_url": res.user.profile_pic_url,
            "adress": res.user.adress,
            "city": res.user.city,
            "is_admin": res.user.is_admin,
            "banned_at": res.user.banned_at,
            "deleted_at": res.user.deleted_at,
            "edited_at": res.user.edited_at,
            "created_at": res.user.created_at,
        },
    }


@router.post("/signup")
def signup(payload: SignupIn, grpc_clients: GrpcClients = Depends(get_grpc)):
    try:
        res = grpc_clients.users.SignupProcess(
            user_pb2.SignupRequest(
                email=payload.email,
                password=payload.password,
                phone_number=payload.phone_number,
                CIN=payload.CIN,
                first_name=payload.first_name,
                last_name=payload.last_name,
                birth_date=payload.birth_date,
                profile_pic_url=payload.profile_pic_url,
                adress=payload.adress,
                city=payload.city,
            )
        )
    except grpc.RpcError as e:
        raise _grpc_to_http_error(e)

    if hasattr(res, "ok") and not res.ok:
        raise HTTPException(status_code=400, detail=res.message or "Signup failed")

    return {
        "ok": bool(getattr(res, "ok", True)),
        "message": getattr(res, "message", ""),
        "access_token": getattr(res, "access_token", ""),
        "user": {
            "user_id": res.user.user_id,
            "email": res.user.email,
            "phone_number": res.user.phone_number,
            "CIN": res.user.CIN,
            "first_name": res.user.first_name,
            "last_name": res.user.last_name,
            "birth_date": res.user.birth_date,
            "profile_pic_url": res.user.profile_pic_url,
            "adress": res.user.adress,
            "city": res.user.city,
            "is_admin": res.user.is_admin,
            "banned_at": res.user.banned_at,
            "deleted_at": res.user.deleted_at,
            "edited_at": res.user.edited_at,
            "created_at": res.user.created_at,
        },
    }
