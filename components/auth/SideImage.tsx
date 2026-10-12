'use client';

export default function SideImage() {
  return (
    <div
      className="auth-side-image"
      aria-hidden="true"
      style={{
        position: 'relative',
        height: '100%',
        width: '100%',
        background: 'center / cover no-repeat url(/images/herobg.png)',
      }}
    />
  );
}
