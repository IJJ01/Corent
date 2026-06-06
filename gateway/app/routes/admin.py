from fastapi import APIRouter, Depends, Header, HTTPException, Query
import grpc
from pydantic import BaseModel, Field

from app.deps import get_grpc
from app.grpc_clients import GrpcClients
from shared.generated import admin_service_pb2


router = APIRouter(prefix="/admin", tags=["admin"])


def _grpc_to_http(e: grpc.RpcError) -> HTTPException:
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


def get_admin_id(x_admin_id: str | None = Header(default=None)) -> str:
    if not x_admin_id:
        raise HTTPException(status_code=401, detail="Missing x-admin-id header")
    return x_admin_id


# ---------------------------
# Admin Overview
# ---------------------------
@router.get("/overview")
def get_admin_overview(
    recentLimit: int = Query(10, ge=1, le=100),
    admin_id: str = Depends(get_admin_id),
    grpc_clients: GrpcClients = Depends(get_grpc),
):
    try:
        res = grpc_clients.admin.GetAdminOverview(
            admin_service_pb2.AdminOverviewRequest(recent_limit=recentLimit)
        )
    except grpc.RpcError as e:
        raise _grpc_to_http(e)

    # recent_events could be messages; we convert minimally
    recent_events = []
    for ev in getattr(res, "recent_events", []):
        recent_events.append({
            "type": getattr(ev, "type", ""),
            "message": getattr(ev, "message", ""),
            "created_at": getattr(ev, "created_at", ""),
        })

    return {
        "total_users": getattr(res, "total_users", 0),
        "total_houses": getattr(res, "total_houses", 0),
        "total_banned_users": getattr(res, "total_banned_users", 0),
        "total_ban_logs": getattr(res, "total_ban_logs", 0),
        "total_rating_logs": getattr(res, "total_rating_logs", 0),
        "recent_events": recent_events,
    }


# ---------------------------
# House moderation
# ---------------------------
class SetRatingIn(BaseModel):
    rating: int = Field(..., ge=1, le=5)


@router.post("/houses/{house_id}/rating")
def set_house_rating(
    house_id: str,
    payload: SetRatingIn,
    admin_id: str = Depends(get_admin_id),
    grpc_clients: GrpcClients = Depends(get_grpc),
):
    try:
        grpc_clients.admin.SetHouseRating(
            admin_service_pb2.SetHouseRatingRequest(
                house_id=house_id,
                admin_id=admin_id,
                rating=int(payload.rating),
            )
        )
    except grpc.RpcError as e:
        raise _grpc_to_http(e)

    return {"ok": True}


class SetStatusIn(BaseModel):
    status: str
    reason: str = ""


@router.post("/houses/{house_id}/status")
def set_house_status(
    house_id: str,
    payload: SetStatusIn,
    admin_id: str = Depends(get_admin_id),
    grpc_clients: GrpcClients = Depends(get_grpc),
):
    try:
        grpc_clients.admin.SetHouseStatus(
            admin_service_pb2.SetHouseStatusRequest(
                house_id=house_id,
                admin_id=admin_id,
                status=payload.status,
                reason=payload.reason,
            )
        )
    except grpc.RpcError as e:
        raise _grpc_to_http(e)

    return {"ok": True}


@router.delete("/houses/{house_id}")
def delete_house(
    house_id: str,
    reason: str = Query(""),
    admin_id: str = Depends(get_admin_id),
    grpc_clients: GrpcClients = Depends(get_grpc),
):
    try:
        grpc_clients.admin.DeleteHouse(
            admin_service_pb2.DeleteHouseRequest(
                house_id=house_id,
                admin_id=admin_id,
                reason=reason,
            )
        )
    except grpc.RpcError as e:
        raise _grpc_to_http(e)

    return {"ok": True}


# ---------------------------
# User moderation
# ---------------------------
class BanUserIn(BaseModel):
    ban: bool = True
    reason: str = ""


@router.post("/users/{user_id}/ban")
def ban_unban_user(
    user_id: str,
    payload: BanUserIn,
    admin_id: str = Depends(get_admin_id),
    grpc_clients: GrpcClients = Depends(get_grpc),
):
    try:
        res = grpc_clients.admin.BanUser(
            admin_service_pb2.BanUserRequest(
                user_id=user_id,
                admin_id=admin_id,
                ban=bool(payload.ban),
                reason=payload.reason,
            )
        )
    except grpc.RpcError as e:
        raise _grpc_to_http(e)

    return {
        "ok": getattr(res, "ok", True),
        "message": getattr(res, "message", ""),
        "banned_at": getattr(res, "banned_at", ""),
    }
