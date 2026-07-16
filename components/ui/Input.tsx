'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export default function Input({ label, error, hint, id, style, ...props }: InputProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <label
          htmlFor={id}
          style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}
        >
          {label}
        </label>
      )}
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        style={{
          padding: '0.625rem 0.875rem',
          fontSize: 14,
          border: `1px solid ${error ? '#DC2626' : '#D1D5DB'}`,
          borderRadius: 8,
          outline: 'none',
          width: '100%',
          background: '#fff',
          color: '#111827',
          transition: 'border-color 0.15s',
          boxSizing: 'border-box',
          ...style,
        }}
        {...props}
      />
      {error && (
        <span id={`${id}-error`} role="alert" style={{ fontSize: 12, color: '#DC2626' }}>
          {error}
        </span>
      )}
      {!error && hint && (
        <span id={`${id}-hint`} style={{ fontSize: 12, color: '#6B7280' }}>
          {hint}
        </span>
      )}
    </div>
  );
}
