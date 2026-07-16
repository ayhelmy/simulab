'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createUser, updateUser } from '@/lib/users';
import { listDepartments } from '@/lib/departments';
import { listAcademicYears } from '@/lib/academic-years';
import { listSemesterTerms } from '@/lib/semester-terms';
import { createAcademicAssignment } from '@/lib/user-academic-assignments';
import type { User, AcademicYear, SemesterTerm } from '@/types';
import type { Department } from '@/lib/departments';
import { Modal, Form, Input, Select, Alert, Typography, Row, Col, Divider } from 'antd';

const { Text } = Typography;

const SUPER_ADMIN_ROLES = [
  { value: 'super_admin',       label: 'Super Admin' },
  { value: 'institution_admin', label: 'Institution Admin' },
  { value: 'guest',             label: 'Guest' },
];

const INSTITUTION_ROLES = [
  { value: 'dept_manager',       label: 'Department Manager' },
  { value: 'instructor',         label: 'Instructor' },
  { value: 'teaching_assistant', label: 'Teaching Assistant' },
  { value: 'student',            label: 'Student' },
];

interface Props {
  user?:     User;
  onClose:   () => void;
  onSuccess: () => void;
}

interface FormFields {
  email?:          string;
  firstName:       string;
  lastName:        string;
  role?:           string;
  status?:         User['status'];
  departmentId?:   string;
  academicYearId?: string;
  semesterTermId?: string;
}

