from datetime import timezone
from fastapi import APIRouter, Depends, Header, HTTPException, Query
import grpc
from pydantic import BaseModel

from app.deps import get_grpc
from app.grpc_clients import GrpcClients
from shared.generated import admin_service_pb2


router = APIRouter(prefix="/admin/reports", tags=["admin-reports"])


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


def _report_to_dict(r) -> dict:
    return {
        "id": getattr(r, "id", ""),
        "reporter_id": getattr(r, "reporter_id", ""),
        "house_id": getattr(r, "house_id", ""),
        "reason": getattr(r, "reason", ""),
        "details": getattr(r, "details", ""),
        "status": getattr(r, "status", ""),
        "created_at": _ts_to_iso(getattr(r, "created_at", None)),
        "updated_at": _ts_to_iso(getattr(r, "updated_at", None)),
    }


@router.get("")
def admin_list_reports(
    status: str = Query("open"),
    pageSize: int = Query(50, ge=1, le=100),
    pageToken: str = Query("0"),
    admin_id: str = Depends(get_admin_id),
    grpc_clients: GrpcClients = Depends(get_grpc),
):
    try:
        res = grpc_clients.admin.ListReports(
            admin_service_pb2.ListReportsRequest(status=status, page_size=pageSize, page_token=pageToken)
        )
    except grpc.RpcError as e:
        raise _grpc_to_http(e)

    reports = getattr(res, "reports", [])
    next_token = getattr(res, "next_page_token", "")

    return {"items": [_report_to_dict(r) for r in reports], "nextPageToken": next_token}


@router.get("/{report_id}")
def admin_get_report_details(
    report_id: str,
    admin_id: str = Depends(get_admin_id),
    grpc_clients: GrpcClients = Depends(get_grpc),
):
    try:
        res = grpc_clients.admin.GetReportDetails(
            admin_service_pb2.GetReportDetailsRequest(report_id=report_id)
        )
    except grpc.RpcError as e:
        raise _grpc_to_http(e)

    if not getattr(res, "found", False):
        raise HTTPException(status_code=404, detail="Report not found")

    return {"report": _report_to_dict(res.report)}


class ResolveIn(BaseModel):
    status: str = "reviewed"


@router.post("/{report_id}/resolve")
def admin_resolve_report(
    report_id: str,
    payload: ResolveIn,
    admin_id: str = Depends(get_admin_id),
    grpc_clients: GrpcClients = Depends(get_grpc),
):
    try:
        res = grpc_clients.admin.ResolveReport(
            admin_service_pb2.ResolveReportRequest(
                report_id=report_id,
                admin_id=admin_id,
                status=payload.status,
            )
        )
    except grpc.RpcError as e:
        raise _grpc_to_http(e)

    if not getattr(res, "success", False):
        raise HTTPException(status_code=400, detail=getattr(res, "message", "Resolve failed"))

    return {"success": True, "message": getattr(res, "message", "")}
