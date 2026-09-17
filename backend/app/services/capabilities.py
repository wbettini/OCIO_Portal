"""Capabilities domain service, including computed coverage."""
from __future__ import annotations

from types import SimpleNamespace

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.auth import PersonaProfile
from app.models.entities import Capability, Person, PersonCapability
from app.schemas.common import Page
from app.schemas.domain import CapabilityCreate, CapabilityRead, CapabilityUpdate
from app.services.common import bump_version, record_audit, require_role, to_page


def _current_coverage(db: Session, capability_id: int) -> float:
    """Percentage of active people who have this capability mapped to them."""
    total_people = db.scalar(select(func.count()).select_from(Person)) or 0
    if total_people == 0:
        return 0.0
    covered = db.scalar(
        select(func.count(func.distinct(PersonCapability.person_id))).where(
            PersonCapability.capability_id == capability_id
        )
    ) or 0
    return round((covered / total_people) * 100, 2)


def _to_read(db: Session, capability: Capability) -> CapabilityRead:
    merged = SimpleNamespace(
        id=capability.id,
        name=capability.name,
        category=capability.category,
        description=capability.description,
        target_coverage_percent=capability.target_coverage_percent,
        version=capability.version,
        created_at=capability.created_at,
        updated_at=capability.updated_at,
        current_coverage=_current_coverage(db, capability.id),
    )
    return CapabilityRead.model_validate(merged)


def list_capabilities(
    db: Session, *, search: str | None, category: str | None, page: int, page_size: int
) -> Page[CapabilityRead]:
    stmt = select(Capability)
    if search:
        like = f"%{search.lower()}%"
        stmt = stmt.where(Capability.name.ilike(like))
    if category:
        stmt = stmt.where(Capability.category == category)
    stmt = stmt.order_by(Capability.name)

    page = max(page, 1)
    page_size = max(min(page_size, 200), 1)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.limit(page_size).offset((page - 1) * page_size)).all()
    items = [_to_read(db, row) for row in rows]
    return to_page(items, total, page, page_size)


def get_capability(db: Session, capability_id: int) -> Capability:
    capability = db.get(Capability, capability_id)
    if capability is None:
        raise HTTPException(status_code=404, detail=f"Capability {capability_id} not found")
    return capability


def get_capability_read(db: Session, capability_id: int) -> CapabilityRead:
    return _to_read(db, get_capability(db, capability_id))


def create_capability(
    db: Session, payload: CapabilityCreate, user: PersonaProfile
) -> CapabilityRead:
    require_role(user, "steward", "admin")
    entity = Capability(
        **payload.model_dump(), created_by=user.persona_key, updated_by=user.persona_key
    )
    db.add(entity)
    db.flush()
    record_audit(
        db,
        entity_type="Capability",
        entity_id=entity.id,
        action="create",
        actor_persona_key=user.persona_key,
        summary=f"Created capability {entity.name}",
    )
    db.commit()
    db.refresh(entity)
    return _to_read(db, entity)


def update_capability(
    db: Session, capability_id: int, payload: CapabilityUpdate, user: PersonaProfile
) -> CapabilityRead:
    require_role(user, "steward", "admin")
    entity = get_capability(db, capability_id)
    bump_version(entity, payload.version)
    for field, value in payload.model_dump(exclude={"version"}).items():
        setattr(entity, field, value)
    entity.updated_by = user.persona_key
    record_audit(
        db,
        entity_type="Capability",
        entity_id=entity.id,
        action="update",
        actor_persona_key=user.persona_key,
        summary=f"Updated capability {entity.name}",
    )
    db.commit()
    db.refresh(entity)
    return _to_read(db, entity)
