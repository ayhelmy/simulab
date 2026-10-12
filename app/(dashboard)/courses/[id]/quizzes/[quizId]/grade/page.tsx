'use client';

/**
 * Instructor manual-grading page — reviews attempts stuck in 'pending_manual_grading'
 * (long_text questions, or any question with manualGrading=true) and lets the instructor
 * enter a score + feedback per response. Auto-graded responses are shown read-only.
 * Route: /courses/:id/quizzes/:quizId/grade
 */

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getQuiz, listQuestions, listQuizAttempts } from '@/lib/quizzes';
import { getAttempt, gradeAttempt } from '@/lib/quiz-attempts';
import type { Quiz, QuizQuestion, QuizAttempt } from '@/types';
import {
  Card, Typography, Button, Spin, Alert, Tag, Space, Tabs, Empty, InputNumber, Input,
  App, Row, Col, List,
} from 'antd';
import { ArrowLeftOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { stripHtml, needsManualGrading, formatAnswer, CorrectnessTag } from '@/components/domain/QuizAnswerDisplay';

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

interface Props { params: Promise<{ id: string; quizId: string }> }

export default function GradeQuizPage({ params }: Props) {
  const { id: courseId, quizId } = use(params);
  const { message } = App.useApp();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [pending, setPending] = useState<QuizAttempt[]>([]);
  const [graded, setGraded] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<QuizAttempt | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedbacks, setFeedbacks] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [q, qs, pendingList, gradedList] = await Promise.all([
        getQuiz(courseId, quizId),
        listQuestions(courseId, quizId),
        listQuizAttempts(courseId, quizId, 'pending_manual_grading'),
        listQuizAttempts(courseId, quizId, 'graded'),
      ]);
      setQuiz(q);
      setQuestions(qs);
      setPending(pendingList);
      setGraded(gradedList.filter(a => qs.some(question => needsManualGrading(question))));
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      setError(e.detail ?? e.title ?? 'Failed to load attempts.');
    } finally {
      setLoading(false);
    }
  }, [courseId, quizId]);

  useEffect(() => { load(); }, [load]);

  const selectAttempt = useCallback(async (attemptId: string) => {
    setDetailLoading(true);
    try {
      const full = await getAttempt(courseId, quizId, attemptId);
      // getAttempt doesn't LEFT JOIN users (only listAttempts does) — carry the name over
      // from whichever list this attempt came from so the header doesn't show a raw user id.
      const fromList = [...pending, ...graded].find(a => a.id === attemptId);
      setSelected({ ...full, studentName: fromList?.studentName, studentEmail: fromList?.studentEmail });
      const nextScores: Record<string, number> = {};
      const nextFeedbacks: Record<string, string> = {};
      (full.responses ?? []).forEach(r => {
        nextScores[r.id] = r.finalScore ?? 0;
        nextFeedbacks[r.id] = r.feedback ?? '';
      });
      setScores(nextScores);
      setFeedbacks(nextFeedbacks);
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      message.error(e.detail ?? e.title ?? 'Failed to load this attempt.');
    } finally {
      setDetailLoading(false);
    }
  }, [courseId, quizId, message, pending, graded]);

  const handleSave = async () => {
    if (!selected) return;
    const manualResponses = (selected.responses ?? []).filter(r => {
      const question = questions.find(q => q.id === r.questionId);
      return question && needsManualGrading(question);
    });
    if (!manualResponses.length) return;

    setSaving(true);
    try {
      const updated = await gradeAttempt(
        courseId,
        selected.id,
        manualResponses.map(r => ({
          responseId: r.id,
          score: scores[r.id] ?? 0,
          feedback: feedbacks[r.id] || undefined,
        })),
      );
      message.success('Grades saved.');
      setSelected(updated);
      await load();
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      message.error(e.detail ?? e.title ?? 'Failed to save grades.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;

  if (error || !quiz) {
    return (
      <Alert
        type="error" showIcon message={error ?? 'Quiz not found'}
        action={<Link href={`/courses/${courseId}/quizzes/${quizId}/edit`}><Button size="small">Back to Quiz</Button></Link>}
      />
    );
  }

  const renderAttemptList = (attempts: QuizAttempt[], emptyText: string) => (
    attempts.length ? (
      <List
        size="small"
        dataSource={attempts}
        renderItem={a => (
          <List.Item
            style={{ cursor: 'pointer', background: selected?.id === a.id ? '#FEF3E2' : undefined, padding: '8px 12px' }}
            onClick={() => selectAttempt(a.id)}
          >
            <div style={{ width: '100%' }}>
              <Text strong>{a.studentName ?? a.userId}</Text>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Attempt {a.attemptNumber} · {a.submittedAt ? new Date(a.submittedAt).toLocaleString() : '—'}
                </Text>
                {a.status === 'graded' && <Tag color="green" style={{ fontSize: 11 }}>{a.percentage}%</Tag>}
              </div>
            </div>
          </List.Item>
        )}
      />
    ) : <Empty description={emptyText} image={Empty.PRESENTED_IMAGE_SIMPLE} />
  );

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <Space style={{ marginBottom: 16 }}>
        <Link href={`/courses/${courseId}/quizzes/${quizId}/edit`}><Button icon={<ArrowLeftOutlined />}>Quiz</Button></Link>
        <Title level={4} style={{ margin: 0 }}>Grade Submissions — {quiz.title}</Title>
      </Space>

      <Row gutter={16}>
        <Col span={8}>
          <Card size="small" title="Attempts">
            <Tabs
              items={[
                { key: 'pending', label: `Needs Grading (${pending.length})`, children: renderAttemptList(pending, 'Nothing needs grading right now.') },
                { key: 'graded', label: `Graded (${graded.length})`, children: renderAttemptList(graded, 'No graded manual attempts yet.') },
              ]}
            />
          </Card>
        </Col>

        <Col span={16}>
          {!selected ? (
            <Card size="small"><Empty description="Select an attempt to review." /></Card>
          ) : detailLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
          ) : (
            <Card size="small" title={`${selected.studentName ?? selected.userId} — Attempt ${selected.attemptNumber}`}>
              {(selected.responses ?? []).map(r => {
                const question = questions.find(q => q.id === r.questionId);
                if (!question) return null;
                const editable = needsManualGrading(question);
                return (
                  <Card key={r.id} size="small" type="inner" style={{ marginBottom: 10 }}>
                    <Space wrap size={6} style={{ marginBottom: 6 }}>
                      <Tag>{question.points} pts</Tag>
                      {!editable && <CorrectnessTag response={r} />}
                    </Space>
                    <Paragraph style={{ marginBottom: 6 }}>{stripHtml(question.prompt)}</Paragraph>
                    <div style={{ background: '#F9FAFB', borderRadius: 6, padding: 10, marginBottom: editable ? 10 : 0 }}>
                      {formatAnswer(question, r)}
                    </div>
                    {editable && (
                      <Row gutter={12} align="middle">
                        <Col flex="0 0 140px">
                          <InputNumber
                            min={0}
                            max={question.points}
                            value={scores[r.id] ?? 0}
                            onChange={v => setScores(prev => ({ ...prev, [r.id]: v ?? 0 }))}
                            addonAfter={`/ ${question.points}`}
                            style={{ width: '100%' }}
                          />
                        </Col>
                        <Col flex="1 1 auto">
                          <TextArea
                            rows={1}
                            placeholder="Feedback (optional)"
                            value={feedbacks[r.id] ?? ''}
                            onChange={e => setFeedbacks(prev => ({ ...prev, [r.id]: e.target.value }))}
                          />
                        </Col>
                      </Row>
                    )}
                  </Card>
                );
              })}

              <Row justify="space-between" align="middle" style={{ marginTop: 8 }}>
                <Col>
                  {selected.finalScore != null && (
                    <Text type="secondary">
                      Total: {selected.finalScore} / {selected.pointsPossible} ({selected.percentage}%)
                      {selected.passed != null && (selected.passed ? ' — Passed' : ' — Not passed')}
                    </Text>
                  )}
                </Col>
                <Col>
                  <Button type="primary" icon={<CheckCircleOutlined />} loading={saving} onClick={handleSave}>
                    Save Grades
                  </Button>
                </Col>
              </Row>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
