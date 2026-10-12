'use client';

import { useMemo, useState } from 'react';
import { Layout } from 'antd';
import { RESOURCES, type ResourceFilterType } from '@/lib/resources';
import { colors } from '@/components/home/homeTheme';
import AnnouncementBar, { ANNOUNCEMENT_BAR_HEIGHT } from '@/components/home/AnnouncementBar';
import Footer from '@/components/home/Footer';
import PublicHeader from '@/components/public/PublicHeader';
import ResourcesHero from '@/components/public/ResourcesHero';
import ResourceFilter from '@/components/public/ResourceFilter';
import ResourceGrid from '@/components/public/ResourceGrid';
import CTASection from '@/components/public/CTASection';

const { Content } = Layout;
const HEADER_HEIGHT = 64;

export default function ResourcesPage() {
  const [filter, setFilter] = useState<ResourceFilterType>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return RESOURCES.filter((r) => {
      const matchesType = filter === 'all' || r.type === filter;
      const matchesSearch = !q || r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
  }, [filter, search]);

  return (
    <Layout style={{ minHeight: '100vh', background: colors.bg }}>
      <AnnouncementBar />
      <PublicHeader topOffset={ANNOUNCEMENT_BAR_HEIGHT} />
      <Content style={{ paddingTop: HEADER_HEIGHT + ANNOUNCEMENT_BAR_HEIGHT }}>
        <ResourcesHero />

        <div style={{ maxWidth: 1160, margin: '0 auto', padding: '28px 24px 80px' }}>
          <div style={{ marginBottom: 28 }}>
            <ResourceFilter active={filter} onChange={setFilter} search={search} onSearchChange={setSearch} />
          </div>

          <ResourceGrid resources={filtered} />
        </div>

        <CTASection />

        <Footer />
      </Content>
    </Layout>
  );
}
