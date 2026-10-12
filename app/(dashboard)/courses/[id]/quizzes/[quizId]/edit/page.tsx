'use client';

/**
 * Quiz Editor — instructor-facing quiz authoring page.
 * Route: /courses/:id/quizzes/:quizId/edit
 *
 * Three-step wizard (Settings → Questions → Preview). Full-page editor (not a
 * modal) — question authoring needs real screen space. Manual authoring only
 * (11 types); hotspot/file_upload/formula are only reachable via QTI import and
 * are not offered in the type selector here.
 */

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  getQuiz, updateQuiz, publishQuiz, deleteQuiz,
  listQuestions, createQuestion, updateQuestion, deleteQuestion, reorderQuestions,
} from '@/lib/quizzes';
import type {
  Quiz, QuizQuestion, QuestionType, QuizAttemptScoringMode, QuizShowPolicy, QuizGradeReleaseMode,
  DifficultyLevel, TaxonomyLevel,
} from '@/types';
import {
  Form, Input, InputNumber, Select, Switch, DatePicker, Button, Card, Steps, Tag,
  Space, Typography, Spin, Alert, Modal, Radio, Checkbox, Popconfirm, App, Row, Col, Tooltip,
  Statistic, Divider,
} from 'antd';
import {
  ArrowLeftOutlined, PlusOutlined, EditOutlined, DeleteOutlined, CopyOutlined,
  ArrowUpOutlined, ArrowDownOutlined, RocketOutlined, CheckSquareOutlined,
  DownOutlined, RightOutlined, CheckCircleFilled,
} from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';

// CKEditor is one of the heaviest deps in this app — load it only when the
// question/description editor is actually rendered.
const TextEditor = dynamic(() => import('@/components/editor/TextEditor'), {
  ssr: false,
  loading: () => <Spin size="small" />,
});

const { Text, Title, Paragraph } = Typography;

interface Props { params: Promise<{ id: string; quizId: string }> }

// Only these 11 types have a manual-authoring editor; hotspot/file_upload/formula
// are only reachable via QTI import (Phase 2a backend), not authored here.
const QUESTION_TYPE_OPTIONS: { value: QuestionType; label: string }[] = [
  { value: 'single_choice',          label: 'Single Choice' },
  { value: 'multiple_choice',        label: 'Multiple Choice' },
  { value: 'true_false',             label: 'True / False' },
  { value: 'short_text',             label: 'Short Text' },
  { value: 'long_text',              label: 'Long Text' },
  { value: 'numeric',                label: 'Numeric' },
  { value: 'numeric_tolerance',      label: 'Numeric (Tolerance)' },
  { value: 'matching',               label: 'Matching' },
  { value: 'ordering',               label: 'Ordering' },
  { value: 'fill_in_blank',          label: 'Fill in the Blank' },
  { value: 'multiple_fill_in_blank', label: 'Multiple Fill in the Blank' },
];

const QUESTION_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  QUESTION_TYPE_OPTIONS.map(o => [o.value, o.label]),
);
QUESTION_TYPE_LABEL.hotspot = 'Hotspot (QTI import only)';

