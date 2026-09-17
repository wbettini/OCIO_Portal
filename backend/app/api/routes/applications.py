from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.auth import PersonaProfile
from app.db.session import get_db
from app.schemas.common import Page
from app.schemas.domain import ApplicationCreate, ApplicationRead, ApplicationUpdate
from app.services import applications as applications_service

router = APIRouter(prefix="/applications", tags=["applications"])


@router.get("", response_model=Page[ApplicationRead])
def list_applications(
    search: str | None = None,
    criticality: str | None = None,
    lifecycle_state: str | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> Page[ApplicationRead]:
    return applications_service.list_applications(
        db,
        search=search,
        criticality=criticality,
        lifecycle_state=lifecycle_state,
        page=page,
        page_size=page_size,
    )


@router.get("/{application_id}", response_model=ApplicationRead)
def get_application(
    application_id: int,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> ApplicationRead:
    return ApplicationRead.model_validate(
        applications_service.get_application(db, application_id)
    )


@router.post("", response_model=ApplicationRead, status_code=201)
def create_application(
    payload: ApplicationCreate,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> ApplicationRead:
    return applications_service.create_application(db, payload, user)


@router.put("/{application_id}", response_model=ApplicationRead)
def update_application(
    application_id: int,
    payload: ApplicationUpdate,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> ApplicationRead:
    return applications_service.update_application(db, application_id, payload, user)


@router.delete("/{application_id}", response_model=ApplicationRead)
def delete_application(
    application_id: int,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> ApplicationRead:
    return applications_service.delete_application(db, application_id, user)
