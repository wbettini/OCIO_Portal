"""All ORM entities for the OCIO Portal domain model.

Kept in a single module intentionally so the full shape of the domain is
easy to scan. SQLAlchemy models here are designed to be portable to SQL
Server / Azure SQL: integer surrogate PKs, NUMERIC(precision, scale) for
decimals, and timezone-aware DateTime columns.
"""
from __future__ import annotations

import datetime as dt

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import AuditUserMixin, TimestampMixin, VersionedMixin


class UserProfile(Base, TimestampMixin):
    """A seeded demo login identity (persona)."""

    __tablename__ = "user_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    persona_key: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(128), nullable=False)
    title: Mapped[str] = mapped_column(String(128), nullable=False)
    email: Mapped[str] = mapped_column(String(256), nullable=False)
    roles_csv: Mapped[str] = mapped_column(String(256), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    @property
    def roles(self) -> list[str]:
        return [r.strip() for r in self.roles_csv.split(",") if r.strip()]


class OrganizationUnit(Base, TimestampMixin, AuditUserMixin, VersionedMixin):
    __tablename__ = "organization_units"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("organization_units.id"), nullable=True
    )

    teams: Mapped[list[Team]] = relationship(back_populates="org_unit")


class Team(Base, TimestampMixin, AuditUserMixin, VersionedMixin):
    __tablename__ = "teams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    org_unit_id: Mapped[int] = mapped_column(ForeignKey("organization_units.id"), nullable=False)

    org_unit: Mapped[OrganizationUnit] = relationship(back_populates="teams")


class Person(Base, TimestampMixin, AuditUserMixin, VersionedMixin):
    __tablename__ = "people"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    email: Mapped[str] = mapped_column(String(256), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="Active", nullable=False)
    role_family: Mapped[str] = mapped_column(String(64), nullable=False)
    hire_date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    org_unit_id: Mapped[int | None] = mapped_column(
        ForeignKey("organization_units.id"), nullable=True
    )
    team_id: Mapped[int | None] = mapped_column(ForeignKey("teams.id"), nullable=True)


class Application(Base, TimestampMixin, AuditUserMixin, VersionedMixin):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    criticality: Mapped[str] = mapped_column(String(32), default="Medium", nullable=False)
    lifecycle_state: Mapped[str] = mapped_column(String(32), default="Active", nullable=False)
    owner_person_id: Mapped[int | None] = mapped_column(ForeignKey("people.id"), nullable=True)


class Platform(Base, TimestampMixin, AuditUserMixin, VersionedMixin):
    __tablename__ = "platforms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    platform_type: Mapped[str] = mapped_column(String(64), nullable=False)
    owner_person_id: Mapped[int | None] = mapped_column(ForeignKey("people.id"), nullable=True)
    lifecycle_state: Mapped[str] = mapped_column(String(32), default="Active", nullable=False)
    support_status: Mapped[str] = mapped_column(String(32), default="Supported", nullable=False)
    strategic_classification: Mapped[str] = mapped_column(
        String(32), default="Strategic", nullable=False
    )


class Capability(Base, TimestampMixin, AuditUserMixin, VersionedMixin):
    __tablename__ = "capabilities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    target_coverage_percent: Mapped[float] = mapped_column(
        Numeric(5, 2), default=80, nullable=False
    )


class Asset(Base, TimestampMixin, AuditUserMixin, VersionedMixin):
    __tablename__ = "assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(160), unique=True, nullable=False)
    asset_type: Mapped[str] = mapped_column(String(64), nullable=False)
    lifecycle_state: Mapped[str] = mapped_column(String(32), default="Active", nullable=False)
    risk_level: Mapped[str] = mapped_column(String(32), default="Low", nullable=False)
    eol_date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    owner_person_id: Mapped[int | None] = mapped_column(ForeignKey("people.id"), nullable=True)


class Announcement(Base, TimestampMixin, AuditUserMixin, VersionedMixin):
    __tablename__ = "announcements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="Draft", nullable=False)
    priority: Mapped[str] = mapped_column(String(32), default="Normal", nullable=False)
    featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    effective_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    expires_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    author_persona_key: Mapped[str | None] = mapped_column(String(32), nullable=True)


class AttestationDefinition(Base, TimestampMixin, AuditUserMixin, VersionedMixin):
    __tablename__ = "attestation_definitions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(64), nullable=False)

    questions: Mapped[list[AttestationQuestion]] = relationship(
        back_populates="definition", order_by="AttestationQuestion.order_index"
    )


