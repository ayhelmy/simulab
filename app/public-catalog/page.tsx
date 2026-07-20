import CatalogClientPage from '@/components/public/CatalogClientPage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function PublicCatalog() {
  return <CatalogClientPage />;
}
