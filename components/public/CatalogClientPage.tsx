'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Select, Pagination, Alert, Empty, Drawer, Button, Spin, Layout } from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import type { SimulationCatalog, SimulationSearchFilters, CatalogSimulation } from '@/types';
import { getDemoCatalogTree, listDemoSimulationsPaginated } from '@/lib/simulations';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/components/home/homeTheme';
import Footer from '@/components/home/Footer';
import PublicHeader from './PublicHeader';
import CatalogHero from './CatalogHero';
import CatalogFilterBar from './CatalogFilterBar';
import CatalogSidebarFilters from './CatalogSidebarFilters';
import SimulationCard from './SimulationCard';
import { SimulationSkeletonList } from './SimulationSkeleton';
import AnnouncementBar, { ANNOUNCEMENT_BAR_HEIGHT } from '../home/AnnouncementBar';


const HEADER_HEIGHT = 64;

const PAGE_SIZE = 12;

// ── url helpers ───────────────────────────────────────────────────────────────

function readFiltersFromParams(params: URLSearchParams): SimulationSearchFilters {
  return {
    search:          params.get('search')      || undefined,
    catalogId:       params.get('catalog')     || undefined,
    includeChildren: params.get('subtree')     === 'true',
    difficulty:      (params.get('difficulty') as SimulationSearchFilters['difficulty']) || undefined,
    page:            parseInt(params.get('page') || '1', 10) || 1,
    limit:           PAGE_SIZE,
  };
}

/** Flattens the catalog tree (root + all descendants) so any node's id — however deep — resolves to a label. */
function flattenCatalogTree(nodes: SimulationCatalog[]): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  for (const n of nodes) {
    out.push({ value: n.id, label: n.name });
    if (n.children?.length) out.push(...flattenCatalogTree(n.children));
  }
  return out;
}

function buildURL(filters: SimulationSearchFilters): string {
  const p = new URLSearchParams();
  if (filters.search)          p.set('search',     filters.search);
  if (filters.catalogId)       p.set('catalog',    filters.catalogId);
  if (filters.includeChildren) p.set('subtree',    'true');
  if (filters.difficulty)      p.set('difficulty', filters.difficulty);
  if ((filters.page ?? 1) > 1) p.set('page',       String(filters.page));
  const s = p.toString();
  return s ? `/public-catalog?${s}` : '/public-catalog';
}

// ── main component ────────────────────────────────────────────────────────────
const { Content } = Layout;

