'use client';

import { Form, Input, type InputProps } from 'antd';
import { colors } from '@/components/home/homeTheme';

interface Props extends InputProps {
  name: string;
  label: string;
  rules?: Parameters<typeof Form.Item>[0]['rules'];
}

export default function InputField({ name, label, rules, ...inputProps }: Props) {
  return (
    <Form.Item
      name={name}
      label={<span style={{ fontSize: 13.5, fontWeight: 600, color: colors.heading }}>{label}</span>}
      rules={rules}
      style={{ marginBottom: 18 }}
    >
      <Input size="large" className="auth-input" {...inputProps} />
    </Form.Item>
  );
}
