"""Analytics service: configuration-driven report catalog, placeholder embed
info, and the locally computed asset lifecycle chart used on the Home page.
"""
from __future__ import annotations

import datetime as dt

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.powerbi import get_powerbi_adapter
from app.models.entities import Asset
from app.schemas.domain import (
    AnalyticsReportRead,
    EmbedInfoRead,
    LifecycleChartPoint,
    LifecycleChartRead,
)
from app.services.common import utcnow

REPORT_CATALOG: list[dict[str, str]] = [
    {
        "key": "workforce-headcount-trends",
        "title": "Workforce Headcount Trends",
        "summary": "Headcount by org unit and role family over time (demo data).",
        "group": "Workforce",
    },
    {
        "key": "workforce-capability-heatmap",
        "title": "Workforce Capability Heatmap",
        "summary": "Coverage of critical capabilities across the workforce.",
        "group": "Workforce",
    },
    {
        "key": "applications-portfolio-health",
        "title": "Applications Portfolio Health",
        "summary": "Application criticality vs. lifecycle state distribution.",
        "group": "Applications",
    },
    {
        "key": "applications-ownership-gaps",
        "title": "Application Ownership Gaps",
        "summary": "Applications missing an accountable owner.",
        "group": "Applications",
    },
    {
        "key": "platforms-strategic-mix",
        "title": "Platform Strategic Mix",
        "summary": "Strategic classification and support status across platforms.",
        "group": "Platforms",
    },
    {
        "key": "assets-eol-horizon",
        "title": "Asset End-of-Life Horizon",
        "summary": "Assets approaching end-of-life across 90/180/365 day horizons.",
        "group": "Assets",
    },
    {
        "key": "capabilities-coverage-scorecard",
        "title": "Capabilities Coverage Scorecard",
        "summary": "Coverage percentage against target for every capability.",
        "group": "Capabilities",
    },
]


def list_reports() -> list[AnalyticsReportRead]:
    now = utcnow()
    return [AnalyticsReportRead(last_refreshed=now, **entry) for entry in REPORT_CATALOG]


def get_report_embed(report_key: str) -> EmbedInfoRead:
    if not any(entry["key"] == report_key for entry in REPORT_CATALOG):
        raise HTTPException(status_code=404, detail=f"Report '{report_key}' not found")
    adapter = get_powerbi_adapter()
    info = adapter.get_embed_info(report_key)
    return EmbedInfoRead(
        provider=info.provider,
        embed_mode=info.embed_mode,
        embed_url=info.embed_url,
        token=info.token,
        expires_in_seconds=info.expires_in_seconds,
        access_state=info.access_state,
        message=info.message,
    )


def get_lifecycle_chart(db: Session) -> LifecycleChartRead:
    today = dt.date.today()
    buckets = {
        "Past EOL": 0,
        "0-90 days": 0,
        "91-180 days": 0,
        "181-365 days": 0,
        "365+ days": 0,
        "No EOL date": 0,
    }
    assets = db.scalars(select(Asset)).all()
    for asset in assets:
        if asset.eol_date is None:
            buckets["No EOL date"] += 1
            continue
        days = (asset.eol_date - today).days
        if days < 0:
            buckets["Past EOL"] += 1
        elif days <= 90:
            buckets["0-90 days"] += 1
        elif days <= 180:
            buckets["91-180 days"] += 1
        elif days <= 365:
            buckets["181-365 days"] += 1
        else:
            buckets["365+ days"] += 1

    return LifecycleChartRead(
        points=[LifecycleChartPoint(bucket=k, count=v) for k, v in buckets.items()]
    )
