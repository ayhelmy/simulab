'use client';

import Image from 'next/image';
import Link from 'next/link';

export default function Logo() {
  return (
    <Link href="/" aria-label="BEDO home" style={{ display: 'inline-flex' }}>
      <Image src="/bedo-logo.png" alt="BEDO" width={110} height={39} style={{ display: 'block' }} priority />
    </Link>
  );
}
