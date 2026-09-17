from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.auth import PersonaProfile
from app.db.session import get_db
from app.schemas.common import Page
from app.schemas.domain import PlatformCreate, PlatformRead, PlatformUpdate
from app.services import platforms as platforms_service

router = APIRouter(prefix="/platforms", tags=["platforms"])


@router.get("", response_model=Page[PlatformRead])
def list_platforms(
    search: str | None = None,
    platform_type: str | None = None,
    lifecycle_state: str | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> Page[PlatformRead]:
    return platforms_service.list_platforms(
        db,
        search=search,
        platform_type=platform_type,
        lifecycle_state=lifecycle_state,
        page=page,
        page_size=page_size,
    )


@router.get("/{platform_id}", response_model=PlatformRead)
def get_platform(
    platform_id: int,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> PlatformRead:
    return PlatformRead.model_validate(platforms_service.get_platform(db, platform_id))


@router.post("", response_model=PlatformRead, status_code=201)
def create_platform(
    payload: PlatformCreate,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> PlatformRead:
    return platforms_service.create_platform(db, payload, user)


@router.put("/{platform_id}", response_model=PlatformRead)
def update_platform(
    platform_id: int,
    payload: PlatformUpdate,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> PlatformRead:
    return platforms_service.update_platform(db, platform_id, payload, user)


@router.delete("/{platform_id}", response_model=PlatformRead)
def delete_platform(
    platform_id: int,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> PlatformRead:
    return platforms_service.delete_platform(db, platform_id, user)
