'use client';

/**
 * Course-level "Grade Submissions" hub — lists every published quiz in the
 * course with how many attempts need grading, so the instructor doesn't have
 * to open each quiz's own editor to find one.
 * Route: /courses/:id/grade
 */

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getCourse } from '@/lib/courses';
import { listQuizzes, listQuizAttempts } from '@/lib/quizzes';
import type { Course, Quiz } from '@/types';
import { Card, Typography, Button, Spin, Alert, Tag, List, Space } from 'antd';
import { ArrowLeftOutlined, CheckSquareOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface Props { params: Promise<{ id: string }> }

interface QuizRow { quiz: Quiz; pending: number; graded: number }

export default function CourseGradeHubPage({ params }: Props) {
  const { id: courseId } = use(params);

  const [course, setCourse] = useState<Course | null>(null);
  const [rows, setRows] = useState<QuizRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, quizzes] = await Promise.all([getCourse(courseId), listQuizzes(courseId)]);
      setCourse(c);
      const published = quizzes.filter(q => q.status === 'published');
      const withCounts = await Promise.all(published.map(async (quiz): Promise<QuizRow> => {
        const [pending, graded] = await Promise.all([
          listQuizAttempts(courseId, quiz.id, 'pending_manual_grading'),
          listQuizAttempts(courseId, quiz.id, 'graded'),
        ]);
        return { quiz, pending: pending.length, graded: graded.length };
      }));
      setRows(withCounts);
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      setError(e.detail ?? e.title ?? 'Failed to load quizzes.');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>;

  if (error || !course) {
    return (
      <Alert
        type="error" showIcon message={error ?? 'Course not found'}
        action={<Link href={`/courses/${courseId}/edit`}><Button size="small">Back to Course</Button></Link>}
      />
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <Space style={{ marginBottom: 16 }}>
        <Link href={`/courses/${courseId}/edit`}><Button icon={<ArrowLeftOutlined />}>Course</Button></Link>
        <Title level={4} style={{ margin: 0 }}>Grade Submissions — {course.title}</Title>
      </Space>

      <Card>
        {!rows.length ? (
          <Text type="secondary">No published quizzes in this course yet.</Text>
        ) : (
          <List
            dataSource={rows}
            renderItem={({ quiz, pending, graded }) => (
              <List.Item
                actions={[
                  <Link key="grade" href={`/courses/${courseId}/quizzes/${quiz.id}/grade`}>
                    <Button icon={<CheckSquareOutlined />} type={pending > 0 ? 'primary' : 'default'}>
                      Grade
                    </Button>
                  </Link>,
                ]}
              >
                <List.Item.Meta
                  title={quiz.title}
                  description={
                    <Space size={6}>
                      <Tag color={pending > 0 ? 'orange' : 'default'}>{pending} pending</Tag>
                      <Tag color="green">{graded} graded</Tag>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
}
