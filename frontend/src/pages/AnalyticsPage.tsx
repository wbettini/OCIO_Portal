import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Badge,
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Title2,
  Title3,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { analyticsApi } from '../api/endpoints';
import { SectionCard } from '../components/common/SectionCard';
import type { AnalyticsReportRead, EmbedInfoRead } from '../api/types';

const useStyles = makeStyles({
  page: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: tokens.spacingHorizontalM,
  },
});

function groupReports(reports: AnalyticsReportRead[]): Map<string, AnalyticsReportRead[]> {
  const groups = new Map<string, AnalyticsReportRead[]>();
  for (const report of reports) {
    const list = groups.get(report.group) ?? [];
    list.push(report);
    groups.set(report.group, list);
  }
  return groups;
}

export function AnalyticsPage() {
  const styles = useStyles();
  const reportsQuery = useQuery({ queryKey: ['analytics', 'reports'], queryFn: analyticsApi.reports });
  const [embedInfo, setEmbedInfo] = useState<EmbedInfoRead | null>(null);
  const [embedTitle, setEmbedTitle] = useState<string>('');

  const groups = groupReports(reportsQuery.data ?? []);

  const openDashboard = async (report: AnalyticsReportRead) => {
    const info = await analyticsApi.embed(report.key);
    setEmbedInfo(info);
    setEmbedTitle(report.title);
  };

  return (
    <div className={styles.page}>
      <Title2 as="h2">Analytics</Title2>

      {Array.from(groups.entries()).map(([group, reports]) => (
        <SectionCard key={group} title={group}>
          <div className={styles.cardGrid}>
            {reports.map((report) => (
              <SectionCard key={report.key} title={report.title} subtitle={report.summary}>
                <p>Last refreshed: {new Date(report.last_refreshed).toLocaleString()}</p>
                <Badge appearance="tint">placeholder</Badge>
                <Button appearance="primary" onClick={() => openDashboard(report)}>
                  Open dashboard
                </Button>
              </SectionCard>
            ))}
          </div>
        </SectionCard>
      ))}

      <Dialog open={embedInfo !== null} onOpenChange={(_, data) => !data.open && setEmbedInfo(null)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>{embedTitle}</DialogTitle>
            <DialogContent>
              {embedInfo ? (
                <>
                  <Title3>Access state: {embedInfo.access_state}</Title3>
                  <MessageBar intent="info">
                    <MessageBarBody>
                      <MessageBarTitle>Power BI not connected</MessageBarTitle>
                      {embedInfo.message}
                    </MessageBarBody>
                  </MessageBar>
                </>
              ) : null}
            </DialogContent>
            <DialogTrigger disableButtonEnhancement>
              <Button appearance="secondary">Close</Button>
            </DialogTrigger>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
