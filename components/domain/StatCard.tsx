// Dashboard stat card. SRS §4.14 ANL-01 to ANL-07.
// TODO: implement with proper styles (skeleton only)

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  icon?: React.ReactNode;
}

export default function StatCard({ label, value, delta, icon }: StatCardProps) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{label}</span>
        {icon}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 700 }}>{value}</div>
      {delta && <div>{delta}</div>}
    </div>
  );
}