export default function UserModal({ user, onClose, onSuccess }: Props) {
  const { hasPermission, hasRole, user: actor } = useAuth();
  const isEdit   = !!user;
  const canAdmin = hasPermission('users.assign_roles') || hasPermission('users.update_all');

  const roleOptions = hasRole('super_admin') ? SUPER_ADMIN_ROLES : INSTITUTION_ROLES;

  // True when the user being edited is a student (based on their actual roles)
  const editUserIsStudent = isEdit && user?.roles?.some((r) => r.name === 'student');

  const [apiError, setApiError]   = useState<string | null>(null);
  const [saving, setSaving]       = useState(false);
  const [departments, setDepts]   = useState<Department[]>([]);
  const [acadYears, setAcadYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms]         = useState<SemesterTerm[]>([]);
  const [yearsLoading, setYLoad]  = useState(false);
  const [termsLoading, setTLoad]  = useState(false);

  const [form] = Form.useForm<FormFields>();
  const watchedRole   = Form.useWatch('role',           form) as string | undefined;
  const watchedDeptId = Form.useWatch('departmentId',   form) as string | undefined;
  const watchedYearId = Form.useWatch('academicYearId', form) as string | undefined;

  // In create mode: driven by the role selector; in edit mode: by the user's actual role
  const isStudentRole = isEdit ? !!editUserIsStudent : watchedRole === 'student';

  // Load departments whenever student context is active
  useEffect(() => {
    if (!isStudentRole || !actor?.institutionId) return;
    listDepartments(actor.institutionId).then(setDepts).catch(() => setDepts([]));
  }, [isStudentRole, actor?.institutionId]);

  // Create mode only: reset academic fields when role changes away from student
  useEffect(() => {
    if (isEdit) return;
    if (!isStudentRole) {
      form.setFieldsValue({ departmentId: undefined, academicYearId: undefined, semesterTermId: undefined });
      setAcadYears([]);
      setTerms([]);
    }
  }, [isStudentRole, isEdit, form]);

  // Edit mode: pre-fill academic assignment from the user's currentStudentAssignment
  useEffect(() => {
    if (!isEdit || !editUserIsStudent) return;
    const csa = user?.currentStudentAssignment;
    if (!csa) return;

    setYLoad(true);
    listAcademicYears(csa.departmentId)
      .then(async (years) => {
        setAcadYears(years);
        const sTerms = await listSemesterTerms(csa.academicYearId);
        setTerms(sTerms);
        form.setFieldsValue({
          departmentId:   csa.departmentId,
          academicYearId: csa.academicYearId,
          semesterTermId: csa.semesterTermId,
        });
      })
      .catch(() => {})
      .finally(() => setYLoad(false));
  // run once on mount for the edit+student case
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadYears = async (deptId: string) => {
    setYLoad(true);
    setAcadYears([]);
    setTerms([]);
    form.setFieldsValue({ academicYearId: undefined, semesterTermId: undefined });
    try { setAcadYears(await listAcademicYears(deptId)); }
    catch { setAcadYears([]); }
    finally { setYLoad(false); }
  };

  const loadTerms = async (yearId: string) => {
    setTLoad(true);
    setTerms([]);
    form.setFieldsValue({ semesterTermId: undefined });
    try { setTerms(await listSemesterTerms(yearId)); }
    catch { setTerms([]); }
    finally { setTLoad(false); }
  };

  async function handleFinish(values: FormFields) {
    setSaving(true);
    setApiError(null);
    try {
      if (isEdit) {
        await updateUser(user!.id, {
          firstName: values.firstName,
          lastName:  values.lastName,
          ...(canAdmin ? { status: values.status } : {}),
        });

        // Update student academic assignment (replaces current via backend upsert)
        if (
          editUserIsStudent &&
          values.departmentId &&
          values.academicYearId &&
          values.semesterTermId
        ) {
          await createAcademicAssignment(user!.id, {
            departmentId:   values.departmentId,
            academicYearId: values.academicYearId,
            semesterTermId: values.semesterTermId,
            roleContext:    'student',
          });
        }
      } else {
        const created = await createUser({
          email:     values.email!,
          firstName: values.firstName,
          lastName:  values.lastName,
          role:      values.role || undefined,
        });

        if (
          values.role === 'student' &&
          values.departmentId &&
          values.academicYearId &&
          values.semesterTermId
        ) {
          await createAcademicAssignment(created.id, {
            departmentId:   values.departmentId,
            academicYearId: values.academicYearId,
            semesterTermId: values.semesterTermId,
            roleContext:    'student',
          });
        }
      }
      onSuccess();
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string };
      setApiError(e.title ?? e.detail ?? 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title={isEdit ? 'Edit User' : 'Add User'}
      onCancel={onClose}
      onOk={() => form.submit()}
      okText={isEdit ? 'Save Changes' : 'Create User'}
      confirmLoading={saving}
      destroyOnHidden
      width={520}
    >
      {apiError && (
        <Alert type="error" message={apiError} showIcon style={{ marginBottom: 16 }} />
      )}

      <Form
        form={form}
        layout="vertical"
        requiredMark={false}
        initialValues={{
          email:     user?.email ?? '',
          firstName: user?.firstName ?? '',
          lastName:  user?.lastName ?? '',
          role:      user?.roles?.[0]?.name ?? undefined,
          status:    user?.status ?? 'pending',
        }}
        onFinish={handleFinish}
      >
        {!isEdit && (
          <Form.Item
            label="Email address"
            name="email"
            rules={[
              { required: true, message: 'Email is required.' },
              { type: 'email', message: 'Enter a valid email address.' },
            ]}
          >
            <Input autoFocus />
          </Form.Item>
        )}

        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              label="First name"
              name="firstName"
              rules={[{ required: true, message: 'Required.' }]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Last name"
              name="lastName"
              rules={[{ required: true, message: 'Required.' }]}
            >
              <Input />
            </Form.Item>
          </Col>
        </Row>

        {!isEdit && (
          <Form.Item label="Role" name="role">
            <Select
              placeholder="No role assigned"
              allowClear
              options={roleOptions}
            />
          </Form.Item>
        )}

        {isEdit && canAdmin && (
          <Form.Item label="Status" name="status">
            <Select
              options={[
                { value: 'active',    label: 'Active' },
                { value: 'suspended', label: 'Suspended' },
                { value: 'pending',   label: 'Pending' },
              ]}
            />
          </Form.Item>
        )}

        {/* -- Student academic assignment (create + edit) ---------------------- */}
        {isStudentRole && (
          <>
            <Divider style={{ margin: '12px 0' }}>Academic Assignment</Divider>
            <Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 12 }}>
              {isEdit
                ? 'Update the student\'s current department, academic year, and semester.'
                : 'Assign the student to their current department, academic year, and semester.'}
            </Text>

            <Form.Item
              label="Department"
              name="departmentId"
              rules={[{ required: true, message: 'Department is required for students.' }]}
            >
              <Select
                placeholder="Select department"
                showSearch
                optionFilterProp="label"
                onChange={(v: string) => loadYears(v)}
                options={departments.map(d => ({
                  value: d.id,
                  label: `${d.name}${d.code ? ` (${d.code})` : ''}`,
                }))}
              />
            </Form.Item>

            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  label="Academic Year"
                  name="academicYearId"
                  rules={[{ required: true, message: 'Required.' }]}
                >
                  <Select
                    placeholder="Select year"
                    loading={yearsLoading}
                    disabled={!watchedDeptId}
                    onChange={(v: string) => loadTerms(v)}
                    options={acadYears.map(y => ({ value: y.id, label: y.name }))}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Semester Term"
                  name="semesterTermId"
                  rules={[{ required: true, message: 'Required.' }]}
                >
                  <Select
                    placeholder="Select term"
                    loading={termsLoading}
                    disabled={!watchedYearId}
                    options={terms.map(t => ({ value: t.id, label: t.name }))}
                  />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}
      </Form>

      {!isEdit && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          A verification email will be sent to the user with login instructions.
        </Text>
      )}
    </Modal>
  );
}
