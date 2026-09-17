"""Platforms domain service."""
from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import PersonaProfile
from app.models.entities import Platform
from app.schemas.common import Page
from app.schemas.domain import PlatformCreate, PlatformRead, PlatformUpdate
from app.services.common import bump_version, paginate, record_audit, require_role, to_page


def list_platforms(
    db: Session,
    *,
    search: str | None,
    platform_type: str | None,
    lifecycle_state: str | None,
    page: int,
    page_size: int,
) -> Page[PlatformRead]:
    stmt = select(Platform)
    if search:
        like = f"%{search.lower()}%"
        stmt = stmt.where(Platform.name.ilike(like))
    if platform_type:
        stmt = stmt.where(Platform.platform_type == platform_type)
    if lifecycle_state:
        stmt = stmt.where(Platform.lifecycle_state == lifecycle_state)
    stmt = stmt.order_by(Platform.name)

    rows, total = paginate(db, stmt, page, page_size)
    items = [PlatformRead.model_validate(row) for row in rows]
    return to_page(items, total, page, page_size)


def get_platform(db: Session, platform_id: int) -> Platform:
    platform = db.get(Platform, platform_id)
    if platform is None:
        raise HTTPException(status_code=404, detail=f"Platform {platform_id} not found")
    return platform


def create_platform(db: Session, payload: PlatformCreate, user: PersonaProfile) -> PlatformRead:
    require_role(user, "steward", "publisher", "admin")
    entity = Platform(
        **payload.model_dump(), created_by=user.persona_key, updated_by=user.persona_key
    )
    db.add(entity)
    db.flush()
    record_audit(
        db,
        entity_type="Platform",
        entity_id=entity.id,
        action="create",
        actor_persona_key=user.persona_key,
        summary=f"Created platform {entity.name}",
    )
    db.commit()
    db.refresh(entity)
    return PlatformRead.model_validate(entity)


def update_platform(
    db: Session, platform_id: int, payload: PlatformUpdate, user: PersonaProfile
) -> PlatformRead:
    require_role(user, "steward", "publisher", "admin")
    entity = get_platform(db, platform_id)
    bump_version(entity, payload.version)
    for field, value in payload.model_dump(exclude={"version"}).items():
        setattr(entity, field, value)
    entity.updated_by = user.persona_key
    record_audit(
        db,
        entity_type="Platform",
        entity_id=entity.id,
        action="update",
        actor_persona_key=user.persona_key,
        summary=f"Updated platform {entity.name}",
    )
    db.commit()
    db.refresh(entity)
    return PlatformRead.model_validate(entity)


def delete_platform(db: Session, platform_id: int, user: PersonaProfile) -> PlatformRead:
    require_role(user, "steward", "publisher", "admin")
    entity = get_platform(db, platform_id)
    record_audit(
        db,
        entity_type="Platform",
        entity_id=entity.id,
        action="delete",
        actor_persona_key=user.persona_key,
        summary=f"Deleted platform {entity.name}",
    )
    db.delete(entity)
    db.commit()
    return PlatformRead.model_validate(entity)
