from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.auth import PersonaProfile
from app.db.session import get_db
from app.schemas.domain import AnalyticsReportRead, EmbedInfoRead, LifecycleChartRead
from app.services import analytics as analytics_service

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/reports", response_model=list[AnalyticsReportRead])
def list_reports(user: PersonaProfile = Depends(get_current_user)) -> list[AnalyticsReportRead]:
    return analytics_service.list_reports()


@router.get("/reports/{report_key}/embed", response_model=EmbedInfoRead)
def get_report_embed(
    report_key: str, user: PersonaProfile = Depends(get_current_user)
) -> EmbedInfoRead:
    return analytics_service.get_report_embed(report_key)


@router.get("/charts/lifecycle", response_model=LifecycleChartRead)
def get_lifecycle_chart(
    db: Session = Depends(get_db), user: PersonaProfile = Depends(get_current_user)
) -> LifecycleChartRead:
    return analytics_service.get_lifecycle_chart(db)
