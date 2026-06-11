import uuid
from datetime import datetime, timezone

from sqlalchemy import String, Text, DateTime, Integer, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base

def utcnow():
    return datetime.now(timezone.utc)

class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    recipient_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)

    type: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    payload_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")

    # 1=UNREAD, 2=READ (matches proto enum values)
    status: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    # 1=LOW,2=NORMAL,3=HIGH (matches proto)
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=2)

    dedup_key: Mapped[str | None] = mapped_column(String(128), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, default=utcnow)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

Index("ix_notifications_recipient_created", Notification.recipient_id, Notification.created_at)
Index("ix_notifications_recipient_status", Notification.recipient_id, Notification.status)
Index("ix_notifications_dedup", Notification.recipient_id, Notification.dedup_key)
