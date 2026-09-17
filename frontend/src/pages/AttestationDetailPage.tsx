import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  Checkbox,
  Dropdown,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Option,
  Textarea,
  Title2,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { attestationsApi } from '../api/endpoints';
import { ApiError } from '../api/client';
import type { AttestationAnswerInput, AttestationQuestionRead } from '../api/types';
import { SectionCard } from '../components/common/SectionCard';
import { usePersona } from '../context/PersonaContext';

const useStyles = makeStyles({
  page: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalM },
  actions: { display: 'flex', gap: tokens.spacingHorizontalM, flexWrap: 'wrap' },
});

type AnswerMap = Record<number, AttestationAnswerInput>;

function parseOptions(optionsJson: string | null): string[] {
  if (!optionsJson) return [];
  try {
    const parsed = JSON.parse(optionsJson);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function QuestionField({
  question,
  answer,
  onChange,
}: {
  question: AttestationQuestionRead;
  answer: AttestationAnswerInput | undefined;
  onChange: (value: AttestationAnswerInput) => void;
}) {
  const options = useMemo(() => parseOptions(question.options_json), [question.options_json]);

  if (question.question_type === 'boolean') {
    return (
      <Field label={question.prompt} required={question.required}>
        <Checkbox
          checked={answer?.answer_boolean ?? false}
          onChange={(_, data) =>
            onChange({ question_id: question.id, answer_boolean: Boolean(data.checked) })
          }
        />
      </Field>
    );
  }

  if (question.question_type === 'choice') {
    return (
      <Field label={question.prompt} required={question.required}>
        <Dropdown
          value={answer?.answer_choice ?? ''}
          selectedOptions={answer?.answer_choice ? [answer.answer_choice] : []}
          onOptionSelect={(_, data) =>
            onChange({ question_id: question.id, answer_choice: data.optionValue })
          }
        >
          {options.map((option) => (
            <Option key={option} value={option} text={option}>
              {option}
            </Option>
          ))}
        </Dropdown>
      </Field>
    );
  }

  if (question.question_type === 'numeric') {
    return (
      <Field label={question.prompt} required={question.required}>
        <Input
          type="number"
          value={answer?.answer_numeric?.toString() ?? ''}
          onChange={(_, data) =>
            onChange({ question_id: question.id, answer_numeric: data.value ? Number(data.value) : null })
          }
        />
      </Field>
    );
  }

  if (question.question_type === 'date') {
    return (
      <Field label={question.prompt} required={question.required}>
        <Input
          type="date"
          value={answer?.answer_date ?? ''}
          onChange={(_, data) => onChange({ question_id: question.id, answer_date: data.value || null })}
        />
      </Field>
    );
  }

  return (
    <Field label={question.prompt} required={question.required}>
      <Textarea
        value={answer?.answer_text ?? ''}
        onChange={(_, data) => onChange({ question_id: question.id, answer_text: data.value })}
      />
    </Field>
  );
}

export function AttestationDetailPage() {
  const styles = useStyles();
  const { assignmentId } = useParams();
  const id = Number(assignmentId);
  const queryClient = useQueryClient();
  const { personaKey, currentPersona } = usePersona();

  const detailQuery = useQuery({
    queryKey: ['attestations', 'detail', id],
    queryFn: () => attestationsApi.detail(id),
    enabled: Number.isFinite(id),
  });

  const [answers, setAnswers] = useState<AnswerMap>({});
  const [acknowledged, setAcknowledged] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!detailQuery.data) return;
    const nextAnswers: AnswerMap = {};
    for (const response of detailQuery.data.responses) {
      nextAnswers[response.question_id] = {
        question_id: response.question_id,
        answer_text: response.answer_text,
        answer_boolean: response.answer_boolean,
        answer_numeric: response.answer_numeric,
        answer_date: response.answer_date,
        answer_choice: response.answer_choice,
      };
    }
    setAnswers(nextAnswers);
    setAcknowledged(detailQuery.data.assignment.acknowledgement);
  }, [detailQuery.data]);

  const invalidateDetail = () => {
    queryClient.invalidateQueries({ queryKey: ['attestations', 'detail', id] });
    queryClient.invalidateQueries({ queryKey: ['attestations', 'assignments'] });
  };

  const draftMutation = useMutation({
    mutationFn: () =>
      attestationsApi.saveDraft(id, detailQuery.data!.assignment.version, Object.values(answers)),
    onSuccess: () => {
      invalidateDetail();
      setActionError(null);
    },
    onError: (error: unknown) =>
      setActionError(error instanceof ApiError ? error.message : 'Failed to save draft.'),
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      attestationsApi.submit(id, detailQuery.data!.assignment.version, Object.values(answers)),
    onSuccess: () => {
      invalidateDetail();
      setActionError(null);
    },
    onError: (error: unknown) =>
      setActionError(error instanceof ApiError ? error.message : 'Failed to submit attestation.'),
  });

  const reviewMutation = useMutation({
    mutationFn: (approve: boolean) =>
      attestationsApi.review(id, detailQuery.data!.assignment.version, approve, reviewNotes),
    onSuccess: () => {
      invalidateDetail();
      setActionError(null);
    },
    onError: (error: unknown) =>
      setActionError(error instanceof ApiError ? error.message : 'Failed to review attestation.'),
  });

  if (!detailQuery.data) {
    return (
      <div className={styles.page}>
        <Title2 as="h2">Attestation</Title2>
        <p>Loading attestation…</p>
      </div>
    );
  }

  const { assignment, definition } = detailQuery.data;
  const isOwner = assignment.assignee_persona_key === personaKey;
  const canReview = Boolean(
    currentPersona?.roles.some((r) => ['manager', 'admin', 'executive'].includes(r)),
  );

  return (
    <div className={styles.page}>
      <Title2 as="h2">{definition.name}</Title2>
      <p>{definition.description}</p>
      <p>
        Status: <strong>{assignment.status}</strong> · Assignee: {assignment.assignee_persona_key}
      </p>

      {actionError ? (
        <MessageBar intent="error">
          <MessageBarBody>
            <MessageBarTitle>Action failed</MessageBarTitle>
            {actionError}
          </MessageBarBody>
        </MessageBar>
      ) : null}

      <SectionCard title="Questions">
        {definition.questions.map((question) => (
          <QuestionField
            key={question.id}
            question={question}
            answer={answers[question.id]}
            onChange={(value) => setAnswers((prev) => ({ ...prev, [question.id]: value }))}
          />
        ))}

        {isOwner ? (
          <Checkbox
            checked={acknowledged}
            onChange={(_, data) => setAcknowledged(Boolean(data.checked))}
            label="I acknowledge the information above is accurate."
          />
        ) : null}

        {isOwner ? (
          <div className={styles.actions}>
            <Button onClick={() => draftMutation.mutate()} disabled={draftMutation.isPending}>
              Save draft
            </Button>
            <Button
              appearance="primary"
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending || !acknowledged}
            >
              Submit
            </Button>
          </div>
        ) : null}
      </SectionCard>

      {canReview && assignment.status === 'Submitted' ? (
        <SectionCard title="Review">
          <Field label="Review notes">
            <Textarea value={reviewNotes} onChange={(_, data) => setReviewNotes(data.value)} />
          </Field>
          <div className={styles.actions}>
            <Button appearance="primary" onClick={() => reviewMutation.mutate(true)}>
              Approve
            </Button>
            <Button appearance="secondary" onClick={() => reviewMutation.mutate(false)}>
              Reject
            </Button>
          </div>
        </SectionCard>
      ) : null}

      {assignment.reviewer_persona_key ? (
        <SectionCard title="Review outcome">
          <p>
            Reviewed by {assignment.reviewer_persona_key}: {assignment.review_notes ?? 'No notes provided.'}
          </p>
        </SectionCard>
      ) : null}
    </div>
  );
}
