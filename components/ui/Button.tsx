'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

const styles: Record<string, React.CSSProperties> = {
  base: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    fontWeight: 600, borderRadius: 8, border: 'none', cursor: 'pointer',
    transition: 'opacity 0.15s, background 0.15s',
    outline: 'none',
  },
  primary:   { background: '#F59324', color: '#fff' },
  secondary: { background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB' },
  danger:    { background: '#DC2626', color: '#fff' },
  ghost:     { background: 'transparent', color: '#F59324' },
  sm:  { padding: '0.375rem 0.75rem', fontSize: 13 },
  md:  { padding: '0.625rem 1.25rem', fontSize: 14 },
  lg:  { padding: '0.75rem 1.75rem',  fontSize: 16 },
  disabled: { opacity: 0.6, cursor: 'not-allowed' },
};

export default function Button({
  variant = 'primary', size = 'md', loading = false, fullWidth = false,
  children, disabled, style, ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      style={{
        ...styles.base,
        ...styles[variant],
        ...styles[size],
        ...(fullWidth ? { width: '100%' } : {}),
        ...((disabled || loading) ? styles.disabled : {}),
        ...style,
      }}
    >
      {loading && (
        <span
          style={{
            width: 14, height: 14, border: '2px solid currentColor',
            borderTopColor: 'transparent', borderRadius: '50%',
            display: 'inline-block', animation: 'spin 0.7s linear infinite',
          }}
        />
      )}
      {loading ? 'Loading…' : children}
    </button>
  );
}
