const COLOR_MAP: Record<string, React.CSSProperties> = {
  green:  { background: '#D1FAE5', color: '#065F46', border: '1px solid #A7F3D0' },
  blue:   { background: '#DBEAFE', color: '#1E40AF', border: '1px solid #BFDBFE' },
  yellow: { background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' },
  red:    { background: '#FEE2E2', color: '#991B1B', border: '1px solid #FECACA' },
  gray:   { background: '#F3F4F6', color: '#374151', border: '1px solid #E5E7EB' },
  purple: { background: '#EDE9FE', color: '#5B21B6', border: '1px solid #DDD6FE' },
  orange: { background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A' },
};

interface BadgeProps {
  label: string;
  color?: keyof typeof COLOR_MAP;
}

export default function Badge({ label, color = 'gray' }: BadgeProps) {
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: '0.75rem',
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 12,
        whiteSpace: 'nowrap',
        lineHeight: 1.6,
        ...(COLOR_MAP[color] ?? COLOR_MAP.gray),
      }}
    >
      {label}
    </span>
  );
}
