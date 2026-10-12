import React, { Suspense } from 'react'
import CatalogClientPage from '@/components/public/CatalogClientPage';

export default function PublicCatalog() {
  return (
    <Suspense>
      <CatalogClientPage/>
    </Suspense>
  )
}