class AttestationQuestion(Base, TimestampMixin, AuditUserMixin, VersionedMixin):
    __tablename__ = "attestation_questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    definition_id: Mapped[int] = mapped_column(
        ForeignKey("attestation_definitions.id"), nullable=False
    )
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[str] = mapped_column(String(16), nullable=False)  # text|boolean|choice|date|numeric
    required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    options_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    definition: Mapped[AttestationDefinition] = relationship(back_populates="questions")


class AttestationCampaign(Base, TimestampMixin, AuditUserMixin, VersionedMixin):
    __tablename__ = "attestation_campaigns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    definition_id: Mapped[int] = mapped_column(
        ForeignKey("attestation_definitions.id"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    opens_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closes_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    definition: Mapped[AttestationDefinition] = relationship()


class AttestationAssignment(Base, TimestampMixin, AuditUserMixin, VersionedMixin):
    __tablename__ = "attestation_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    campaign_id: Mapped[int] = mapped_column(
        ForeignKey("attestation_campaigns.id"), nullable=False
    )
    assignee_persona_key: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="Draft", nullable=False)
    acknowledgement: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    submitted_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewer_persona_key: Mapped[str | None] = mapped_column(String(32), nullable=True)
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    campaign: Mapped[AttestationCampaign] = relationship()
    responses: Mapped[list[AttestationResponse]] = relationship(back_populates="assignment")


class AttestationResponse(Base, TimestampMixin, AuditUserMixin, VersionedMixin):
    __tablename__ = "attestation_responses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    assignment_id: Mapped[int] = mapped_column(
        ForeignKey("attestation_assignments.id"), nullable=False
    )
    question_id: Mapped[int] = mapped_column(
        ForeignKey("attestation_questions.id"), nullable=False
    )
    answer_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    answer_boolean: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    answer_numeric: Mapped[float | None] = mapped_column(Numeric(18, 4), nullable=True)
    answer_date: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    answer_choice: Mapped[str | None] = mapped_column(String(200), nullable=True)

    assignment: Mapped[AttestationAssignment] = relationship(back_populates="responses")
    question: Mapped[AttestationQuestion] = relationship()


class _AssociationMixin(TimestampMixin, AuditUserMixin, VersionedMixin):
    """Common fields shared by all many-to-many association objects."""

    role: Mapped[str | None] = mapped_column(String(64), nullable=True)
    allocation_percent: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)
    effective_start: Mapped[dt.date | None] = mapped_column(Date, nullable=True)
    effective_end: Mapped[dt.date | None] = mapped_column(Date, nullable=True)


class PersonTeamAssignment(Base, _AssociationMixin):
    __tablename__ = "person_team_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("people.id"), nullable=False)
    team_id: Mapped[int] = mapped_column(ForeignKey("teams.id"), nullable=False)


class PersonApplicationAssignment(Base, _AssociationMixin):
    __tablename__ = "person_application_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("people.id"), nullable=False)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id"), nullable=False)


class PersonPlatformAssignment(Base, _AssociationMixin):
    __tablename__ = "person_platform_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("people.id"), nullable=False)
    platform_id: Mapped[int] = mapped_column(ForeignKey("platforms.id"), nullable=False)


class PersonCapability(Base, _AssociationMixin):
    __tablename__ = "person_capabilities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    person_id: Mapped[int] = mapped_column(ForeignKey("people.id"), nullable=False)
    capability_id: Mapped[int] = mapped_column(ForeignKey("capabilities.id"), nullable=False)


class ApplicationPlatformRelationship(Base, _AssociationMixin):
    __tablename__ = "application_platform_relationships"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id"), nullable=False)
    platform_id: Mapped[int] = mapped_column(ForeignKey("platforms.id"), nullable=False)


class ApplicationCapabilityRequirement(Base, _AssociationMixin):
    __tablename__ = "application_capability_requirements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id"), nullable=False)
    capability_id: Mapped[int] = mapped_column(ForeignKey("capabilities.id"), nullable=False)


class AssetApplicationRelationship(Base, _AssociationMixin):
    __tablename__ = "asset_application_relationships"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    asset_id: Mapped[int] = mapped_column(ForeignKey("assets.id"), nullable=False)
    application_id: Mapped[int] = mapped_column(ForeignKey("applications.id"), nullable=False)


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity_type: Mapped[str] = mapped_column(String(64), nullable=False)
    entity_id: Mapped[int] = mapped_column(Integer, nullable=False)
    action: Mapped[str] = mapped_column(String(32), nullable=False)
    actor_persona_key: Mapped[str] = mapped_column(String(32), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: dt.datetime.now(dt.UTC), nullable=False
    )
