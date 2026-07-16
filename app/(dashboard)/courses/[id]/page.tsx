'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  getCourse, publishCourse, archiveCourse, restoreCourse, cloneCourse, deleteCourse,
  enrollInCourse, unenroll, getMyEnrollment,
} from '@/lib/courses';
import { getCourseTree } from '@/lib/modules';
import type { Course, Enrollment, CourseModule } from '@/types';
import {
  Breadcrumb, Spin, Alert, Button, Card, Row, Col, Tag, Typography, Input,
  Descriptions, Divider, Space, Popconfirm, App, Collapse, List, Empty,
} from 'antd';
import {
  CheckCircleOutlined, ClockCircleOutlined, RocketOutlined,
  InboxOutlined, CopyOutlined, DeleteOutlined, EditOutlined,
  LockOutlined, FileTextOutlined, PlayCircleOutlined, AppstoreOutlined,
  ReloadOutlined, BarChartOutlined,
} from '@ant-design/icons';
import StatusTag from '@/components/common/StatusTag';

const { Title, Text, Paragraph } = Typography;

const ENROLL_TYPE_LABEL: Record<string, string> = {
  open:     'Open Enrollment',
  approval: 'Requires Approval',
  code:     'Enrollment Code Required',
  admin:    'Admin-Managed Enrollment',
};

interface Props { params: Promise<{ id: string }> }