export default function CatalogClientPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const isAuthenticated = !authLoading && !!user;

  const [filters, setFilters] = useState<SimulationSearchFilters>(() =>
    readFiltersFromParams(searchParams),
  );

  const ownNavRef = useRef(false);

  useEffect(() => {
    if (ownNavRef.current) { ownNavRef.current = false; return; }
    setFilters(readFiltersFromParams(searchParams));
  }, [searchParams]);

  // -- Data state ------------------------------------------------------------
  const [simulations, setSimulations] = useState<CatalogSimulation[]>([]);
  const [total,       setTotal]       = useState(0);
  const [totalPages,  setTotalPages]  = useState(1);
  const [simsLoading, setSimsLoading] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [simsError,   setSimsError]   = useState<string | null>(null);
  const [resultsKey,  setResultsKey]  = useState(0);

  const [catalogTree, setCatalogTree] = useState<SimulationCatalog[]>([]);
  const [treeLoading, setTreeLoading] = useState(true);
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // -- Catalog tree ------------------------------------------------------------
  useEffect(() => {
    getDemoCatalogTree()
      .then(setCatalogTree)
      .catch(() => setCatalogTree([]))
      .finally(() => setTreeLoading(false));
  }, []);

  const disciplineOptions = useMemo(
    () => flattenCatalogTree(catalogTree),
    [catalogTree],
  );

  // -- Simulations -------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    setSimsLoading(true);
    setSimsError(null);

    listDemoSimulationsPaginated(filters)
      .then((res) => {
        if (cancelled) return;
        setSimulations(res.simulations);
        setTotal(res.meta.total);
        setTotalPages(res.meta.totalPages);
        setIsFirstLoad(false);
        setResultsKey((k) => k + 1);
      })
      .catch((err) => {
        if (cancelled) return;
        setSimsError(err?.title ?? err?.message ?? 'Failed to load simulations.');
        setSimulations([]);
        setIsFirstLoad(false);
      })
      .finally(() => { if (!cancelled) setSimsLoading(false); });

    return () => { cancelled = true; };
  }, [filters]);

  // -- Filter helpers ------------------------------------------------------------

  function applyFilters(next: SimulationSearchFilters, replace = true) {
    ownNavRef.current = true;
    const url = buildURL(next);
    if (replace) router.replace(url, { scroll: false });
    else         router.push(url,    { scroll: false });
    setFilters(next);
  }

  function resetPage(partial: Partial<SimulationSearchFilters>) {
    applyFilters({ ...filters, ...partial, page: 1 }, true);
  }

  const handleSearchChange = useCallback(
    (value: string) => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
      searchTimeout.current = setTimeout(() => {
        resetPage({ search: value || undefined });
      }, 350);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters],
  );

  function handleDifficultyChange(value: string) {
    resetPage({ difficulty: (value as SimulationSearchFilters['difficulty']) || undefined });
  }

  function handleDisciplineChange(catalogId: string) {
    resetPage({ catalogId: catalogId || undefined, includeChildren: !!catalogId });
  }

  function handleCatalogSelect(keys: string[], includeChildren: boolean) {
    const catalogId = keys[0] ?? undefined;
    resetPage({ catalogId, includeChildren: catalogId ? includeChildren : false });
  }

  function handlePageChange(page: number) {
    applyFilters({ ...filters, page }, false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleResetAll() {
    ownNavRef.current = true;
    router.replace('/public-catalog');
    setFilters({ page: 1, limit: PAGE_SIZE });
  }

  const hasActiveFilters = !!(filters.search || filters.difficulty || filters.catalogId);

  // -- Sidebar ------------------------------------------------------------------

  const selectedCatalogKeys = filters.catalogId ? [filters.catalogId] : [];

  const sidebar = (
    <CatalogSidebarFilters
      catalogTree={catalogTree}
      catalogLoading={treeLoading}
      selectedCatalogKeys={selectedCatalogKeys}
      onCatalogSelect={handleCatalogSelect}
      level={filters.difficulty ?? ''}
      onLevelChange={handleDifficultyChange}
    />
  );

  // -- Results --------------------------------------------------------------------

  function renderResults() {
    if (simsError) {
      return (
        <Alert
          type="error"
          message="Failed to load simulations"
          description={simsError}
          showIcon
          action={<Button size="small" onClick={() => setFilters({ ...filters })}>Retry</Button>}
        />
      );
    }

    if (isFirstLoad && simsLoading) {
      return <SimulationSkeletonList count={PAGE_SIZE} />;
    }

    if (!simsLoading && simulations.length === 0) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <span>
              No simulations match your current filters.{' '}
              <button className="catalog-reset-inline" onClick={handleResetAll}>
                Clear all filters
              </button>
            </span>
          }
          style={{ margin: '64px auto' }}
        />
      );
    }

    return (
      <>
        <div className={`catalog-results-wrap${simsLoading ? ' is-loading' : ''}`}>
          {simsLoading && (
            <div className="catalog-loading-overlay" aria-live="polite" aria-label="Loading simulations">
              <Spin size="large" />
            </div>
          )}

          <div key={resultsKey} className="sim-results-grid" role="list" aria-label={`${total} simulations`} aria-busy={simsLoading}>
            {simulations.map((sim, i) => (
              <div key={sim.id} role="listitem" className="sim-card-anim" style={{ animationDelay: `${i * 45}ms` }}>
                <SimulationCard simulation={sim} isAuthenticated={isAuthenticated} />
              </div>
            ))}
          </div>
        </div>

        {totalPages > 1 && (
          <div className="catalog-pagination">
            <Pagination
              current={filters.page ?? 1}
              total={total}
              pageSize={PAGE_SIZE}
              onChange={handlePageChange}
              showSizeChanger={false}
              showQuickJumper={totalPages > 10}
            />
          </div>
        )}
      </>
    );
  }

  // -- Render -----------------------------------------------------------------

  return (
        <Layout style={{ minHeight: '100vh', background: '#fff' }}>
      <AnnouncementBar />
      <PublicHeader topOffset={ANNOUNCEMENT_BAR_HEIGHT} />
      <Content style={{ paddingTop: HEADER_HEIGHT + ANNOUNCEMENT_BAR_HEIGHT }}>
     <div style={{ background: colors.bg }}>
   
      {/* <div style={{ paddingTop: 64 }}> */}
        <CatalogHero />

        <div style={{ margin: '0 auto',         padding: '16px 100px 16px 100px',
 }}>
          <CatalogFilterBar
            searchValue={filters.search ?? ''}
            onSearchChange={handleSearchChange}
            level={filters.difficulty ?? ''}
            onLevelChange={handleDifficultyChange}
            disciplineOptions={disciplineOptions}
            disciplineValue={filters.catalogId ?? ''}
            onDisciplineChange={handleDisciplineChange}
            hasActiveFilters={hasActiveFilters}
            onResetAll={handleResetAll}
          />
        </div>

        <div className="catalog-main-layout" style={{  margin: '0 auto',        padding: '16px 100px 16px 100px', display: 'flex', alignItems: 'flex-start', gap: 24 }}>
          <aside className="catalog-sidebar-desktop" aria-label="Filter simulations" style={{ flexShrink: 0, width: 248 }}>
            {sidebar}
          </aside>

          <main className="catalog-results-column" style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
              <span style={{ fontSize: 14, color: colors.body }}>
                Showing <strong style={{ color: colors.heading }}>{total}</strong> simulation{total !== 1 ? 's' : ''}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Button
                  icon={<FilterOutlined />}
                  className="catalog-mobile-filter-btn"
                  onClick={() => setFiltersDrawerOpen(true)}
                >
                  Filters
                </Button>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: colors.body }}>
                  Sort:
                  <Select value="relevant" style={{ width: 150 }} options={[{ value: 'relevant', label: 'Most Relevant' }]} />
                </span>
              </div>
            </div>

            {renderResults()}
          </main>
        </div>

        <Footer />
      {/* </div> */}

      <Drawer
        title="Filters"
        placement="left"
        open={filtersDrawerOpen}
        onClose={() => setFiltersDrawerOpen(false)}
        styles={{ body: { padding: '16px' } }}
      >
        {sidebar}
      </Drawer>
    </div>
      </Content>
    </Layout>
   
  );
}
