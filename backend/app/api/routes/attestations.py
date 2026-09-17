from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.auth import PersonaProfile
from app.db.session import get_db
from app.schemas.common import Page
from app.schemas.domain import (
    AttestationAssignmentRead,
    AttestationCampaignCreate,
    AttestationCampaignRead,
    AttestationCampaignUpdate,
    AttestationDefinitionRead,
    AttestationDetail,
    AttestationDraftRequest,
    AttestationReviewRequest,
    AttestationSubmitRequest,
)
from app.services import attestations as attestations_service

router = APIRouter(prefix="/attestations", tags=["attestations"])


@router.get("/definitions", response_model=list[AttestationDefinitionRead])
def list_definitions(
    db: Session = Depends(get_db), user: PersonaProfile = Depends(get_current_user)
) -> list[AttestationDefinitionRead]:
    return attestations_service.list_definitions(db)


@router.get("/campaigns", response_model=list[AttestationCampaignRead])
def list_campaigns(
    db: Session = Depends(get_db), user: PersonaProfile = Depends(get_current_user)
) -> list[AttestationCampaignRead]:
    return attestations_service.list_campaigns(db)


@router.get("/campaigns/{campaign_id}", response_model=AttestationCampaignRead)
def get_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> AttestationCampaignRead:
    return AttestationCampaignRead.model_validate(attestations_service.get_campaign(db, campaign_id))


@router.post("/campaigns", response_model=AttestationCampaignRead, status_code=201)
def create_campaign(
    payload: AttestationCampaignCreate,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> AttestationCampaignRead:
    return attestations_service.create_campaign(db, payload, user)


@router.put("/campaigns/{campaign_id}", response_model=AttestationCampaignRead)
def update_campaign(
    campaign_id: int,
    payload: AttestationCampaignUpdate,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> AttestationCampaignRead:
    return attestations_service.update_campaign(db, campaign_id, payload, user)


@router.delete("/campaigns/{campaign_id}", response_model=AttestationCampaignRead)
def delete_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> AttestationCampaignRead:
    return attestations_service.delete_campaign(db, campaign_id, user)


@router.get("/assignments", response_model=Page[AttestationAssignmentRead])
def list_assignments(
    campaign_id: int | None = None,
    assignee_persona_key: str | None = None,
    status: str | None = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> Page[AttestationAssignmentRead]:
    return attestations_service.list_assignments(
        db,
        campaign_id=campaign_id,
        assignee_persona_key=assignee_persona_key,
        status=status,
        page=page,
        page_size=page_size,
    )


@router.get("/assignments/{assignment_id}", response_model=AttestationDetail)
def get_assignment(
    assignment_id: int,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> AttestationDetail:
    return attestations_service.get_assignment_detail(db, assignment_id)


@router.post("/assignments/{assignment_id}/draft", response_model=AttestationDetail)
def save_draft(
    assignment_id: int,
    payload: AttestationDraftRequest,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> AttestationDetail:
    return attestations_service.save_draft(db, assignment_id, payload, user)


@router.post("/assignments/{assignment_id}/submit", response_model=AttestationDetail)
def submit_assignment(
    assignment_id: int,
    payload: AttestationSubmitRequest,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> AttestationDetail:
    return attestations_service.submit_assignment(db, assignment_id, payload, user)


@router.post("/assignments/{assignment_id}/review", response_model=AttestationDetail)
def review_assignment(
    assignment_id: int,
    payload: AttestationReviewRequest,
    db: Session = Depends(get_db),
    user: PersonaProfile = Depends(get_current_user),
) -> AttestationDetail:
    return attestations_service.review_assignment(db, assignment_id, payload, user)
