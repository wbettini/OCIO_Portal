import { useQuery } from '@tanstack/react-query';
import {
  Body1,
  Button,
  Caption1,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  Subtitle1,
  Subtitle2,
  Text,
  Title1,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { ChevronRight24Regular } from '@fluentui/react-icons';
import {
  analyticsApi,
  announcementsApi,
  applicationsApi,
  attestationsApi,
  auditApi,
  capabilitiesApi,
  dashboardApi,
  platformsApi,
  workforceApi,
} from '../api/endpoints';
import { KpiCard } from '../components/common/KpiCard';
import { SectionCard } from '../components/common/SectionCard';
import { PageHeader } from '../components/common/PageHeader';
import { BarChart } from '../components/common/BarChart';
import { AppLink } from '../components/common/AppLink';
import { usePersona } from '../context/PersonaContext';
import { HIDE_DEMO_LABELS, NAV_ITEMS } from '../constants';

const useStyles = makeStyles({
  page: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  hero: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: tokens.spacingHorizontalL,
    padding: tokens.spacingHorizontalL,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: '#0b3a67',
    color: 'white',
    flexWrap: 'wrap',
  },
  heroContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS,
    flex: '2 1 420px',
  },
  heroActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
  },
  personaPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    padding: tokens.spacingHorizontalM,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: 'rgba(255,255,255,0.12)',
    minWidth: '220px',
    flex: '1 1 220px',
  },
  personaLabel: { color: 'rgba(255,255,255,0.75)' },
  personaName: { color: 'white' },
  personaTitle: { color: 'rgba(255,255,255,0.75)' },
  kpiGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: tokens.spacingHorizontalM,
  },
  sectionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: tokens.spacingHorizontalM,
  },
  compactList: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  compactRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalS,
    padding: '4px 0',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
  },
  compactLabel: {
    color: tokens.colorNeutralForeground2,
    fontSize: '12px',
  },
  compactValue: {
    fontSize: '12px',
    fontWeight: 600,
    color: tokens.colorNeutralForeground1,
    minWidth: '26px',
    textAlign: 'right',
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  quickLinks: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: tokens.spacingHorizontalS,
  },
  quickLinkTile: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalS,
    padding: tokens.spacingHorizontalM,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    textDecoration: 'none',
    color: tokens.colorNeutralForeground1,
  },
});

