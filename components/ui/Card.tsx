// Generic card container. TODO: implement with styles (skeleton only)

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export default function Card({ children, className }: CardProps) {
  return <div className={className} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '1.25rem' }}>{children}</div>;
}
