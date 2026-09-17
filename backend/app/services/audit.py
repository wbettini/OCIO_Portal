"""Audit trail service."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import AuditEvent
from app.schemas.common import Page
from app.schemas.domain import AuditEventRead
from app.services.common import paginate, to_page


def list_events(db: Session, *, page: int, page_size: int) -> Page[AuditEventRead]:
    stmt = select(AuditEvent).order_by(AuditEvent.created_at.desc())
    rows, total = paginate(db, stmt, page, page_size)
    items = [AuditEventRead.model_validate(row) for row in rows]
    return to_page(items, total, page, page_size)
