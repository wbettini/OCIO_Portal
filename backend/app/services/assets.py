"""Assets domain service."""
from __future__ import annotations

import datetime as dt

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import PersonaProfile
from app.models.entities import Asset
from app.schemas.common import Page
from app.schemas.domain import AssetCreate, AssetRead, AssetUpdate
from app.services.common import bump_version, paginate, record_audit, require_role, to_page


def list_assets(
    db: Session,
    *,
    search: str | None,
    lifecycle_state: str | None,
    risk_level: str | None,
    horizon_180: bool,
    page: int,
    page_size: int,
) -> Page[AssetRead]:
    stmt = select(Asset)
    if search:
        like = f"%{search.lower()}%"
        stmt = stmt.where(Asset.name.ilike(like))
    if lifecycle_state:
        stmt = stmt.where(Asset.lifecycle_state == lifecycle_state)
    if risk_level:
        stmt = stmt.where(Asset.risk_level == risk_level)
    if horizon_180:
        cutoff = dt.date.today() + dt.timedelta(days=180)
        stmt = stmt.where(Asset.eol_date.is_not(None)).where(Asset.eol_date <= cutoff)
    stmt = stmt.order_by(Asset.eol_date.is_(None), Asset.eol_date, Asset.name)

    rows, total = paginate(db, stmt, page, page_size)
    items = [AssetRead.model_validate(row) for row in rows]
    return to_page(items, total, page, page_size)


def get_asset(db: Session, asset_id: int) -> Asset:
    asset = db.get(Asset, asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail=f"Asset {asset_id} not found")
    return asset


def create_asset(db: Session, payload: AssetCreate, user: PersonaProfile) -> AssetRead:
    require_role(user, "steward", "admin")
    entity = Asset(**payload.model_dump(), created_by=user.persona_key, updated_by=user.persona_key)
    db.add(entity)
    db.flush()
    record_audit(
        db,
        entity_type="Asset",
        entity_id=entity.id,
        action="create",
        actor_persona_key=user.persona_key,
        summary=f"Created asset {entity.name}",
    )
    db.commit()
    db.refresh(entity)
    return AssetRead.model_validate(entity)


def update_asset(db: Session, asset_id: int, payload: AssetUpdate, user: PersonaProfile) -> AssetRead:
    require_role(user, "steward", "admin")
    entity = get_asset(db, asset_id)
    bump_version(entity, payload.version)
    for field, value in payload.model_dump(exclude={"version"}).items():
        setattr(entity, field, value)
    entity.updated_by = user.persona_key
    record_audit(
        db,
        entity_type="Asset",
        entity_id=entity.id,
        action="update",
        actor_persona_key=user.persona_key,
        summary=f"Updated asset {entity.name}",
    )
    db.commit()
    db.refresh(entity)
    return AssetRead.model_validate(entity)
