from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.auth import PersonaProfile
from app.db.session import get_db
from app.schemas.common import Page
from app.schemas.domain import CapabilityCreate, CapabilityRead, CapabilityUpdate
from app.services import capabilities as capabilities_service

router = APIRouter(prefix="/capabilities", tags=["capabilities"])


@router.get("", response_model=Page[CapabilityRead])
def list_capabilities(
    search: str | None = None,
    category: str | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> Page[CapabilityRead]:
    return capabilities_service.list_capabilities(
        db, search=search, category=category, page=page, page_size=page_size
    )


@router.get("/{capability_id}", response_model=CapabilityRead)
def get_capability(
    capability_id: int,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> CapabilityRead:
    return capabilities_service.get_capability_read(db, capability_id)


@router.post("", response_model=CapabilityRead, status_code=201)
def create_capability(
    payload: CapabilityCreate,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> CapabilityRead:
    return capabilities_service.create_capability(db, payload, user)


@router.put("/{capability_id}", response_model=CapabilityRead)
def update_capability(
    capability_id: int,
    payload: CapabilityUpdate,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> CapabilityRead:
    return capabilities_service.update_capability(db, capability_id, payload, user)
