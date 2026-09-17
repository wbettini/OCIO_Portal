import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import {
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
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Textarea,
  Title2,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { Delete24Regular, Edit24Regular } from '@fluentui/react-icons';
import { applicationsApi, workforceApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import type { ApplicationInput, ApplicationRead } from '../api/types';
import { SectionCard } from '../components/common/SectionCard';
import { usePersona } from '../context/PersonaContext';

const useStyles = makeStyles({
  page: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  filters: { display: 'flex', gap: tokens.spacingHorizontalM, flexWrap: 'wrap', alignItems: 'flex-end' },
  layout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)',
    gap: tokens.spacingHorizontalM,
    alignItems: 'start',
  },
  detailActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalXS,
    alignItems: 'center',
  },
  interactiveRow: {
    cursor: 'pointer',
    transition: 'background-color 120ms ease, box-shadow 120ms ease',
    '&:hover': {
      backgroundColor: '#f3f7fb',
    },
    '&:focus': {
      outline: 'none',
      boxShadow: 'none',
    },
    '&:focus-visible': {
      outline: 'none',
      boxShadow: 'none',
    },
    '& td': {
      paddingTop: '8px',
      paddingBottom: '8px',
      fontWeight: 500,
    },
  },
  selectedRow: {
    backgroundColor: '#ebf3ff',
    boxShadow: `inset 4px 0 0 ${tokens.colorBrandStroke1}, inset 0 0 0 1px ${tokens.colorBrandStroke1}`,
    transition: 'background-color 120ms ease, box-shadow 120ms ease',
    '&:hover': {
      backgroundColor: '#e5f0ff',
    },
    '&:focus': {
      outline: 'none',
      boxShadow: `inset 4px 0 0 ${tokens.colorBrandStroke1}, inset 0 0 0 1px ${tokens.colorBrandStroke1}`,
    },
    '&:focus-visible': {
      outline: 'none',
      boxShadow: `inset 4px 0 0 ${tokens.colorBrandStroke1}, inset 0 0 0 1px ${tokens.colorBrandStroke1}`,
    },
    '& td': {
      paddingTop: '8px',
      paddingBottom: '8px',
      fontWeight: 600,
    },
  },
});

const CRITICALITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
const LIFECYCLE_OPTIONS = ['Planned', 'Active', 'Sunset', 'Retired'];

interface ApplicationFormValues {
  name: string;
  description: string;
  criticality: string;
  lifecycle_state: string;
  owner_person_id: string;
}

