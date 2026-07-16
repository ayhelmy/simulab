import React from 'react';

interface SpinnerProps {
  size?: number;
  color?: string;
}

export default function Spinner({ size = 24, color = '#F59324' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        border: `${Math.max(2, Math.round(size / 8))}px solid ${color}22`,
        borderTopColor: color,
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
        flexShrink: 0,
      }}
    />
  );
}
