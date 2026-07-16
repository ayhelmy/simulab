'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { createCourse } from '@/lib/courses';
import { listDepartments } from '@/lib/departments';
import { listAcademicYears } from '@/lib/academic-years';
import { listSemesterTerms } from '@/lib/semester-terms';
import type { Course, AcademicYear, SemesterTerm } from '@/types';
import type { Department } from '@/lib/departments';
import {
  Form, Input, Select, InputNumber, Button, Card, Alert, Breadcrumb, Row, Col,
  Typography, DatePicker, App,
} from 'antd';
import { ArrowLeftOutlined, InfoCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { Title, Text } = Typography;

interface NewCourseFields {
  title:          string;
  description?:   string;
  thumbnailUrl?:  string;
  departmentId:   string;
  academicYearId: string;
  semesterTermId: string;
  enrollmentType: Course['enrollmentType'];
  enrollmentCap?: number;
  passingGrade?:  number;
  dateRange?:     [dayjs.Dayjs, dayjs.Dayjs] | null;
}

export default function NewCoursePage() {
  const { user, hasRole } = useAuth();
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const [submitting, setSubmitting]       = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [departments, setDepartments]     = useState<Department[]>([]);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms]                 = useState<SemesterTerm[]>([]);
  const [deptsLoading, setDeptsLoading]   = useState(false);
  const [yearsLoading, setYearsLoading]   = useState(false);
  const [termsLoading, setTermsLoading]   = useState(false);

  const canCreate = hasRole('super_admin') || hasRole('instructor') || hasRole('teaching_assistant');

  // Load all departments in the institution on mount
  useEffect(() => {
    if (!user?.institutionId) return;
    setDeptsLoading(true);
    listDepartments(user.institutionId)
      .then(setDepartments)
      .catch(() => setDepartments([]))
      .finally(() => setDeptsLoading(false));
  }, [user?.institutionId]);

  const selectedDeptId = Form.useWatch('departmentId', form) as string | undefined;
  const selectedYearId = Form.useWatch('academicYearId', form) as string | undefined;

  const loadYears = async (deptId: string) => {
    setYearsLoading(true);
    setAcademicYears([]);
    setTerms([]);
    form.setFieldsValue({ academicYearId: undefined, semesterTermId: undefined });
    try { setAcademicYears(await listAcademicYears(deptId)); }
    catch { setAcademicYears([]); }
    finally { setYearsLoading(false); }
  };

  const loadTerms = async (yearId: string) => {
    setTermsLoading(true);
    setTerms([]);
    form.setFieldsValue({ semesterTermId: undefined });
    try { setTerms(await listSemesterTerms(yearId)); }
    catch { setTerms([]); }
    finally { setTermsLoading(false); }
  };

  if (!canCreate) {
    return (
      <div style={{ maxWidth: 600, margin: '40px auto' }}>
        <Alert
          type="info"
          showIcon
          message="Course creation is for instructors"
          description={
            hasRole('institution_admin')
              ? 'As institution admin you manage departments, academic years, and catalog assignments. Instructors create courses within the academic structure.'
              : 'Only instructors and super admins can create courses.'
          }
          style={{ marginBottom: 16 }}
        />
        <Link href="/courses"><Button icon={<ArrowLeftOutlined />}>Back to Courses</Button></Link>
      </div>
    );
  }

  async function handleFinish(values: NewCourseFields) {
    if (!user) return;
    setSubmitting(true);
    setError(null);
    try {
      const course = await createCourse({
        title:          values.title.trim(),
        institutionId:  user.institutionId ?? '',
        departmentId:   values.departmentId,
        academicYearId: values.academicYearId,
        semesterTermId: values.semesterTermId,
        description:    values.description?.trim() || undefined,
        thumbnailUrl:   values.thumbnailUrl?.trim() || undefined,
        enrollmentType: values.enrollmentType,
        enrollmentCap:  values.enrollmentCap ?? null,
        passingGrade:   values.passingGrade ?? 60,
        startDate:      values.dateRange?.[0]?.toISOString() || undefined,
        endDate:        values.dateRange?.[1]?.toISOString() || undefined,
      });
      message.success('Course created!');
      router.push(`/courses/${course.id}/edit`);
    } catch (err: unknown) {
      const e = err as { detail?: string; title?: string };
      setError(e?.detail ?? e?.title ?? 'Failed to create course.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <Breadcrumb
        style={{ marginBottom: 20 }}
        items={[
          { title: <Link href="/courses">Courses</Link> },
          { title: 'New Course' },
        ]}
      />

      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>Create Course</Title>
        <Text type="secondary">Select the department, academic year, and semester term for this course.</Text>
      </div>

      {error && (
        <Alert type="error" message={error} showIcon style={{ marginBottom: 20 }} closable onClose={() => setError(null)} />
      )}

      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          initialValues={{ enrollmentType: 'open', passingGrade: 60 }}
          requiredMark={false}
        >
          {/* -- Academic context ------------------------------------ */}
          <Alert
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            message="Academic Context"
            description="Choose the department, academic year, and semester term. The department determines which simulation catalogs are available in the course builder."
            style={{ marginBottom: 20 }}
          />

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item label="Department" name="departmentId" rules={[{ required: true }]}>
                <Select
                  placeholder="Select department"
                  loading={deptsLoading}
                  showSearch
                  optionFilterProp="label"
                  onChange={(v: string) => loadYears(v)}
                  options={departments.map(d => ({ value: d.id, label: `${d.name}${d.code ? ` (${d.code})` : ''}` }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Academic Year" name="academicYearId" rules={[{ required: true }]}>
                <Select
                  placeholder="Select year"
                  loading={yearsLoading}
                  disabled={!selectedDeptId}
                  onChange={(v: string) => loadTerms(v)}
                  options={academicYears.map(y => ({ value: y.id, label: y.name }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Semester Term" name="semesterTermId" rules={[{ required: true }]}>
                <Select
                  placeholder="Select term"
                  loading={termsLoading}
                  disabled={!selectedYearId}
                  options={terms.map(t => ({ value: t.id, label: t.name }))}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* -- Course details ------------------------------------ */}
          <Form.Item
            label="Course Title"
            name="title"
            rules={[{ required: true, message: 'Course title is required.' }]}
          >
            <Input placeholder="e.g. Introduction to Fluid Mechanics" size="large" />
          </Form.Item>

          <Form.Item label="Description" name="description">
            <TextArea placeholder="What will students learn?" rows={4} showCount maxLength={2000} />
          </Form.Item>

          <Form.Item label="Thumbnail URL" name="thumbnailUrl">
            <Input placeholder="https://example.com/thumbnail.jpg" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="Enrollment Type" name="enrollmentType" rules={[{ required: true }]}>
                <Select options={[
                  { value: 'open',     label: 'Open — anyone can enroll immediately' },
                  { value: 'approval', label: 'Approval — instructor reviews each request' },
                  { value: 'code',     label: 'Code — students need an enrollment code' },
                  { value: 'admin',    label: 'Admin — only admins can enroll students' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Enrollment Cap" name="enrollmentCap" extra="Leave blank for unlimited">
                <InputNumber min={1} style={{ width: '100%' }} placeholder="Unlimited" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item label="Passing Grade (%)" name="passingGrade">
                <InputNumber min={0} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label="Course Date Range" name="dateRange">
            <DatePicker.RangePicker style={{ width: '100%' }} placeholder={['Start date', 'End date']} />
          </Form.Item>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
            <Link href="/courses"><Button size="large">Cancel</Button></Link>
            <Button type="primary" htmlType="submit" loading={submitting} size="large">Create Course</Button>
          </div>
        </Form>
      </Card>
    </div>
  );
}