export default function CourseDetailPage({ params }: Props) {
  const { id } = use(params);
  const { user, hasRole } = useAuth();
  const router = useRouter();
  const { message } = App.useApp();

  const [course, setCourse]         = useState<Course | null>(null);
  const [modules, setModules]       = useState<CourseModule[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading]       = useState(true);
  const [pageError, setPageError]   = useState<string | null>(null);

  const [enrollCode, setEnrollCode] = useState('');
  const [enrolling, setEnrolling]   = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  const [actionBusy, setActionBusy] = useState(false);

  const isInstitutionAdmin = hasRole('institution_admin');
  const isDeptManager = hasRole('dept_manager');
  const isAdmin      = hasRole('super_admin') || isInstitutionAdmin;
  const isOwnCourse  = course?.instructorId === user?.id;
  const canManage    = isAdmin || isOwnCourse;
  const canDelete    = isAdmin;

  useEffect(() => {
    async function load() {
      setLoading(true);
      setPageError(null);
      try {
        const [c, e, mods] = await Promise.all([
          getCourse(id),
          getMyEnrollment(id),
          getCourseTree(id).catch(() => []),
        ]);
        setCourse(c);
        setEnrollment(e);
        setModules(mods);
      } catch (err: unknown) {
        const e = err as { detail?: string; title?: string };
        setPageError(e?.detail ?? e?.title ?? 'Failed to load course.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleEnroll() {
    if (!course) return;
    setEnrolling(true);
    setEnrollError(null);
    try {
      const data = course.enrollmentType === 'code' ? { enrollmentCode: enrollCode } : {};
      const e = await enrollInCourse(id, data);
      setEnrollment(e);
      if (e.status === 'active') router.push(`/courses/${id}/home`);
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      setEnrollError(e?.detail ?? e?.title ?? 'Enrollment failed.');
    } finally { setEnrolling(false); }
  }

  async function handleUnenroll() {
    if (!user) return;
    setEnrolling(true);
    setEnrollError(null);
    try {
      await unenroll(id, user.id);
      setEnrollment(null);
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      setEnrollError(e?.detail ?? e?.title ?? 'Failed to withdraw.');
    } finally { setEnrolling(false); }
  }

  async function handlePublish() {
    setActionBusy(true);
    try {
      const updated = await publishCourse(id);
      setCourse(updated);
      message.success('Course published. Students can now enroll.');
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      message.error(e?.detail ?? e?.title ?? 'Publish failed.');
    } finally { setActionBusy(false); }
  }

  async function handleArchive() {
    setActionBusy(true);
    try {
      const updated = await archiveCourse(id);
      setCourse(updated);
      message.success('Course archived.');
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      message.error(e?.detail ?? e?.title ?? 'Archive failed.');
    } finally { setActionBusy(false); }
  }

  async function handleRestore() {
    setActionBusy(true);
    try {
      const updated = await restoreCourse(id);
      setCourse(updated);
      message.success('Course restored to draft.');
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      message.error(e?.detail ?? e?.title ?? 'Restore failed.');
    } finally { setActionBusy(false); }
  }

  async function handleClone() {
    setActionBusy(true);
    try {
      const cloned = await cloneCourse(id);
      message.success(`Cloned as "${cloned.title}". Redirecting…`);
      setTimeout(() => router.push(`/courses/${cloned.id}/edit`), 1200);
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      message.error(e?.detail ?? e?.title ?? 'Clone failed.');
    } finally { setActionBusy(false); }
  }

  async function handleDelete() {
    setActionBusy(true);
    try {
      await deleteCourse(id);
      message.success('Course deleted.');
      router.push('/courses');
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      message.error(e?.detail ?? e?.title ?? 'Delete failed.');
      setActionBusy(false);
    }
  }

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>;
  }

  if (pageError) return <Alert type="error" title={pageError} showIcon />;
  if (!course) return null;

  const isEnrollable = course.status === 'published' && !isOwnCourse;

  function renderEnrollmentCard() {
    if (!course) return null;
    const type = course.enrollmentType;

    if (enrollment?.status === 'active') {
      return (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <CheckCircleOutlined style={{ color: '#059669', fontSize: 20 }} />
            <Text strong style={{ color: '#059669' }}>You are enrolled</Text>
          </div>
          <Link href={`/courses/${id}/home`}>
            <Button type="primary" block size="large" style={{ marginBottom: 10 }}>Go to Course</Button>
          </Link>
          <Popconfirm
            title="Drop this course?"
            description="You can re-enroll later if the course allows it."
            onConfirm={handleUnenroll}
            okText="Drop"
            okButtonProps={{ danger: true }}
          >
            <Button block loading={enrolling} disabled={enrolling}>Drop Course</Button>
          </Popconfirm>
        </>
      );
    }

    if (enrollment?.status === 'pending') {
      return (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <ClockCircleOutlined style={{ color: '#D97706', fontSize: 20 }} />
            <Text strong style={{ color: '#D97706' }}>Pending Approval</Text>
          </div>
          <Text type="secondary" style={{ display: 'block', fontSize: 13, marginBottom: 14 }}>
            Your request is awaiting instructor approval.
          </Text>
          <Button block loading={enrolling} onClick={handleUnenroll}>Cancel Request</Button>
        </>
      );
    }

    if (isOwnCourse) {
      return <Text type="secondary" style={{ textAlign: 'center', display: 'block' }}>You are the instructor of this course.</Text>;
    }

    if (!isEnrollable) {
      if (type === 'admin' && !isAdmin) {
        return <Text type="secondary" style={{ textAlign: 'center', display: 'block' }}>Contact your administrator to enroll.</Text>;
      }
      return <Text type="secondary" style={{ textAlign: 'center', display: 'block' }}>This course is not available for enrollment.</Text>;
    }

    const label = type === 'approval' ? 'Request to Enroll' : type === 'code' ? 'Enroll with Code' : 'Enroll Now';

    return (
      <Space orientation="vertical" style={{ width: '100%' }}>
        {type === 'code' && (
          <Input
            placeholder="Enter enrollment code"
            value={enrollCode}
            onChange={(e) => setEnrollCode(e.target.value)}
          />
        )}
        <Button
          type="primary"
          block
          size="large"
          loading={enrolling}
          disabled={type === 'code' && !enrollCode.trim()}
          onClick={handleEnroll}
        >
          {label}
        </Button>
        {type === 'approval' && (
          <Text type="secondary" style={{ fontSize: 12 }}>Your request will be reviewed by the instructor.</Text>
        )}
        {enrollError && <Alert type="error" title={enrollError} showIcon />}
      </Space>
    );
  }

  return (
    <div style={{ maxWidth: 1500, margin: '0 auto' }}>
      {/* <Breadcrumb
        style={{ marginBottom: 20 }}
        items={[
          { title: <Link href="/courses">Courses</Link> },
          { title: course.title },
        ]}
      /> */}

      <Row gutter={50}>
        {/* -- Main column ------------------------------------------------ */}
        <Col xs={15} md={16} 
        style={{ marginBottom: 24 , backgroundColor:"white", padding: 24, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
        >
          {/* Hero thumbnail */}
          <div style={{
            height: 240, borderRadius: 12, overflow: 'hidden', marginBottom: 24,
            background: course.thumbnailUrl
              ? `url(${course.thumbnailUrl}) center/cover no-repeat`
              : 'linear-gradient(135deg, #FEF3E2 0%, #FDE8C6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%',
          }}>
            {!course.thumbnailUrl && <span style={{ fontSize: 64 }}>📚</span>}
          </div>

          {/* Badges */}
          <Space wrap style={{ marginBottom: 12 }}>
            <StatusTag status={course.status} />
            <Tag style={{ margin: 0 }}>{ENROLL_TYPE_LABEL[course.enrollmentType] ?? course.enrollmentType}</Tag>
          </Space>

          <Title level={3} style={{ margin: '0 0 12px' }}>{course.title}</Title>

          {course.description && (
            <Paragraph style={{ fontSize: 15, color: '#374151', lineHeight: 1.7 }}>
              {course.description}
            </Paragraph>
          )}

          {/* Details */}
          <Descriptions
            column={{ xs: 1, sm: 5 }}
            bordered
            size="small"
            style={{ marginBottom: 24 }}
          >
            {course.departmentName && (
              <Descriptions.Item label="Department">
                {course.departmentName}{course.departmentCode ? ` (${course.departmentCode})` : ''}
              </Descriptions.Item>
            )}
            {course.academicYearName && (
              <Descriptions.Item label="Academic Year">{course.academicYearName}</Descriptions.Item>
            )}
            {course.semesterTermName && (
              <Descriptions.Item label="Semester">{course.semesterTermName}</Descriptions.Item>
            )}
            {course.startDate && (
              <Descriptions.Item label="Start Date">
                {new Date(course.startDate).toLocaleDateString()}
              </Descriptions.Item>
            )}
            {course.endDate && (
              <Descriptions.Item label="End Date">
                {new Date(course.endDate).toLocaleDateString()}
              </Descriptions.Item>
            )}
            {course.enrollmentCap != null && (
              <Descriptions.Item label="Capacity">{course.enrollmentCap} seats</Descriptions.Item>
            )}
            <Descriptions.Item label="Passing Grade">{course.passingGrade}%</Descriptions.Item>
          </Descriptions>

          {/* Course Modules */}
          <Card
            title={`Course Modules (${modules.length})`}
            size="small"
            extra={
              canManage && (
                <Link href={`/courses/${id}/edit`}>
                  <Button size="small" icon={<EditOutlined />}>Edit</Button>
                </Link>
              )
            }
          >
            {modules.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="No modules have been added yet."
                style={{ padding: '16px 0' }}
              />
            ) : (
              <Collapse
                size="small"
                defaultActiveKey={modules.filter((m) => m.isPublished).map((m) => m.id)}
                items={modules.map((mod) => {
                  const isLocked = mod.unlockAt && new Date(mod.unlockAt) > new Date();
                  const lessons  = mod.lessons ?? [];
                  return {
                    key:   mod.id,
                    label: (
                      <Space size={6}>
                        {isLocked && <LockOutlined style={{ color: '#9CA3AF', fontSize: 12 }} />}
                        <Text strong style={{ fontSize: 13 }}>{mod.title}</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {lessons.length} lesson{lessons.length !== 1 ? 's' : ''}
                        </Text>
                        {!mod.isPublished && <Tag color="warning" style={{ margin: 0, fontSize: 10 }}>Draft</Tag>}
                      </Space>
                    ),
                    children: isLocked ? (
                      <div style={{ color: '#9CA3AF', fontSize: 13, padding: '4px 0' }}>
                        <LockOutlined /> Unlocks {new Date(mod.unlockAt!).toLocaleDateString()}
                      </div>
                    ) : lessons.length === 0 ? (
                      <Text type="secondary" style={{ fontSize: 13 }}>No lessons yet.</Text>
                    ) : (
                      <List
                        size="small"
                        dataSource={lessons}
                        renderItem={(lesson) => {
                          const modeIcon =
                            lesson.lessonMode === 'simulation' ? <PlayCircleOutlined style={{ color: '#7C3AED' }} /> :
                            lesson.lessonMode === 'content_and_simulation' ? <AppstoreOutlined style={{ color: '#0284C7' }} /> :
                            <FileTextOutlined style={{ color: '#059669' }} />;
                          return (
                            <List.Item
                              style={{ padding: '6px 0', borderBottom: '1px solid #F3F4F6' }}
                              extra={
                                lesson.estimatedMinutes ? (
                                  <Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                                    {lesson.estimatedMinutes} min
                                  </Text>
                                ) : null
                              }
                            >
                              <Space size={6}>
                                {modeIcon}
                                <Text style={{ fontSize: 13 }}>{lesson.title}</Text>
                                {lesson.isRequired && (
                                  <Tag color="blue" style={{ margin: 0, fontSize: 10 }}>Required</Tag>
                                )}
                                {!lesson.isPublished && (
                                  <Tag color="default" style={{ margin: 0, fontSize: 10 }}>Draft</Tag>
                                )}
                              </Space>
                            </List.Item>
                          );
                        }}
                      />
                    ),
                  };
                })}
              />
            )}
          </Card>
        </Col>

        {/* -- Sidebar ---------------------------------------------------- */}
        <Col xs={24} md={8}>
          {!isInstitutionAdmin && !isDeptManager && (
            <Card title="Enrollment" style={{ marginBottom: 16 }}>
              {renderEnrollmentCard()}
            </Card>
          )}

          {canManage && (
            <Card title="Course Management" size="small">
              <Space orientation="vertical" style={{ width: '100%' }}>
                <Link href={`/courses/${id}/edit`}>
                  <Button icon={<EditOutlined />} block>Edit Course</Button>
                </Link>

                <Link href={`/courses/${id}/activity`}>
                  <Button icon={<BarChartOutlined />} block>Simulation Activity</Button>
                </Link>

                {course.status !== 'published' && course.status !== 'archived' && (
                  <Button
                    type="primary"
                    icon={<RocketOutlined />}
                    loading={actionBusy}
                    onClick={handlePublish}
                    block
                  >
                    Publish
                  </Button>
                )}

                {course.status !== 'archived' && (
                  <Button icon={<InboxOutlined />} loading={actionBusy} onClick={handleArchive} block>
                    Archive
                  </Button>
                )}

                {course.status === 'archived' && (
                  <Popconfirm
                    title="Restore this course?"
                    description="The course will be moved back to draft and will not be visible to students until published."
                    onConfirm={handleRestore}
                    okText="Restore"
                  >
                    <Button icon={<ReloadOutlined />} loading={actionBusy} block>
                      Restore Course
                    </Button>
                  </Popconfirm>
                )}

                <Button icon={<CopyOutlined />} loading={actionBusy} onClick={handleClone} block>
                  Clone Course
                </Button>

                {canDelete && (
                  <>
                    <Divider style={{ margin: '8px 0' }} />
                    <Popconfirm
                      title="Delete course?"
                      description={`Permanently delete "${course.title}"? This cannot be undone.`}
                      onConfirm={handleDelete}
                      okText="Delete"
                      okButtonProps={{ danger: true }}
                    >
                      <Button danger icon={<DeleteOutlined />} loading={actionBusy} block>
                        Delete Course
                      </Button>
                    </Popconfirm>
                  </>
                )}
              </Space>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
