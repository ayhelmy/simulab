'use client';

import { Button } from 'antd';
import { colors } from '@/components/home/homeTheme';

interface Props {
  loading?: boolean;
  children: React.ReactNode;
}

export default function LoginButton({ loading, children }: Props) {
  return (
    <Button
      type="primary"
      htmlType="submit"
      loading={loading}
      block
      size="large"
      className="auth-login-btn"
      style={{
        background: colors.primary, borderColor: colors.primary,
        height: 48, borderRadius: 10, fontSize: 15, fontWeight: 700,
      }}
    >
      {children}
    </Button>
  );
}
