'use client';

/**
 * Shared per-question-type read-only answer formatter — used by the instructor
 * grading page and the student attempt-review page so both render a student's
 * answer identically. Mirrors the response_payload contract in the backend's
 * quiz-scoring.util.js (single source of truth documented there).
 */

import { Typography, Tag } from 'antd';
import type { QuizQuestion, QuizResponse } from '@/types';

const { Text } = Typography;

const ALWAYS_MANUAL_TYPES = new Set(['long_text', 'hotspot', 'file_upload', 'formula']);

export function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function needsManualGrading(question: QuizQuestion) {
  return question.manualGrading || ALWAYS_MANUAL_TYPES.has(question.questionType);
}

export function formatAnswer(question: QuizQuestion, response: QuizResponse | undefined) {
  const payload = response?.responsePayload ?? {};
  const data = question.questionData ?? {};

  switch (question.questionType) {
    case 'single_choice':
    case 'true_false': {
      const opt = question.options.find(o => o.id === payload.selectedOptionId);
      return opt?.content ?? <Text type="secondary">(no answer)</Text>;
    }
    case 'multiple_choice': {
      const ids = (payload.selectedOptionIds as string[]) ?? [];
      const labels = question.options.filter(o => ids.includes(o.id)).map(o => o.content);
      return labels.length ? labels.join(', ') : <Text type="secondary">(no answer)</Text>;
    }
    case 'short_text':
    case 'long_text':
      return (payload.text as string) || <Text type="secondary">(no answer)</Text>;
    case 'numeric':
    case 'numeric_tolerance':
      return payload.value != null ? String(payload.value) : <Text type="secondary">(no answer)</Text>;
    case 'matching': {
      const sourceChoices = (data.sourceChoices as { id: string; text: string }[]) ?? [];
      const targetChoices = (data.targetChoices as { id: string; text: string }[]) ?? [];
      const matches = (payload.matches as Array<{ sourceId: string; targetId: string }>) ?? [];
      if (!matches.length) return <Text type="secondary">(no answer)</Text>;
      return (
        <div>
          {matches.map(m => (
            <div key={m.sourceId}>
              {sourceChoices.find(s => s.id === m.sourceId)?.text ?? m.sourceId}
              {' → '}
              {targetChoices.find(t => t.id === m.targetId)?.text ?? m.targetId}
            </div>
          ))}
        </div>
      );
    }
    case 'ordering': {
      const items = (data.items as { id: string; text: string }[]) ?? [];
      const order = (payload.order as string[]) ?? [];
      if (!order.length) return <Text type="secondary">(no answer)</Text>;
      return order.map(id => items.find(i => i.id === id)?.text ?? id).join(' → ');
    }
    case 'fill_in_blank':
    case 'multiple_fill_in_blank': {
      const answers = (payload.answers as Record<string, string>) ?? {};
      const entries = Object.entries(answers);
      if (!entries.length) return <Text type="secondary">(no answer)</Text>;
      return entries.map(([gapId, text]) => `${gapId}: ${text}`).join(', ');
    }
    default:
      return response ? JSON.stringify(payload) : <Text type="secondary">(no answer)</Text>;
  }
}

/** Correct / Incorrect / Partial credit / Pending tag for an auto- or manually-graded response. */
export function CorrectnessTag({ response }: { response: QuizResponse }) {
  if (response.finalScore == null) return <Tag color="default">Pending</Tag>;
  if (response.isCorrect === true) return <Tag color="green">Correct</Tag>;
  if (response.isCorrect === false) return <Tag color="red">Incorrect</Tag>;
  return <Tag color="gold">Partial credit</Tag>;
}
