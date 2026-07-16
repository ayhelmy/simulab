'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { listCourses } from '@/lib/courses';
import type { Course } from '@/types';
import {
  Input, Select, Button, Card, Row, Col, Spin, Alert, Empty, Typography, Tag, Space,
} from 'antd';
import { PlusOutlined, SearchOutlined, BookOutlined } from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader';

const { Text } = Typography;
const { Search } = Input;

const ENROLLMENT_LABEL: Record<string, string> = {
  open: 'Open Enrollment',
  approval: 'Approval Required',
  code: 'Code Required',
  admin: 'Admin Only',
};

const STATUS_COLOR: Record<string, string> = {
  draft: 'gold', published: 'green', archived: 'default',
};

function CourseCard({ course, showStatus }: { course: Course; showStatus: boolean }) {
  return (
    <Link href={`/courses/${course.id}`} style={{ display: 'block', height: '100%' }}>
      <Card
        hoverable
        cover={
          <div
            style={{
              height: 140,
              background: course.thumbnailUrl
                ? `url(${course.thumbnailUrl}) center/cover no-repeat`
                : 'linear-gradient(135deg, #FEF3E2 0%, #FDE8C6 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {!course.thumbnailUrl && <BookOutlined style={{ fontSize: 40, color: '#F9B46C' }} />}
          </div>
        }
        // ={{ padding: '14px 16px' }}
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        <Space size={4} wrap style={{ marginBottom: 8 }}>
          {showStatus && (
            <Tag color={STATUS_COLOR[course.status] ?? 'default'} style={{ textTransform: 'capitalize', margin: 0 }}>
              {course.status}
            </Tag>
          )}
          <Text type="secondary" style={{ fontSize: 11 }}>
            {ENROLLMENT_LABEL[course.enrollmentType] ?? course.enrollmentType}
          </Text>
        </Space>

        <Text strong style={{ fontSize: 15, marginBottom: 6, WebkitLineClamp: 2, overflow: 'hidden', display: '-webkit-box' as never, WebkitBoxOrient: 'vertical' as never }}>
          {course.title}
        </Text>

        {course.description && (
          <Text type="secondary" style={{ fontSize: 13, WebkitLineClamp: 2, overflow: 'hidden', display: '-webkit-box' as never, WebkitBoxOrient: 'vertical' as never }}>
            {course.description}
          </Text>
        )}

        {/* Department / Academic Year / Semester */}
        {(course.departmentName || course.academicYearName || course.semesterTermName) && (
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: '2px 8px' }}>
            {course.departmentName && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                {course.departmentName}{course.departmentCode ? ` (${course.departmentCode})` : ''}
              </Text>
            )}
            {(course.academicYearName || course.semesterTermName) && (
              <Text type="secondary" style={{ fontSize: 11 }}>
                {[course.academicYearName, course.semesterTermName].filter(Boolean).join(' · ')}
              </Text>
            )}
          </div>
        )}

        <div style={{ marginTop: 'auto', paddingTop: 10, display: 'flex', gap: 12 }}>
          {course.startDate && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Starts {new Date(course.startDate).toLocaleDateString()}
            </Text>
          )}
          {course.enrollmentCap != null && (
            <Text type="secondary" style={{ fontSize: 12 }}>Cap: {course.enrollmentCap}</Text>
          )}
        </div>
      </Card>
    </Link>
  );
}

export default function CoursesPage() {
  const { user, hasRole } = useAuth();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebounced] = useState('');
  const [statusFilter, setStatus] = useState<string | undefined>();

  const isAdmin      = hasRole('super_admin') || hasRole('institution_admin') || hasRole('dept_manager');
  const isInstructor = !isAdmin && (hasRole('instructor') || hasRole('teaching_assistant'));
  const canManage    = isAdmin || isInstructor;
  const canCreate    = hasRole('super_admin') || hasRole('instructor');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const fetchCourses = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { courses: data } = await listCourses({
        limit: 50,
        search:       debouncedSearch || undefined,
        status:       (statusFilter as Course['status']) || undefined,
        // Instructors only see their own courses; pass explicitly so the intent
        // is clear even though the backend enforces it via role as well.
        instructorId: isInstructor ? user.id : undefined,
      });
      setCourses(data);
    } catch (e: unknown) {
      const err = e as { detail?: string; title?: string };
      setError(err?.detail ?? err?.title ?? 'Failed to load courses.');
    } finally {
      setLoading(false);
    }
  }, [user, debouncedSearch, statusFilter, isInstructor]);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  const isDeptManager = hasRole('dept_manager');
  const pageTitle    = isInstructor ? 'My Courses' : isDeptManager ? 'Department Courses' : isAdmin ? 'All Courses' : 'Course Catalog';
  const pageSubtitle = isDeptManager
    ? 'Courses in your department'
    : isAdmin
    ? 'All courses in your institution'
    : isInstructor ? 'Courses you teach' : 'Browse available courses';

  return (
    <div>
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        extra={
          canCreate ? (
            <Link href="/courses/new">
              <Button type="primary" icon={<PlusOutlined />}>New Course</Button>
            </Link>
          ) : undefined
        }
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <Search
          placeholder="Search courses…"
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: '1 1 240px', maxWidth: 400 }}
          allowClear
        />
        {canManage && (
          <Select
            placeholder="All Statuses"
            value={statusFilter}
            onChange={setStatus}
            allowClear
            style={{ width: 160 }}
            options={[
              { value: 'draft', label: 'Draft' },
              { value: 'published', label: 'Published' },
              { value: 'archived', label: 'Archived' },
            ]}
          />
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
          <Spin size="large" />
        </div>
      ) : error ? (
        <Alert type="error" title={error} showIcon />
      ) : courses.length === 0 ? (
        <Empty
          description={
            debouncedSearch
              ? 'No courses match your search.'
              : canManage ? 'No courses yet.' : 'No courses available.'
          }
        >
          {canCreate && !debouncedSearch && (
            <Link href="/courses/new">
              <Button type="primary" icon={<PlusOutlined />}>Create your first course</Button>
            </Link>
          )}
        </Empty>
      ) : (
        <>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 13 }}>
            {courses.length} {courses.length === 1 ? 'course' : 'courses'}
            {debouncedSearch && ` matching "${debouncedSearch}"`}
          </Text>
          <Row gutter={[20, 20]}>
            {courses.map((c) => (
              <Col key={c.id} xs={24} sm={12} lg={8} xl={6}>
                <CourseCard course={c} showStatus={canManage} />
              </Col>
            ))}
          </Row>
        </>
      )}
    </div>
  );
}