const DIFFICULTY_OPTIONS: { value: DifficultyLevel; label: string }[] = [
  { value: 'easy',   label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard',   label: 'Hard' },
];
const DIFFICULTY_COLOR: Record<DifficultyLevel, string> = { easy: 'green', medium: 'blue', hard: 'red' };
const DIFFICULTY_LABEL: Record<DifficultyLevel, string> = Object.fromEntries(
  DIFFICULTY_OPTIONS.map(o => [o.value, o.label]),
) as Record<DifficultyLevel, string>;

const TAXONOMY_OPTIONS: { value: TaxonomyLevel; label: string }[] = [
  { value: 'remember',   label: 'Remember' },
  { value: 'understand', label: 'Understand' },
  { value: 'apply',      label: 'Apply' },
  { value: 'analyze',    label: 'Analyze' },
  { value: 'evaluate',   label: 'Evaluate' },
  { value: 'create',     label: 'Create' },
];
const TAXONOMY_LABEL: Record<TaxonomyLevel, string> = Object.fromEntries(
  TAXONOMY_OPTIONS.map(o => [o.value, o.label]),
) as Record<TaxonomyLevel, string>;
QUESTION_TYPE_LABEL.file_upload = 'File Upload (QTI import only)';
QUESTION_TYPE_LABEL.formula = 'Formula (QTI import only)';

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function genId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

interface OptionRow { optionIdentifier: string; content: string; isCorrect: boolean; position: number }
interface ChoiceRow { id: string; text: string }
interface BlankRow { gapId: string; acceptedAnswers: string[] }

// -- questionStatus — client-side completion check, no API call ----------------

function questionStatus(question: QuizQuestion): { label: string; color: string } {
  const isKnownType = QUESTION_TYPE_OPTIONS.some(o => o.value === question.questionType);
  if (!isKnownType) return { label: 'Read-only (QTI import)', color: 'default' };
  if (!stripHtml(question.prompt)) return { label: 'Missing prompt', color: 'red' };

  const data = question.questionData ?? {};
  switch (question.questionType) {
    case 'single_choice':
    case 'multiple_choice':
    case 'true_false':
      if (!question.options.some(o => o.isCorrect)) return { label: 'Missing answer', color: 'orange' };
      break;
    case 'short_text':
      if (!(data.acceptedAnswers as string[] | undefined)?.length) return { label: 'Missing answer', color: 'orange' };
      break;
    case 'numeric':
    case 'numeric_tolerance':
      if (data.correctValue == null) return { label: 'Missing answer', color: 'orange' };
      break;
    case 'matching':
      if (!(data.pairs as unknown[] | undefined)?.length) return { label: 'Missing answer', color: 'orange' };
      break;
    case 'ordering':
      if (!(data.correctOrder as unknown[] | undefined)?.length) return { label: 'Missing answer', color: 'orange' };
      break;
    case 'fill_in_blank':
    case 'multiple_fill_in_blank':
      if (!(data.blanks as unknown[] | undefined)?.length) return { label: 'Missing answer', color: 'orange' };
      break;
    default:
      break;
  }
  if (!question.points || question.points <= 0) return { label: 'Missing points', color: 'orange' };
  return { label: 'Complete', color: 'green' };
}

// -- renderQuestionPreview — structural, read-only, correct answers shown ------
// This is the instructor's own authoring preview (not a student-facing surface),
// so — unlike QuizAnswerDisplay's student-answer formatter — it's fine to reveal
// which option/value is correct here.

function renderQuestionPreview(question: QuizQuestion) {
  const data = question.questionData ?? {};

  switch (question.questionType) {
    case 'single_choice':
    case 'true_false':
      return (
        <Space direction="vertical" size={4}>
          {question.options.map(o => (
            <Space key={o.id}>
              {o.isCorrect ? <CheckCircleFilled style={{ color: '#059669' }} /> : <span style={{ width: 14, display: 'inline-block' }} />}
              <Text strong={o.isCorrect}>{o.content}</Text>
            </Space>
          ))}
        </Space>
      );
    case 'multiple_choice':
      return (
        <Space direction="vertical" size={4}>
          {question.options.map(o => (
            <Space key={o.id}>
              {o.isCorrect ? <CheckCircleFilled style={{ color: '#059669' }} /> : <span style={{ width: 14, display: 'inline-block' }} />}
              <Text strong={o.isCorrect}>{o.content}</Text>
            </Space>
          ))}
        </Space>
      );
    case 'short_text': {
      const answers = (data.acceptedAnswers as string[]) ?? [];
      return <Text>Accepted: {answers.length ? answers.join(', ') : <Text type="secondary">(none set)</Text>}</Text>;
    }
    case 'long_text':
      return <Text type="secondary">Manually graded — free-text response.</Text>;
    case 'numeric':
      return <Text>Correct value: {data.correctValue != null ? String(data.correctValue) : <Text type="secondary">(not set)</Text>}</Text>;
    case 'numeric_tolerance':
      return (
        <Text>
          Correct value: {data.correctValue != null ? String(data.correctValue) : '(not set)'}
          {' '}± {String(data.tolerance ?? 0)} ({(data.toleranceMode as string) ?? 'absolute'})
        </Text>
      );
    case 'matching': {
      const sourceChoices = (data.sourceChoices as { id: string; text: string }[]) ?? [];
      const targetChoices = (data.targetChoices as { id: string; text: string }[]) ?? [];
      const pairs = (data.pairs as Array<{ source: { id: string }; target: { id: string } }>) ?? [];
      if (!pairs.length) return <Text type="secondary">(no pairs set)</Text>;
      return (
        <Space direction="vertical" size={2}>
          {pairs.map((p, i) => (
            <Text key={i}>
              {sourceChoices.find(s => s.id === p.source?.id)?.text ?? '?'} → {targetChoices.find(t => t.id === p.target?.id)?.text ?? '?'}
            </Text>
          ))}
        </Space>
      );
    }
    case 'ordering': {
      const items = (data.items as { id: string; text: string }[]) ?? [];
      const order = (data.correctOrder as string[]) ?? [];
      if (!order.length) return <Text type="secondary">(no order set)</Text>;
      return <Text>{order.map(id => items.find(i => i.id === id)?.text ?? id).join(' → ')}</Text>;
    }
    case 'fill_in_blank':
    case 'multiple_fill_in_blank': {
      const blanks = (data.blanks as { gapId: string; acceptedAnswers: string[] }[]) ?? [];
      if (!blanks.length) return <Text type="secondary">(no blanks set)</Text>;
      return (
        <Space direction="vertical" size={2}>
          {blanks.map(b => (
            <Text key={b.gapId}><Tag style={{ marginRight: 4 }}>{b.gapId}</Tag>{b.acceptedAnswers?.join(', ') || '(none set)'}</Text>
          ))}
        </Space>
      );
    }
    default:
      return <Text type="secondary">Imported via QTI — structure not editable here.</Text>;
  }
}

// -- OptionListEditor (single_choice / multiple_choice / true_false) ----------

function OptionListEditor({
  options, onChange, multiple, fixedTrueFalse,
}: {
  options: OptionRow[];
  onChange: (opts: OptionRow[]) => void;
  multiple: boolean;
  fixedTrueFalse?: boolean;
}) {
  const setCorrect = (idx: number, checked: boolean) => {
    onChange(multiple
      ? options.map((o, i) => (i === idx ? { ...o, isCorrect: checked } : o))
      : options.map((o, i) => ({ ...o, isCorrect: i === idx })));
  };
  const setContent = (idx: number, content: string) => {
    onChange(options.map((o, i) => (i === idx ? { ...o, content } : o)));
  };
  const addOption = () => {
    onChange([...options, { optionIdentifier: genId('opt'), content: '', isCorrect: false, position: options.length }]);
  };
  const removeOption = (idx: number) => onChange(options.filter((_, i) => i !== idx));

  return (
    <div>
      {options.map((opt, idx) => (
        <div key={opt.optionIdentifier} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          {multiple
            ? <Checkbox checked={opt.isCorrect} onChange={e => setCorrect(idx, e.target.checked)} />
            : <Radio checked={opt.isCorrect} onChange={() => setCorrect(idx, true)} />}
          <Input
            value={opt.content}
            onChange={e => setContent(idx, e.target.value)}
            placeholder={`Option ${idx + 1}`}
            disabled={fixedTrueFalse}
            style={{ flex: 1 }}
          />
          {!fixedTrueFalse && options.length > 2 && (
            <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => removeOption(idx)} />
          )}
        </div>
      ))}
      {!fixedTrueFalse && (
        <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addOption}>Add Option</Button>
      )}
    </div>
  );
}

// -- ShortTextEditor ------------------------------------------------------------

function ShortTextEditor({
  acceptedAnswers, caseSensitive, onChange,
}: { acceptedAnswers: string[]; caseSensitive: boolean; onChange: (a: string[], c: boolean) => void }) {
  return (
    <>
      <Form.Item label="Accepted Answers" extra="Press Enter to add each accepted answer.">
        <Select
          mode="tags"
          value={acceptedAnswers}
          onChange={v => onChange(v, caseSensitive)}
          tokenSeparators={[',']}
          placeholder="Type an answer and press Enter"
        />
      </Form.Item>
      <Form.Item label="Case sensitive">
        <Switch checked={caseSensitive} onChange={v => onChange(acceptedAnswers, v)} />
      </Form.Item>
    </>
  );
}

// -- MatchingEditor ---------------------------------------------------------────

