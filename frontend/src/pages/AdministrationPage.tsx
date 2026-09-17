import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import {
  Badge,
  Button,
  Checkbox,
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
import { announcementsApi, auditApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import type { AnnouncementInput, AnnouncementRead } from '../api/types';
import { SectionCard } from '../components/common/SectionCard';
import { usePersona } from '../context/PersonaContext';

const useStyles = makeStyles({
  page: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
});

const STATUS_OPTIONS = ['Draft', 'Scheduled', 'Published', 'Expired'];
const PRIORITY_OPTIONS = ['Low', 'Normal', 'High', 'Critical'];

interface AnnouncementFormValues {
  title: string;
  body: string;
  status: string;
  priority: string;
  featured: boolean;
}

export function AdministrationPage() {
  const styles = useStyles();
  const queryClient = useQueryClient();
  const { currentPersona } = usePersona();
  const canManage = Boolean(currentPersona?.roles.some((r) => ['publisher', 'admin'].includes(r)));

  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<AnnouncementRead | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const announcementsQuery = useQuery({
    queryKey: ['announcements', 'all'],
    queryFn: () => announcementsApi.list({ page_size: 100 }),
  });
  const auditQuery = useQuery({
    queryKey: ['audit-events', 'all'],
    queryFn: () => auditApi.list({ page_size: 50 }),
  });

  const { control, handleSubmit, reset } = useForm<AnnouncementFormValues>({
    defaultValues: { title: '', body: '', status: 'Draft', priority: 'Normal', featured: false },
  });

  const toInput = (values: AnnouncementFormValues): AnnouncementInput => ({
    title: values.title,
    body: values.body,
    status: values.status,
    priority: values.priority,
    featured: values.featured,
    effective_at: null,
    expires_at: null,
  });

  const createMutation = useMutation({
    mutationFn: (values: AnnouncementFormValues) => announcementsApi.create(toInput(values)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setDialogMode(null);
      setFormError(null);
    },
    onError: (error: unknown) =>
      setFormError(error instanceof ApiError ? error.message : 'Failed to create announcement.'),
  });

  const updateMutation = useMutation({
    mutationFn: (values: AnnouncementFormValues) =>
      announcementsApi.update(selected!.id, { ...toInput(values), version: selected!.version }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setDialogMode(null);
      setFormError(null);
    },
    onError: (error: unknown) =>
      setFormError(error instanceof ApiError ? error.message : 'Failed to update announcement.'),
  });

  const openCreate = () => {
    reset({ title: '', body: '', status: 'Draft', priority: 'Normal', featured: false });
    setFormError(null);
    setDialogMode('create');
  };

  const openEdit = (announcement: AnnouncementRead) => {
    reset({
      title: announcement.title,
      body: announcement.body,
      status: announcement.status,
      priority: announcement.priority,
      featured: announcement.featured,
    });
    setSelected(announcement);
    setFormError(null);
    setDialogMode('edit');
  };

  const onSubmit = (values: AnnouncementFormValues) => {
    if (dialogMode === 'create') createMutation.mutate(values);
    if (dialogMode === 'edit') updateMutation.mutate(values);
  };

  return (
    <div className={styles.page}>
      <Title2 as="h2">Administration</Title2>

      <SectionCard
        title="Announcements"
        subtitle="Rendered as plain text (no HTML injection)"
        action={canManage ? <Button onClick={openCreate}>New announcement</Button> : undefined}
      >
        <Table aria-label="Announcements table">
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Title</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Priority</TableHeaderCell>
              <TableHeaderCell>Featured</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(announcementsQuery.data?.items ?? []).map((announcement) => (
              <TableRow key={announcement.id}>
                <TableCell>{announcement.title}</TableCell>
                <TableCell>
                  <Badge appearance="tint">{announcement.status}</Badge>
                </TableCell>
                <TableCell>{announcement.priority}</TableCell>
                <TableCell>{announcement.featured ? 'Yes' : 'No'}</TableCell>
                <TableCell>
                  {canManage ? (
                    <Button size="small" onClick={() => openEdit(announcement)}>
                      Edit
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>

      <SectionCard title="Audit trail" subtitle="Most recent portal activity">
        <Table aria-label="Audit events table">
          <TableHeader>
            <TableRow>
              <TableHeaderCell>Entity</TableHeaderCell>
              <TableHeaderCell>Action</TableHeaderCell>
              <TableHeaderCell>Actor</TableHeaderCell>
              <TableHeaderCell>Summary</TableHeaderCell>
              <TableHeaderCell>When</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(auditQuery.data?.items ?? []).map((event) => (
              <TableRow key={event.id}>
                <TableCell>
                  {event.entity_type} #{event.entity_id}
                </TableCell>
                <TableCell>{event.action}</TableCell>
                <TableCell>{event.actor_persona_key}</TableCell>
                <TableCell>{event.summary}</TableCell>
                <TableCell>{new Date(event.created_at).toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>

      <Dialog open={dialogMode !== null} onOpenChange={(_, data) => !data.open && setDialogMode(null)}>
        <DialogSurface>
          <form onSubmit={handleSubmit(onSubmit)}>
            <DialogBody>
              <DialogTitle>{dialogMode === 'create' ? 'New announcement' : 'Edit announcement'}</DialogTitle>
              <DialogContent style={{ display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM }}>
                {formError ? (
                  <MessageBar intent="error">
                    <MessageBarBody>
                      <MessageBarTitle>Could not save announcement</MessageBarTitle>
                      {formError}
                    </MessageBarBody>
                  </MessageBar>
                ) : null}
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
                  name="body"
                  control={control}
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Field label="Body" required>
                      <Textarea {...field} />
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
                          <Option key={option} value={option} text={option}>{option}</Option>
                        ))}
                      </Dropdown>
                    </Field>
                  )}
                />
                <Controller
                  name="priority"
                  control={control}
                  render={({ field }) => (
                    <Field label="Priority">
                      <Dropdown
                        value={field.value}
                        selectedOptions={[field.value]}
                        onOptionSelect={(_, data) => field.onChange(data.optionValue)}
                      >
                        {PRIORITY_OPTIONS.map((option) => (
                          <Option key={option} value={option} text={option}>{option}</Option>
                        ))}
                      </Dropdown>
                    </Field>
                  )}
                />
                <Controller
                  name="featured"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      checked={field.value}
                      onChange={(_, data) => field.onChange(Boolean(data.checked))}
                      label="Featured"
                    />
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
