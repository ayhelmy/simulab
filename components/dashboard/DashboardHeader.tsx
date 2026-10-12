'use client';

import { Typography, Tag, Space } from 'antd';
import type { UserRole, DashboardScope } from '@/types';

export function scopeToContext(scope: DashboardScope | undefined) {
  return {
    institutionName: scope?.institution_name ?? undefined,
    departmentName: scope?.department_name ?? undefined,
    academicYearName: scope?.academic_year_name ?? undefined,
    semesterTermName: scope?.semester_term_name ?? undefined,
  };
}

const { Title, Text } = Typography;

const ROLE_LABEL: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  institution_admin: 'Institution Admin',
  dept_manager: 'Department Manager',
  instructor: 'Instructor',
  teaching_assistant: 'Teaching Assistant',
  student: 'Student',
  guest: 'Guest',
};

const ROLE_COLOR: Record<UserRole, string> = {
  super_admin: 'blue',
  institution_admin: 'purple',
  dept_manager: 'blue',
  instructor: 'green',
  teaching_assistant: 'cyan',
  student: 'orange',
  guest: 'default',
};

interface Props {
  name: string;
  role: UserRole;
  institutionName?: string | null;
  departmentName?: string | null;
  academicYearName?: string | null;
  semesterTermName?: string | null;
  subtitle?: string;
}

export default function DashboardHeader({
  name, role, institutionName, departmentName, academicYearName, semesterTermName, subtitle,
}: Props) {
  const contextParts = [institutionName, departmentName, academicYearName, semesterTermName].filter(Boolean);

  return (
    <div style={{ marginBottom: 24 }}>
      <Space align="center" wrap style={{ marginBottom: 4 }}>
        <Title level={4} style={{ margin: 0 }}>Welcome back, {name}</Title>
        <Tag color={ROLE_COLOR[role]}>{ROLE_LABEL[role]}</Tag>
      </Space>
      {contextParts.length > 0 && (
        <div>
          <Text type="secondary" style={{ fontSize: 13 }}>{contextParts.join(' • ')}</Text>
        </div>
      )}
      {subtitle && (
        <div>
          <Text type="secondary" style={{ fontSize: 13 }}>{subtitle}</Text>
        </div>
      )}
    </div>
  );
}
