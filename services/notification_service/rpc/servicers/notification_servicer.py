import uuid
from datetime import timezone as dt_timezone

import grpc
from google.protobuf.timestamp_pb2 import Timestamp
from sqlalchemy.orm import Session

from services.notification_service.app.auth import require_user
from services.notification_service.app.db import SessionLocal
from services.notification_service.app import repository as repo
from services.notification_service.app.templates import TEMPLATES
from shared.generated import notification_pb2, notification_pb2_grpc


def _to_ts(dt):
    ts = Timestamp()
    if not dt:
        return ts
    ts.FromDatetime(dt.astimezone(dt_timezone.utc))
    return ts


def _model_to_proto(n) -> notification_pb2.Notification:
    return notification_pb2.Notification(
        id=str(n.id),
        recipient_id=n.recipient_id,
        type=n.type,
        title=n.title,
        body=n.body,
        payload_json=n.payload_json,
        status=n.status,
        priority=n.priority,
        created_at=_to_ts(n.created_at),
        read_at=_to_ts(n.read_at),
    )


def _render_template_if_needed(n_type, payload_json, title, body):
    if (not title or not body) and n_type in TEMPLATES:
        gen_title, gen_body = TEMPLATES[n_type](payload_json)
        title = title or gen_title
        body = body or gen_body
    return title, body


def _is_service_caller(caller_id):
    return bool(caller_id) and caller_id.startswith("service:")


def _is_admin_role(role):
    return (role or "").strip().upper() == "ADMIN"


def _can_access_recipient(caller_id, caller_role, recipient_id):
    if caller_id == recipient_id:
        return True
    if _is_admin_role(caller_role):
        return True
    if _is_service_caller(caller_id):
        return True
    return False


def _can_bulk(caller_id, caller_role):
    return _is_admin_role(caller_role) or _is_service_caller(caller_id)


class NotificationService(notification_pb2_grpc.NotificationServiceServicer):

    def CreateNotification(self, request, context):
        caller_id, caller_role = require_user(context)
        if not _can_access_recipient(caller_id, caller_role, request.recipient_id):
            context.abort(grpc.StatusCode.PERMISSION_DENIED, "Not allowed to notify this recipient")

        db: Session = SessionLocal()
        try:
            title, body = _render_template_if_needed(request.type, request.payload_json, request.title, request.body)
            n = repo.create_notification(
                db,
                recipient_id=request.recipient_id,
                type_=request.type,
                title=title,
                body=body,
                payload_json=request.payload_json,
                priority=int(request.priority) if request.priority else 2,
                dedup_key=request.dedup_key if request.dedup_key else None,
            )
            return notification_pb2.CreateNotificationResponse(notification=_model_to_proto(n))
        finally:
            db.close()

    def CreateBulkNotifications(self, request, context):
        caller_id, caller_role = require_user(context)
        if not _can_bulk(caller_id, caller_role):
            context.abort(grpc.StatusCode.PERMISSION_DENIED, "Only admins or internal services can create bulk notifications")

        db: Session = SessionLocal()
        try:
            items = []
            for r in request.requests:
                title, body = _render_template_if_needed(r.type, r.payload_json, r.title, r.body)
                items.append(dict(
                    recipient_id=r.recipient_id,
                    type_=r.type,
                    title=title,
                    body=body,
                    payload_json=r.payload_json,
                    priority=int(r.priority) if r.priority else 2,
                    dedup_key=r.dedup_key if r.dedup_key else None,
                ))
            rows = repo.create_notifications_bulk(db, items)
            return notification_pb2.CreateBulkNotificationsResponse(notifications=[_model_to_proto(x) for x in rows])
        finally:
            db.close()

    def ListNotifications(self, request, context):
        caller_id, caller_role = require_user(context)
        if not _can_access_recipient(caller_id, caller_role, request.recipient_id):
            context.abort(grpc.StatusCode.PERMISSION_DENIED, "Not allowed")

        db: Session = SessionLocal()
        try:
            status = int(request.status) if request.status else None
            rows, next_token = repo.list_notifications(
                db,
                recipient_id=request.recipient_id,
                status=status,
                page_size=request.page_size,
                page_token=request.page_token if request.page_token else None,
            )
            return notification_pb2.ListNotificationsResponse(
                notifications=[_model_to_proto(x) for x in rows],
                next_page_token=next_token or "",
            )
        finally:
            db.close()

    def GetUnreadCount(self, request, context):
        caller_id, caller_role = require_user(context)
        if not _can_access_recipient(caller_id, caller_role, request.recipient_id):
            context.abort(grpc.StatusCode.PERMISSION_DENIED, "Not allowed")

        db: Session = SessionLocal()
        try:
            count = repo.unread_count(db, recipient_id=request.recipient_id)
            return notification_pb2.GetUnreadCountResponse(unread_count=count)
        finally:
            db.close()

    def MarkAsRead(self, request, context):
        caller_id, caller_role = require_user(context)

        db: Session = SessionLocal()
        try:
            try:
                nid = uuid.UUID(request.notification_id)
            except ValueError:
                context.abort(grpc.StatusCode.INVALID_ARGUMENT, "notification_id must be a UUID")

            n = repo.mark_as_read(db, notification_id=nid)
            if not n:
                context.abort(grpc.StatusCode.NOT_FOUND, "notification not found")

            if not _can_access_recipient(caller_id, caller_role, n.recipient_id):
                context.abort(grpc.StatusCode.PERMISSION_DENIED, "Not allowed")

            return notification_pb2.MarkAsReadResponse(notification=_model_to_proto(n))
        finally:
            db.close()

    def MarkAllAsRead(self, request, context):
        caller_id, caller_role = require_user(context)
        if not _can_access_recipient(caller_id, caller_role, request.recipient_id):
            context.abort(grpc.StatusCode.PERMISSION_DENIED, "Not allowed")

        db: Session = SessionLocal()
        try:
            count = repo.mark_all_as_read(db, recipient_id=request.recipient_id)
            return notification_pb2.MarkAllAsReadResponse(updated_count=count)
        finally:
            db.close()