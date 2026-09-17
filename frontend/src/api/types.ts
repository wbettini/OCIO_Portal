/** Shared TypeScript types mirroring backend Pydantic schemas. */

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface PersonaRead {
  persona_key: string;
  display_name: string;
  title: string;
  roles: string[];
  email: string;
}

export interface PersonRead {
  id: number;
  full_name: string;
  email: string;
  title: string;
  status: string;
  role_family: string;
  hire_date: string | null;
  org_unit_id: number | null;
  team_id: number | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export type PersonInput = Omit<PersonRead, 'id' | 'version' | 'created_at' | 'updated_at'>;

export interface OrganizationUnitRead {
  id: number;
  name: string;
  code: string;
  description: string | null;
  parent_id: number | null;
  version: number;
}

export interface TeamRead {
  id: number;
  name: string;
  description: string | null;
  org_unit_id: number;
  version: number;
}

export interface ApplicationRead {
  id: number;
  name: string;
  description: string | null;
  criticality: string;
  lifecycle_state: string;
  owner_person_id: number | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export type ApplicationInput = Omit<
  ApplicationRead,
  'id' | 'version' | 'created_at' | 'updated_at'
>;

export interface PlatformRead {
  id: number;
  name: string;
  platform_type: string;
  owner_person_id: number | null;
  lifecycle_state: string;
  support_status: string;
  strategic_classification: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export type PlatformInput = Omit<PlatformRead, 'id' | 'version' | 'created_at' | 'updated_at'>;

export interface CapabilityRead {
  id: number;
  name: string;
  category: string;
  description: string | null;
  target_coverage_percent: number;
  current_coverage: number;
  version: number;
  created_at: string;
  updated_at: string;
}

export type CapabilityInput = Omit<
  CapabilityRead,
  'id' | 'current_coverage' | 'version' | 'created_at' | 'updated_at'
>;

export interface AssetRead {
  id: number;
  name: string;
  asset_type: string;
  lifecycle_state: string;
  risk_level: string;
  eol_date: string | null;
  owner_person_id: number | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export type AssetInput = Omit<AssetRead, 'id' | 'version' | 'created_at' | 'updated_at'>;

export interface AnnouncementRead {
  id: number;
  title: string;
  body: string;
  status: string;
  priority: string;
  featured: boolean;
  effective_at: string | null;
  expires_at: string | null;
  author_persona_key: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export type AnnouncementInput = Omit<
  AnnouncementRead,
  'id' | 'author_persona_key' | 'version' | 'created_at' | 'updated_at'
>;

export interface AttestationQuestionRead {
  id: number;
  definition_id: number;
  prompt: string;
  question_type: 'text' | 'boolean' | 'choice' | 'date' | 'numeric';
  required: boolean;
  options_json: string | null;
  order_index: number;
}

export interface AttestationDefinitionRead {
  id: number;
  name: string;
  description: string | null;
  category: string;
  questions: AttestationQuestionRead[];
}

export interface AttestationCampaignRead {
  id: number;
  definition_id: number;
  name: string;
  description: string | null;
  opens_at: string | null;
  closes_at: string | null;
}

export interface AttestationAssignmentRead {
  id: number;
  campaign_id: number;
  assignee_persona_key: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected' | 'Expired';
  acknowledgement: boolean;
  submitted_at: string | null;
  reviewed_at: string | null;
  reviewer_persona_key: string | null;
  review_notes: string | null;
  version: number;
}

export interface AttestationResponseRead {
  id: number;
  assignment_id: number;
  question_id: number;
  answer_text: string | null;
  answer_boolean: boolean | null;
  answer_numeric: number | null;
  answer_date: string | null;
  answer_choice: string | null;
}

export interface AttestationAnswerInput {
  question_id: number;
  answer_text?: string | null;
  answer_boolean?: boolean | null;
  answer_numeric?: number | null;
  answer_date?: string | null;
  answer_choice?: string | null;
}

export interface AttestationDetail {
  assignment: AttestationAssignmentRead;
  definition: AttestationDefinitionRead;
  responses: AttestationResponseRead[];
}

export interface AssignmentBase {
  role: string | null;
  allocation_percent: number | null;
  effective_start: string | null;
  effective_end: string | null;
}

export interface PersonApplicationAssignmentRead extends AssignmentBase {
  id: number;
  person_id: number;
  application_id: number;
  version: number;
}

export interface PersonPlatformAssignmentRead extends AssignmentBase {
  id: number;
  person_id: number;
  platform_id: number;
  version: number;
}

export interface PersonCapabilityRead extends AssignmentBase {
  id: number;
  person_id: number;
  capability_id: number;
  version: number;
}

export interface ApplicationPlatformRelationshipRead extends AssignmentBase {
  id: number;
  application_id: number;
  platform_id: number;
  version: number;
}

export interface ApplicationCapabilityRequirementRead extends AssignmentBase {
  id: number;
  application_id: number;
  capability_id: number;
  version: number;
}

export interface WorkforcePlannerView {
  person: PersonRead;
  applications: PersonApplicationAssignmentRead[];
  platforms: PersonPlatformAssignmentRead[];
  capabilities: PersonCapabilityRead[];
}

export interface CoverageAlert {
  severity: 'info' | 'warning' | 'critical';
  category: string;
  message: string;
  entity_type: string;
  entity_id: number;
}

export interface ApplicationPlannerView {
  application: ApplicationRead;
  people: PersonApplicationAssignmentRead[];
  platforms: ApplicationPlatformRelationshipRead[];
  capabilities: ApplicationCapabilityRequirementRead[];
  alerts: CoverageAlert[];
}

export interface CoveragePlannerView {
  alerts: CoverageAlert[];
}

export interface PlannerAssignRequest {
  target_type: 'application' | 'platform';
  target_id: number;
  role?: string | null;
  allocation_percent?: number | null;
  effective_start?: string | null;
  effective_end?: string | null;
}

export interface AnalyticsReportRead {
  key: string;
  title: string;
  summary: string;
  group: string;
  last_refreshed: string;
}

export interface EmbedInfoRead {
  provider: string;
  embed_mode: string;
  embed_url: string | null;
  token: string | null;
  expires_in_seconds: number | null;
  access_state: string;
  message: string;
}

export interface LifecycleChartPoint {
  bucket: string;
  count: number;
}

export interface LifecycleChartRead {
  points: LifecycleChartPoint[];
}

export interface DashboardSummary {
  total_workforce: number;
  applications_supported: number;
  platforms_managed: number;
  assets_approaching_eol_180d: number;
  open_attestations: number;
  capability_coverage_percent: number;
}

export interface AuditEventRead {
  id: number;
  entity_type: string;
  entity_id: number;
  action: string;
  actor_persona_key: string;
  summary: string;
  created_at: string;
}