function MatchingEditor({
  sourceChoices, targetChoices, pairs, onChange,
}: {
  sourceChoices: ChoiceRow[]; targetChoices: ChoiceRow[]; pairs: Record<string, string>;
  onChange: (s: ChoiceRow[], t: ChoiceRow[], p: Record<string, string>) => void;
}) {
  const addRow = () => {
    const sId = genId('s'); const tId = genId('t');
    onChange([...sourceChoices, { id: sId, text: '' }], [...targetChoices, { id: tId, text: '' }], { ...pairs, [sId]: tId });
  };
  const removeRow = (idx: number) => {
    const s = sourceChoices[idx];
    const newSource = sourceChoices.filter((_, i) => i !== idx);
    const newPairs = { ...pairs }; delete newPairs[s.id];
    onChange(newSource, targetChoices, newPairs);
  };
  const setSourceText = (idx: number, text: string) => {
    onChange(sourceChoices.map((c, i) => (i === idx ? { ...c, text } : c)), targetChoices, pairs);
  };
  const setTargetText = (idx: number, text: string) => {
    onChange(sourceChoices, targetChoices.map((c, i) => (i === idx ? { ...c, text } : c)), pairs);
  };

  return (
    <div>
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
        Each row is a correct pair — left matches right.
      </Text>
      {sourceChoices.map((s, idx) => (
        <Row key={s.id} gutter={8} style={{ marginBottom: 8 }} align="middle">
          <Col span={10}>
            <Input value={s.text} onChange={e => setSourceText(idx, e.target.value)} placeholder="Left item" />
          </Col>
          <Col span={2} style={{ textAlign: 'center' }}>→</Col>
          <Col span={10}>
            <Input
              value={targetChoices[idx]?.text ?? ''}
              onChange={e => setTargetText(idx, e.target.value)}
              placeholder="Right item (correct match)"
            />
          </Col>
          <Col span={2}>
            {sourceChoices.length > 1 && (
              <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => removeRow(idx)} />
            )}
          </Col>
        </Row>
      ))}
      <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addRow}>Add Pair</Button>
    </div>
  );
}

// -- OrderingEditor ------------------------------------------------------------─

function OrderingEditor({ items, onChange }: { items: ChoiceRow[]; onChange: (items: ChoiceRow[]) => void }) {
  const addItem = () => onChange([...items, { id: genId('it'), text: '' }]);
  const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));
  const setText = (idx: number, text: string) => onChange(items.map((it, i) => (i === idx ? { ...it, text } : it)));
  const move = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= items.length) return;
    const copy = [...items];
    [copy[idx], copy[target]] = [copy[target], copy[idx]];
    onChange(copy);
  };

  return (
    <div>
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
        The order below IS the correct order — use the arrows to fix it.
      </Text>
      {items.map((it, idx) => (
        <div key={it.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <Text type="secondary">{idx + 1}.</Text>
          <Input value={it.text} onChange={e => setText(idx, e.target.value)} style={{ flex: 1 }} />
          <Button size="small" type="text" icon={<ArrowUpOutlined />} disabled={idx === 0} onClick={() => move(idx, -1)} />
          <Button size="small" type="text" icon={<ArrowDownOutlined />} disabled={idx === items.length - 1} onClick={() => move(idx, 1)} />
          {items.length > 1 && (
            <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => removeItem(idx)} />
          )}
        </div>
      ))}
      <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addItem}>Add Item</Button>
    </div>
  );
}

// -- FillInBlankEditor (shared: single vs multiple via maxBlanks) --------------

function FillInBlankEditor({
  blanks, onChange, maxBlanks,
}: { blanks: BlankRow[]; onChange: (b: BlankRow[]) => void; maxBlanks: number }) {
  const addBlank = () => {
    if (blanks.length >= maxBlanks) return;
    onChange([...blanks, { gapId: genId('gap'), acceptedAnswers: [] }]);
  };
  const removeBlank = (idx: number) => onChange(blanks.filter((_, i) => i !== idx));
  const setAnswers = (idx: number, answers: string[]) => {
    onChange(blanks.map((b, i) => (i === idx ? { ...b, acceptedAnswers: answers } : b)));
  };

  return (
    <div>
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
        Reference each blank as <code>{'{{'}gapId{'}}'}</code> in the prompt text above.
      </Text>
      {blanks.map((b, idx) => (
        <Row key={b.gapId} gutter={8} style={{ marginBottom: 8 }} align="middle">
          <Col span={5}><Tag>{b.gapId}</Tag></Col>
          <Col span={17}>
            <Select
              mode="tags"
              value={b.acceptedAnswers}
              onChange={v => setAnswers(idx, v)}
              placeholder="Accepted answers for this blank"
              style={{ width: '100%' }}
            />
          </Col>
          <Col span={2}>
            <Button size="small" danger type="text" icon={<DeleteOutlined />} onClick={() => removeBlank(idx)} />
          </Col>
        </Row>
      ))}
      {blanks.length < maxBlanks && (
        <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addBlank}>Add Blank</Button>
      )}
    </div>
  );
}

// -- QuestionEditorModal --------------------------------------------------------

