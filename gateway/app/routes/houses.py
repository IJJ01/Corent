from fastapi import APIRouter, Depends, Header, HTTPException, Query
import grpc
from pydantic import BaseModel
from typing import Any, Optional

from app.deps import get_grpc
from app.grpc_clients import GrpcClients
from shared.generated import house_pb2
from google.protobuf import wrappers_pb2


router = APIRouter(prefix="/houses", tags=["houses"])


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
    """
    Same pattern as your applications router:
    require x-user-id for authenticated actions.
    """
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Missing x-user-id header")
    return x_user_id


def _status_to_str(status_val: int) -> str:
    # If enum exists, convert to name; else fallback to raw value
    try:
        return house_pb2.HouseStatus.Name(status_val).lower()
    except Exception:
        return str(status_val)


def _status_to_enum(status_val: Any) -> int:
    """
    Accepts:
      - int enum value
      - string like "available" / "AVAILABLE"
    Falls back to 0 if unknown.
    """
    if status_val is None:
        return 0

    if isinstance(status_val, bool):
        return 0

    if isinstance(status_val, int):
        return int(status_val)

    s = str(status_val).strip()
    if not s:
        return 0

    # Try parse int string
    try:
        return int(s)
    except Exception:
        pass

    # Try enum name
    try:
        return int(house_pb2.HouseStatus.Value(s.upper()))
    except Exception:
        return 0


def _house_to_dict(h) -> dict:
    """
    Convert proto HouseMessage/House object to JSON-friendly dict.
    We use getattr so it won't crash if a field doesn't exist.
    """
    return {
        "id": getattr(h, "id", ""),
        "owner_id": getattr(h, "owner_id", None),
        "title": getattr(h, "title", ""),
        "description": getattr(h, "description", ""),
        "location": getattr(h, "location", ""),
        "price_per_room": getattr(h, "price_per_room", 0),
        "total_rooms": getattr(h, "total_rooms", 0),
        "occupied_rooms": getattr(h, "occupied_rooms", 0),
        "status": _status_to_str(getattr(h, "status", 0)),
        "rating": getattr(h, "rating", None),
        "created_at": getattr(h, "created_at", ""),
        "edited_at": getattr(h, "edited_at", ""),
        "deleted_at": getattr(h, "deleted_at", ""),
        # Optional common fields (won’t crash if missing)
        "city": getattr(h, "city", ""),
        "images": list(getattr(h, "images", [])) if hasattr(h, "images") else [],
    }


class CreateHouseIn(BaseModel):
    title: str = ""
    description: str = ""
    location: str = ""
    city: str = ""
    price_per_room: float = 0
    total_rooms: int = 0
    occupied_rooms: int = 0
    status: Optional[Any] = None  # can be int or string


def _pick(payload: dict, *keys, default=None):
    for k in keys:
        if k in payload and payload[k] is not None:
            return payload[k]
    return default


@router.get("")
def list_houses(
    page: int = Query(1, ge=1),
    pageSize: int = Query(10, ge=1, le=100),
    grpc_clients: GrpcClients = Depends(get_grpc),
):
    """
    REST:
      GET /houses?page=1&pageSize=10

    gRPC expected:
      ListHouses(ListHousesRequest(page, pageSize|page_size))
    """
    # Some teams use page_size in proto, some pageSize. We'll try both safely.
    req_fields = house_pb2.ListHousesRequest.DESCRIPTOR.fields_by_name

    if "pageSize" in req_fields:
        req = house_pb2.ListHousesRequest(page=page, pageSize=pageSize)
    elif "page_size" in req_fields:
        req = house_pb2.ListHousesRequest(page=page, page_size=pageSize)
    else:
        # fallback: just pass what we can
        req = house_pb2.ListHousesRequest(page=page)

    try:
        res = grpc_clients.houses.ListHouses(req)
    except grpc.RpcError as e:
        raise _grpc_to_http(e)

    houses = getattr(res, "houses", [])
    total = getattr(res, "total", None)
    page_out = getattr(res, "page", page)

    return {
        "items": [_house_to_dict(h) for h in houses],
        "page": page_out,
        "pageSize": pageSize,
        "total": total,
    }

@router.get("/my")
def list_my_houses(
    page: int = Query(1, ge=1),
    pageSize: int = Query(10, ge=1, le=100),
    user_id: str = Depends(get_current_user_id),
    grpc_clients: GrpcClients = Depends(get_grpc),
):
    """
    REST:
      GET /houses/my?page=1&pageSize=10

    Uses gRPC:
      ListHousesByOwner(owner_id, page, page_size)
    """
    try:
        res = grpc_clients.houses.ListHousesByOwner(
            house_pb2.ListHousesByOwnerRequest(
                owner_id=user_id,
                page=page,
                page_size=pageSize,
            )
        )
    except grpc.RpcError as e:
        raise _grpc_to_http(e)

    houses = getattr(res, "houses", [])
    total = getattr(res, "total", None)
    page_out = getattr(res, "page", page)

    return {
        "items": [_house_to_dict(h) for h in houses],
        "page": page_out,
        "pageSize": pageSize,
        "total": total,
    }

