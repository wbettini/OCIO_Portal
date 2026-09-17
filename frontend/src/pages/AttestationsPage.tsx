import { useQuery } from '@tanstack/react-query';
import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Title2,
} from '@fluentui/react-components';
import { attestationsApi } from '../api/endpoints';
import { SectionCard } from '../components/common/SectionCard';
import { AppLink } from '../components/common/AppLink';
import { usePersona } from '../context/PersonaContext';

export function AttestationsPage() {
  const { personaKey, currentPersona } = usePersona();
  const canReview = Boolean(
    currentPersona?.roles.some((r) => ['manager', 'admin', 'executive'].includes(r)),
  );

  const campaignsQuery = useQuery({
    queryKey: ['attestations', 'campaigns'],
    queryFn: attestationsApi.campaigns,
  });
  const myAssignmentsQuery = useQuery({
    queryKey: ['attestations', 'assignments', 'mine', personaKey],
    queryFn: () => attestationsApi.assignments({ assignee_persona_key: personaKey, page_size: 100 }),
  });
  const reviewQueueQuery = useQuery({
    queryKey: ['attestations', 'assignments', 'review-queue'],
    queryFn: () => attestationsApi.assignments({ status: 'Submitted', page_size: 100 }),
    enabled: canReview,
  });

  const campaignName = (id: number) =>
    campaignsQuery.data?.find((c) => c.id === id)?.name ?? `Campaign #${id}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Title2 as="h2">Attestations</Title2>

      <SectionCard title="My attestations" subtitle={`Signed in as ${personaKey}`}>
        <Table aria-label="My attestations">
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Campaign</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(myAssignmentsQuery.data?.items ?? []).map((assignment) => (
              <TableRow key={assignment.id}>
                <TableCell>{campaignName(assignment.campaign_id)}</TableCell>
                <TableCell>
                  <Badge appearance="tint">{assignment.status}</Badge>
                </TableCell>
                <TableCell>
                  <AppLink to={`/attestations/${assignment.id}`}>Open</AppLink>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>

      {canReview ? (
        <SectionCard title="Review queue" subtitle="Submitted assignments awaiting review">
          <Table aria-label="Review queue">
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Campaign</TableHeaderCell>
                <TableHeaderCell>Assignee</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Actions</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(reviewQueueQuery.data?.items ?? []).map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell>{campaignName(assignment.campaign_id)}</TableCell>
                  <TableCell>{assignment.assignee_persona_key}</TableCell>
                  <TableCell>
                    <Badge appearance="tint">{assignment.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <AppLink to={`/attestations/${assignment.id}`}>Review</AppLink>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>
      ) : null}
    </div>
  );
}
