/** Typed endpoint functions built on top of apiRequest. */
import { apiRequest } from './client';
import type {
  AnalyticsReportRead,
  AnnouncementInput,
  AnnouncementRead,
  ApplicationInput,
  ApplicationPlannerView,
  ApplicationRead,
  AssetInput,
  AssetRead,
  AttestationAnswerInput,
  AttestationAssignmentRead,
  AttestationCampaignRead,
  AttestationDefinitionRead,
  AttestationDetail,
  AuditEventRead,
  CapabilityInput,
  CapabilityRead,
  CoveragePlannerView,
  DashboardSummary,
  EmbedInfoRead,
  LifecycleChartRead,
  OrganizationUnitRead,
  Page,
  PersonaRead,
  PersonApplicationAssignmentRead,
  PersonInput,
  PersonPlatformAssignmentRead,
  PersonRead,
  PlannerAssignRequest,
  PlatformInput,
  PlatformRead,
  TeamRead,
  WorkforcePlannerView,
} from './types';

function toQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

export const identityApi = {
  me: () => apiRequest<PersonaRead>('/me'),
  personas: () => apiRequest<PersonaRead[]>('/me/personas'),
};

export const dashboardApi = {
  summary: () => apiRequest<DashboardSummary>('/dashboard/summary'),
};

