from __future__ import annotations

from fastapi import APIRouter

from app.api.routes import (
    analytics,
    announcements,
    applications,
    assets,
    attestations,
    audit,
    capabilities,
    dashboard,
    health,
    identity,
    planner,
    platforms,
    workforce,
)

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(health.router)
api_router.include_router(identity.router)
api_router.include_router(dashboard.router)
api_router.include_router(announcements.router)
api_router.include_router(workforce.router)
api_router.include_router(applications.router)
api_router.include_router(platforms.router)
api_router.include_router(capabilities.router)
api_router.include_router(assets.router)
api_router.include_router(attestations.router)
api_router.include_router(planner.router)
api_router.include_router(analytics.router)
api_router.include_router(audit.router)
