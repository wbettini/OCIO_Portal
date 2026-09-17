"""Attestation framework service: definitions, campaigns, assignments,
draft/submit/review workflow."""
from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import PersonaProfile
from app.models.entities import (
    AttestationAssignment,
    AttestationCampaign,
    AttestationDefinition,
    AttestationResponse,
)
from app.schemas.common import Page
from app.schemas.domain import (
    AttestationAssignmentRead,
    AttestationCampaignCreate,
    AttestationCampaignRead,
    AttestationCampaignUpdate,
    AttestationDefinitionRead,
    AttestationDetail,
    AttestationDraftRequest,
    AttestationResponseRead,
    AttestationReviewRequest,
    AttestationSubmitRequest,
)
from app.services.common import bump_version, paginate, record_audit, require_role, to_page, utcnow


def list_definitions(db: Session) -> list[AttestationDefinitionRead]:
    rows = db.scalars(select(AttestationDefinition).order_by(AttestationDefinition.name)).all()
    return [AttestationDefinitionRead.model_validate(row) for row in rows]


def get_definition(db: Session, definition_id: int) -> AttestationDefinition:
    definition = db.get(AttestationDefinition, definition_id)
    if definition is None:
        raise HTTPException(status_code=404, detail=f"Definition {definition_id} not found")
    return definition


def list_campaigns(db: Session) -> list[AttestationCampaignRead]:
    rows = db.scalars(select(AttestationCampaign).order_by(AttestationCampaign.name)).all()
    return [AttestationCampaignRead.model_validate(row) for row in rows]


def get_campaign(db: Session, campaign_id: int) -> AttestationCampaign:
    campaign = db.get(AttestationCampaign, campaign_id)
    if campaign is None:
        raise HTTPException(status_code=404, detail=f"Campaign {campaign_id} not found")
    return campaign


def create_campaign(
    db: Session, payload: AttestationCampaignCreate, user: PersonaProfile
) -> AttestationCampaignRead:
    require_role(user, "manager", "admin")
    get_definition(db, payload.definition_id)
    entity = AttestationCampaign(
        **payload.model_dump(), created_by=user.persona_key, updated_by=user.persona_key
    )
    db.add(entity)
    db.flush()
    record_audit(
        db,
        entity_type="AttestationCampaign",
        entity_id=entity.id,
        action="create",
        actor_persona_key=user.persona_key,
        summary=f"Created attestation campaign {entity.name}",
    )
    db.commit()
    db.refresh(entity)
    return AttestationCampaignRead.model_validate(entity)


def update_campaign(
    db: Session, campaign_id: int, payload: AttestationCampaignUpdate, user: PersonaProfile
) -> AttestationCampaignRead:
    require_role(user, "manager", "admin")
    entity = get_campaign(db, campaign_id)
    get_definition(db, payload.definition_id)
    bump_version(entity, payload.version)
    for field, value in payload.model_dump(exclude={"version"}).items():
        setattr(entity, field, value)
    entity.updated_by = user.persona_key
    record_audit(
        db,
        entity_type="AttestationCampaign",
        entity_id=entity.id,
        action="update",
        actor_persona_key=user.persona_key,
        summary=f"Updated attestation campaign {entity.name}",
    )
    db.commit()
    db.refresh(entity)
    return AttestationCampaignRead.model_validate(entity)


def delete_campaign(db: Session, campaign_id: int, user: PersonaProfile) -> AttestationCampaignRead:
    require_role(user, "manager", "admin")
    entity = get_campaign(db, campaign_id)
    existing_assignments = db.scalars(
        select(AttestationAssignment).where(AttestationAssignment.campaign_id == campaign_id)
    ).first()
    if existing_assignments is not None:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete a campaign that has attestation assignments",
        )
    record_audit(
        db,
        entity_type="AttestationCampaign",
        entity_id=entity.id,
        action="delete",
        actor_persona_key=user.persona_key,
        summary=f"Deleted attestation campaign {entity.name}",
    )
    db.delete(entity)
    db.commit()
    return AttestationCampaignRead.model_validate(entity)


def list_assignments(
    db: Session,
    *,
    campaign_id: int | None,
    assignee_persona_key: str | None,
    status: str | None,
    page: int,
    page_size: int,
) -> Page[AttestationAssignmentRead]:
    stmt = select(AttestationAssignment)
    if campaign_id:
        stmt = stmt.where(AttestationAssignment.campaign_id == campaign_id)
    if assignee_persona_key:
        stmt = stmt.where(AttestationAssignment.assignee_persona_key == assignee_persona_key)
    if status:
        stmt = stmt.where(AttestationAssignment.status == status)
    stmt = stmt.order_by(AttestationAssignment.id)

    rows, total = paginate(db, stmt, page, page_size)
    items = [AttestationAssignmentRead.model_validate(row) for row in rows]
    return to_page(items, total, page, page_size)


def _get_assignment(db: Session, assignment_id: int) -> AttestationAssignment:
    assignment = db.get(AttestationAssignment, assignment_id)
    if assignment is None:
        raise HTTPException(status_code=404, detail=f"Assignment {assignment_id} not found")
    return assignment


