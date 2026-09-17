from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.auth import PersonaProfile
from app.db.session import get_db
from app.schemas.domain import DashboardSummary
from app.services import dashboard as dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def get_summary(
    db: Session = Depends(get_db), user: PersonaProfile = Depends(get_current_user)
) -> DashboardSummary:
    return dashboard_service.get_summary(db)
