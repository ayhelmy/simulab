import nextDynamic from 'next/dynamic';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const CatalogClientPage = nextDynamic(
  () => import('@/components/public/CatalogClientPage'),
  {
    ssr: false,
    loading: () => <div style={{ minHeight: '60vh' }} />,
  },
);

export default function PublicCatalog() {
  return <CatalogClientPage />;
}