export function HomePage() {
  const styles = useStyles();
  const { currentPersona } = usePersona();

  const summaryQuery = useQuery({ queryKey: ['dashboard-summary'], queryFn: dashboardApi.summary });
  const announcementQuery = useQuery({
    queryKey: ['announcements', 'home'],
    queryFn: () => announcementsApi.list({ status: 'Published', page_size: 1 }),
  });
  const applicationsQuery = useQuery({
    queryKey: ['applications', 'home'],
    queryFn: () => applicationsApi.list({ page_size: 100 }),
  });
  const platformsQuery = useQuery({
    queryKey: ['platforms', 'home'],
    queryFn: () => platformsApi.list({ page_size: 100 }),
  });
  const workforceQuery = useQuery({
    queryKey: ['workforce', 'home'],
    queryFn: () => workforceApi.list({ page_size: 100 }),
  });
  const capabilitiesQuery = useQuery({
    queryKey: ['capabilities', 'home'],
    queryFn: () => capabilitiesApi.list({ page_size: 100 }),
  });
  const attestationsQuery = useQuery({
    queryKey: ['attestations', 'assignments', 'open'],
    queryFn: () => attestationsApi.assignments({ page_size: 100 }),
  });
  const lifecycleChartQuery = useQuery({
    queryKey: ['analytics', 'lifecycle'],
    queryFn: analyticsApi.lifecycleChart,
  });
  const auditQuery = useQuery({
    queryKey: ['audit-events', 'recent'],
    queryFn: () => auditApi.list({ page_size: 8 }),
  });

  const summary = summaryQuery.data;
  const announcement = announcementQuery.data?.items[0];

  const assignments = attestationsQuery.data?.items ?? [];
  const openAttestations = assignments.filter((a) => ['Draft', 'Submitted'].includes(a.status));
  const draftCount = assignments.filter((a) => a.status === 'Draft').length;
  const submittedCount = assignments.filter((a) => a.status === 'Submitted').length;
  const approvedCount = assignments.filter((a) => a.status === 'Approved').length;

  const capabilityGaps = (capabilitiesQuery.data?.items ?? [])
    .filter((c) => c.current_coverage < c.target_coverage_percent)
    .sort((a, b) => a.current_coverage - b.current_coverage)
    .slice(0, 5);

  const coverage = summary?.capability_coverage_percent ?? 0;
  const coverageTone = coverage >= 90 ? 'positive' : coverage >= 75 ? 'warning' : 'critical';
  const eolCount = summary?.assets_approaching_eol_180d ?? 0;
  const openAttestationsCount = summary?.open_attestations ?? 0;

  const applicationHealthCounts = Object.entries(
    (applicationsQuery.data?.items ?? []).reduce<Record<string, number>>((acc, app) => {
      const key = app.lifecycle_state || 'Unspecified';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const platformLifecycleCounts = Object.entries(
    (platformsQuery.data?.items ?? []).reduce<Record<string, number>>((acc, platform) => {
      const key = platform.support_status || 'Unspecified';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const workforceCoverageCounts = Object.entries(
    (workforceQuery.data?.items ?? []).reduce<Record<string, number>>((acc, person) => {
      const key = person.role_family || 'Unassigned';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return (
    <div className={styles.page}>
      {HIDE_DEMO_LABELS ? null : (
        <MessageBar intent="warning">
          <MessageBarBody>
            <MessageBarTitle>Local prototype</MessageBarTitle>
            This portal runs against synthetic demonstration data only. Nothing here reflects real
            people, applications, or platforms.
          </MessageBarBody>
        </MessageBar>
      )}

      <PageHeader
        title="Executive Home"
        subtitle="A single, synthetic view into our people, applications, platforms, and capabilities."
        hint="All figures below are computed live from the demo dataset."
      />

      <section className={styles.hero} aria-label="Featured announcement">
        <div className={styles.heroContent}>
          <Title1 as="h1" style={{ color: 'white' }}>
            {announcement ? announcement.title : 'Welcome to the OCIO Portal'}
          </Title1>
          <Body1 style={{ color: 'white', maxWidth: '760px' }}>
            {announcement
              ? announcement.body
              : 'Our technology portfolio is the backbone of how we serve customers every day.'}
          </Body1>
          <div className={styles.heroActions}>
            <AppLink to="/administration">
              <Button appearance="primary">Read announcement</Button>
            </AppLink>
            <AppLink to="/attestations">
              <Button appearance="secondary">Review attestations</Button>
            </AppLink>
          </div>
        </div>
        <div className={styles.personaPanel}>
          <Caption1 className={styles.personaLabel}>Signed in as</Caption1>
          <Subtitle1 className={styles.personaName}>
            {currentPersona?.display_name ?? 'Guest'}
          </Subtitle1>
          <Caption1 className={styles.personaTitle}>{currentPersona?.title ?? ''}</Caption1>
        </div>
      </section>

      <section className={styles.kpiGrid} aria-label="Executive KPIs">
        {summaryQuery.isLoading || !summary ? (
          <Spinner label="Loading KPIs" />
        ) : (
          <>
            <KpiCard label="Total workforce" value={summary.total_workforce} unit="people" />
            <KpiCard
              label="Applications supported"
              value={summary.applications_supported}
              unit="apps"
            />
            <KpiCard label="Platforms managed" value={summary.platforms_managed} unit="platforms" />
            <KpiCard
              label="Assets approaching EOL (180d)"
              value={eolCount}
              unit="assets"
              tone={eolCount > 0 ? 'warning' : 'positive'}
              badgeText={eolCount > 0 ? 'Needs attention' : 'On track'}
            />
            <KpiCard
              label="Open attestations"
              value={openAttestationsCount}
              unit="open"
              tone={openAttestationsCount > 0 ? 'warning' : 'positive'}
              badgeText={openAttestationsCount > 0 ? 'Action required' : 'Clear'}
            />
            <KpiCard
              label="Capability coverage"
              value={coverage}
              unit="%"
              tone={coverageTone}
              hint={`Target coverage is tracked per capability.`}
            />
          </>
        )}
      </section>

      <div className={styles.sectionGrid}>
        <SectionCard title="Application health" subtitle="Lifecycle and criticality snapshot">
          <div className={styles.compactList}>
            {applicationHealthCounts.length ? (
              applicationHealthCounts.map(({ label, count }) => (
                <div key={label} className={styles.compactRow}>
                  <span className={styles.compactLabel}>{label}</span>
                  <span className={styles.compactValue}>{count}</span>
                </div>
              ))
            ) : (
              <Text>No application data available</Text>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Platform lifecycle" subtitle="Support status across the platform catalog">
          <div className={styles.compactList}>
            {platformLifecycleCounts.length ? (
              platformLifecycleCounts.map(({ label, count }) => (
                <div key={label} className={styles.compactRow}>
                  <span className={styles.compactLabel}>{label}</span>
                  <span className={styles.compactValue}>{count}</span>
                </div>
              ))
            ) : (
              <Text>No platform data available</Text>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Workforce coverage" subtitle="Recently active workforce members">
          <div className={styles.compactList}>
            {workforceCoverageCounts.length ? (
              workforceCoverageCounts.map(({ label, count }) => (
                <div key={label} className={styles.compactRow}>
                  <span className={styles.compactLabel}>{label}</span>
                  <span className={styles.compactValue}>{count}</span>
                </div>
              ))
            ) : (
              <Text>No workforce data available</Text>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Capability gaps (top 5)" subtitle="Current coverage vs. target">
          <ul className={styles.list}>
            {capabilityGaps.map((capability) => (
              <li key={capability.id}>
                <Text weight="semibold">{capability.name}</Text> — {capability.current_coverage}% /{' '}
                {capability.target_coverage_percent}% (gap{' '}
                {capability.target_coverage_percent - capability.current_coverage})
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Pending attestations" subtitle="Draft or submitted assignments">
          <ul className={styles.list}>
            {openAttestations.slice(0, 5).map((assignment) => (
              <li key={assignment.id}>
                <AppLink to={`/attestations/${assignment.id}`}>Assignment #{assignment.id}</AppLink>{' '}
                — {assignment.assignee_persona_key} · {assignment.status}
              </li>
            ))}
          </ul>
          <Caption1>
            Draft: {draftCount} · Submitted: {submittedCount} · Approved: {approvedCount} (Rejected and
            Expired assignments are not counted as pending)
          </Caption1>
        </SectionCard>

        <SectionCard
          title="Asset end-of-life horizon"
          subtitle="Locally computed from live asset records (not Power BI)"
        >
          {lifecycleChartQuery.data ? (
            <BarChart points={lifecycleChartQuery.data.points} />
          ) : (
            <Spinner label="Loading chart" />
          )}
        </SectionCard>
      </div>

      <SectionCard title="Quick links">
        <div className={styles.quickLinks}>
          {NAV_ITEMS.filter((item) => item.path !== '/').map((item) => (
            <AppLink to={item.path} key={item.path} className={styles.quickLinkTile}>
              <Text>{item.label}</Text>
              <ChevronRight24Regular />
            </AppLink>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Recently updated content" subtitle="Latest audit events">
        <ul className={styles.list}>
          {(auditQuery.data?.items ?? []).map((event) => (
            <li key={event.id}>
              <Subtitle2 as="span">{event.entity_type}</Subtitle2> #{event.entity_id} —{' '}
              {event.action} by {event.actor_persona_key}
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
