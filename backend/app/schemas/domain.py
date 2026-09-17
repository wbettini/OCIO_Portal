"""Domain Pydantic schemas (Pydantic v2) for every entity and composite view
used by the API. Grouped by domain with Read / Create / Update variants.
"""
from __future__ import annotations

import datetime as dt

from pydantic import BaseModel, ConfigDict, Field

# --------------------------------------------------------------------------
# Identity / personas
# --------------------------------------------------------------------------


class PersonaRead(BaseModel):
    persona_key: str
    display_name: str
    title: str
    roles: list[str]
    email: str


# --------------------------------------------------------------------------
# Org structure
# --------------------------------------------------------------------------


class OrganizationUnitRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: str
    description: str | None
    parent_id: int | None
    version: int


class TeamRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    org_unit_id: int
    version: int


# --------------------------------------------------------------------------
# Workforce
# --------------------------------------------------------------------------


class PersonBase(BaseModel):
    full_name: str = Field(min_length=1, max_length=160)
    email: str = Field(min_length=3, max_length=256)
    title: str = Field(min_length=1, max_length=160)
    status: str = "Active"
    role_family: str
    hire_date: dt.date | None = None
    org_unit_id: int | None = None
    team_id: int | None = None


class PersonCreate(PersonBase):
    pass


class PersonUpdate(PersonBase):
    version: int


