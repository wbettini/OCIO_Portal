from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.auth import PersonaProfile
from app.db.session import get_db
from app.schemas.common import Page
from app.schemas.domain import (
    OrganizationUnitRead,
    PersonCreate,
    PersonRead,
    PersonUpdate,
    TeamRead,
)
from app.services import workforce as workforce_service

router = APIRouter(prefix="/workforce", tags=["workforce"])


@router.get("", response_model=Page[PersonRead])
def list_people(
    search: str | None = None,
    status: str | None = None,
    role_family: str | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> Page[PersonRead]:
    return workforce_service.list_people(
        db, search=search, status=status, role_family=role_family, page=page, page_size=page_size
    )


@router.get("/org-units", response_model=list[OrganizationUnitRead])
def list_org_units(
    db: Session = Depends(get_db), user: PersonaProfile = Depends(get_current_user)
) -> list[OrganizationUnitRead]:
    return workforce_service.list_org_units(db)


@router.get("/teams", response_model=list[TeamRead])
def list_teams(
    db: Session = Depends(get_db), user: PersonaProfile = Depends(get_current_user)
) -> list[TeamRead]:
    return workforce_service.list_teams(db)


@router.get("/{person_id}", response_model=PersonRead)
def get_person(
    person_id: int,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> PersonRead:
    return PersonRead.model_validate(workforce_service.get_person(db, person_id))


@router.post("", response_model=PersonRead, status_code=201)
def create_person(
    payload: PersonCreate,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> PersonRead:
    return workforce_service.create_person(db, payload, user)


@router.put("/{person_id}", response_model=PersonRead)
def update_person(
    person_id: int,
    payload: PersonUpdate,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> PersonRead:
    return workforce_service.update_person(db, person_id, payload, user)


@router.delete("/{person_id}", response_model=PersonRead)
def delete_person(
    person_id: int,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> PersonRead:
    return workforce_service.delete_person(db, person_id, user)
