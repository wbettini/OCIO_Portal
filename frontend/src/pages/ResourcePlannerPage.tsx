import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Badge,
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
  Dropdown,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Option,
  Radio,
  RadioGroup,
  Tab,
  TabList,
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
import {
  applicationsApi,
  platformsApi,
  plannerApi,
  workforceApi,
} from '../api/endpoints';
import { ApiError } from '../api/client';
import type {
  CoverageAlert,
  PersonApplicationAssignmentRead,
  PersonPlatformAssignmentRead,
  PlannerAssignRequest,
} from '../api/types';
import { SectionCard } from '../components/common/SectionCard';
import { KpiCard } from '../components/common/KpiCard';
import { usePersona } from '../context/PersonaContext';

const useStyles = makeStyles({
  page: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  kpiGrid: { display: 'flex', flexWrap: 'wrap', gap: tokens.spacingHorizontalM },
  pickerRow: { display: 'flex', gap: tokens.spacingHorizontalM, alignItems: 'flex-end', flexWrap: 'wrap' },
});

function severityColor(severity: CoverageAlert['severity']) {
  if (severity === 'critical') return 'danger' as const;
  if (severity === 'warning') return 'warning' as const;
  return 'informative' as const;
}

interface AssignFormState {
  targetType: 'application' | 'platform';
  targetId: string;
  role: string;
  allocationPercent: string;
}

