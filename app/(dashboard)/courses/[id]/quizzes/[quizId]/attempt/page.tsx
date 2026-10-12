'use client';

/**
 * Student Quiz Attempt page — start/resume, answer, autosave, submit, see result.
 * Route: /courses/:id/quizzes/:quizId/attempt
 */

import { use, useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getQuiz, listQuestions } from '@/lib/quizzes';
import { startAttempt, saveResponses, submitAttempt, getAttempt } from '@/lib/quiz-attempts';
import type { Quiz, QuizQuestion, QuizAttempt } from '@/types';
import {
  Typography, Button, Alert, Space,
  Radio, Checkbox, Input, InputNumber, Select, Row, Col, App,
} from 'antd';
import {
  ArrowLeftOutlined, ArrowRightOutlined, ArrowUpOutlined, ArrowDownOutlined,
  CheckCircleOutlined, ClockCircleOutlined, CheckCircleFilled, CloseCircleFilled,
  LoadingOutlined, InfoCircleOutlined, FileTextOutlined,
} from '@ant-design/icons';
import LoadingState from '@/components/common/LoadingState';
import { Chip, Fact, ProgressBar, activityHref, learningStyles as s } from '@/components/student/studentUi';

const { Text } = Typography;
const { TextArea } = Input;

interface Props { params: Promise<{ id: string; quizId: string }> }

type ResponsePayload = Record<string, unknown>;

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// -- QuestionRenderer — one input control per question_type, matching the
// response_payload contract the backend scoring engine expects. ----------------