function QuestionEditorModal({
  open, courseId, quizId, question, position, onClose, onSaved,
}: {
  open: boolean; courseId: string; quizId: string; question: QuizQuestion | null; position: number;
  onClose: () => void; onSaved: () => void;
}) {
  const { message } = App.useApp();
  const isEdit = !!question;
  const readOnlyType = isEdit && !QUESTION_TYPE_OPTIONS.some(o => o.value === question!.questionType);

  const [questionType, setQuestionType] = useState<QuestionType>(question?.questionType ?? 'single_choice');
  const [title, setTitle] = useState(question?.title ?? '');
  const [prompt, setPrompt] = useState(question?.prompt ?? '');
  const [points, setPoints] = useState(question?.points ?? 1);
  const [required, setRequired] = useState(question?.required ?? true);
  const [manualGrading, setManualGrading] = useState(question?.manualGrading ?? false);
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel | null>(question?.difficultyLevel ?? null);
  const [taxonomyLevel, setTaxonomyLevel] = useState<TaxonomyLevel | null>(question?.taxonomyLevel ?? null);
  const [saving, setSaving] = useState(false);

  const [options, setOptions] = useState<OptionRow[]>(() => {
    if (question?.options?.length) {
      return question.options.map(o => ({ optionIdentifier: o.optionIdentifier, content: o.content, isCorrect: !!o.isCorrect, position: o.position }));
    }
    return [
      { optionIdentifier: genId('opt'), content: '', isCorrect: true, position: 0 },
      { optionIdentifier: genId('opt'), content: '', isCorrect: false, position: 1 },
    ];
  });
  const [acceptedAnswers, setAcceptedAnswers] = useState<string[]>((question?.questionData?.acceptedAnswers as string[]) ?? []);
  const [caseSensitive, setCaseSensitive] = useState<boolean>(!!question?.questionData?.caseSensitive);
  const [correctValue, setCorrectValue] = useState<number | null>((question?.questionData?.correctValue as number) ?? null);
  const [tolerance, setTolerance] = useState<number | null>((question?.questionData?.tolerance as number) ?? null);
  const [toleranceMode, setToleranceMode] = useState<'absolute' | 'relative'>((question?.questionData?.toleranceMode as 'absolute' | 'relative') ?? 'absolute');
  const [sourceChoices, setSourceChoices] = useState<ChoiceRow[]>((question?.questionData?.sourceChoices as ChoiceRow[]) ?? [{ id: genId('s'), text: '' }]);
  const [targetChoices, setTargetChoices] = useState<ChoiceRow[]>((question?.questionData?.targetChoices as ChoiceRow[]) ?? [{ id: genId('t'), text: '' }]);
  const [pairs, setPairs] = useState<Record<string, string>>(() => {
    const p = (question?.questionData?.pairs as Array<{ source: { id: string }; target: { id: string } }>) ?? [];
    return Object.fromEntries(p.map(x => [x.source.id, x.target.id]));
  });
  const [orderItems, setOrderItems] = useState<ChoiceRow[]>((question?.questionData?.items as ChoiceRow[]) ?? [{ id: genId('it'), text: '' }]);
  const [blanks, setBlanks] = useState<BlankRow[]>((question?.questionData?.blanks as BlankRow[]) ?? [{ gapId: genId('gap'), acceptedAnswers: [] }]);

  const handleTypeChange = (t: QuestionType) => {
    setQuestionType(t);
    if (t === 'true_false') {
      setOptions([
        { optionIdentifier: 'true', content: 'True', isCorrect: true, position: 0 },
        { optionIdentifier: 'false', content: 'False', isCorrect: false, position: 1 },
      ]);
    }
    if (t === 'long_text') setManualGrading(true);
  };

  const handleSave = async () => {
    const plainPrompt = stripHtml(prompt);
    if (!plainPrompt) { message.error('Question prompt is required.'); return; }
    if (['single_choice', 'multiple_choice', 'true_false'].includes(questionType) && !options.some(o => o.isCorrect)) {
      message.error('Mark at least one option as correct.'); return;
    }

    let questionData: Record<string, unknown> = {};
    switch (questionType) {
      case 'short_text': questionData = { acceptedAnswers, caseSensitive }; break;
      case 'numeric': questionData = { correctValue }; break;
      case 'numeric_tolerance': questionData = { correctValue, tolerance, toleranceMode }; break;
      case 'matching':
        questionData = {
          sourceChoices, targetChoices,
          pairs: Object.entries(pairs).map(([sourceId, targetId]) => ({
            source: sourceChoices.find(s => s.id === sourceId), target: targetChoices.find(t => t.id === targetId),
          })),
        };
        break;
      case 'ordering': questionData = { items: orderItems, correctOrder: orderItems.map(i => i.id) }; break;
      case 'fill_in_blank':
      case 'multiple_fill_in_blank': questionData = { blanks, wordBank: [] }; break;
      default: questionData = {};
    }

    const payload = {
      questionType, prompt, points, required,
      title: title.trim() || null,
      manualGrading: questionType === 'long_text' ? true : manualGrading,
      difficultyLevel, taxonomyLevel,
      position,
      ...(['single_choice', 'multiple_choice', 'true_false'].includes(questionType) ? { options } : { questionData }),
    };

    setSaving(true);
    try {
      if (isEdit) await updateQuestion(courseId, quizId, question!.id, payload);
      else await createQuestion(courseId, quizId, payload);
      message.success(isEdit ? 'Question updated.' : 'Question added.');
      onSaved();
      onClose();
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      message.error(e.detail ?? e.title ?? 'Failed to save question.');
    } finally { setSaving(false); }
  };

  const isOptionBased = ['single_choice', 'multiple_choice', 'true_false'].includes(questionType);

  return (
    <Modal
      open={open}
      title={isEdit ? 'Edit Question' : 'Add Question'}
      onCancel={onClose}
      onOk={readOnlyType ? onClose : handleSave}
      okText={readOnlyType ? 'Close' : 'Save'}
      cancelButtonProps={readOnlyType ? { style: { display: 'none' } } : undefined}
      confirmLoading={saving}
      width={720}
      destroyOnHidden
    >
      {readOnlyType ? (
        <Alert
          type="info"
          showIcon
          message={`This question type (${QUESTION_TYPE_LABEL[question!.questionType] ?? question!.questionType}) was imported via QTI and isn't editable in this manual authoring UI yet.`}
        />
      ) : (
        <Form layout="vertical" style={{ marginTop: 8 }}>
          {!isEdit && (
            <Form.Item label="Question Type" required>
              <Radio.Group
                value={questionType}
                onChange={e => handleTypeChange(e.target.value)}
                style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}
              >
                {QUESTION_TYPE_OPTIONS.map(opt => (
                  <Radio.Button key={opt.value} value={opt.value} style={{ fontSize: 12 }}>{opt.label}</Radio.Button>
                ))}
              </Radio.Group>
            </Form.Item>
          )}

          <Form.Item label="Title" extra="Optional — a short internal label for this question, distinct from the prompt shown to students.">
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. OSI Layer 4 Protocol" />
          </Form.Item>

          <Form.Item label="Question Body" required>
            <TextEditor body={prompt} onChange={setPrompt} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item label="Points">
                <InputNumber style={{ width: '100%' }} min={0} value={points} onChange={v => setPoints(v ?? 1)} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Required">
                <Switch checked={required} onChange={setRequired} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Manual Grading">
                <Switch checked={questionType === 'long_text' ? true : manualGrading} disabled={questionType === 'long_text'} onChange={setManualGrading} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Difficulty">
                <Select
                  allowClear
                  placeholder="Not set"
                  value={difficultyLevel ?? undefined}
                  onChange={v => setDifficultyLevel(v ?? null)}
                  options={DIFFICULTY_OPTIONS}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Taxonomy (Bloom's)">
                <Select
                  allowClear
                  placeholder="Not set"
                  value={taxonomyLevel ?? undefined}
                  onChange={v => setTaxonomyLevel(v ?? null)}
                  options={TAXONOMY_OPTIONS}
                />
              </Form.Item>
            </Col>
          </Row>

          {isOptionBased && (
            <Form.Item label="Options" required>
              <OptionListEditor
                options={options}
                onChange={setOptions}
                multiple={questionType === 'multiple_choice'}
                fixedTrueFalse={questionType === 'true_false'}
              />
            </Form.Item>
          )}

          {questionType === 'short_text' && (
            <ShortTextEditor
              acceptedAnswers={acceptedAnswers}
              caseSensitive={caseSensitive}
              onChange={(a, c) => { setAcceptedAnswers(a); setCaseSensitive(c); }}
            />
          )}

          {questionType === 'long_text' && (
            <Alert type="info" showIcon message="Long text answers always require manual grading — no auto-scoring config needed." />
          )}

          {questionType === 'numeric' && (
            <Form.Item label="Correct Value" required>
              <InputNumber style={{ width: '100%' }} value={correctValue ?? undefined} onChange={v => setCorrectValue(v ?? null)} />
            </Form.Item>
          )}

          {questionType === 'numeric_tolerance' && (
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item label="Correct Value" required>
                  <InputNumber style={{ width: '100%' }} value={correctValue ?? undefined} onChange={v => setCorrectValue(v ?? null)} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Tolerance" required>
                  <InputNumber style={{ width: '100%' }} min={0} value={tolerance ?? undefined} onChange={v => setTolerance(v ?? null)} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Tolerance Mode">
                  <Radio.Group value={toleranceMode} onChange={e => setToleranceMode(e.target.value)}>
                    <Radio.Button value="absolute">Absolute</Radio.Button>
                    <Radio.Button value="relative">Relative</Radio.Button>
                  </Radio.Group>
                </Form.Item>
              </Col>
            </Row>
          )}

          {questionType === 'matching' && (
            <Form.Item label="Pairs" required>
              <MatchingEditor
                sourceChoices={sourceChoices}
                targetChoices={targetChoices}
                pairs={pairs}
                onChange={(s, t, p) => { setSourceChoices(s); setTargetChoices(t); setPairs(p); }}
              />
            </Form.Item>
          )}

          {questionType === 'ordering' && (
            <Form.Item label="Items (in correct order)" required>
              <OrderingEditor items={orderItems} onChange={setOrderItems} />
            </Form.Item>
          )}

          {(questionType === 'fill_in_blank' || questionType === 'multiple_fill_in_blank') && (
            <Form.Item label="Blanks" required>
              <FillInBlankEditor
                blanks={blanks}
                onChange={setBlanks}
                maxBlanks={questionType === 'fill_in_blank' ? 1 : 10}
              />
            </Form.Item>
          )}
        </Form>
      )}
    </Modal>
  );
}