def _detail(db: Session, assignment: AttestationAssignment) -> AttestationDetail:
    campaign = get_campaign(db, assignment.campaign_id)
    definition = get_definition(db, campaign.definition_id)
    responses = db.scalars(
        select(AttestationResponse).where(AttestationResponse.assignment_id == assignment.id)
    ).all()
    return AttestationDetail(
        assignment=AttestationAssignmentRead.model_validate(assignment),
        definition=AttestationDefinitionRead.model_validate(definition),
        responses=[AttestationResponseRead.model_validate(r) for r in responses],
    )


def get_assignment_detail(db: Session, assignment_id: int) -> AttestationDetail:
    assignment = _get_assignment(db, assignment_id)
    return _detail(db, assignment)


def _upsert_answers(db: Session, assignment: AttestationAssignment, answers) -> None:
    existing = {
        r.question_id: r
        for r in db.scalars(
            select(AttestationResponse).where(AttestationResponse.assignment_id == assignment.id)
        ).all()
    }
    for answer in answers:
        response = existing.get(answer.question_id)
        if response is None:
            response = AttestationResponse(
                assignment_id=assignment.id, question_id=answer.question_id
            )
            db.add(response)
        response.answer_text = answer.answer_text
        response.answer_boolean = answer.answer_boolean
        response.answer_numeric = answer.answer_numeric
        response.answer_date = answer.answer_date
        response.answer_choice = answer.answer_choice


def save_draft(
    db: Session, assignment_id: int, payload: AttestationDraftRequest, user: PersonaProfile
) -> AttestationDetail:
    assignment = _get_assignment(db, assignment_id)
    if assignment.assignee_persona_key != user.persona_key:
        require_role(user, "admin")
    bump_version(assignment, payload.version)
    _upsert_answers(db, assignment, payload.answers)
    assignment.status = "Draft"
    assignment.updated_by = user.persona_key
    record_audit(
        db,
        entity_type="AttestationAssignment",
        entity_id=assignment.id,
        action="update",
        actor_persona_key=user.persona_key,
        summary="Saved attestation draft",
    )
    db.commit()
    db.refresh(assignment)
    return _detail(db, assignment)


def submit_assignment(
    db: Session, assignment_id: int, payload: AttestationSubmitRequest, user: PersonaProfile
) -> AttestationDetail:
    assignment = _get_assignment(db, assignment_id)
    if assignment.assignee_persona_key != user.persona_key:
        require_role(user, "admin")

    if not payload.acknowledgement:
        raise HTTPException(status_code=422, detail="Submission requires acknowledgement=true")

    bump_version(assignment, payload.version)
    _upsert_answers(db, assignment, payload.answers)

    campaign = get_campaign(db, assignment.campaign_id)
    definition = get_definition(db, campaign.definition_id)
    required_ids = {q.id for q in definition.questions if q.required}
    answered_ids = {
        r.question_id
        for r in db.scalars(
            select(AttestationResponse).where(AttestationResponse.assignment_id == assignment.id)
        ).all()
        if _has_answer(r)
    }
    missing = required_ids - answered_ids
    if missing:
        raise HTTPException(
            status_code=422,
            detail=f"Missing answers for required question(s): {sorted(missing)}",
        )

    assignment.status = "Submitted"
    assignment.acknowledgement = True
    assignment.submitted_at = utcnow()
    assignment.updated_by = user.persona_key
    record_audit(
        db,
        entity_type="AttestationAssignment",
        entity_id=assignment.id,
        action="submit",
        actor_persona_key=user.persona_key,
        summary="Submitted attestation",
    )
    db.commit()
    db.refresh(assignment)
    return _detail(db, assignment)


def review_assignment(
    db: Session, assignment_id: int, payload: AttestationReviewRequest, user: PersonaProfile
) -> AttestationDetail:
    require_role(user, "manager", "admin", "executive")
    assignment = _get_assignment(db, assignment_id)
    bump_version(assignment, payload.version)

    if assignment.status != "Submitted":
        raise HTTPException(
            status_code=422, detail="Only submitted assignments can be reviewed"
        )

    assignment.status = "Approved" if payload.approve else "Rejected"
    assignment.reviewed_at = utcnow()
    assignment.reviewer_persona_key = user.persona_key
    assignment.review_notes = payload.review_notes
    assignment.updated_by = user.persona_key
    record_audit(
        db,
        entity_type="AttestationAssignment",
        entity_id=assignment.id,
        action="approve" if payload.approve else "reject",
        actor_persona_key=user.persona_key,
        summary=f"{'Approved' if payload.approve else 'Rejected'} attestation",
    )
    db.commit()
    db.refresh(assignment)
    return _detail(db, assignment)


def _has_answer(response: AttestationResponse) -> bool:
    return any(
        value is not None
        for value in (
            response.answer_text,
            response.answer_boolean,
            response.answer_numeric,
            response.answer_date,
            response.answer_choice,
        )
    )
