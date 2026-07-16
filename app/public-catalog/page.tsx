import React, { Suspense } from 'react';
import CatalogClientPage from '@/components/public/CatalogClientPage';

export const dynamic = 'force-dynamic';

export default function PublicCatalog() {
  return (
    <Suspense fallback={<div style={{ minHeight: '60vh' }} />}>
      <CatalogClientPage />
    </Suspense>
  );
}