function QuestionRenderer({
  question, value, onChange,
}: { question: QuizQuestion; value: ResponsePayload | undefined; onChange: (v: ResponsePayload) => void }) {
  const data = question.questionData ?? {};

  switch (question.questionType) {
    case 'single_choice':
    case 'true_false':
      return (
        <Radio.Group
          value={value?.selectedOptionId as string | undefined}
          onChange={e => onChange({ selectedOptionId: e.target.value })}
        >
          <Space direction="vertical">
            {question.options.map(o => <Radio key={o.id} value={o.id}>{o.content}</Radio>)}
          </Space>
        </Radio.Group>
      );

    case 'multiple_choice':
      return (
        <Checkbox.Group
          value={(value?.selectedOptionIds as string[]) ?? []}
          onChange={vals => onChange({ selectedOptionIds: vals })}
        >
          <Space direction="vertical">
            {question.options.map(o => <Checkbox key={o.id} value={o.id}>{o.content}</Checkbox>)}
          </Space>
        </Checkbox.Group>
      );

    case 'short_text':
      return (
        <Input
          value={(value?.text as string) ?? ''}
          onChange={e => onChange({ text: e.target.value })}
          placeholder="Your answer"
        />
      );

    case 'long_text':
      return (
        <TextArea
          rows={6}
          value={(value?.text as string) ?? ''}
          onChange={e => onChange({ text: e.target.value })}
          placeholder="Your answer"
        />
      );

    case 'numeric':
    case 'numeric_tolerance':
      return (
        <InputNumber
          style={{ width: '100%' }}
          value={(value?.value as number) ?? undefined}
          onChange={v => onChange({ value: v ?? null })}
          placeholder="Enter a number"
        />
      );

    case 'matching': {
      const sourceChoices = (data.sourceChoices as { id: string; text: string }[]) ?? [];
      const targetChoices = (data.targetChoices as { id: string; text: string }[]) ?? [];
      const matches = Object.fromEntries(
        ((value?.matches as Array<{ sourceId: string; targetId: string }>) ?? []).map(m => [m.sourceId, m.targetId]),
      );
      const setMatch = (sourceId: string, targetId: string) => {
        const next = { ...matches, [sourceId]: targetId };
        onChange({ matches: Object.entries(next).map(([s, t]) => ({ sourceId: s, targetId: t })) });
      };
      return (
        <div>
          {sourceChoices.map(s => (
            <Row key={s.id} gutter={8} style={{ marginBottom: 8 }} align="middle">
              <Col span={10}><Text>{s.text}</Text></Col>
              <Col span={2} style={{ textAlign: 'center' }}>→</Col>
              <Col span={12}>
                <Select
                  style={{ width: '100%' }}
                  value={matches[s.id]}
                  onChange={v => setMatch(s.id, v)}
                  options={targetChoices.map(t => ({ value: t.id, label: t.text }))}
                  placeholder="Select a match"
                />
              </Col>
            </Row>
          ))}
        </div>
      );
    }

    case 'ordering': {
      const items = (data.items as { id: string; text: string }[]) ?? [];
      const order = (value?.order as string[]) ?? items.map(i => i.id);
      const move = (idx: number, dir: -1 | 1) => {
        const target = idx + dir;
        if (target < 0 || target >= order.length) return;
        const copy = [...order];
        [copy[idx], copy[target]] = [copy[target], copy[idx]];
        onChange({ order: copy });
      };
      return (
        <div>
          {order.map((id, idx) => {
            const item = items.find(i => i.id === id);
            return (
              <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Text type="secondary">{idx + 1}.</Text>
                <Text style={{ flex: 1 }}>{item?.text}</Text>
                <Button size="small" type="text" icon={<ArrowUpOutlined />} disabled={idx === 0} onClick={() => move(idx, -1)} />
                <Button size="small" type="text" icon={<ArrowDownOutlined />} disabled={idx === order.length - 1} onClick={() => move(idx, 1)} />
              </div>
            );
          })}
        </div>
      );
    }

    case 'fill_in_blank':
    case 'multiple_fill_in_blank': {
      const blanks = (data.blanks as { gapId: string }[]) ?? [];
      const answers = (value?.answers as Record<string, string>) ?? {};
      return (
        <div>
          {blanks.map(b => (
            <div key={b.gapId} style={{ marginBottom: 8 }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Blank: {b.gapId}</Text>
              <Input
                value={answers[b.gapId] ?? ''}
                onChange={e => onChange({ answers: { ...answers, [b.gapId]: e.target.value } })}
              />
            </div>
          ))}
        </div>
      );
    }

    default:
      return (
        <Alert
          type="warning"
          showIcon
          message="This question type isn't supported for online submission yet. Contact your course administrator."
        />
      );
  }
}

// -- QuizTimer --------------------------------------------------------------────

function QuizTimer({ deadline, onExpire }: { deadline: number; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(Math.max(0, deadline - Date.now()));

  useEffect(() => {
    const interval = setInterval(() => {
      const left = Math.max(0, deadline - Date.now());
      setRemaining(left);
      if (left <= 0) { clearInterval(interval); onExpire(); }
    }, 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline]);

  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  return (
    <span
      className={`${s.timer} ${remaining < 60000 ? s.timerLow : ''}`}
      role="timer"
      aria-label={`Time left: ${minutes} minutes ${seconds} seconds`}
    >
      <ClockCircleOutlined />
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  );
}

// -- QuizResultView -----------------------------------------------------------──

function ResultShell({
  icon, title, subtitle, children, backHref, reviewHref,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  backHref: string;
  reviewHref?: string;
}) {
  return (
    <section className={`${s.panel} ${s.resultCard}`}>
      <div style={{ fontSize: 44, lineHeight: 1, marginBottom: 12 }} aria-hidden>{icon}</div>
      <h1 className={s.title}>{title}</h1>
      {subtitle && <p className={s.meta} style={{ margin: '6px auto 0', maxWidth: 460, fontSize: 14 }}>{subtitle}</p>}
      {children}
      <Space wrap style={{ justifyContent: 'center', marginTop: children ? 0 : 24 }}>
        <Link href={backHref}><Button type="primary">Back to Course</Button></Link>
        {reviewHref && (
          <Link href={reviewHref}><Button icon={<FileTextOutlined />}>Review</Button></Link>
        )}
      </Space>
    </section>
  );
}

function QuizResultView({
  attempt, quiz, courseId, backHref, lessonId,
}: { attempt: QuizAttempt; quiz: Quiz; courseId: string; backHref: string; lessonId: string | null }) {
  if (attempt.status === 'pending_manual_grading') {
    return (
      <ResultShell
        backHref={backHref}
        icon={<InfoCircleOutlined style={{ color: 'var(--sl-secondary)' }} />}
        title="Submitted — awaiting grading"
        subtitle="One or more questions in this quiz require manual grading. It will be graded soon."
      />
    );
  }

  if (attempt.finalScore == null) {
    const reason = quiz.showScorePolicy === 'never'
      ? 'This quiz does not release scores.'
      : quiz.showScorePolicy === 'after_due_date'
        ? `Your score will be available after the due date${quiz.dueAt ? ` (${new Date(quiz.dueAt).toLocaleString()})` : ''}.`
        : quiz.showScorePolicy === 'after_final_attempt'
          ? 'Your score will be available after your final attempt.'
          : 'Your score is not available yet.';
    return (
      <ResultShell
        backHref={backHref}
        icon={<CheckCircleFilled style={{ color: 'var(--sl-success)' }} />}
        title="Quiz submitted"
        subtitle={reason}
      />
    );
  }

  const passed = attempt.passed;
  return (
    <ResultShell
      backHref={backHref}
      reviewHref={`/courses/${courseId}/quizzes/${quiz.id}/attempts/${attempt.id}/review${lessonId ? `?lessonId=${lessonId}` : ''}`}
      icon={passed === false
        ? <CloseCircleFilled style={{ color: 'var(--sl-error)' }} />
        : <CheckCircleFilled style={{ color: 'var(--sl-success)' }} />}
      title={passed == null ? 'Quiz submitted' : passed ? 'Quiz passed' : 'Quiz failed'}
      subtitle={quiz.title}
    >
      <div className={s.resultStats}>
        <Fact label="Score" value={`${attempt.finalScore} / ${attempt.pointsPossible}`} />
        <Fact label="Percentage" value={attempt.percentage != null ? `${attempt.percentage}%` : '—'} />
        <Fact
          label="Pass score"
          value={quiz.passingPercentage != null ? `${quiz.passingPercentage}%` : quiz.passingScore != null ? `${quiz.passingScore} pts` : '—'}
        />
        <Fact label="Attempt" value={`${attempt.attemptNumber} of ${quiz.maxAttempts}`} />
      </div>
    </ResultShell>
  );
}

// -- Main page ------------------------------------------------------------────

export default function QuizAttemptPage({ params }: Props) {
  const { id: courseId, quizId } = use(params);
  const { message, modal } = App.useApp();
  // The workspace passes the originating activity so every exit returns to it.
  const lessonId = useSearchParams().get('lessonId');
  const backHref = activityHref(courseId, lessonId);

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [responses, setResponses] = useState<Record<string, ResponsePayload>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef<QuizAttempt | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const started = await startAttempt(courseId, quizId);
      const [q, qs] = await Promise.all([getQuiz(courseId, quizId), listQuestions(courseId, quizId)]);
      setQuiz(q);
      setQuestions(qs);

      if (started.status === 'in_progress') {
        const full = await getAttempt(courseId, quizId, started.id);
        setAttempt(full);
        attemptRef.current = full;
        const respMap: Record<string, ResponsePayload> = {};
        (full.responses ?? []).forEach(r => { respMap[r.questionId] = r.responsePayload; });
        setResponses(respMap);
      } else {
        setAttempt(started);
        attemptRef.current = started;
      }
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      setError(e.detail ?? e.title ?? 'Failed to start this quiz.');
    } finally {
      setLoading(false);
    }
  }, [courseId, quizId]);

  useEffect(() => { load(); }, [load]);

  const handleAnswerChange = useCallback((questionId: string, payload: ResponsePayload) => {
    setResponses(prev => ({ ...prev, [questionId]: payload }));
    setSaveStatus('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const current = attemptRef.current;
      if (!current) return;
      try {
        await saveResponses(courseId, current.id, [{ questionId, responsePayload: payload }]);
        setSaveStatus('saved');
      } catch {
        setSaveStatus('idle');
      }
    }, 800);
  }, [courseId]);

  const doSubmit = useCallback(async () => {
    if (!attemptRef.current) return;
    setSubmitting(true);
    try {
      const result = await submitAttempt(courseId, attemptRef.current.id);
      setAttempt(result);
      attemptRef.current = result;
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      message.error(e.detail ?? e.title ?? 'Failed to submit quiz.');
    } finally {
      setSubmitting(false);
    }
  }, [courseId, message]);

  const handleSubmitClick = () => {
    const unanswered = questions.filter(q => q.required && !responses[q.id]);
    if (unanswered.length) {
      modal.confirm({
        title: 'Unanswered required questions',
        content: `You have ${unanswered.length} unanswered required question(s). Submit anyway?`,
        okText: 'Submit anyway',
        onOk: doSubmit,
      });
      return;
    }
    modal.confirm({
      title: 'Submit quiz?',
      content: 'You will not be able to change your answers after submitting.',
      okText: 'Submit',
      onOk: doSubmit,
    });
  };

  // -- Render states ------------------------------------------------------------

  if (loading) {
    return <LoadingState tip="Preparing quiz…" />;
  }

  if (error || !quiz || !attempt) {
    return (
      <Alert
        type="error" showIcon message={error ?? 'Unable to load this quiz.'}
        action={<Link href={backHref}><Button size="small">Back to Course</Button></Link>}
        style={{ margin: 24 }}
      />
    );
  }

  if (attempt.status !== 'in_progress') {
    return (
      <div className={s.page} style={{ maxWidth: 700, margin: '0 auto' }}>
        <QuizResultView attempt={attempt} quiz={quiz} courseId={courseId} backHref={backHref} lessonId={lessonId} />
      </div>
    );
  }

  const answeredCount = questions.filter(q => responses[q.id]).length;
  const unansweredRequired = questions.filter(q => q.required && !responses[q.id]).length;
  const deadline = quiz.timeLimitSeconds
    ? new Date(attempt.startedAt).getTime() + quiz.timeLimitSeconds * 1000
    : null;

  const visibleQuestions = quiz.oneQuestionAtATime ? [questions[currentIdx]].filter(Boolean) : questions;

  return (
    <div className={`${s.page} ${s.quizShell}`}>
      {/* Header — title, answered progress, timer, autosave state */}
      <section className={`${s.panel} ${s.quizHeader}`}>
        <div style={{ minWidth: 0 }}>
          <span className={s.eyebrow}>
            Check Understanding · Attempt {attempt.attemptNumber} of {quiz.maxAttempts}
          </span>
          <h1 className={s.quizHeaderTitle}>{quiz.title}</h1>
          <ProgressBar
            percent={(answeredCount / Math.max(1, questions.length)) * 100}
            label={`${answeredCount} of ${questions.length} answered`}
          />
        </div>
        <div className={s.quizHeaderSide}>
          {deadline ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={s.timerLabel}>Time left</span>
              <QuizTimer deadline={deadline} onExpire={doSubmit} />
            </div>
          ) : (
            <Chip tone="neutral" icon={<ClockCircleOutlined />}>No time limit</Chip>
          )}
          <span className={s.saveState} aria-live="polite">
            {saveStatus === 'saving'
              ? <><LoadingOutlined /> Saving…</>
              : saveStatus === 'saved'
                ? <><CheckCircleOutlined style={{ color: 'var(--sl-success)' }} /> All answers saved</>
                : 'Answers save automatically'}
          </span>
        </div>
      </section>

      {quiz.instructions && (
        <div className={`${s.resultPanel} ${s.resultInfo}`} style={{ marginTop: 0, marginBottom: 12 }}>
          <InfoCircleOutlined style={{ color: 'var(--sl-secondary)' }} />
          <span style={{ fontSize: 14, flex: 1, minWidth: 0 }}>{stripHtml(quiz.instructions)}</span>
        </div>
      )}

      {visibleQuestions.map((q, idx) => {
        const absoluteIdx = quiz.oneQuestionAtATime ? currentIdx : idx;
        const answered = !!responses[q.id];
        return (
          <section
            key={q.id}
            className={`${s.panel} ${s.questionCard} ${answered ? s.questionAnswered : ''}`}
            aria-labelledby={`q-${q.id}`}
          >
            <div className={s.questionHead}>
              <span className={s.questionNumber} id={`q-${q.id}`}>
                Question {absoluteIdx + 1} of {questions.length}
              </span>
              <div className={s.metaRow}>
                <Chip tone="neutral">{q.points} {q.points === 1 ? 'pt' : 'pts'}</Chip>
                {q.required && <Chip tone="neutral">Required</Chip>}
                {answered && <Chip tone="success" icon={<CheckCircleFilled />}>Answered</Chip>}
              </div>
            </div>
            <p className={s.questionPrompt}>{stripHtml(q.prompt)}</p>
            <div className={s.options}>
              <QuestionRenderer
                question={q}
                value={responses[q.id]}
                onChange={payload => handleAnswerChange(q.id, payload)}
              />
            </div>
          </section>
        );
      })}

      {/* Submit area */}
      <section className={`${s.panel} ${s.submitBar}`}>
        <div className={s.submitSummary}>
          <strong>{answeredCount} of {questions.length}</strong> questions answered
          {unansweredRequired > 0 && (
            <div style={{ marginTop: 4 }}>
              <Chip tone="warning">{unansweredRequired} required {unansweredRequired === 1 ? 'question' : 'questions'} unanswered</Chip>
            </div>
          )}
        </div>
        <Space wrap>
          {quiz.oneQuestionAtATime ? (
            <>
              <Button
                icon={<ArrowLeftOutlined />}
                disabled={currentIdx === 0 || !quiz.allowBackNavigation}
                onClick={() => setCurrentIdx(i => i - 1)}
              >
                Previous
              </Button>
              <Button
                icon={<ArrowRightOutlined />}
                disabled={currentIdx >= questions.length - 1}
                onClick={() => setCurrentIdx(i => i + 1)}
                iconPlacement="end"
              >
                Next
              </Button>
            </>
          ) : null}
          <Button type="primary" size="large" icon={<CheckCircleOutlined />} loading={submitting} onClick={handleSubmitClick}>
            Submit Quiz
          </Button>
        </Space>
      </section>
    </div>
  );
}
