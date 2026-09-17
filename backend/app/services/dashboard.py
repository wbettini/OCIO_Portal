"""Home page dashboard summary service."""
from __future__ import annotations

import datetime as dt

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.entities import (
    Application,
    Asset,
    AttestationAssignment,
    Capability,
    Person,
    PersonCapability,
    Platform,
)
from app.schemas.domain import DashboardSummary


def get_summary(db: Session) -> DashboardSummary:
    total_workforce = db.scalar(select(func.count()).select_from(Person)) or 0
    applications_supported = db.scalar(select(func.count()).select_from(Application)) or 0
    platforms_managed = db.scalar(select(func.count()).select_from(Platform)) or 0

    cutoff = dt.date.today() + dt.timedelta(days=180)
    assets_approaching_eol = (
        db.scalar(
            select(func.count())
            .select_from(Asset)
            .where(Asset.eol_date.is_not(None))
            .where(Asset.eol_date <= cutoff)
        )
        or 0
    )

    open_attestations = (
        db.scalar(
            select(func.count())
            .select_from(AttestationAssignment)
            .where(AttestationAssignment.status.in_(["Draft", "Submitted"]))
        )
        or 0
    )

    total_capabilities = db.scalar(select(func.count()).select_from(Capability)) or 0
    if total_capabilities == 0 or total_workforce == 0:
        capability_coverage_percent = 0.0
    else:
        covered_pairs = db.scalar(select(func.count()).select_from(PersonCapability)) or 0
        max_possible = total_capabilities * total_workforce
        capability_coverage_percent = round((covered_pairs / max_possible) * 100, 2)

    return DashboardSummary(
        total_workforce=total_workforce,
        applications_supported=applications_supported,
        platforms_managed=platforms_managed,
        assets_approaching_eol_180d=assets_approaching_eol,
        open_attestations=open_attestations,
        capability_coverage_percent=capability_coverage_percent,
    )