@router.put("/{house_id}")
def update_house(
    house_id: str,
    payload: dict,
    user_id: str = Depends(get_current_user_id),
    grpc_clients: GrpcClients = Depends(get_grpc),
):
    """
    REST:
      PUT /houses/{id}
    Requires:
      x-user-id header (owner id)
    Accepts partial updates.
    """
    try:
        req = house_pb2.UpdateHouseRequest(
            id=house_id,
            owner_id=user_id,
        )

        # Optional fields via wrappers
        if "title" in payload and payload["title"] is not None:
            req.title.CopyFrom(wrappers_pb2.StringValue(value=str(payload["title"])))

        if "description" in payload and payload["description"] is not None:
            req.description.CopyFrom(wrappers_pb2.StringValue(value=str(payload["description"])))

        if "location" in payload and payload["location"] is not None:
            req.location.CopyFrom(wrappers_pb2.StringValue(value=str(payload["location"])))

        if "rating" in payload and payload["rating"] is not None:
            req.rating.CopyFrom(wrappers_pb2.Int32Value(value=int(payload["rating"])))

        if "price_per_room" in payload and payload["price_per_room"] is not None:
            req.price_per_room.CopyFrom(wrappers_pb2.DoubleValue(value=float(payload["price_per_room"])))

        if "total_rooms" in payload and payload["total_rooms"] is not None:
            req.total_rooms.CopyFrom(wrappers_pb2.Int32Value(value=int(payload["total_rooms"])))

        if "occupied_rooms" in payload and payload["occupied_rooms"] is not None:
            req.occupied_rooms.CopyFrom(wrappers_pb2.Int32Value(value=int(payload["occupied_rooms"])))

        # status is not wrapped in proto; use 0 to ignore when not provided
        if "status" in payload and payload["status"] is not None:
            # accept "AVAILABLE" / "available" or numeric
            s = payload["status"]
            if isinstance(s, int):
                req.status = int(s)
            else:
                req.status = house_pb2.HouseStatus.Value(str(s).upper())

        res = grpc_clients.houses.UpdateHouse(req)

    except grpc.RpcError as e:
        raise _grpc_to_http(e)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    h = getattr(res, "house", None) or res
    return {"house": _house_to_dict(h)}


@router.delete("/{house_id}")
def delete_house(
    house_id: str,
    user_id: str = Depends(get_current_user_id),
    grpc_clients: GrpcClients = Depends(get_grpc),
):
    """
    REST:
      DELETE /houses/{id}
    Requires:
      x-user-id header (owner id)
    """
    try:
        res = grpc_clients.houses.DeleteHouse(
            house_pb2.DeleteHouseRequest(id=house_id, owner_id=user_id)
        )
    except grpc.RpcError as e:
        raise _grpc_to_http(e)

    # proto returns DeleteHouseResponse { bool ok, string message } (usually)
    ok = getattr(res, "ok", True)
    msg = getattr(res, "message", "Deleted")
    return {"ok": ok, "message": msg}


@router.get("/{house_id}")
def get_house(
    house_id: str,
    grpc_clients: GrpcClients = Depends(get_grpc),
):
    """
    REST:
      GET /houses/{id}

    gRPC expected:
      GetHouse(GetHouseRequest(id))
    """
    try:
        res = grpc_clients.houses.GetHouse(house_pb2.GetHouseRequest(id=house_id))
    except grpc.RpcError as e:
        raise _grpc_to_http(e)

    h = getattr(res, "house", None)
    if not h:
        raise HTTPException(status_code=404, detail="House not found")

    return {"house": _house_to_dict(h)}


@router.post("/create")
def create_house(
    payload: CreateHouseIn,
    user_id: str = Depends(get_current_user_id),
    grpc_clients: GrpcClients = Depends(get_grpc),
):
    """
    REST:
      POST /houses
    Requires:
      x-user-id header (owner id)
    """
    # Support both snake_case + camelCase if frontend ever sends camelCase
    raw = payload.model_dump()

    title = _pick(raw, "title", default="")
    description = _pick(raw, "description", default="")
    location = _pick(raw, "location", default="")
    city = _pick(raw, "city", default="")
    price_per_room = float(_pick(raw, "price_per_room", "pricePerRoom", default=0) or 0)
    total_rooms = int(_pick(raw, "total_rooms", "totalRooms", default=0) or 0)
    occupied_rooms = int(_pick(raw, "occupied_rooms", "occupiedRooms", default=0) or 0)
    status = _status_to_enum(_pick(raw, "status", default=None))

    # Build request safely based on proto fields (won't break if proto differs slightly)
    fields = house_pb2.CreateHouseRequest.DESCRIPTOR.fields_by_name
    kwargs = {}

    if "owner_id" in fields:
        kwargs["owner_id"] = user_id
    if "title" in fields:
        kwargs["title"] = title
    if "description" in fields:
        kwargs["description"] = description
    if "location" in fields:
        kwargs["location"] = location
    if "city" in fields:
        kwargs["city"] = city
    if "price_per_room" in fields:
        kwargs["price_per_room"] = price_per_room
    if "total_rooms" in fields:
        kwargs["total_rooms"] = total_rooms
    if "occupied_rooms" in fields:
        kwargs["occupied_rooms"] = occupied_rooms
    if "status" in fields:
        kwargs["status"] = status

    try:
        res = grpc_clients.houses.CreateHouse(house_pb2.CreateHouseRequest(**kwargs))
    except grpc.RpcError as e:
        raise _grpc_to_http(e)

    h = getattr(res, "house", None) or res
    return {"house": _house_to_dict(h)}
