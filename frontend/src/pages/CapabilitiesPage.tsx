import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Badge,
  ProgressBar,
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
import { capabilitiesApi } from '../api/endpoints';
import { SectionCard } from '../components/common/SectionCard';

const useStyles = makeStyles({
  page: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  progressCell: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalXS, minWidth: '160px' },
});

export function CapabilitiesPage() {
  const styles = useStyles();
  const capabilitiesQuery = useQuery({
    queryKey: ['capabilities', 'all'],
    queryFn: () => capabilitiesApi.list({ page_size: 100 }),
  });

  const capabilities = useMemo(() => capabilitiesQuery.data?.items ?? [], [capabilitiesQuery.data]);

  return (
    <div className={styles.page}>
      <Title2 as="h2">Capabilities Management</Title2>

      <SectionCard title="Capability taxonomy" subtitle={`${capabilities.length} capabilities tracked`}>
        <Table aria-label="Capabilities table">
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Category</TableHeaderCell>
              <TableHeaderCell>Coverage</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {capabilities.map((capability) => {
              const met = capability.current_coverage >= capability.target_coverage_percent;
              return (
                <TableRow key={capability.id}>
                  <TableCell>{capability.name}</TableCell>
                  <TableCell>{capability.category}</TableCell>
                  <TableCell>
                    <div className={styles.progressCell}>
                      <ProgressBar value={Math.min(1, capability.current_coverage / 100)} />
                      <span>
                        {capability.current_coverage}% of {capability.target_coverage_percent}% target
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge appearance="filled" color={met ? 'success' : 'danger'}>
                      {met ? 'Met' : 'Gap'}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </SectionCard>
    </div>
  );
}
