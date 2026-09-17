"""Workforce domain service: Person CRUD plus org reference lookups."""
from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import PersonaProfile
from app.models.entities import OrganizationUnit, Person, Team
from app.schemas.common import Page
from app.schemas.domain import (
    OrganizationUnitRead,
    PersonCreate,
    PersonRead,
    PersonUpdate,
    TeamRead,
)
from app.services.common import (
    bump_version,
    paginate,
    record_audit,
    require_role,
    to_page,
)


def list_people(
    db: Session,
    *,
    search: str | None,
    status: str | None,
    role_family: str | None,
    page: int,
    page_size: int,
) -> Page[PersonRead]:
    stmt = select(Person)
    if search:
        like = f"%{search.lower()}%"
        stmt = stmt.where(
            (Person.full_name.ilike(like))
            | (Person.email.ilike(like))
            | (Person.title.ilike(like))
        )
    if status:
        stmt = stmt.where(Person.status == status)
    if role_family:
        stmt = stmt.where(Person.role_family == role_family)
    stmt = stmt.order_by(Person.full_name)

    rows, total = paginate(db, stmt, page, page_size)
    items = [PersonRead.model_validate(row) for row in rows]
    return to_page(items, total, page, page_size)


def get_person(db: Session, person_id: int) -> Person:
    person = db.get(Person, person_id)
    if person is None:
        raise HTTPException(status_code=404, detail=f"Person {person_id} not found")
    return person


def create_person(db: Session, payload: PersonCreate, user: PersonaProfile) -> PersonRead:
    require_role(user, "manager", "admin")
    person = Person(**payload.model_dump(), created_by=user.persona_key, updated_by=user.persona_key)
    db.add(person)
    db.flush()
    record_audit(
        db,
        entity_type="Person",
        entity_id=person.id,
        action="create",
        actor_persona_key=user.persona_key,
        summary=f"Created person {person.full_name}",
    )
    db.commit()
    db.refresh(person)
    return PersonRead.model_validate(person)


def update_person(
    db: Session, person_id: int, payload: PersonUpdate, user: PersonaProfile
) -> PersonRead:
    require_role(user, "manager", "admin")
    person = get_person(db, person_id)
    bump_version(person, payload.version)
    data = payload.model_dump(exclude={"version"})
    for field, value in data.items():
        setattr(person, field, value)
    person.updated_by = user.persona_key
    record_audit(
        db,
        entity_type="Person",
        entity_id=person.id,
        action="update",
        actor_persona_key=user.persona_key,
        summary=f"Updated person {person.full_name}",
    )
    db.commit()
    db.refresh(person)
    return PersonRead.model_validate(person)


def delete_person(db: Session, person_id: int, user: PersonaProfile) -> PersonRead:
    require_role(user, "manager", "admin")
    person = get_person(db, person_id)
    record_audit(
        db,
        entity_type="Person",
        entity_id=person.id,
        action="delete",
        actor_persona_key=user.persona_key,
        summary=f"Deleted person {person.full_name}",
    )
    db.delete(person)
    db.commit()
    return PersonRead.model_validate(person)


def list_org_units(db: Session) -> list[OrganizationUnitRead]:
    rows = db.scalars(select(OrganizationUnit).order_by(OrganizationUnit.name)).all()
    return [OrganizationUnitRead.model_validate(row) for row in rows]


def list_teams(db: Session) -> list[TeamRead]:
    rows = db.scalars(select(Team).order_by(Team.name)).all()
    return [TeamRead.model_validate(row) for row in rows]
