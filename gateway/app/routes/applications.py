from datetime import timezone
from fastapi import APIRouter, Depends, Header, HTTPException, Query
import grpc
from pydantic import BaseModel

from app.deps import get_grpc
from app.grpc_clients import GrpcClients
from shared.generated import application_pb2, house_pb2


router = APIRouter(tags=["applications"])


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


def get_current_user_id(x_user_id: str | None = Header(default=None)) -> str:
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Missing x-user-id header")
    return x_user_id


class ApplyIn(BaseModel):
    message: str = ""


def _ts_to_iso(ts) -> str:
    """
    Converts google.protobuf.Timestamp to ISO string.
    Returns "" if timestamp is empty/unset.
    """
    if ts is None:
        return ""
    seconds = getattr(ts, "seconds", 0)
    nanos = getattr(ts, "nanos", 0)
    if not seconds and not nanos:
        return ""
    try:
        dt = ts.ToDatetime()
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()
    except Exception:
        return ""


def _status_to_str(s: int) -> str:
    """
    Your enum is `Status` in application.proto.
    """
    try:
        return application_pb2.Status.Name(s).lower()
    except Exception:
        return str(s)


def _application_to_dict(a) -> dict:
    return {
        "id": getattr(a, "id", ""),
        "applicant_id": getattr(a, "applicant_id", ""),
        "house_id": getattr(a, "house_id", ""),
        "message": getattr(a, "message", ""),
        "status": _status_to_str(getattr(a, "status", 0)),
        "created_at": _ts_to_iso(getattr(a, "created_at", None)),
        "updated_at": _ts_to_iso(getattr(a, "updated_at", None)),
    }


@router.post("/houses/{house_id}/apply")
def apply_for_house(
    house_id: str,
    payload: ApplyIn,
    user_id: str = Depends(get_current_user_id),
    grpc_clients: GrpcClients = Depends(get_grpc),
):
    try:
        res = grpc_clients.apps.ApplyForHouse(
            application_pb2.ApplyForHouseRequest(
                applicant_id=user_id,
                house_id=house_id,
                message=payload.message or "",
            )
        )
    except grpc.RpcError as e:
        raise _grpc_to_http(e)

    err = getattr(res, "error", "")
    if err:
        raise HTTPException(status_code=400, detail=err)

    app = getattr(res, "application", None)
    if not app:
        raise HTTPException(status_code=400, detail="Apply failed")

    return {"application": _application_to_dict(app)}


@router.get("/applications")
def list_my_applications(
    mine: int = Query(1),
    pageSize: int = Query(20, ge=1, le=100),
    pageToken: str = Query("0"),
    user_id: str = Depends(get_current_user_id),
    grpc_clients: GrpcClients = Depends(get_grpc),
):
    """
    Uses your real proto RPC:
      GetApplicationsByUser(GetApplicationsByUserRequest)
    """
    try:
        res = grpc_clients.apps.GetApplicationsByUser(
            application_pb2.GetApplicationsByUserRequest(
                user_id=user_id,
                page_size=pageSize,
                page_token=pageToken,
            )
        )
    except grpc.RpcError as e:
        raise _grpc_to_http(e)

    err = getattr(res, "error", "")
    if err:
        raise HTTPException(status_code=400, detail=err)

    apps = getattr(res, "applications", [])
    next_token = getattr(res, "next_page_token", "")

    return {
        "items": [_application_to_dict(a) for a in apps],
        "nextPageToken": next_token,
    }


@router.post("/applications/{application_id}/accept")
def accept_application(
    application_id: str,
    user_id: str = Depends(get_current_user_id),
    grpc_clients: GrpcClients = Depends(get_grpc),
):
    try:
        res = grpc_clients.apps.AcceptApplication(
            application_pb2.ChangeApplicationStatusRequest(application_id=application_id)
        )
    except grpc.RpcError as e:
        raise _grpc_to_http(e)

    err = getattr(res, "error", "")
    if err:
        raise HTTPException(status_code=400, detail=err)

    app = getattr(res, "application", None)
    if not app:
        raise HTTPException(status_code=400, detail="Accept failed")

    return {"application": _application_to_dict(app)}


@router.post("/applications/{application_id}/reject")
def reject_application(
    application_id: str,
    user_id: str = Depends(get_current_user_id),
    grpc_clients: GrpcClients = Depends(get_grpc),
):
    try:
        res = grpc_clients.apps.RejectApplication(
            application_pb2.ChangeApplicationStatusRequest(application_id=application_id)
        )
    except grpc.RpcError as e:
        raise _grpc_to_http(e)

    err = getattr(res, "error", "")
    if err:
        raise HTTPException(status_code=400, detail=err)

    app = getattr(res, "application", None)
    if not app:
        raise HTTPException(status_code=400, detail="Reject failed")

    return {"application": _application_to_dict(app)}


@router.get("/applications/owner")
def list_owner_applications(
    status: str = Query("PENDING"),
    pageSize: int = Query(50, ge=1, le=200),
    pageToken: str = Query("0"),
    user_id: str = Depends(get_current_user_id),
    grpc_clients: GrpcClients = Depends(get_grpc),
):
    """
    Aggregates applications across all houses owned by the current user.
    pageToken is treated as an integer offset (string).
    """
    # 1) Fetch my houses
    try:
        houses_res = grpc_clients.houses.ListHousesByOwner(
            house_pb2.ListHousesByOwnerRequest(
                owner_id=user_id,
                page=1,
                page_size=500,
            )
        )
    except grpc.RpcError as e:
        raise _grpc_to_http(e)

    house_ids = [
        h.id for h in getattr(houses_res, "houses", [])
        if getattr(h, "id", None)
    ]

    # 2) Gather applications for each house
    apps = []
    want = str(status or "").strip().lower()  # "pending" / "accepted" / "rejected" / "all"

    for hid in house_ids:
        try:
            # ✅ FIX: your GrpcClients exposes application stub as "apps"
            r = grpc_clients.apps.GetApplicationsByHouse(
                application_pb2.GetApplicationsByHouseRequest(
                    house_id=hid,
                    page_size=500,
                    page_token="",
                )
            )
        except grpc.RpcError as e:
            raise _grpc_to_http(e)

        for a in getattr(r, "applications", []):
            st = _status_to_str(getattr(a, "status", 0))  # normalized e.g. "pending"
            if want and want != "all" and st != want:
                continue
            apps.append(a)

    # 3) Sort newest first (created_at)
    def _created_key(a):
        ts = getattr(a, "created_at", None)
        sec = getattr(ts, "seconds", 0) if ts else 0
        nano = getattr(ts, "nanos", 0) if ts else 0
        return (sec, nano)

    apps.sort(key=_created_key, reverse=True)

    # 4) Paginate using pageToken as offset
    try:
        offset = int(pageToken or "0")
    except Exception:
        offset = 0

    page_items = apps[offset: offset + pageSize]
    next_offset = offset + len(page_items)
    next_token = str(next_offset) if next_offset < len(apps) else ""

    return {
        "items": [_application_to_dict(a) for a in page_items],
        "next_page_token": next_token,
        "total": len(apps),
    }
