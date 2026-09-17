from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.auth import PersonaProfile
from app.db.session import get_db
from app.schemas.common import Page
from app.schemas.domain import AnnouncementCreate, AnnouncementRead, AnnouncementUpdate
from app.services import announcements as announcements_service

router = APIRouter(prefix="/announcements", tags=["announcements"])


@router.get("", response_model=Page[AnnouncementRead])
def list_announcements(
    status: str | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> Page[AnnouncementRead]:
    return announcements_service.list_announcements(
        db, status=status, page=page, page_size=page_size
    )


@router.get("/{announcement_id}", response_model=AnnouncementRead)
def get_announcement(
    announcement_id: int,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> AnnouncementRead:
    return AnnouncementRead.model_validate(
        announcements_service.get_announcement(db, announcement_id)
    )


@router.post("", response_model=AnnouncementRead, status_code=201)
def create_announcement(
    payload: AnnouncementCreate,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> AnnouncementRead:
    return announcements_service.create_announcement(db, payload, user)


@router.put("/{announcement_id}", response_model=AnnouncementRead)
def update_announcement(
    announcement_id: int,
    payload: AnnouncementUpdate,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> AnnouncementRead:
    return announcements_service.update_announcement(db, announcement_id, payload, user)
