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
import { workforceApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import type { PersonInput, PersonRead } from '../api/types';
import { SectionCard } from '../components/common/SectionCard';
import { usePersona } from '../context/PersonaContext';

const useStyles = makeStyles({
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
  },
  filters: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
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

const STATUS_OPTIONS = ['Active', 'Inactive', 'OnLeave'];
const ROLE_FAMILY_OPTIONS = ['Executive', 'Manager', 'Engineer', 'Analyst', 'Steward', 'Administrator'];

interface PersonFormValues {
  full_name: string;
  email: string;
  title: string;
  status: string;
  role_family: string;
  hire_date: string;
}

function toPersonInput(values: PersonFormValues): PersonInput {
  return {
    full_name: values.full_name,
    email: values.email,
    title: values.title,
    status: values.status,
    role_family: values.role_family,
    hire_date: values.hire_date || null,
    org_unit_id: null,
    team_id: null,
  };
}

export function WorkforcePage() {
  const styles = useStyles();
  const queryClient = useQueryClient();
  const { currentPersona } = usePersona();
  const canEdit = Boolean(currentPersona?.roles.some((r) => ['manager', 'admin'].includes(r)));

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [roleFamily, setRoleFamily] = useState<string | undefined>(undefined);
  const [selectedPerson, setSelectedPerson] = useState<PersonRead | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const peopleQuery = useQuery({
    queryKey: ['workforce', { search, status, roleFamily }],
    queryFn: () =>
      workforceApi.list({ search: search || undefined, status, role_family: roleFamily, page_size: 100 }),
  });

  const people = useMemo(() => peopleQuery.data?.items ?? [], [peopleQuery.data]);

  useEffect(() => {
    if (!selectedPerson) {
      setSelectedIndex(-1);
      return;
    }
    const index = people.findIndex((person) => person.id === selectedPerson.id);
    setSelectedIndex(index >= 0 ? index : -1);
  }, [people, selectedPerson]);

  const navigateSelectedRow = (direction: 'up' | 'down') => {
    if (people.length === 0) return;
    const nextIndex =
      selectedIndex >= 0
        ? Math.min(people.length - 1, Math.max(0, selectedIndex + (direction === 'down' ? 1 : -1)))
        : direction === 'down'
          ? 0
          : people.length - 1;
    const nextPerson = people[nextIndex];
    if (nextPerson) setSelectedPerson(nextPerson);
  };

  const { control, handleSubmit, reset } = useForm<PersonFormValues>({
    defaultValues: {
      full_name: '',
      email: '',
      title: '',
      status: 'Active',
      role_family: 'Engineer',
      hire_date: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: PersonFormValues) => workforceApi.create(toPersonInput(values)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workforce'] });
      setDialogMode(null);
      setFormError(null);
    },
    onError: (error: unknown) => {
      setFormError(error instanceof ApiError ? error.message : 'Failed to create person.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: PersonFormValues) =>
      workforceApi.update(selectedPerson!.id, { ...toPersonInput(values), version: selectedPerson!.version }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['workforce'] });
      setSelectedPerson(updated);
      setDialogMode(null);
      setFormError(null);
    },
    onError: (error: unknown) => {
      setFormError(error instanceof ApiError ? error.message : 'Failed to update person.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (person: PersonRead) => workforceApi.delete(person.id),
    onSuccess: (_, person) => {
      queryClient.invalidateQueries({ queryKey: ['workforce'] });
      setSelectedPerson((current) => (current?.id === person.id ? null : current));
    },
    onError: (error: unknown) => {
      setFormError(error instanceof ApiError ? error.message : 'Failed to delete person.');
    },
  });

  const openCreate = () => {
    reset({ full_name: '', email: '', title: '', status: 'Active', role_family: 'Engineer', hire_date: '' });
    setFormError(null);
    setDialogMode('create');
  };

  const openEdit = (person: PersonRead) => {
    reset({
      full_name: person.full_name,
      email: person.email,
      title: person.title,
      status: person.status,
      role_family: person.role_family,
      hire_date: person.hire_date ?? '',
    });
    setSelectedPerson(person);
    setFormError(null);
    setDialogMode('edit');
  };

  const onSubmit = (values: PersonFormValues) => {
    if (dialogMode === 'create') createMutation.mutate(values);
    if (dialogMode === 'edit') updateMutation.mutate(values);
  };

  const handleDelete = (person: PersonRead) => {
    if (!window.confirm(`Delete ${person.full_name}?`)) return;
    deleteMutation.mutate(person);
  };

  return (
    <div className={styles.page}>
      <Title2 as="h2">Workforce Management</Title2>

      <div className={styles.filters}>
        <Field label="Search">
          <Input value={search} onChange={(_, data) => setSearch(data.value)} placeholder="Name, email, or title" />
        </Field>
        <Field label="Status">
          <Dropdown
            placeholder="All statuses"
            selectedOptions={status ? [status] : []}
            value={status ?? ''}
            onOptionSelect={(_, data) => setStatus(data.optionValue || undefined)}
          >
            <Option value="" text="All statuses">
              All statuses
            </Option>
            {STATUS_OPTIONS.map((option) => (
              <Option key={option} value={option} text={option}>
                {option}
              </Option>
            ))}
          </Dropdown>
        </Field>
        <Field label="Role family">
          <Dropdown
            placeholder="All role families"
            selectedOptions={roleFamily ? [roleFamily] : []}
            value={roleFamily ?? ''}
            onOptionSelect={(_, data) => setRoleFamily(data.optionValue || undefined)}
          >
            <Option value="" text="All role families">
              All role families
            </Option>
            {ROLE_FAMILY_OPTIONS.map((option) => (
              <Option key={option} value={option} text={option}>
                {option}
              </Option>
            ))}
          </Dropdown>
        </Field>
        {canEdit ? (
          <Button appearance="primary" onClick={openCreate}>
            Add person
          </Button>
        ) : null}
      </div>

      <div className={styles.layout}>
        <SectionCard title="People" subtitle={`${people.length} shown`}>
          <Table
            aria-label="Workforce table"
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
                <TableHeaderCell>Title</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Role family</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.map((person, index) => {
                const isSelected = selectedPerson?.id === person.id;
                return (
                  <TableRow
                    key={person.id}
                    tabIndex={0}
                    data-selected={isSelected ? 'true' : 'false'}
                    className={isSelected ? styles.selectedRow : styles.interactiveRow}
                    onClick={(event) => {
                      event.currentTarget.focus();
                      setSelectedPerson(person);
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
                    <TableCell>{person.full_name}</TableCell>
                    <TableCell>{person.title}</TableCell>
                    <TableCell>{person.status}</TableCell>
                    <TableCell>{person.role_family}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </SectionCard>

        <SectionCard
          title="Person detail"
          action={
            selectedPerson && canEdit ? (
              <div className={styles.detailActions}>
                <Button
                  appearance="subtle"
                  icon={<Edit24Regular />}
                  aria-label={`Edit ${selectedPerson.full_name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    openEdit(selectedPerson);
                  }}
                />
                <Button
                  appearance="subtle"
                  icon={<Delete24Regular />}
                  aria-label={`Delete ${selectedPerson.full_name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDelete(selectedPerson);
                  }}
                />
              </div>
            ) : undefined
          }
        >
          {selectedPerson ? (
            <div>
              <p>
                <strong>{selectedPerson.full_name}</strong>
              </p>
              <p>{selectedPerson.title}</p>
              <p>Email: {selectedPerson.email}</p>
              <p>Status: {selectedPerson.status}</p>
              <p>Role family: {selectedPerson.role_family}</p>
              <p>Hire date: {selectedPerson.hire_date ?? 'Not recorded'}</p>
            </div>
          ) : (
            <p>Select a person from the table to view details.</p>
          )}
        </SectionCard>
      </div>

      <Dialog open={dialogMode !== null} onOpenChange={(_, data) => !data.open && setDialogMode(null)}>
        <DialogSurface>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogBody>
              <DialogTitle>{dialogMode === 'create' ? 'Add person' : 'Edit person'}</DialogTitle>
              <DialogContent
                style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM }}
              >
                {formError ? (
                  <MessageBar intent="error">
                    <MessageBarBody>
                      <MessageBarTitle>Could not save person</MessageBarTitle>
                      {formError}
                    </MessageBarBody>
                  </MessageBar>
                ) : null}
                <Controller
                  name="full_name"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Field label="Full name" required>
                      <Input {...field} />
                    </Field>
                  )}
                />
                <Controller
                  name="email"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Field label="Email" required>
                      <Input {...field} type="email" />
                    </Field>
                  )}
                />
                <Controller
                  name="title"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Field label="Title" required>
                      <Input {...field} />
                    </Field>
                  )}
                />
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Field label="Status">
                      <Dropdown
                        value={field.value}
                        selectedOptions={[field.value]}
                        onOptionSelect={(_, data) => field.onChange(data.optionValue)}
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <Option key={option} value={option} text={option}>
                            {option}
                          </Option>
                        ))}
                      </Dropdown>
                    </Field>
                  )}
                />
                <Controller
                  name="role_family"
                  control={control}
                  render={({ field }) => (
                    <Field label="Role family">
                      <Dropdown
                        value={field.value}
                        selectedOptions={[field.value]}
                        onOptionSelect={(_, data) => field.onChange(data.optionValue)}
                      >
                        {ROLE_FAMILY_OPTIONS.map((option) => (
                          <Option key={option} value={option} text={option}>
                            {option}
                          </Option>
                        ))}
                      </Dropdown>
                    </Field>
                  )}
                />
                <Controller
                  name="hire_date"
                  control={control}
                  render={({ field }) => (
                    <Field label="Hire date">
                      <Input {...field} type="date" />
                    </Field>
                  )}
                />
              </DialogContent>
              <DialogActions>
                <DialogTrigger disableButtonEnhancement>
                  <Button appearance="secondary">Cancel</Button>
                </DialogTrigger>
                <Button
                  appearance="primary"
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
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
