// Progress bar for lesson/course completion. SRS §4.9 PRG-03.
// TODO: implement styles (skeleton only)

interface ProgressBarProps {
  value: number;  // 0–100
  label?: string;
}

export default function ProgressBar({ value, label }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? 'Progress'} style={{ background: '#e5e7eb', borderRadius: 4, height: 8 }}>
      <div style={{ width: `${clamped}%`, background: '#3b82f6', height: '100%', borderRadius: 4, transition: 'width 0.3s' }} />
    </div>
  );
}
