from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.auth import PersonaProfile
from app.db.session import get_db
from app.schemas.domain import (
    ApplicationPlannerView,
    CoveragePlannerView,
    PersonApplicationAssignmentRead,
    PersonPlatformAssignmentRead,
    PlannerAssignRequest,
    WorkforcePlannerView,
)
from app.services import planner as planner_service

router = APIRouter(prefix="/planner", tags=["planner"])


@router.get("/workforce/{person_id}", response_model=WorkforcePlannerView)
def get_workforce_view(
    person_id: int,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> WorkforcePlannerView:
    return planner_service.get_workforce_view(db, person_id)


@router.get("/applications/{application_id}", response_model=ApplicationPlannerView)
def get_application_view(
    application_id: int,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> ApplicationPlannerView:
    return planner_service.get_application_view(db, application_id)


@router.get("/coverage", response_model=CoveragePlannerView)
def get_coverage_view(
    db: Session = Depends(get_db), user: PersonaProfile = Depends(get_current_user)
) -> CoveragePlannerView:
    return planner_service.get_coverage_view(db)


@router.post(
    "/workforce/{person_id}/assign",
    response_model=PersonApplicationAssignmentRead | PersonPlatformAssignmentRead,
)
def assign(
    person_id: int,
    payload: PlannerAssignRequest,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> PersonApplicationAssignmentRead | PersonPlatformAssignmentRead:
    return planner_service.assign(db, person_id, payload, user)


@router.delete(
    "/workforce/{person_id}/assign/{target_type}/{assignment_id}",
    status_code=204,
    response_model=None,
)
def unassign(
    person_id: int,
    target_type: str,
    assignment_id: int,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> None:
    planner_service.unassign(db, person_id, target_type, assignment_id, user)