// -- QuestionList ----------------------------------------------------------────
// Presentational — questions/reload are owned by the parent so the Questions
// step's summary cards and the Preview step can share the same loaded data.

function QuestionList({
  courseId, quizId, questions, onReload,
}: { courseId: string; quizId: string; questions: QuizQuestion[]; onReload: () => void }) {
  const { message } = App.useApp();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const handleDelete = async (questionId: string) => {
    try {
      await deleteQuestion(courseId, quizId, questionId);
      message.success('Question deleted.');
      onReload();
    } catch { message.error('Failed to delete question.'); }
  };

  const handleDuplicate = async (q: QuizQuestion) => {
    const isOptionBased = ['single_choice', 'multiple_choice', 'true_false'].includes(q.questionType);
    const payload = {
      questionType: q.questionType, prompt: q.prompt, points: q.points, required: q.required,
      manualGrading: q.manualGrading, position: questions.length,
      ...(isOptionBased
        ? { options: q.options.map(o => ({ optionIdentifier: genId('opt'), content: o.content, isCorrect: !!o.isCorrect, position: o.position })) }
        : { questionData: q.questionData }),
    };
    try {
      await createQuestion(courseId, quizId, payload);
      message.success('Question duplicated.');
      onReload();
    } catch { message.error('Failed to duplicate question.'); }
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= questions.length) return;
    const order = questions.map(q => q.id);
    [order[idx], order[target]] = [order[target], order[idx]];
    try {
      await reorderQuestions(courseId, quizId, order);
      onReload();
    } catch { message.error('Failed to reorder questions.'); }
  };

  return (
    <div>
      {!questions.length && (
        <Alert type="info" showIcon message="No questions yet" description="Add your first question below." style={{ marginBottom: 12 }} />
      )}
      {questions.map((q, idx) => {
        const status = questionStatus(q);
        const isExpanded = !!expanded[q.id];
        return (
          <Card key={q.id} size="small" style={{ marginBottom: 8 }} styles={{ body: { padding: '10px 14px' } }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <Button
                size="small" type="text"
                icon={isExpanded ? <DownOutlined /> : <RightOutlined />}
                onClick={() => setExpanded(prev => ({ ...prev, [q.id]: !prev[q.id] }))}
              />
              <Text type="secondary" style={{ width: 20, marginTop: 4 }}>{idx + 1}.</Text>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Space wrap size={4} style={{ marginBottom: 4 }}>
                  <Tag color="blue">{QUESTION_TYPE_LABEL[q.questionType] ?? q.questionType}</Tag>
                  <Tag>{q.points} pts</Tag>
                  {q.required && <Tag color="orange">Required</Tag>}
                  {q.manualGrading && <Tag color="gold">Manual grading</Tag>}
                  {q.difficultyLevel && <Tag color={DIFFICULTY_COLOR[q.difficultyLevel]}>{DIFFICULTY_LABEL[q.difficultyLevel]}</Tag>}
                  {q.taxonomyLevel && <Tag>{TAXONOMY_LABEL[q.taxonomyLevel]}</Tag>}
                  <Tag color={status.color}>{status.label}</Tag>
                </Space>
                {q.title && (
                  <Text strong style={{ display: 'block', fontSize: 13 }} ellipsis>{q.title}</Text>
                )}
                <Text
                  type={q.title ? 'secondary' : undefined}
                  style={{ display: 'block', fontSize: q.title ? 12 : 13 }}
                  ellipsis
                >
                  {stripHtml(q.prompt) || <Text type="secondary">(empty prompt)</Text>}
                </Text>
                {isExpanded && (
                  <div style={{ background: '#F9FAFB', border: '1px solid #DDDEDF', borderRadius: 8, padding: 10, marginTop: 8 }}>
                    {renderQuestionPreview(q)}
                  </div>
                )}
              </div>
              <Space size={2}>
                <Button size="small" type="text" icon={<ArrowUpOutlined />} disabled={idx === 0} onClick={() => move(idx, -1)} />
                <Button size="small" type="text" icon={<ArrowDownOutlined />} disabled={idx === questions.length - 1} onClick={() => move(idx, 1)} />
                <Tooltip title="Duplicate">
                  <Button size="small" type="text" icon={<CopyOutlined />} onClick={() => handleDuplicate(q)} />
                </Tooltip>
                <Button size="small" type="text" icon={<EditOutlined />} onClick={() => { setEditingQuestion(q); setEditorOpen(true); }} />
                <Popconfirm title="Delete this question?" onConfirm={() => handleDelete(q.id)} okButtonProps={{ danger: true }}>
                  <Button size="small" danger type="text" icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            </div>
          </Card>
        );
      })}

      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={() => { setEditingQuestion(null); setEditorOpen(true); }}
        block
        style={{ marginTop: 8 }}
      >
        Add Question
      </Button>

      {editorOpen && (
        <QuestionEditorModal
          open={editorOpen}
          courseId={courseId}
          quizId={quizId}
          question={editingQuestion}
          position={questions.length}
          onClose={() => setEditorOpen(false)}
          onSaved={onReload}
        />
      )}
    </div>
  );
}

