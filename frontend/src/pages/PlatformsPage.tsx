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
  Title2,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { Delete24Regular, Edit24Regular } from '@fluentui/react-icons';
import { platformsApi, workforceApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import type { PlatformInput, PlatformRead } from '../api/types';
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

const LIFECYCLE_OPTIONS = ['Planned', 'Active', 'Sunset', 'Retired'];
const SUPPORT_OPTIONS = ['Supported', 'Limited', 'Unsupported'];
const STRATEGIC_OPTIONS = ['Strategic', 'Tactical', 'Legacy'];

interface PlatformFormValues {
  name: string;
  platform_type: string;
  lifecycle_state: string;
  support_status: string;
  strategic_classification: string;
  owner_person_id: string;
}

export function PlatformsPage() {
  const styles = useStyles();
  const queryClient = useQueryClient();
  const { currentPersona } = usePersona();
  const canEdit = Boolean(
    currentPersona?.roles.some((r) => ['steward', 'publisher', 'admin'].includes(r)),
  );

  const [lifecycleState, setLifecycleState] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<PlatformRead | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const platformsQuery = useQuery({
    queryKey: ['platforms', { lifecycleState }],
    queryFn: () => platformsApi.list({ lifecycle_state: lifecycleState, page_size: 100 }),
  });
  const peopleQuery = useQuery({
    queryKey: ['workforce', 'reference'],
    queryFn: () => workforceApi.list({ page_size: 100 }),
  });

  const platforms = useMemo(() => platformsQuery.data?.items ?? [], [platformsQuery.data]);
  const people = peopleQuery.data?.items ?? [];

  useEffect(() => {
    if (!selected) {
      setSelectedIndex(-1);
      return;
    }
    const index = platforms.findIndex((platform) => platform.id === selected.id);
    setSelectedIndex(index >= 0 ? index : -1);
  }, [platforms, selected]);

  const navigateSelectedRow = (direction: 'up' | 'down') => {
    if (platforms.length === 0) return;
    const nextIndex =
      selectedIndex >= 0
        ? Math.min(platforms.length - 1, Math.max(0, selectedIndex + (direction === 'down' ? 1 : -1)))
        : direction === 'down'
          ? 0
          : platforms.length - 1;
    const nextPlatform = platforms[nextIndex];
    if (nextPlatform) setSelected(nextPlatform);
  };

  const ownerName = (ownerId: number | null) => people.find((p) => p.id === ownerId)?.full_name ?? 'Unassigned';

  const { control, handleSubmit, reset } = useForm<PlatformFormValues>({
    defaultValues: {
      name: '',
      platform_type: '',
      lifecycle_state: 'Active',
      support_status: 'Supported',
      strategic_classification: 'Strategic',
      owner_person_id: '',
    },
  });

  const toInput = (values: PlatformFormValues): PlatformInput => ({
    name: values.name,
    platform_type: values.platform_type,
    lifecycle_state: values.lifecycle_state,
    support_status: values.support_status,
    strategic_classification: values.strategic_classification,
    owner_person_id: values.owner_person_id ? Number(values.owner_person_id) : null,
  });

  const createMutation = useMutation({
    mutationFn: (values: PlatformFormValues) => platformsApi.create(toInput(values)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platforms'] });
      setDialogMode(null);
      setFormError(null);
    },
    onError: (error: unknown) =>
      setFormError(error instanceof ApiError ? error.message : 'Failed to create platform.'),
  });

  const updateMutation = useMutation({
    mutationFn: (values: PlatformFormValues) =>
      platformsApi.update(selected!.id, { ...toInput(values), version: selected!.version }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['platforms'] });
      setSelected(updated);
      setDialogMode(null);
      setFormError(null);
    },
    onError: (error: unknown) =>
      setFormError(error instanceof ApiError ? error.message : 'Failed to update platform.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (platform: PlatformRead) => platformsApi.delete(platform.id),
    onSuccess: (_, platform) => {
      queryClient.invalidateQueries({ queryKey: ['platforms'] });
      setSelected((current) => (current?.id === platform.id ? null : current));
    },
    onError: (error: unknown) =>
      setFormError(error instanceof ApiError ? error.message : 'Failed to delete platform.'),
  });

  const openCreate = () => {
    reset({
      name: '',
      platform_type: '',
      lifecycle_state: 'Active',
      support_status: 'Supported',
      strategic_classification: 'Strategic',
      owner_person_id: '',
    });
    setFormError(null);
    setDialogMode('create');
  };

  const openEdit = (platform: PlatformRead) => {
    reset({
      name: platform.name,
      platform_type: platform.platform_type,
      lifecycle_state: platform.lifecycle_state,
      support_status: platform.support_status,
      strategic_classification: platform.strategic_classification,
      owner_person_id: platform.owner_person_id ? String(platform.owner_person_id) : '',
    });
    setSelected(platform);
    setFormError(null);
    setDialogMode('edit');
  };

  const onSubmit = (values: PlatformFormValues) => {
    if (dialogMode === 'create') createMutation.mutate(values);
    if (dialogMode === 'edit') updateMutation.mutate(values);
  };

  const handleDelete = (platform: PlatformRead) => {
    if (!window.confirm(`Delete ${platform.name}?`)) return;
    deleteMutation.mutate(platform);
  };

  return (
    <div className={styles.page}>
      <Title2 as="h2">Platform Management</Title2>

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
        {canEdit ? (
          <Button appearance="primary" onClick={openCreate}>
            Add platform
          </Button>
        ) : null}
      </div>

      <div className={styles.layout}>
        <SectionCard title="Platform catalog" subtitle={`${platforms.length} shown`}>
          <Table
            aria-label="Platforms table"
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
                <TableHeaderCell>Type</TableHeaderCell>
                <TableHeaderCell>Owner</TableHeaderCell>
                <TableHeaderCell>Lifecycle</TableHeaderCell>
                <TableHeaderCell>Support status</TableHeaderCell>
                <TableHeaderCell>Strategic classification</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {platforms.map((platform, index) => {
                const isSelected = selected?.id === platform.id;
                return (
                  <TableRow
                    key={platform.id}
                    tabIndex={0}
                    data-selected={isSelected ? 'true' : 'false'}
                    className={isSelected ? styles.selectedRow : styles.interactiveRow}
                    onClick={(event) => {
                      event.currentTarget.focus();
                      setSelected(platform);
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
                    <TableCell>{platform.name}</TableCell>
                    <TableCell>{platform.platform_type}</TableCell>
                    <TableCell>{ownerName(platform.owner_person_id)}</TableCell>
                    <TableCell>{platform.lifecycle_state}</TableCell>
                    <TableCell>{platform.support_status}</TableCell>
                    <TableCell>{platform.strategic_classification}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </SectionCard>

        <SectionCard
          title="Platform detail"
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
              <p>{selected.platform_type}</p>
              <p>Owner: {ownerName(selected.owner_person_id)}</p>
              <p>Lifecycle: {selected.lifecycle_state}</p>
              <p>Support status: {selected.support_status}</p>
              <p>Strategic classification: {selected.strategic_classification}</p>
            </div>
          ) : (
            <p>Select a platform from the table to view details.</p>
          )}
        </SectionCard>
      </div>

      <Dialog open={dialogMode !== null} onOpenChange={(_, data) => !data.open && setDialogMode(null)}>
        <DialogSurface>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogBody>
              <DialogTitle>{dialogMode === 'create' ? 'Add platform' : 'Edit platform'}</DialogTitle>
              <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM }}>
                {formError ? (
                  <MessageBar intent="error">
                    <MessageBarBody>
                      <MessageBarTitle>Could not save platform</MessageBarTitle>
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
                  name="platform_type"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Field label="Type" required>
                      <Input {...field} />
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
                  name="support_status"
                  control={control}
                  render={({ field }) => (
                    <Field label="Support status">
                      <Dropdown
                        value={field.value}
                        selectedOptions={[field.value]}
                        onOptionSelect={(_, data) => field.onChange(data.optionValue)}
                      >
                        {SUPPORT_OPTIONS.map((option) => (
                          <Option key={option} value={option} text={option}>{option}</Option>
                        ))}
                      </Dropdown>
                    </Field>
                  )}
                />
                <Controller
                  name="strategic_classification"
                  control={control}
                  render={({ field }) => (
                    <Field label="Strategic classification">
                      <Dropdown
                        value={field.value}
                        selectedOptions={[field.value]}
                        onOptionSelect={(_, data) => field.onChange(data.optionValue)}
                      >
                        {STRATEGIC_OPTIONS.map((option) => (
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
