from datetime import timezone
from fastapi import APIRouter, Depends, Header, HTTPException, Query
import grpc

from app.deps import get_grpc
from app.grpc_clients import GrpcClients
from shared.generated import notification_pb2


router = APIRouter(prefix="/notifications", tags=["notifications"])


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


def get_current_user_role(x_user_role: str | None = Header(default=None)) -> str:
    return (x_user_role or "USER").strip() or "USER"


def _ts_to_iso(ts) -> str:
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


def _notif_to_dict(n) -> dict:
    return {
        "id": getattr(n, "id", ""),
        "recipient_id": getattr(n, "recipient_id", ""),
        "type": getattr(n, "type", ""),
        "title": getattr(n, "title", ""),
        "body": getattr(n, "body", ""),
        "payload_json": getattr(n, "payload_json", ""),
        "status": getattr(n, "status", ""),
        "created_at": _ts_to_iso(getattr(n, "created_at", None)),
        "read_at": _ts_to_iso(getattr(n, "read_at", None)),
    }


def _status_param_to_enum(status: str) -> int:
    s = (status or "").strip().lower()
    # Your proto most likely has: UNREAD=1, READ=2 (or similar).
    # We map strings defensively.
    if s in ("unread", "new", "0", "1"):
        return getattr(notification_pb2, "UNREAD", 1)
    if s in ("read", "2"):
        return getattr(notification_pb2, "READ", 2)
    # default: unread
    return getattr(notification_pb2, "UNREAD", 1)


@router.get("/unread-count")
def unread_count(
    user_id: str = Depends(get_current_user_id),
    user_role: str = Depends(get_current_user_role),
    grpc_clients: GrpcClients = Depends(get_grpc),
):
    md = (("x-user-id", user_id), ("x-user-role", user_role))
    try:
        res = grpc_clients.notifs.GetUnreadCount(
            notification_pb2.GetUnreadCountRequest(recipient_id=user_id),
            metadata=md,
        )
    except grpc.RpcError as e:
        raise _grpc_to_http(e)

    return {"unread_count": int(getattr(res, "unread_count", 0))}


@router.get("")
def list_notifications(
    status: str = Query("unread"),
    pageSize: int = Query(20, ge=1, le=100),
    pageToken: str = Query("0"),
    user_id: str = Depends(get_current_user_id),
    user_role: str = Depends(get_current_user_role),
    grpc_clients: GrpcClients = Depends(get_grpc),
):
    md = (("x-user-id", user_id), ("x-user-role", user_role))

    status_enum = _status_param_to_enum(status)

    # Some protos use page_size/page_token. We'll use those (like your E2E test).
    try:
        res = grpc_clients.notifs.ListNotifications(
            notification_pb2.ListNotificationsRequest(
                recipient_id=user_id,
                status=status_enum,
                page_size=pageSize,
                page_token=pageToken,
            ),
            metadata=md,
        )
    except grpc.RpcError as e:
        raise _grpc_to_http(e)

    notifs = getattr(res, "notifications", [])
    next_token = getattr(res, "next_page_token", "")

    return {
        "items": [_notif_to_dict(n) for n in notifs],
        "nextPageToken": next_token,
    }


@router.post("/mark-all-read")
def mark_all_read(
    user_id: str = Depends(get_current_user_id),
    user_role: str = Depends(get_current_user_role),
    grpc_clients: GrpcClients = Depends(get_grpc),
):
    md = (("x-user-id", user_id), ("x-user-role", user_role))
    try:
        grpc_clients.notifs.MarkAllAsRead(
            notification_pb2.MarkAllAsReadRequest(recipient_id=user_id),
            metadata=md,
        )
    except grpc.RpcError as e:
        raise _grpc_to_http(e)

    return {"ok": True}


@router.post("/{notification_id}/mark-read")
def mark_one_read(
    notification_id: str,
    user_id: str = Depends(get_current_user_id),
    user_role: str = Depends(get_current_user_role),
    grpc_clients: GrpcClients = Depends(get_grpc),
):
    md = (("x-user-id", user_id), ("x-user-role", user_role))
    try:
        grpc_clients.notifs.MarkAsRead(
            notification_pb2.MarkAsReadRequest(notification_id=notification_id),
            metadata=md,
        )
    except grpc.RpcError as e:
        raise _grpc_to_http(e)

    return {"ok": True}