// -- QuizSettingsForm ------------------------------------------------------────
// `form` is created by the parent so the wizard's "Save & Continue" footer
// button can trigger this form's submission from outside the component.

function QuizSettingsForm({
  form, courseId, quiz, onSaved,
}: { form: ReturnType<typeof Form.useForm<QuizSettingsFieldValues>>[0]; courseId: string; quiz: Quiz; onSaved: (q: Quiz) => void }) {
  const { message } = App.useApp();
  const [description, setDescription] = useState(quiz.description ?? '');
  const [instructions, setInstructions] = useState(quiz.instructions ?? '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    form.setFieldsValue({
      title: quiz.title,
      pointsPossible: quiz.pointsPossible,
      passingScore: quiz.passingScore,
      passingPercentage: quiz.passingPercentage,
      maxAttempts: quiz.maxAttempts,
      attemptScoringMode: quiz.attemptScoringMode,
      timeLimitMinutes: quiz.timeLimitSeconds ? Math.round(quiz.timeLimitSeconds / 60) : null,
      shuffleQuestions: quiz.shuffleQuestions,
      shuffleAnswers: quiz.shuffleAnswers,
      oneQuestionAtATime: quiz.oneQuestionAtATime,
      allowBackNavigation: quiz.allowBackNavigation,
      showScorePolicy: quiz.showScorePolicy,
      showAnswersPolicy: quiz.showAnswersPolicy,
      gradeReleaseMode: quiz.gradeReleaseMode,
      availableFrom: quiz.availableFrom ? dayjs(quiz.availableFrom) : null,
      dueAt: quiz.dueAt ? dayjs(quiz.dueAt) : null,
      availableUntil: quiz.availableUntil ? dayjs(quiz.availableUntil) : null,
    });
    setDescription(quiz.description ?? '');
    setInstructions(quiz.instructions ?? '');
  }, [quiz, form]);

  async function handleSave(values: QuizSettingsFieldValues) {
    setSaving(true);
    try {
      const updated = await updateQuiz(courseId, quiz.id, {
        title: values.title.trim(),
        description,
        instructions,
        pointsPossible: values.pointsPossible,
        passingScore: values.passingScore ?? null,
        passingPercentage: values.passingPercentage ?? null,
        maxAttempts: values.maxAttempts,
        attemptScoringMode: values.attemptScoringMode,
        timeLimitSeconds: values.timeLimitMinutes ? values.timeLimitMinutes * 60 : null,
        shuffleQuestions: values.shuffleQuestions,
        shuffleAnswers: values.shuffleAnswers,
        oneQuestionAtATime: values.oneQuestionAtATime,
        allowBackNavigation: values.allowBackNavigation,
        showScorePolicy: values.showScorePolicy,
        showAnswersPolicy: values.showAnswersPolicy,
        gradeReleaseMode: values.gradeReleaseMode,
        availableFrom: values.availableFrom ? values.availableFrom.toISOString() : null,
        dueAt: values.dueAt ? values.dueAt.toISOString() : null,
        availableUntil: values.availableUntil ? values.availableUntil.toISOString() : null,
      });
      onSaved(updated);
      message.success('Quiz settings saved.');
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      message.error(e.detail ?? e.title ?? 'Failed to save settings.');
      throw err;
    } finally { setSaving(false); }
  }

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
          Basic information
        </Text>
        <Row gutter={16}>
          <Col span={12}>
            <Text style={{ display: 'block', marginBottom: 6 }}>Quiz delivery type</Text>
            <Radio.Group value="computer" disabled>
              <Radio value="computer">Computer based</Radio>
              <Radio value="paper">Paper based <Tag style={{ marginLeft: 4 }}>Coming soon</Tag></Radio>
            </Radio.Group>
          </Col>
          <Col span={12}>
            <Text style={{ display: 'block', marginBottom: 6 }}>Creation method</Text>
            <Radio.Group value="quick" disabled>
              <Radio value="quick">Quick Quiz</Radio>
              <Radio value="manual">Manual Selection <Tag style={{ marginLeft: 4 }}>Coming soon</Tag></Radio>
              <Radio value="blueprint">Blueprint <Tag style={{ marginLeft: 4 }}>Coming soon</Tag></Radio>
            </Radio.Group>
          </Col>
        </Row>
      </Card>

      <Card>
        <Form form={form} layout="vertical" onFinish={handleSave} requiredMark={false}>
          <Form.Item label="Title" name="title" rules={[{ required: true, message: 'Title is required.' }]}>
            <Input size="large" />
          </Form.Item>

          <Form.Item label="Description">
            <TextEditor body={description} onChange={setDescription} />
          </Form.Item>
          <Form.Item label="Instructions">
            <TextEditor body={instructions} onChange={setInstructions} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Points Possible" name="pointsPossible">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Passing Score" name="passingScore">
                <InputNumber style={{ width: '100%' }} min={0} placeholder="Optional" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Passing Percentage" name="passingPercentage">
                <InputNumber style={{ width: '100%' }} min={0} max={100} placeholder="Optional" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Max Attempts" name="maxAttempts">
                <InputNumber style={{ width: '100%' }} min={1} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Attempt Scoring Mode" name="attemptScoringMode">
                <Select options={[
                  { value: 'latest', label: 'Latest Attempt' },
                  { value: 'highest', label: 'Highest Attempt' },
                  { value: 'first', label: 'First Attempt' },
                  { value: 'average', label: 'Average of Attempts' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Time Limit (minutes)" name="timeLimitMinutes">
                <InputNumber style={{ width: '100%' }} min={1} placeholder="No limit" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={6}><Form.Item label="Shuffle Questions" name="shuffleQuestions" valuePropName="checked"><Switch /></Form.Item></Col>
            <Col span={6}><Form.Item label="Shuffle Answers" name="shuffleAnswers" valuePropName="checked"><Switch /></Form.Item></Col>
            <Col span={6}><Form.Item label="One Question at a Time" name="oneQuestionAtATime" valuePropName="checked"><Switch /></Form.Item></Col>
            <Col span={6}><Form.Item label="Allow Back Navigation" name="allowBackNavigation" valuePropName="checked"><Switch /></Form.Item></Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Show Score" name="showScorePolicy">
                <Select options={[
                  { value: 'immediately', label: 'Immediately' },
                  { value: 'after_due_date', label: 'After Due Date' },
                  { value: 'after_final_attempt', label: 'After Final Attempt' },
                  { value: 'never', label: 'Never' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Show Correct Answers" name="showAnswersPolicy">
                <Select options={[
                  { value: 'immediately', label: 'Immediately' },
                  { value: 'after_due_date', label: 'After Due Date' },
                  { value: 'after_final_attempt', label: 'After Final Attempt' },
                  { value: 'never', label: 'Never' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Grade Release" name="gradeReleaseMode">
                <Select options={[
                  { value: 'automatic', label: 'Automatic' },
                  { value: 'instructor_approval', label: 'Instructor Approval' },
                ]} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Available From" name="availableFrom">
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Due Date" name="dueAt">
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Available Until" name="availableUntil">
                <DatePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
          {saving && <Spin size="small" />}
        </Form>
      </Card>
    </div>
  );
}

interface QuizSettingsFieldValues {
  title: string; pointsPossible: number; passingScore: number | null; passingPercentage: number | null;
  maxAttempts: number; attemptScoringMode: QuizAttemptScoringMode; timeLimitMinutes: number | null;
  shuffleQuestions: boolean; shuffleAnswers: boolean; oneQuestionAtATime: boolean; allowBackNavigation: boolean;
  showScorePolicy: QuizShowPolicy; showAnswersPolicy: QuizShowPolicy; gradeReleaseMode: QuizGradeReleaseMode;
  availableFrom: Dayjs | null; dueAt: Dayjs | null; availableUntil: Dayjs | null;
}

// -- Preview step ----------------------------------------------------------────

function PreviewStep({ quiz, questions }: { quiz: Quiz; questions: QuizQuestion[] }) {
  const totalPoints = questions.reduce((sum, q) => sum + Number(q.points), 0);
  const blockers: string[] = [];
  if (!quiz.title?.trim()) blockers.push('Quiz title is missing.');
  if (!questions.length) blockers.push('This quiz has no questions yet.');

  return (
    <div>
      {blockers.length === 0 ? (
        <Alert
          type="success" showIcon
          message="Ready to publish"
          description={`${questions.length} question${questions.length !== 1 ? 's' : ''} · ${totalPoints} points`}
          style={{ marginBottom: 16 }}
        />
      ) : (
        <Alert
          type="error" showIcon
          message="Not ready to publish"
          description={<ul style={{ margin: 0, paddingLeft: 18 }}>{blockers.map(b => <li key={b}>{b}</li>)}</ul>}
          style={{ marginBottom: 16 }}
        />
      )}

      <Card style={{ marginBottom: 16 }}>
        <Title level={4} style={{ marginTop: 0 }}>{quiz.title || 'Untitled Quiz'}</Title>
        {quiz.description && <Paragraph>{stripHtml(quiz.description)}</Paragraph>}
        {quiz.instructions && (
          <Paragraph type="secondary" style={{ fontSize: 13 }}>{stripHtml(quiz.instructions)}</Paragraph>
        )}
        <Space wrap size={6}>
          <Tag>{totalPoints} points</Tag>
          <Tag>{questions.length} questions</Tag>
          <Tag>{quiz.maxAttempts} attempt{quiz.maxAttempts !== 1 ? 's' : ''}</Tag>
          {quiz.timeLimitSeconds ? <Tag>{Math.round(quiz.timeLimitSeconds / 60)} min limit</Tag> : <Tag>No time limit</Tag>}
          {quiz.passingPercentage != null && <Tag>Pass at {quiz.passingPercentage}%</Tag>}
          {quiz.passingScore != null && <Tag>Pass at {quiz.passingScore} pts</Tag>}
          {quiz.availableFrom && <Tag>From {new Date(quiz.availableFrom).toLocaleString()}</Tag>}
          {quiz.dueAt && <Tag>Due {new Date(quiz.dueAt).toLocaleString()}</Tag>}
        </Space>
      </Card>

      {questions.map((q, idx) => (
        <Card key={q.id} size="small" style={{ marginBottom: 10 }}>
          <Space wrap size={6} style={{ marginBottom: 6 }}>
            <Text type="secondary">Question {idx + 1}</Text>
            <Tag color="blue">{QUESTION_TYPE_LABEL[q.questionType] ?? q.questionType}</Tag>
            <Tag>{q.points} pts</Tag>
            {q.required && <Tag color="orange">Required</Tag>}
            {q.difficultyLevel && <Tag color={DIFFICULTY_COLOR[q.difficultyLevel]}>{DIFFICULTY_LABEL[q.difficultyLevel]}</Tag>}
            {q.taxonomyLevel && <Tag>{TAXONOMY_LABEL[q.taxonomyLevel]}</Tag>}
          </Space>
          {q.title && <Text strong style={{ display: 'block', marginBottom: 2 }}>{q.title}</Text>}
          <Paragraph style={{ marginBottom: 6 }}>{stripHtml(q.prompt) || <Text type="secondary">(empty prompt)</Text>}</Paragraph>
          <div style={{ background: '#F9FAFB', border: '1px solid #DDDEDF', borderRadius: 8, padding: 10 }}>
            {renderQuestionPreview(q)}
          </div>
        </Card>
      ))}
    </div>
  );
}

// -- Main page ------------------------------------------------------------────

export default function QuizEditorPage({ params }: Props) {
  const { id: courseId, quizId } = use(params);
  const router = useRouter();
  const { message } = App.useApp();
  const [settingsForm] = Form.useForm<QuizSettingsFieldValues>();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [step, setStep] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    try {
      const [q, qs] = await Promise.all([getQuiz(courseId, quizId), listQuestions(courseId, quizId)]);
      setQuiz(q);
      setQuestions(qs);
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      setPageError(e.detail ?? e.title ?? 'Failed to load quiz.');
    } finally { setLoading(false); }
  }, [courseId, quizId]);

  useEffect(() => { load(); }, [load]);

  const reloadQuestions = useCallback(async () => {
    try {
      const qs = await listQuestions(courseId, quizId);
      setQuestions(qs);
    } catch { /* keep previous list on transient failure */ }
  }, [courseId, quizId]);

  async function handlePublish() {
    setPublishing(true);
    try {
      const updated = await publishQuiz(courseId, quizId);
      setQuiz(updated);
      message.success('Quiz published.');
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      message.error(e.detail ?? e.title ?? 'Failed to publish quiz.');
    } finally { setPublishing(false); }
  }

  async function handleDelete() {
    try {
      await deleteQuiz(courseId, quizId);
      message.success('Quiz deleted.');
      router.push(`/courses/${courseId}/edit`);
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      message.error(e.detail ?? e.title ?? 'Failed to delete quiz.');
    }
  }

  const handleSaveAndContinue = () => {
    settingsForm.submit();
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;

  if (pageError || !quiz) {
    return (
      <Alert
        type="error" showIcon message={pageError ?? 'Quiz not found'}
        action={<Link href={`/courses/${courseId}/edit`}><Button size="small">Back to Course</Button></Link>}
      />
    );
  }

  const statusColor = quiz.status === 'published' ? 'green' : quiz.status === 'archived' ? 'default' : 'orange';
  const totalPoints = questions.reduce((sum, q) => sum + Number(q.points), 0);
  const typeCounts = questions.reduce<Record<string, number>>((acc, q) => {
    acc[q.questionType] = (acc[q.questionType] ?? 0) + 1;
    return acc;
  }, {});

  const handleQuestionsNext = () => {
    if (!questions.length) { message.error('Add at least one question before continuing.'); return; }
    setStep(2);
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <Link href={`/courses/${courseId}/edit`}><Button icon={<ArrowLeftOutlined />}>Course</Button></Link>
        <Title level={4} style={{ margin: 0 }}>{quiz.title}</Title>
        <Tag color={statusColor}>{quiz.status}</Tag>
        <div style={{ flex: 1 }} />
        {quiz.status === 'published' && (
          <Link href={`/courses/${courseId}/quizzes/${quizId}/grade`}>
            <Button icon={<CheckSquareOutlined />}>Grade Submissions</Button>
          </Link>
        )}
        <Popconfirm title="Delete this quiz?" description="This cannot be undone." onConfirm={handleDelete} okButtonProps={{ danger: true }}>
          <Button danger icon={<DeleteOutlined />}>Delete</Button>
        </Popconfirm>
      </div>

      <Steps
        current={step}
        onChange={s => { if (s < step) setStep(s); }}
        items={[
          { title: 'Settings' },
          { title: `Questions (${questions.length})` },
          { title: 'Preview' },
        ]}
        style={{ marginBottom: 20 }}
      />

      <div style={{ marginBottom: 20 }}>
        {step === 0 && (
          <QuizSettingsForm form={settingsForm} courseId={courseId} quiz={quiz} onSaved={q => { setQuiz(q); setStep(1); }} />
        )}

        {step === 1 && (
          <div>
            <Row gutter={12} style={{ marginBottom: 16 }}>
              <Col span={8}><Card size="small"><Statistic title="Questions" value={questions.length} /></Card></Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic title="Points Allocated" value={totalPoints} suffix={quiz.pointsPossible ? `/ ${quiz.pointsPossible}` : undefined} />
                </Card>
              </Col>
              <Col span={8}>
                <Card size="small">
                  <Statistic title="Time Limit" value={quiz.timeLimitSeconds ? Math.round(quiz.timeLimitSeconds / 60) : 'None'} suffix={quiz.timeLimitSeconds ? 'min' : undefined} />
                </Card>
              </Col>
            </Row>

            {!!Object.keys(typeCounts).length && (
              <Space wrap size={4} style={{ marginBottom: 16 }}>
                {Object.entries(typeCounts).map(([type, count]) => (
                  <Tag key={type}>{QUESTION_TYPE_LABEL[type] ?? type}: {count}</Tag>
                ))}
              </Space>
            )}

            <QuestionList courseId={courseId} quizId={quizId} questions={questions} onReload={reloadQuestions} />
          </div>
        )}

        {step === 2 && <PreviewStep quiz={quiz} questions={questions} />}
      </div>

      <Divider />

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button disabled={step === 0} onClick={() => setStep(s => Math.max(0, s - 1))}>Previous</Button>
        <Space>
          {step === 0 && (
            <Button type="primary" onClick={handleSaveAndContinue}>Save & Continue</Button>
          )}
          {step === 1 && (
            <Button type="primary" onClick={handleQuestionsNext}>Next</Button>
          )}
          {step === 2 && quiz.status !== 'published' && (
            <Tooltip title={questions.length === 0 ? 'Add at least one question before publishing.' : undefined}>
              <Popconfirm
                title="Publish this quiz?"
                description="Students will be able to see and take it."
                onConfirm={handlePublish}
                disabled={questions.length === 0}
              >
                <Button type="primary" icon={<RocketOutlined />} loading={publishing} disabled={questions.length === 0}>
                  Finish and Publish
                </Button>
              </Popconfirm>
            </Tooltip>
          )}
          {step === 2 && quiz.status === 'published' && (
            <Tag color="green" icon={<CheckCircleFilled />} style={{ padding: '4px 10px', fontSize: 13 }}>Published</Tag>
          )}
        </Space>
      </div>
    </div>
  );
}
