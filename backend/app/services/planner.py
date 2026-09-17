"""Resource planner service: workforce-centric, application-centric and
coverage-centric views plus assignment mutations."""
from __future__ import annotations

import datetime as dt

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.auth import PersonaProfile
from app.models.entities import (
    Application,
    ApplicationCapabilityRequirement,
    ApplicationPlatformRelationship,
    Person,
    PersonApplicationAssignment,
    PersonCapability,
    PersonPlatformAssignment,
    Platform,
)
from app.schemas.domain import (
    ApplicationCapabilityRequirementRead,
    ApplicationPlannerView,
    ApplicationPlatformRelationshipRead,
    ApplicationRead,
    CoverageAlert,
    CoveragePlannerView,
    PersonApplicationAssignmentRead,
    PersonCapabilityRead,
    PersonPlatformAssignmentRead,
    PersonRead,
    PlannerAssignRequest,
    WorkforcePlannerView,
)
from app.services.common import record_audit, require_role


def get_workforce_view(db: Session, person_id: int) -> WorkforcePlannerView:
    person = db.get(Person, person_id)
    if person is None:
        raise HTTPException(status_code=404, detail=f"Person {person_id} not found")

    applications = db.scalars(
        select(PersonApplicationAssignment).where(
            PersonApplicationAssignment.person_id == person_id
        )
    ).all()
    platforms = db.scalars(
        select(PersonPlatformAssignment).where(PersonPlatformAssignment.person_id == person_id)
    ).all()
    capabilities = db.scalars(
        select(PersonCapability).where(PersonCapability.person_id == person_id)
    ).all()

    return WorkforcePlannerView(
        person=PersonRead.model_validate(person),
        applications=[PersonApplicationAssignmentRead.model_validate(a) for a in applications],
        platforms=[PersonPlatformAssignmentRead.model_validate(p) for p in platforms],
        capabilities=[PersonCapabilityRead.model_validate(c) for c in capabilities],
    )


def get_application_view(db: Session, application_id: int) -> ApplicationPlannerView:
    application = db.get(Application, application_id)
    if application is None:
        raise HTTPException(status_code=404, detail=f"Application {application_id} not found")

    people = db.scalars(
        select(PersonApplicationAssignment).where(
            PersonApplicationAssignment.application_id == application_id
        )
    ).all()
    platforms = db.scalars(
        select(ApplicationPlatformRelationship).where(
            ApplicationPlatformRelationship.application_id == application_id
        )
    ).all()
    capabilities = db.scalars(
        select(ApplicationCapabilityRequirement).where(
            ApplicationCapabilityRequirement.application_id == application_id
        )
    ).all()

    alerts: list[CoverageAlert] = []
    if application.owner_person_id is None:
        alerts.append(
            CoverageAlert(
                severity="critical",
                category="ownership",
                message=f"Application '{application.name}' has no designated owner.",
                entity_type="Application",
                entity_id=application.id,
            )
        )
    if not capabilities:
        alerts.append(
            CoverageAlert(
                severity="warning",
                category="capability",
                message=f"Application '{application.name}' has no required capabilities traced.",
                entity_type="Application",
                entity_id=application.id,
            )
        )

    return ApplicationPlannerView(
        application=ApplicationRead.model_validate(application),
        people=[PersonApplicationAssignmentRead.model_validate(p) for p in people],
        platforms=[ApplicationPlatformRelationshipRead.model_validate(p) for p in platforms],
        capabilities=[
            ApplicationCapabilityRequirementRead.model_validate(c) for c in capabilities
        ],
        alerts=alerts,
    )