class PersonRead(PersonBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    version: int
    created_at: dt.datetime
    updated_at: dt.datetime


# --------------------------------------------------------------------------
# Applications
# --------------------------------------------------------------------------


class ApplicationBase(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    description: str | None = None
    criticality: str = "Medium"
    lifecycle_state: str = "Active"
    owner_person_id: int | None = None


class ApplicationCreate(ApplicationBase):
    pass


class ApplicationUpdate(ApplicationBase):
    version: int


class ApplicationRead(ApplicationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    version: int
    created_at: dt.datetime
    updated_at: dt.datetime


# --------------------------------------------------------------------------
# Platforms
# --------------------------------------------------------------------------


class PlatformBase(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    platform_type: str
    owner_person_id: int | None = None
    lifecycle_state: str = "Active"
    support_status: str = "Supported"
    strategic_classification: str = "Strategic"


class PlatformCreate(PlatformBase):
    pass


class PlatformUpdate(PlatformBase):
    version: int


class PlatformRead(PlatformBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    version: int
    created_at: dt.datetime
    updated_at: dt.datetime


# --------------------------------------------------------------------------
# Capabilities
# --------------------------------------------------------------------------


class CapabilityBase(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    category: str
    description: str | None = None
    target_coverage_percent: float = 80


class CapabilityCreate(CapabilityBase):
    pass


class CapabilityUpdate(CapabilityBase):
    version: int


class CapabilityRead(CapabilityBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    version: int
    current_coverage: float
    created_at: dt.datetime
    updated_at: dt.datetime


# --------------------------------------------------------------------------
# Assets
# --------------------------------------------------------------------------


class AssetBase(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    asset_type: str
    lifecycle_state: str = "Active"
    risk_level: str = "Low"
    eol_date: dt.date | None = None
    owner_person_id: int | None = None


class AssetCreate(AssetBase):
    pass


class AssetUpdate(AssetBase):
    version: int


class AssetRead(AssetBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    version: int
    created_at: dt.datetime
    updated_at: dt.datetime


# --------------------------------------------------------------------------
# Announcements
# --------------------------------------------------------------------------


class AnnouncementBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    body: str
    status: str = "Draft"
    priority: str = "Normal"
    featured: bool = False
    effective_at: dt.datetime | None = None
    expires_at: dt.datetime | None = None


class AnnouncementCreate(AnnouncementBase):
    pass


class AnnouncementUpdate(AnnouncementBase):
    version: int


class AnnouncementRead(AnnouncementBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    version: int
    author_persona_key: str | None
    created_at: dt.datetime
    updated_at: dt.datetime


# --------------------------------------------------------------------------
# Attestations
# --------------------------------------------------------------------------


class AttestationQuestionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    definition_id: int
    prompt: str
    question_type: str
    required: bool
    options_json: str | None
    order_index: int


class AttestationDefinitionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None
    category: str
    questions: list[AttestationQuestionRead] = []


class AttestationCampaignBase(BaseModel):
    definition_id: int
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None
    opens_at: dt.datetime | None = None
    closes_at: dt.datetime | None = None


class AttestationCampaignCreate(AttestationCampaignBase):
    pass


class AttestationCampaignUpdate(AttestationCampaignBase):
    version: int


class AttestationCampaignRead(AttestationCampaignBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    version: int


class AttestationAssignmentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    campaign_id: int
    assignee_persona_key: str
    status: str
    acknowledgement: bool
    submitted_at: dt.datetime | None
    reviewed_at: dt.datetime | None
    reviewer_persona_key: str | None
    review_notes: str | None
    version: int


class AttestationResponseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    assignment_id: int
    question_id: int
    answer_text: str | None
    answer_boolean: bool | None
    answer_numeric: float | None
    answer_date: dt.date | None
    answer_choice: str | None


class AttestationAnswerInput(BaseModel):
    question_id: int
    answer_text: str | None = None
    answer_boolean: bool | None = None
    answer_numeric: float | None = None
    answer_date: dt.date | None = None
    answer_choice: str | None = None


class AttestationDraftRequest(BaseModel):
    version: int
    answers: list[AttestationAnswerInput] = []


class AttestationSubmitRequest(BaseModel):
    version: int
    answers: list[AttestationAnswerInput] = []
    acknowledgement: bool = False


class AttestationReviewRequest(BaseModel):
    version: int
    approve: bool
    review_notes: str | None = None


class AttestationDetail(BaseModel):
    assignment: AttestationAssignmentRead
    definition: AttestationDefinitionRead
    responses: list[AttestationResponseRead]


# --------------------------------------------------------------------------
# Resource planner
# --------------------------------------------------------------------------


class AssignmentBase(BaseModel):
    role: str | None = None
    allocation_percent: float | None = None
    effective_start: dt.date | None = None
    effective_end: dt.date | None = None


class PersonApplicationAssignmentRead(AssignmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    person_id: int
    application_id: int
    version: int


class PersonPlatformAssignmentRead(AssignmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    person_id: int
    platform_id: int
    version: int


class PersonCapabilityRead(AssignmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    person_id: int
    capability_id: int
    version: int


class ApplicationPlatformRelationshipRead(AssignmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    application_id: int
    platform_id: int
    version: int


class ApplicationCapabilityRequirementRead(AssignmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    application_id: int
    capability_id: int
    version: int


class PlannerAssignRequest(BaseModel):
    target_type: str  # "application" | "platform"
    target_id: int
    role: str | None = None
    allocation_percent: float | None = None
    effective_start: dt.date | None = None
    effective_end: dt.date | None = None


class WorkforcePlannerView(BaseModel):
    person: PersonRead
    applications: list[PersonApplicationAssignmentRead]
    platforms: list[PersonPlatformAssignmentRead]
    capabilities: list[PersonCapabilityRead]


class ApplicationPlannerView(BaseModel):
    application: ApplicationRead
    people: list[PersonApplicationAssignmentRead]
    platforms: list[ApplicationPlatformRelationshipRead]
    capabilities: list[ApplicationCapabilityRequirementRead]
    alerts: list[CoverageAlert]


class CoverageAlert(BaseModel):
    severity: str  # info | warning | critical
    category: str
    message: str
    entity_type: str
    entity_id: int


class CoveragePlannerView(BaseModel):
    alerts: list[CoverageAlert]


# --------------------------------------------------------------------------
# Analytics
# --------------------------------------------------------------------------


class AnalyticsReportRead(BaseModel):
    key: str
    title: str
    summary: str
    group: str
    last_refreshed: dt.datetime


class EmbedInfoRead(BaseModel):
    provider: str
    embed_mode: str
    embed_url: str | None
    token: str | None
    expires_in_seconds: int | None
    access_state: str
    message: str


class LifecycleChartPoint(BaseModel):
    bucket: str
    count: int


class LifecycleChartRead(BaseModel):
    points: list[LifecycleChartPoint]


# --------------------------------------------------------------------------
# Dashboard
# --------------------------------------------------------------------------


class DashboardSummary(BaseModel):
    total_workforce: int
    applications_supported: int
    platforms_managed: int
    assets_approaching_eol_180d: int
    open_attestations: int
    capability_coverage_percent: float


# --------------------------------------------------------------------------
# Audit
# --------------------------------------------------------------------------


class AuditEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    entity_type: str
    entity_id: int
    action: str
    actor_persona_key: str
    summary: str
    created_at: dt.datetime
