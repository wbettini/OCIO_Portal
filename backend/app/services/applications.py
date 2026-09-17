"""Applications domain service."""
from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import PersonaProfile
from app.models.entities import Application
from app.schemas.common import Page
from app.schemas.domain import ApplicationCreate, ApplicationRead, ApplicationUpdate
from app.services.common import bump_version, paginate, record_audit, require_role, to_page


def list_applications(
    db: Session,
    *,
    search: str | None,
    criticality: str | None,
    lifecycle_state: str | None,
    page: int,
    page_size: int,
) -> Page[ApplicationRead]:
    stmt = select(Application)
    if search:
        like = f"%{search.lower()}%"
        stmt = stmt.where(Application.name.ilike(like))
    if criticality:
        stmt = stmt.where(Application.criticality == criticality)
    if lifecycle_state:
        stmt = stmt.where(Application.lifecycle_state == lifecycle_state)
    stmt = stmt.order_by(Application.name)

    rows, total = paginate(db, stmt, page, page_size)
    items = [ApplicationRead.model_validate(row) for row in rows]
    return to_page(items, total, page, page_size)


def get_application(db: Session, application_id: int) -> Application:
    app = db.get(Application, application_id)
    if app is None:
        raise HTTPException(status_code=404, detail=f"Application {application_id} not found")
    return app


def create_application(
    db: Session, payload: ApplicationCreate, user: PersonaProfile
) -> ApplicationRead:
    require_role(user, "steward", "publisher", "admin")
    entity = Application(
        **payload.model_dump(), created_by=user.persona_key, updated_by=user.persona_key
    )
    db.add(entity)
    db.flush()
    record_audit(
        db,
        entity_type="Application",
        entity_id=entity.id,
        action="create",
        actor_persona_key=user.persona_key,
        summary=f"Created application {entity.name}",
    )
    db.commit()
    db.refresh(entity)
    return ApplicationRead.model_validate(entity)


def update_application(
    db: Session, application_id: int, payload: ApplicationUpdate, user: PersonaProfile
) -> ApplicationRead:
    require_role(user, "steward", "publisher", "admin")
    entity = get_application(db, application_id)
    bump_version(entity, payload.version)
    for field, value in payload.model_dump(exclude={"version"}).items():
        setattr(entity, field, value)
    entity.updated_by = user.persona_key
    record_audit(
        db,
        entity_type="Application",
        entity_id=entity.id,
        action="update",
        actor_persona_key=user.persona_key,
        summary=f"Updated application {entity.name}",
    )
    db.commit()
    db.refresh(entity)
    return ApplicationRead.model_validate(entity)


def delete_application(
    db: Session, application_id: int, user: PersonaProfile
) -> ApplicationRead:
    require_role(user, "steward", "publisher", "admin")
    entity = get_application(db, application_id)
    record_audit(
        db,
        entity_type="Application",
        entity_id=entity.id,
        action="delete",
        actor_persona_key=user.persona_key,
        summary=f"Deleted application {entity.name}",
    )
    db.delete(entity)
    db.commit()
    return ApplicationRead.model_validate(entity)
