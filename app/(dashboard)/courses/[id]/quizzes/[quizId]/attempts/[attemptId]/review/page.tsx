'use client';

/**
 * Student read-only quiz review — questions + the student's own answers,
 * marked correct/incorrect/partial once graded. Reused from the gradebook's
 * "click a graded quiz row" drill-down.
 * Route: /courses/:id/quizzes/:quizId/attempts/:attemptId/review
 *
 * Deliberately does not show the correct-answer key — listQuestions() only
 * reveals correct answers to the quiz's own instructor/admin (the QTI
 * answer-leakage boundary from the original quiz work), which this page
 * doesn't change.
 */

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getQuiz, listQuestions } from '@/lib/quizzes';
import { getAttempt } from '@/lib/quiz-attempts';
import type { Quiz, QuizQuestion, QuizAttempt } from '@/types';
import { Card, Typography, Button, Spin, Alert, Tag, Space, Row, Col, Statistic, Result } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { stripHtml, formatAnswer, CorrectnessTag } from '@/components/domain/QuizAnswerDisplay';
import { activityHref } from '@/components/student/studentUi';

const { Text, Title, Paragraph } = Typography;

interface Props { params: Promise<{ id: string; quizId: string; attemptId: string }> }

export default function QuizAttemptReviewPage({ params }: Props) {
  const { id: courseId, quizId, attemptId } = use(params);
  // Set by the workspace and the quiz result, so Back to Course reopens the activity.
  const backHref = activityHref(courseId, useSearchParams().get('lessonId'));

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [q, qs, a] = await Promise.all([
        getQuiz(courseId, quizId),
        listQuestions(courseId, quizId),
        getAttempt(courseId, quizId, attemptId),
      ]);
      setQuiz(q);
      setQuestions(qs);
      setAttempt(a);
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      setError(e.detail ?? e.title ?? 'Failed to load this attempt.');
    } finally {
      setLoading(false);
    }
  }, [courseId, quizId, attemptId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;

  if (error || !quiz || !attempt) {
    return (
      <Alert
        type="error" showIcon message={error ?? 'Attempt not found'}
        action={<Link href={backHref}><Button size="small">Back to Course</Button></Link>}
      />
    );
  }

  if (attempt.status === 'pending_manual_grading') {
    return (
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <Result
          status="info"
          title="Awaiting grading"
          subTitle="Your instructor hasn't finished grading this attempt yet."
          extra={<Link href={backHref}><Button type="primary">Back to Course</Button></Link>}
        />
      </div>
    );
  }

  const responses = attempt.responses ?? [];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Space style={{ marginBottom: 16 }}>
        <Link href="/gradebook"><Button icon={<ArrowLeftOutlined />}>Gradebook</Button></Link>
        <Title level={4} style={{ margin: 0 }}>{quiz.title}</Title>
      </Space>

      <Card size="small" style={{ marginBottom: 16 }}>
        {attempt.finalScore != null ? (
          <Row gutter={24}>
            <Col><Statistic title="Score" value={attempt.finalScore} suffix={`/ ${attempt.pointsPossible}`} /></Col>
            <Col><Statistic title="Percentage" value={attempt.percentage ?? undefined} suffix="%" /></Col>
            <Col>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>Result</Text>
              {attempt.passed == null
                ? <Tag>Submitted</Tag>
                : attempt.passed ? <Tag color="green">Passed</Tag> : <Tag color="red">Not passed</Tag>}
            </Col>
          </Row>
        ) : (
          <Text type="secondary">Your score for this attempt isn&apos;t available yet.</Text>
        )}
      </Card>

      {questions.map((q, idx) => {
        const response = responses.find(r => r.questionId === q.id);
        return (
          <Card key={q.id} size="small" style={{ marginBottom: 10 }}>
            <Space wrap size={6} style={{ marginBottom: 6 }}>
              <Text type="secondary">Question {idx + 1}</Text>
              <Tag>{q.points} pts</Tag>
              {response && <CorrectnessTag response={response} />}
            </Space>
            <Paragraph style={{ marginBottom: 6 }}>{stripHtml(q.prompt)}</Paragraph>
            <div style={{ background: '#F9FAFB', borderRadius: 6, padding: 10 }}>
              {formatAnswer(q, response)}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
