import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dropdown,
  Field,
  Option,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Title2,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { assetsApi } from '../api/endpoints';
import { KpiCard } from '../components/common/KpiCard';
import { SectionCard } from '../components/common/SectionCard';

const useStyles = makeStyles({
  page: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  filters: { display: 'flex', gap: tokens.spacingHorizontalM, flexWrap: 'wrap', alignItems: 'flex-end' },
  kpiGrid: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalM },
});

const LIFECYCLE_OPTIONS = ['Active', 'Sunset', 'Unsupported', 'Retired'];
const RISK_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];

export function AssetsPage() {
  const styles = useStyles();
  const [lifecycleState, setLifecycleState] = useState<string | undefined>(undefined);
  const [riskLevel, setRiskLevel] = useState<string | undefined>(undefined);
  const [horizon180, setHorizon180] = useState(false);

  const assetsQuery = useQuery({
    queryKey: ['assets', { lifecycleState, riskLevel, horizon180 }],
    queryFn: () =>
      assetsApi.list({
        lifecycle_state: lifecycleState,
        risk_level: riskLevel,
        horizon_180: horizon180,
        page_size: 100,
      }),
  });

  const allAssetsQuery = useQuery({
    queryKey: ['assets', 'summary'],
    queryFn: () => assetsApi.list({ page_size: 200 }),
  });

  const assets = useMemo(() => assetsQuery.data?.items ?? [], [assetsQuery.data]);
  const allAssets = allAssetsQuery.data?.items ?? [];

  const unsupportedCount = allAssets.filter((a) => a.lifecycle_state === 'Unsupported').length;
  const highRiskCount = allAssets.filter((a) => ['High', 'Critical'].includes(a.risk_level)).length;
  const within180 = allAssets.filter((a) => {
    if (!a.eol_date) return false;
    const days = (new Date(a.eol_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days <= 180;
  }).length;

  return (
    <div className={styles.page}>
      <Title2 as="h2">Asset &amp; End-of-Life Management</Title2>

      <div className={styles.kpiGrid} aria-label="Lifecycle exposure summary">
        <KpiCard label="Total assets" value={allAssets.length} />
        <KpiCard label="Unsupported assets" value={unsupportedCount} />
        <KpiCard label="High / critical risk" value={highRiskCount} />
        <KpiCard label="Within 180-day EOL horizon" value={within180} />
      </div>

      <div className={styles.filters}>
        <Field label="Lifecycle state">
          <Dropdown
            placeholder="All"
            selectedOptions={lifecycleState ? [lifecycleState] : []}
            value={lifecycleState ?? ''}
            onOptionSelect={(_, data) => setLifecycleState(data.optionValue || undefined)}
          >
            <Option value="" text="All">All</Option>
            {LIFECYCLE_OPTIONS.map((option) => (
              <Option key={option} value={option} text={option}>{option}</Option>
            ))}
          </Dropdown>
        </Field>
        <Field label="Risk level">
          <Dropdown
            placeholder="All"
            selectedOptions={riskLevel ? [riskLevel] : []}
            value={riskLevel ?? ''}
            onOptionSelect={(_, data) => setRiskLevel(data.optionValue || undefined)}
          >
            <Option value="" text="All">All</Option>
            {RISK_OPTIONS.map((option) => (
              <Option key={option} value={option} text={option}>{option}</Option>
            ))}
          </Dropdown>
        </Field>
        <Switch
          checked={horizon180}
          onChange={(_, data) => setHorizon180(data.checked)}
          label="Focus on 180-day horizon"
        />
      </div>

      <SectionCard title="Assets" subtitle={`${assets.length} shown`}>
        <Table aria-label="Assets table">
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Type</TableHeaderCell>
              <TableHeaderCell>Lifecycle</TableHeaderCell>
              <TableHeaderCell>Risk</TableHeaderCell>
              <TableHeaderCell>EOL date</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((asset) => (
              <TableRow key={asset.id}>
                <TableCell>{asset.name}</TableCell>
                <TableCell>{asset.asset_type}</TableCell>
                <TableCell>{asset.lifecycle_state}</TableCell>
                <TableCell>{asset.risk_level}</TableCell>
                <TableCell>{asset.eol_date ?? 'Not set'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  );
}