export const announcementsApi = {
  list: (params: { status?: string; page?: number; page_size?: number } = {}) =>
    apiRequest<Page<AnnouncementRead>>(`/announcements${toQuery(params)}`),
  get: (id: number) => apiRequest<AnnouncementRead>(`/announcements/${id}`),
  create: (payload: AnnouncementInput) =>
    apiRequest<AnnouncementRead>('/announcements', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: number, payload: AnnouncementInput & { version: number }) =>
    apiRequest<AnnouncementRead>(`/announcements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};

export const workforceApi = {
  list: (
    params: {
      search?: string;
      status?: string;
      role_family?: string;
      page?: number;
      page_size?: number;
    } = {},
  ) => apiRequest<Page<PersonRead>>(`/workforce${toQuery(params)}`),
  get: (id: number) => apiRequest<PersonRead>(`/workforce/${id}`),
  create: (payload: PersonInput) =>
    apiRequest<PersonRead>('/workforce', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: number, payload: PersonInput & { version: number }) =>
    apiRequest<PersonRead>(`/workforce/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  delete: (id: number) => apiRequest<PersonRead>(`/workforce/${id}`, { method: 'DELETE' }),
  orgUnits: () => apiRequest<OrganizationUnitRead[]>(`/workforce/org-units`),
  teams: () => apiRequest<TeamRead[]>(`/workforce/teams`),
};

export const applicationsApi = {
  list: (
    params: {
      search?: string;
      criticality?: string;
      lifecycle_state?: string;
      page?: number;
      page_size?: number;
    } = {},
  ) => apiRequest<Page<ApplicationRead>>(`/applications${toQuery(params)}`),
  get: (id: number) => apiRequest<ApplicationRead>(`/applications/${id}`),
  create: (payload: ApplicationInput) =>
    apiRequest<ApplicationRead>('/applications', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: number, payload: ApplicationInput & { version: number }) =>
    apiRequest<ApplicationRead>(`/applications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  delete: (id: number) => apiRequest<ApplicationRead>(`/applications/${id}`, { method: 'DELETE' }),
};

export const platformsApi = {
  list: (
    params: {
      search?: string;
      platform_type?: string;
      lifecycle_state?: string;
      page?: number;
      page_size?: number;
    } = {},
  ) => apiRequest<Page<PlatformRead>>(`/platforms${toQuery(params)}`),
  get: (id: number) => apiRequest<PlatformRead>(`/platforms/${id}`),
  create: (payload: PlatformInput) =>
    apiRequest<PlatformRead>('/platforms', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: number, payload: PlatformInput & { version: number }) =>
    apiRequest<PlatformRead>(`/platforms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  delete: (id: number) => apiRequest<PlatformRead>(`/platforms/${id}`, { method: 'DELETE' }),
};

export const capabilitiesApi = {
  list: (params: { search?: string; category?: string; page?: number; page_size?: number } = {}) =>
    apiRequest<Page<CapabilityRead>>(`/capabilities${toQuery(params)}`),
  get: (id: number) => apiRequest<CapabilityRead>(`/capabilities/${id}`),
  create: (payload: CapabilityInput) =>
    apiRequest<CapabilityRead>('/capabilities', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  update: (id: number, payload: CapabilityInput & { version: number }) =>
    apiRequest<CapabilityRead>(`/capabilities/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};

export const assetsApi = {
  list: (
    params: {
      search?: string;
      lifecycle_state?: string;
      risk_level?: string;
      horizon_180?: boolean;
      page?: number;
      page_size?: number;
    } = {},
  ) => apiRequest<Page<AssetRead>>(`/assets${toQuery(params)}`),
  get: (id: number) => apiRequest<AssetRead>(`/assets/${id}`),
  create: (payload: AssetInput) =>
    apiRequest<AssetRead>('/assets', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: number, payload: AssetInput & { version: number }) =>
    apiRequest<AssetRead>(`/assets/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
};

export const attestationsApi = {
  definitions: () => apiRequest<AttestationDefinitionRead[]>('/attestations/definitions'),
  campaigns: () => apiRequest<AttestationCampaignRead[]>('/attestations/campaigns'),
  assignments: (
    params: {
      campaign_id?: number;
      assignee_persona_key?: string;
      status?: string;
      page?: number;
      page_size?: number;
    } = {},
  ) => apiRequest<Page<AttestationAssignmentRead>>(`/attestations/assignments${toQuery(params)}`),
  detail: (assignmentId: number) =>
    apiRequest<AttestationDetail>(`/attestations/assignments/${assignmentId}`),
  saveDraft: (assignmentId: number, version: number, answers: AttestationAnswerInput[]) =>
    apiRequest<AttestationDetail>(`/attestations/assignments/${assignmentId}/draft`, {
      method: 'POST',
      body: JSON.stringify({ version, answers }),
    }),
  submit: (assignmentId: number, version: number, answers: AttestationAnswerInput[]) =>
    apiRequest<AttestationDetail>(`/attestations/assignments/${assignmentId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ version, answers, acknowledgement: true }),
    }),
  review: (assignmentId: number, version: number, approve: boolean, reviewNotes?: string) =>
    apiRequest<AttestationDetail>(`/attestations/assignments/${assignmentId}/review`, {
      method: 'POST',
      body: JSON.stringify({ version, approve, review_notes: reviewNotes ?? null }),
    }),
};

export const plannerApi = {
  workforceView: (personId: number) =>
    apiRequest<WorkforcePlannerView>(`/planner/workforce/${personId}`),
  applicationView: (applicationId: number) =>
    apiRequest<ApplicationPlannerView>(`/planner/applications/${applicationId}`),
  coverageView: () => apiRequest<CoveragePlannerView>('/planner/coverage'),
  assign: (personId: number, payload: PlannerAssignRequest) =>
    apiRequest<PersonApplicationAssignmentRead | PersonPlatformAssignmentRead>(
      `/planner/workforce/${personId}/assign`,
      { method: 'POST', body: JSON.stringify(payload) },
    ),
  unassign: (personId: number, targetType: 'application' | 'platform', assignmentId: number) =>
    apiRequest<void>(`/planner/workforce/${personId}/assign/${targetType}/${assignmentId}`, {
      method: 'DELETE',
    }),
};

export const analyticsApi = {
  reports: () => apiRequest<AnalyticsReportRead[]>('/analytics/reports'),
  embed: (reportKey: string) =>
    apiRequest<EmbedInfoRead>(`/analytics/reports/${reportKey}/embed`),
  lifecycleChart: () => apiRequest<LifecycleChartRead>('/analytics/charts/lifecycle'),
};

export const auditApi = {
  list: (params: { page?: number; page_size?: number } = {}) =>
    apiRequest<Page<AuditEventRead>>(`/audit-events${toQuery(params)}`),
};
