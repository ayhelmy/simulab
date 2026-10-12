'use client';

import { Form, Input } from 'antd';
import type { PasswordProps } from 'antd/es/input';
import { colors } from '@/components/home/homeTheme';

interface Props extends PasswordProps {
  name: string;
  label: string;
  rules?: Parameters<typeof Form.Item>[0]['rules'];
}

export default function PasswordInput({ name, label, rules, ...inputProps }: Props) {
  return (
    <Form.Item
      name={name}
      label={<span style={{ fontSize: 13.5, fontWeight: 600, color: colors.heading }}>{label}</span>}
      rules={rules}
      style={{ marginBottom: 12 }}
    >
      <Input.Password size="large" className="auth-input" {...inputProps} />
    </Form.Item>
  );
}