export function ApplicationsPage() {
  const styles = useStyles();
  const queryClient = useQueryClient();
  const { currentPersona } = usePersona();
  const canEdit = Boolean(
    currentPersona?.roles.some((r) => ['steward', 'publisher', 'admin'].includes(r)),
  );

  const [criticality, setCriticality] = useState<string | undefined>(undefined);
  const [lifecycleState, setLifecycleState] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<ApplicationRead | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const applicationsQuery = useQuery({
    queryKey: ['applications', { criticality, lifecycleState }],
    queryFn: () => applicationsApi.list({ criticality, lifecycle_state: lifecycleState, page_size: 100 }),
  });
  const peopleQuery = useQuery({
    queryKey: ['workforce', 'reference'],
    queryFn: () => workforceApi.list({ page_size: 100 }),
  });

  const applications = useMemo(() => applicationsQuery.data?.items ?? [], [applicationsQuery.data]);
  const people = peopleQuery.data?.items ?? [];

  useEffect(() => {
    if (!selected) {
      setSelectedIndex(-1);
      return;
    }
    const index = applications.findIndex((app) => app.id === selected.id);
    setSelectedIndex(index >= 0 ? index : -1);
  }, [applications, selected]);

  const navigateSelectedRow = (direction: 'up' | 'down') => {
    if (applications.length === 0) return;
    const nextIndex =
      selectedIndex >= 0
        ? Math.min(applications.length - 1, Math.max(0, selectedIndex + (direction === 'down' ? 1 : -1)))
        : direction === 'down'
          ? 0
          : applications.length - 1;
    const nextApp = applications[nextIndex];
    if (nextApp) setSelected(nextApp);
  };

  const ownerName = (ownerId: number | null) =>
    people.find((p) => p.id === ownerId)?.full_name ?? 'Unassigned';

  const { control, handleSubmit, reset } = useForm<ApplicationFormValues>({
    defaultValues: {
      name: '',
      description: '',
      criticality: 'Medium',
      lifecycle_state: 'Active',
      owner_person_id: '',
    },
  });

  const toInput = (values: ApplicationFormValues): ApplicationInput => ({
    name: values.name,
    description: values.description || null,
    criticality: values.criticality,
    lifecycle_state: values.lifecycle_state,
    owner_person_id: values.owner_person_id ? Number(values.owner_person_id) : null,
  });

  const createMutation = useMutation({
    mutationFn: (values: ApplicationFormValues) => applicationsApi.create(toInput(values)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      setDialogMode(null);
      setFormError(null);
    },
    onError: (error: unknown) =>
      setFormError(error instanceof ApiError ? error.message : 'Failed to create application.'),
  });

  const updateMutation = useMutation({
    mutationFn: (values: ApplicationFormValues) =>
      applicationsApi.update(selected!.id, { ...toInput(values), version: selected!.version }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      setSelected(updated);
      setDialogMode(null);
      setFormError(null);
    },
    onError: (error: unknown) =>
      setFormError(error instanceof ApiError ? error.message : 'Failed to update application.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (app: ApplicationRead) => applicationsApi.delete(app.id),
    onSuccess: (_, app) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      setSelected((current) => (current?.id === app.id ? null : current));
    },
    onError: (error: unknown) =>
      setFormError(error instanceof ApiError ? error.message : 'Failed to delete application.'),
  });

  const openCreate = () => {
    reset({ name: '', description: '', criticality: 'Medium', lifecycle_state: 'Active', owner_person_id: '' });
    setFormError(null);
    setDialogMode('create');
  };

  const openEdit = (app: ApplicationRead) => {
    reset({
      name: app.name,
      description: app.description ?? '',
      criticality: app.criticality,
      lifecycle_state: app.lifecycle_state,
      owner_person_id: app.owner_person_id ? String(app.owner_person_id) : '',
    });
    setSelected(app);
    setFormError(null);
    setDialogMode('edit');
  };

  const onSubmit = (values: ApplicationFormValues) => {
    if (dialogMode === 'create') createMutation.mutate(values);
    if (dialogMode === 'edit') updateMutation.mutate(values);
  };

  const handleDelete = (app: ApplicationRead) => {
    if (!window.confirm(`Delete ${app.name}?`)) return;
    deleteMutation.mutate(app);
  };

  return (
    <div className={styles.page}>
      <Title2 as="h2">Applications Management</Title2>

      <div className={styles.filters}>
        <Field label="Criticality">
          <Dropdown
            placeholder="All"
            selectedOptions={criticality ? [criticality] : []}
            value={criticality ?? ''}
            onOptionSelect={(_, data) => setCriticality(data.optionValue || undefined)}
          >
            <Option value="" text="All">All</Option>
            {CRITICALITY_OPTIONS.map((option) => (
              <Option key={option} value={option} text={option}>{option}</Option>
            ))}
          </Dropdown>
        </Field>
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
        {canEdit ? (
          <Button appearance="primary" onClick={openCreate}>
            Add application
          </Button>
        ) : null}
      </div>

      <div className={styles.layout}>
        <SectionCard title="Applications" subtitle={`${applications.length} shown`}>
          <Table
            aria-label="Applications table"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                navigateSelectedRow('down');
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                navigateSelectedRow('up');
              }
            }}
          >
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Name</TableHeaderCell>
                <TableHeaderCell>Criticality</TableHeaderCell>
                <TableHeaderCell>Lifecycle</TableHeaderCell>
                <TableHeaderCell>Owner</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.map((app, index) => {
                const isSelected = selected?.id === app.id;
                return (
                  <TableRow
                    key={app.id}
                    tabIndex={0}
                    data-selected={isSelected ? 'true' : 'false'}
                    className={isSelected ? styles.selectedRow : styles.interactiveRow}
                    onClick={(event) => {
                      event.currentTarget.focus();
                      setSelected(app);
                      setSelectedIndex(index);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        navigateSelectedRow('down');
                      }
                      if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        navigateSelectedRow('up');
                      }
                    }}
                  >
                    <TableCell>{app.name}</TableCell>
                    <TableCell>{app.criticality}</TableCell>
                    <TableCell>{app.lifecycle_state}</TableCell>
                    <TableCell>{ownerName(app.owner_person_id)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </SectionCard>

        <SectionCard
          title="Application detail"
          action={
            selected && canEdit ? (
              <div className={styles.detailActions}>
                <Button
                  appearance="subtle"
                  icon={<Edit24Regular />}
                  aria-label={`Edit ${selected.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    openEdit(selected);
                  }}
                />
                <Button
                  appearance="subtle"
                  icon={<Delete24Regular />}
                  aria-label={`Delete ${selected.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDelete(selected);
                  }}
                />
              </div>
            ) : undefined
          }
        >
          {selected ? (
            <div>
              <p><strong>{selected.name}</strong></p>
              <p>{selected.description ?? 'No description provided.'}</p>
              <p>Owner: {ownerName(selected.owner_person_id)}</p>
              <p>Criticality: {selected.criticality}</p>
              <p>Lifecycle: {selected.lifecycle_state}</p>
            </div>
          ) : (
            <p>Select an application from the table to view details.</p>
          )}
        </SectionCard>
      </div>

      <Dialog open={dialogMode !== null} onOpenChange={(_, data) => !data.open && setDialogMode(null)}>
        <DialogSurface>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogBody>
              <DialogTitle>{dialogMode === 'create' ? 'Add application' : 'Edit application'}</DialogTitle>
              <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM }}>
                {formError ? (
                  <MessageBar intent="error">
                    <MessageBarBody>
                      <MessageBarTitle>Could not save application</MessageBarTitle>
                      {formError}
                    </MessageBarBody>
                  </MessageBar>
                ) : null}
                <Controller
                  name="name"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Field label="Name" required>
                      <Input {...field} />
                    </Field>
                  )}
                />
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <Field label="Description">
                      <Textarea {...field} />
                    </Field>
                  )}
                />
                <Controller
                  name="criticality"
                  control={control}
                  render={({ field }) => (
                    <Field label="Criticality">
                      <Dropdown
                        value={field.value}
                        selectedOptions={[field.value]}
                        onOptionSelect={(_, data) => field.onChange(data.optionValue)}
                      >
                        {CRITICALITY_OPTIONS.map((option) => (
                          <Option key={option} value={option} text={option}>{option}</Option>
                        ))}
                      </Dropdown>
                    </Field>
                  )}
                />
                <Controller
                  name="lifecycle_state"
                  control={control}
                  render={({ field }) => (
                    <Field label="Lifecycle state">
                      <Dropdown
                        value={field.value}
                        selectedOptions={[field.value]}
                        onOptionSelect={(_, data) => field.onChange(data.optionValue)}
                      >
                        {LIFECYCLE_OPTIONS.map((option) => (
                          <Option key={option} value={option} text={option}>{option}</Option>
                        ))}
                      </Dropdown>
                    </Field>
                  )}
                />
                <Controller
                  name="owner_person_id"
                  control={control}
                  render={({ field }) => (
                    <Field label="Owner">
                      <Dropdown
                        placeholder="Unassigned"
                        value={people.find((p) => String(p.id) === field.value)?.full_name ?? ''}
                        selectedOptions={field.value ? [field.value] : []}
                        onOptionSelect={(_, data) => field.onChange(data.optionValue ?? '')}
                      >
                        <Option value="" text="Unassigned">Unassigned</Option>
                        {people.map((person) => (
                          <Option key={person.id} value={String(person.id)} text={person.full_name}>
                            {person.full_name}
                          </Option>
                        ))}
                      </Dropdown>
                    </Field>
                  )}
                />
              </DialogContent>
              <DialogActions>
                <DialogTrigger disableButtonEnhancement>
                  <Button appearance="secondary">Cancel</Button>
                </DialogTrigger>
                <Button appearance="primary" type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  Save
                </Button>
              </DialogActions>
            </DialogBody>
          </form>
        </DialogSurface>
      </Dialog>
    </div>
  );
}
