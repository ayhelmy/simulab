import type { Metadata } from 'next';
import HomePage from '@/components/home/HomePage';
import { getHomePageData } from '@/lib/pageContent';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const data = await getHomePageData();
    const title = data.hero?.title ?? 'BEDO SimuLearn';
    const description = data.hero?.description
      ?? 'Access browser-based interactive 3D simulations for engineering and computer science labs.';
    const heroImage = (data.hero?.extra as { heroImageUrl?: string | null } | undefined)?.heroImageUrl;

    return {
      title: `${title} | BEDO SimuLearn`,
      description,
      openGraph: {
        title,
        description,
        images: heroImage ? [{ url: heroImage }] : undefined,
      },
      alternates: { canonical: '/' },
    };
  } catch {
    return {
      title: 'BEDO SimuLearn',
      description: 'Access browser-based interactive 3D simulations for engineering and computer science labs.',
    };
  }
}

export default function Page() {
  return <HomePage />;
}
