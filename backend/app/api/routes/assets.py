from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.auth import PersonaProfile
from app.db.session import get_db
from app.schemas.common import Page
from app.schemas.domain import AssetCreate, AssetRead, AssetUpdate
from app.services import assets as assets_service

router = APIRouter(prefix="/assets", tags=["assets"])


@router.get("", response_model=Page[AssetRead])
def list_assets(
    search: str | None = None,
    lifecycle_state: str | None = None,
    risk_level: str | None = None,
    horizon_180: bool = False,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> Page[AssetRead]:
    return assets_service.list_assets(
        db,
        search=search,
        lifecycle_state=lifecycle_state,
        risk_level=risk_level,
        horizon_180=horizon_180,
        page=page,
        page_size=page_size,
    )


@router.get("/{asset_id}", response_model=AssetRead)
def get_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> AssetRead:
    return AssetRead.model_validate(assets_service.get_asset(db, asset_id))


@router.post("", response_model=AssetRead, status_code=201)
def create_asset(
    payload: AssetCreate,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> AssetRead:
    return assets_service.create_asset(db, payload, user)


@router.put("/{asset_id}", response_model=AssetRead)
def update_asset(
    asset_id: int,
    payload: AssetUpdate,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> AssetRead:
    return assets_service.update_asset(db, asset_id, payload, user)
