// Alert / banner for success, error, warning, info messages.
// TODO: implement styles (skeleton only)

interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onDismiss?: () => void;
}

export default function Alert({ type, message, onDismiss }: AlertProps) {
  return (
    <div role="alert" data-type={type} style={{ padding: '0.75rem 1rem', borderRadius: 6, display: 'flex', justifyContent: 'space-between' }}>
      <span>{message}</span>
      {onDismiss && <button onClick={onDismiss} aria-label="Dismiss">✕</button>}
    </div>
  );
}
