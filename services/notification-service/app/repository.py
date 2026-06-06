from datetime import datetime, timezone
from sqlalchemy import select, update, func, and_
from sqlalchemy.orm import Session

from .models import Notification

STATUS_UNREAD = 1
STATUS_READ = 2

def create_notification(
    db: Session,
    *,
    recipient_id: str,
    type_: str,
    title: str,
    body: str,
    payload_json: str,
    priority: int,
    dedup_key: str | None,
) -> Notification:
    # Dedup (optional): if dedup_key exists, avoid duplicates per recipient_id
    if dedup_key:
        stmt = select(Notification).where(
            and_(Notification.recipient_id == recipient_id, Notification.dedup_key == dedup_key)
        )
        existing = db.execute(stmt).scalars().first()
        if existing:
            return existing

    n = Notification(
        recipient_id=recipient_id,
        type=type_,
        title=title,
        body=body,
        payload_json=payload_json or "{}",
        priority=priority or 2,
        status=STATUS_UNREAD,
        dedup_key=dedup_key if dedup_key else None,
    )
    db.add(n)
    db.commit()
    db.refresh(n)
    return n

def list_notifications(
    db: Session,
    *,
    recipient_id: str,
    status: int | None,
    page_size: int,
    page_token: str | None,
):
    page_size = max(1, min(page_size or 20, 100))

    stmt = select(Notification).where(Notification.recipient_id == recipient_id)

    if status in (STATUS_UNREAD, STATUS_READ):
        stmt = stmt.where(Notification.status == status)

    # page_token is ISO datetime, return older than token (cursor paging)
    if page_token:
        try:
            dt = datetime.fromisoformat(page_token)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            stmt = stmt.where(Notification.created_at < dt)
        except ValueError:
            pass

    stmt = stmt.order_by(Notification.created_at.desc()).limit(page_size + 1)

    rows = db.execute(stmt).scalars().all()
    next_token = None
    if len(rows) > page_size:
        last = rows[page_size - 1]
        next_token = last.created_at.isoformat()
        rows = rows[:page_size]

    return rows, next_token

def mark_as_read(db: Session, *, notification_id):
    n = db.get(Notification, notification_id)
    if not n:
        return None

    if n.status != STATUS_READ:
        n.status = STATUS_READ
        n.read_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(n)
    return n

def mark_all_as_read(db: Session, *, recipient_id: str) -> int:
    now = datetime.now(timezone.utc)
    stmt = (
        update(Notification)
        .where(and_(Notification.recipient_id == recipient_id, Notification.status == STATUS_UNREAD))
        .values(status=STATUS_READ, read_at=now)
    )
    res = db.execute(stmt)
    db.commit()
    return int(res.rowcount or 0)

def unread_count(db: Session, *, recipient_id: str) -> int:
    stmt = select(func.count()).select_from(Notification).where(
        and_(Notification.recipient_id == recipient_id, Notification.status == STATUS_UNREAD)
    )
    return int(db.execute(stmt).scalar_one())
from sqlalchemy import select, and_

def create_notifications_bulk(db: Session, items: list[dict]) -> list[Notification]:
    created: list[Notification] = []

    for it in items:
        recipient_id = it["recipient_id"]
        dedup_key = it.get("dedup_key")

        if dedup_key:
            stmt = select(Notification).where(
                and_(Notification.recipient_id == recipient_id, Notification.dedup_key == dedup_key)
            )
            existing = db.execute(stmt).scalars().first()
            if existing:
                created.append(existing)
                continue

        n = Notification(
            recipient_id=recipient_id,
            type=it["type_"],
            title=it["title"],
            body=it["body"],
            payload_json=it.get("payload_json") or "{}",
            priority=it.get("priority") or 2,
            status=STATUS_UNREAD,
            dedup_key=dedup_key if dedup_key else None,
        )
        db.add(n)
        created.append(n)

    db.commit()
    for n in created:
        db.refresh(n)
    return created

