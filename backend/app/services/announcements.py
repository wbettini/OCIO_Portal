"""Announcements domain service."""
from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import PersonaProfile
from app.models.entities import Announcement
from app.schemas.common import Page
from app.schemas.domain import AnnouncementCreate, AnnouncementRead, AnnouncementUpdate
from app.services.common import bump_version, paginate, record_audit, require_role, to_page


def list_announcements(
    db: Session, *, status: str | None, page: int, page_size: int
) -> Page[AnnouncementRead]:
    stmt = select(Announcement)
    if status:
        stmt = stmt.where(Announcement.status == status)
    stmt = stmt.order_by(Announcement.featured.desc(), Announcement.created_at.desc())

    rows, total = paginate(db, stmt, page, page_size)
    items = [AnnouncementRead.model_validate(row) for row in rows]
    return to_page(items, total, page, page_size)


def get_announcement(db: Session, announcement_id: int) -> Announcement:
    entity = db.get(Announcement, announcement_id)
    if entity is None:
        raise HTTPException(status_code=404, detail=f"Announcement {announcement_id} not found")
    return entity


def create_announcement(
    db: Session, payload: AnnouncementCreate, user: PersonaProfile
) -> AnnouncementRead:
    require_role(user, "publisher", "admin")
    entity = Announcement(
        **payload.model_dump(),
        author_persona_key=user.persona_key,
        created_by=user.persona_key,
        updated_by=user.persona_key,
    )
    db.add(entity)
    db.flush()
    record_audit(
        db,
        entity_type="Announcement",
        entity_id=entity.id,
        action="create",
        actor_persona_key=user.persona_key,
        summary=f"Created announcement {entity.title}",
    )
    db.commit()
    db.refresh(entity)
    return AnnouncementRead.model_validate(entity)


def update_announcement(
    db: Session, announcement_id: int, payload: AnnouncementUpdate, user: PersonaProfile
) -> AnnouncementRead:
    require_role(user, "publisher", "admin")
    entity = get_announcement(db, announcement_id)
    bump_version(entity, payload.version)
    for field, value in payload.model_dump(exclude={"version"}).items():
        setattr(entity, field, value)
    entity.updated_by = user.persona_key
    record_audit(
        db,
        entity_type="Announcement",
        entity_id=entity.id,
        action="update",
        actor_persona_key=user.persona_key,
        summary=f"Updated announcement {entity.title}",
    )
    db.commit()
    db.refresh(entity)
    return AnnouncementRead.model_validate(entity)
