import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import { renderWithProviders } from './test-utils';
import type {
  AttestationDetail,
  DashboardSummary,
  Page,
  PersonaRead,
  PersonRead,
} from '../api/types';

const PERSONAS: PersonaRead[] = [
  {
    persona_key: 'executive',
    display_name: 'Erin Executive',
    title: 'Chief Information Officer',
    roles: ['executive'],
    email: 'erin.executive@example.com',
  },
];

const DASHBOARD_SUMMARY: DashboardSummary = {
  total_workforce: 17,
  applications_supported: 11,
  platforms_managed: 8,
  assets_approaching_eol_180d: 2,
  open_attestations: 5,
  capability_coverage_percent: 72,
};

const WORKFORCE_PAGE: Page<PersonRead> = {
  items: [
    {
      id: 1,
      full_name: 'Erin Executive',
      email: 'erin.executive@example.com',
      title: 'Chief Information Officer',
      status: 'Active',
      role_family: 'Leadership',
      hire_date: '2020-01-01',
      org_unit_id: 1,
      team_id: 1,
      version: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ],
  total: 1,
  page: 1,
  page_size: 100,
};

const EMPTY_PAGE: Page<unknown> = { items: [], total: 0, page: 1, page_size: 100 };

const ATTESTATION_DETAIL: AttestationDetail = {
  assignment: {
    id: 1,
    campaign_id: 1,
    assignee_persona_key: 'executive',
    status: 'Draft',
    acknowledgement: false,
    submitted_at: null,
    reviewed_at: null,
    reviewer_persona_key: null,
    review_notes: null,
    version: 1,
  },
  definition: {
    id: 1,
    name: 'Quarterly Data Access Attestation',
    description: 'Confirm access is still required.',
    category: 'Security',
    questions: [
      {
        id: 1,
        definition_id: 1,
        prompt: 'Do you still require access to this system?',
        question_type: 'boolean',
        required: true,
        options_json: null,
        order_index: 1,
      },
    ],
  },
  responses: [],
};

function jsonResponse(body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
}

function routeFetch(url: string) {
  if (url.includes('/me/personas')) return jsonResponse(PERSONAS);
  if (url.includes('/dashboard/summary')) return jsonResponse(DASHBOARD_SUMMARY);
  if (url.includes('/analytics/charts/lifecycle')) return jsonResponse({ points: [] });
  if (url.includes('/announcements')) return jsonResponse(EMPTY_PAGE);
  if (url.includes('/workforce/org-units')) return jsonResponse([]);
  if (url.includes('/workforce/teams')) return jsonResponse([]);
  if (url.includes('/workforce')) return jsonResponse(WORKFORCE_PAGE);
  if (url.includes('/applications')) return jsonResponse(EMPTY_PAGE);
  if (url.includes('/platforms')) return jsonResponse(EMPTY_PAGE);
  if (url.includes('/assets')) return jsonResponse(EMPTY_PAGE);
  if (url.includes('/capabilities')) return jsonResponse(EMPTY_PAGE);
  if (url.includes('/attestations/assignments/1')) return jsonResponse(ATTESTATION_DETAIL);
  if (url.includes('/attestations/campaigns')) return jsonResponse([]);
  if (url.includes('/attestations/assignments')) return jsonResponse(EMPTY_PAGE);
  if (url.includes('/audit-events')) return jsonResponse(EMPTY_PAGE);
  return jsonResponse(EMPTY_PAGE);
}

describe('App shell and navigation', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: string | URL | Request) => routeFetch(String(input))),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the shell chrome and home KPIs', async () => {
    renderWithProviders(<App />);

    expect(await screen.findByText('OCIO Portal')).toBeInTheDocument();
    expect(await screen.findByText('Local Prototype Mode')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('17')).toBeInTheDocument());
  });

  it('navigates to Workforce Management from the side nav', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />);

    const nav = await screen.findByRole('navigation', { name: 'Primary' });
    await user.click(within(nav).getByText('Workforce Management'));

    expect(
      await screen.findByRole('heading', { name: 'Workforce Management' }),
    ).toBeInTheDocument();
  });

  it('renders an attestation question form', async () => {
    renderWithProviders(<App />, { route: '/attestations/1' });

    expect(
      await screen.findByText('Do you still require access to this system?'),
    ).toBeInTheDocument();
  });

  it('highlights the selected row and accepts arrow-key navigation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<App />, { route: '/workforce' });

    await screen.findByRole('heading', { name: 'Workforce Management' });
    const table = screen.getByRole('table', { name: 'Workforce table' });
    const row = (await within(table).findByText('Erin Executive')).closest('tr');

    expect(row).not.toBeNull();
    await user.click(row!);
    row!.focus();
    expect(row).toHaveAttribute('data-selected', 'true');

    await user.keyboard('{ArrowDown}');
    expect(row).toHaveAttribute('data-selected', 'true');

    await user.keyboard('{ArrowUp}');
    expect(row).toHaveAttribute('data-selected', 'true');
    expect(row).toHaveFocus();
  });
});