def get_coverage_view(db: Session) -> CoveragePlannerView:
    alerts: list[CoverageAlert] = []
    today = dt.date.today()

    unowned_apps = db.scalars(
        select(Application).where(Application.owner_person_id.is_(None))
    ).all()
    for app in unowned_apps:
        alerts.append(
            CoverageAlert(
                severity="critical",
                category="ownership",
                message=f"Application '{app.name}' is missing an owner.",
                entity_type="Application",
                entity_id=app.id,
            )
        )

    platforms = db.scalars(select(Platform)).all()
    platforms_with_requirements = set(
        db.scalars(select(ApplicationPlatformRelationship.platform_id)).all()
    )
    for platform in platforms:
        if platform.id not in platforms_with_requirements:
            alerts.append(
                CoverageAlert(
                    severity="warning",
                    category="capability",
                    message=f"Platform '{platform.name}' has no traced capability requirements.",
                    entity_type="Platform",
                    entity_id=platform.id,
                )
            )

    expired = db.scalars(
        select(PersonApplicationAssignment).where(
            PersonApplicationAssignment.effective_end.is_not(None),
            PersonApplicationAssignment.effective_end < today,
        )
    ).all()
    for assignment in expired:
        alerts.append(
            CoverageAlert(
                severity="info",
                category="expired-assignment",
                message=(
                    f"Assignment #{assignment.id} for application "
                    f"{assignment.application_id} expired on {assignment.effective_end}."
                ),
                entity_type="PersonApplicationAssignment",
                entity_id=assignment.id,
            )
        )

    return CoveragePlannerView(alerts=alerts)


def assign(
    db: Session, person_id: int, payload: PlannerAssignRequest, user: PersonaProfile
) -> PersonApplicationAssignmentRead | PersonPlatformAssignmentRead:
    require_role(user, "manager", "steward", "admin")

    if db.get(Person, person_id) is None:
        raise HTTPException(status_code=404, detail=f"Person {person_id} not found")

    if payload.target_type == "application":
        if db.get(Application, payload.target_id) is None:
            raise HTTPException(
                status_code=404, detail=f"Application {payload.target_id} not found"
            )
        entity = PersonApplicationAssignment(
            person_id=person_id,
            application_id=payload.target_id,
            role=payload.role,
            allocation_percent=payload.allocation_percent,
            effective_start=payload.effective_start,
            effective_end=payload.effective_end,
            created_by=user.persona_key,
            updated_by=user.persona_key,
        )
        db.add(entity)
        db.flush()
        record_audit(
            db,
            entity_type="PersonApplicationAssignment",
            entity_id=entity.id,
            action="assign",
            actor_persona_key=user.persona_key,
            summary=f"Assigned person {person_id} to application {payload.target_id}",
        )
        db.commit()
        db.refresh(entity)
        return PersonApplicationAssignmentRead.model_validate(entity)

    if payload.target_type == "platform":
        if db.get(Platform, payload.target_id) is None:
            raise HTTPException(status_code=404, detail=f"Platform {payload.target_id} not found")
        entity = PersonPlatformAssignment(
            person_id=person_id,
            platform_id=payload.target_id,
            role=payload.role,
            allocation_percent=payload.allocation_percent,
            effective_start=payload.effective_start,
            effective_end=payload.effective_end,
            created_by=user.persona_key,
            updated_by=user.persona_key,
        )
        db.add(entity)
        db.flush()
        record_audit(
            db,
            entity_type="PersonPlatformAssignment",
            entity_id=entity.id,
            action="assign",
            actor_persona_key=user.persona_key,
            summary=f"Assigned person {person_id} to platform {payload.target_id}",
        )
        db.commit()
        db.refresh(entity)
        return PersonPlatformAssignmentRead.model_validate(entity)

    raise HTTPException(status_code=422, detail="target_type must be 'application' or 'platform'")


def unassign(
    db: Session, person_id: int, target_type: str, assignment_id: int, user: PersonaProfile
) -> None:
    require_role(user, "manager", "steward", "admin")

    model = PersonApplicationAssignment if target_type == "application" else PersonPlatformAssignment
    if target_type not in ("application", "platform"):
        raise HTTPException(status_code=422, detail="target_type must be 'application' or 'platform'")

    entity = db.get(model, assignment_id)
    if entity is None or entity.person_id != person_id:
        raise HTTPException(status_code=404, detail=f"Assignment {assignment_id} not found")

    db.delete(entity)
    record_audit(
        db,
        entity_type=model.__name__,
        entity_id=assignment_id,
        action="unassign",
        actor_persona_key=user.persona_key,
        summary=f"Removed assignment {assignment_id} for person {person_id}",
    )
    db.commit()