export function ResourcePlannerPage() {
  const styles = useStyles();
  const queryClient = useQueryClient();
  const { currentPersona } = usePersona();
  const canAssign = Boolean(
    currentPersona?.roles.some((r) => ['manager', 'steward', 'admin'].includes(r)),
  );

  const [selectedTab, setSelectedTab] = useState<'workforce' | 'application' | 'coverage'>(
    'workforce',
  );
  const [personId, setPersonId] = useState<number | undefined>(undefined);
  const [applicationId, setApplicationId] = useState<number | undefined>(undefined);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignForm, setAssignForm] = useState<AssignFormState>({
    targetType: 'application',
    targetId: '',
    role: '',
    allocationPercent: '',
  });
  const [assignError, setAssignError] = useState<string | null>(null);

  const peopleQuery = useQuery({
    queryKey: ['workforce', 'reference'],
    queryFn: () => workforceApi.list({ page_size: 100 }),
  });
  const applicationsQuery = useQuery({
    queryKey: ['applications', 'reference'],
    queryFn: () => applicationsApi.list({ page_size: 100 }),
  });
  const platformsQuery = useQuery({
    queryKey: ['platforms', 'reference'],
    queryFn: () => platformsApi.list({ page_size: 100 }),
  });

  const workforceViewQuery = useQuery({
    queryKey: ['planner', 'workforce', personId],
    queryFn: () => plannerApi.workforceView(personId!),
    enabled: personId !== undefined,
  });
  const applicationViewQuery = useQuery({
    queryKey: ['planner', 'application', applicationId],
    queryFn: () => plannerApi.applicationView(applicationId!),
    enabled: applicationId !== undefined,
  });
  const coverageViewQuery = useQuery({
    queryKey: ['planner', 'coverage'],
    queryFn: plannerApi.coverageView,
  });

  const people = peopleQuery.data?.items ?? [];
  const applications = applicationsQuery.data?.items ?? [];
  const platforms = platformsQuery.data?.items ?? [];

  const applicationName = (id: number) => applications.find((a) => a.id === id)?.name ?? `#${id}`;
  const platformName = (id: number) => platforms.find((p) => p.id === id)?.name ?? `#${id}`;
  const personName = (id: number) => people.find((p) => p.id === id)?.full_name ?? `#${id}`;

  const assignMutation = useMutation<
    PersonApplicationAssignmentRead | PersonPlatformAssignmentRead,
    unknown,
    PlannerAssignRequest
  >({
    mutationFn: (payload) => plannerApi.assign(personId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner', 'workforce', personId] });
      queryClient.invalidateQueries({ queryKey: ['planner', 'coverage'] });
      setAssignDialogOpen(false);
      setAssignError(null);
    },
    onError: (error: unknown) =>
      setAssignError(error instanceof ApiError ? error.message : 'Failed to create assignment.'),
  });

  const unassignApplicationMutation = useMutation({
    mutationFn: (assignmentId: number) => plannerApi.unassign(personId!, 'application', assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner', 'workforce', personId] });
      queryClient.invalidateQueries({ queryKey: ['planner', 'coverage'] });
    },
  });
  const unassignPlatformMutation = useMutation({
    mutationFn: (assignmentId: number) => plannerApi.unassign(personId!, 'platform', assignmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planner', 'workforce', personId] });
      queryClient.invalidateQueries({ queryKey: ['planner', 'coverage'] });
    },
  });

  const openAssignDialog = () => {
    setAssignForm({ targetType: 'application', targetId: '', role: '', allocationPercent: '' });
    setAssignError(null);
    setAssignDialogOpen(true);
  };

  const submitAssign = () => {
    if (!assignForm.targetId) {
      setAssignError('Select a target application or platform.');
      return;
    }
    assignMutation.mutate({
      target_type: assignForm.targetType,
      target_id: Number(assignForm.targetId),
      role: assignForm.role || null,
      allocation_percent: assignForm.allocationPercent ? Number(assignForm.allocationPercent) : null,
    });
  };

  const targetOptions = assignForm.targetType === 'application' ? applications : platforms;

  return (
    <div className={styles.page}>
      <Title2 as="h2">Resource Planner</Title2>

      <TabList
        selectedValue={selectedTab}
        onTabSelect={(_, data) => setSelectedTab(data.value as typeof selectedTab)}
      >
        <Tab value="workforce">Workforce-centric</Tab>
        <Tab value="application">Application-centric</Tab>
        <Tab value="coverage">Coverage-centric</Tab>
      </TabList>

      {selectedTab === 'workforce' ? (
        <div className={styles.page}>
          <div className={styles.pickerRow}>
            <Field label="Select a person">
              <Dropdown
                placeholder="Choose a person"
                value={personId ? personName(personId) : ''}
                selectedOptions={personId ? [String(personId)] : []}
                onOptionSelect={(_, data) => setPersonId(data.optionValue ? Number(data.optionValue) : undefined)}
              >
                {people.map((person) => (
                  <Option key={person.id} value={String(person.id)} text={person.full_name}>
                    {person.full_name}
                  </Option>
                ))}
              </Dropdown>
            </Field>
            {canAssign && personId !== undefined ? (
              <Button appearance="primary" onClick={openAssignDialog}>
                Assign to application/platform
              </Button>
            ) : null}
          </div>

          {workforceViewQuery.data ? (
            <>
              <div className={styles.kpiGrid}>
                <KpiCard label="Applications" value={workforceViewQuery.data.applications.length} />
                <KpiCard label="Platforms" value={workforceViewQuery.data.platforms.length} />
                <KpiCard label="Capabilities" value={workforceViewQuery.data.capabilities.length} />
              </div>

              <SectionCard title="Application assignments">
                <Table aria-label="Application assignments">
                  <TableHeader>
                    <TableRow>
                      <TableHeaderCell>Application</TableHeaderCell>
                      <TableHeaderCell>Role</TableHeaderCell>
                      <TableHeaderCell>Allocation %</TableHeaderCell>
                      <TableHeaderCell>Actions</TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workforceViewQuery.data.applications.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>{applicationName(assignment.application_id)}</TableCell>
                        <TableCell>{assignment.role ?? '—'}</TableCell>
                        <TableCell>{assignment.allocation_percent ?? '—'}</TableCell>
                        <TableCell>
                          {canAssign ? (
                            <Button size="small" onClick={() => unassignApplicationMutation.mutate(assignment.id)}>
                              Remove
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </SectionCard>

              <SectionCard title="Platform assignments">
                <Table aria-label="Platform assignments">
                  <TableHeader>
                    <TableRow>
                      <TableHeaderCell>Platform</TableHeaderCell>
                      <TableHeaderCell>Role</TableHeaderCell>
                      <TableHeaderCell>Allocation %</TableHeaderCell>
                      <TableHeaderCell>Actions</TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workforceViewQuery.data.platforms.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>{platformName(assignment.platform_id)}</TableCell>
                        <TableCell>{assignment.role ?? '—'}</TableCell>
                        <TableCell>{assignment.allocation_percent ?? '—'}</TableCell>
                        <TableCell>
                          {canAssign ? (
                            <Button size="small" onClick={() => unassignPlatformMutation.mutate(assignment.id)}>
                              Remove
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </SectionCard>

              <SectionCard title="Capability mappings">
                <Table aria-label="Capability mappings">
                  <TableHeader>
                    <TableRow>
                      <TableHeaderCell>Capability ID</TableHeaderCell>
                      <TableHeaderCell>Role</TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workforceViewQuery.data.capabilities.map((capability) => (
                      <TableRow key={capability.id}>
                        <TableCell>{capability.capability_id}</TableCell>
                        <TableCell>{capability.role ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </SectionCard>
            </>
          ) : null}
        </div>
      ) : null}

      {selectedTab === 'application' ? (
        <div className={styles.page}>
          <Field label="Select an application">
            <Dropdown
              placeholder="Choose an application"
              value={applicationId ? applicationName(applicationId) : ''}
              selectedOptions={applicationId ? [String(applicationId)] : []}
              onOptionSelect={(_, data) =>
                setApplicationId(data.optionValue ? Number(data.optionValue) : undefined)
              }
            >
              {applications.map((app) => (
                <Option key={app.id} value={String(app.id)} text={app.name}>
                  {app.name}
                </Option>
              ))}
            </Dropdown>
          </Field>

          {applicationViewQuery.data ? (
            <>
              {applicationViewQuery.data.alerts.length > 0 ? (
                <SectionCard title="Coverage alerts">
                  {applicationViewQuery.data.alerts.map((alert, index) => (
                    <MessageBar key={index} intent={alert.severity === 'critical' ? 'error' : alert.severity}>
                      <MessageBarBody>
                        <MessageBarTitle>{alert.category}</MessageBarTitle>
                        {alert.message}
                      </MessageBarBody>
                    </MessageBar>
                  ))}
                </SectionCard>
              ) : null}

              <SectionCard title="Supporting people">
                <Table aria-label="Supporting people">
                  <TableHeader>
                    <TableRow>
                      <TableHeaderCell>Person</TableHeaderCell>
                      <TableHeaderCell>Role</TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applicationViewQuery.data.people.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>{personName(assignment.person_id)}</TableCell>
                        <TableCell>{assignment.role ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </SectionCard>

              <SectionCard title="Platforms">
                <Table aria-label="Application platforms">
                  <TableHeader>
                    <TableRow>
                      <TableHeaderCell>Platform</TableHeaderCell>
                      <TableHeaderCell>Role</TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applicationViewQuery.data.platforms.map((relationship) => (
                      <TableRow key={relationship.id}>
                        <TableCell>{platformName(relationship.platform_id)}</TableCell>
                        <TableCell>{relationship.role ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </SectionCard>

              <SectionCard title="Required capabilities">
                <Table aria-label="Required capabilities">
                  <TableHeader>
                    <TableRow>
                      <TableHeaderCell>Capability ID</TableHeaderCell>
                      <TableHeaderCell>Role</TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applicationViewQuery.data.capabilities.map((requirement) => (
                      <TableRow key={requirement.id}>
                        <TableCell>{requirement.capability_id}</TableCell>
                        <TableCell>{requirement.role ?? '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </SectionCard>
            </>
          ) : null}
        </div>
      ) : null}

      {selectedTab === 'coverage' ? (
        <SectionCard title="Coverage alerts" subtitle="Applications, platforms, and expired assignments">
          {(coverageViewQuery.data?.alerts ?? []).length === 0 ? (
            <p>No coverage alerts at this time.</p>
          ) : (
            <Table aria-label="Coverage alerts table">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Severity</TableHeaderCell>
                  <TableHeaderCell>Category</TableHeaderCell>
                  <TableHeaderCell>Message</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(coverageViewQuery.data?.alerts ?? []).map((alert, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Badge appearance="filled" color={severityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>{alert.category}</TableCell>
                    <TableCell>{alert.message}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </SectionCard>
      ) : null}

      <Dialog open={assignDialogOpen} onOpenChange={(_, data) => setAssignDialogOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Assign person</DialogTitle>
            <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM }}>
              {assignError ? (
                <MessageBar intent="error">
                  <MessageBarBody>
                    <MessageBarTitle>Could not create assignment</MessageBarTitle>
                    {assignError}
                  </MessageBarBody>
                </MessageBar>
              ) : null}
              <Field label="Assign to">
                <RadioGroup
                  layout="horizontal"
                  value={assignForm.targetType}
                  onChange={(_, data) =>
                    setAssignForm((prev) => ({
                      ...prev,
                      targetType: data.value as 'application' | 'platform',
                      targetId: '',
                    }))
                  }
                >
                  <Radio value="application" label="Application" />
                  <Radio value="platform" label="Platform" />
                </RadioGroup>
              </Field>
              <Field label={assignForm.targetType === 'application' ? 'Application' : 'Platform'}>
                <Dropdown
                  placeholder="Select a target"
                  value={
                    targetOptions.find((t) => String(t.id) === assignForm.targetId)?.name ?? ''
                  }
                  selectedOptions={assignForm.targetId ? [assignForm.targetId] : []}
                  onOptionSelect={(_, data) =>
                    setAssignForm((prev) => ({ ...prev, targetId: data.optionValue ?? '' }))
                  }
                >
                  {targetOptions.map((target) => (
                    <Option key={target.id} value={String(target.id)} text={target.name}>
                      {target.name}
                    </Option>
                  ))}
                </Dropdown>
              </Field>
              <Field label="Role">
                <Input
                  value={assignForm.role}
                  onChange={(_, data) => setAssignForm((prev) => ({ ...prev, role: data.value }))}
                />
              </Field>
              <Field label="Allocation %">
                <Input
                  type="number"
                  value={assignForm.allocationPercent}
                  onChange={(_, data) =>
                    setAssignForm((prev) => ({ ...prev, allocationPercent: data.value }))
                  }
                />
              </Field>
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">Cancel</Button>
              </DialogTrigger>
              <Button appearance="primary" onClick={submitAssign} disabled={assignMutation.isPending}>
                Assign
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
