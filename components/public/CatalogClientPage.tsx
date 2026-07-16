'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Input, Select, Button, Tag, Pagination,
  Alert, Empty, Drawer, Badge, Spin,
  Layout,
} from 'antd';
import {
  FilterOutlined, CloseOutlined, ReloadOutlined,
  AppstoreOutlined, SearchOutlined,
} from '@ant-design/icons';
import type { SimulationCatalog, SimulationSearchFilters } from '@/types';
import { getDemoCatalogTree, listDemoSimulationsPaginated } from '@/lib/simulations';
import { useAuth } from '@/context/AuthContext';
import PublicHeader from './PublicHeader';
import SimulationCard from './SimulationCard';
import { SimulationSkeletonList } from './SimulationSkeleton';
import CatalogTreeFilter from './CatalogTreeFilter';
import type { Simulation } from '@/types';
import { Typography } from 'antd';
const { Search } = Input;
const { Text } = Typography;
const DIFFICULTY_OPTIONS = [
  { value: '',             label: 'All Levels'    },
  { value: 'beginner',     label: 'Beginner'      },
  { value: 'intermediate', label: 'Intermediate'  },
  { value: 'advanced',     label: 'Advanced'      },
];

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

export default function CatalogClientPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const isAuthenticated = !authLoading && !!user;

  // -- Filter state — local state is source of truth --------------------------
  const [filters, setFilters] = useState<SimulationSearchFilters>(() =>
    readFiltersFromParams(searchParams),
  );

  const ownNavRef = useRef(false);

  useEffect(() => {
    if (ownNavRef.current) { ownNavRef.current = false; return; }
    setFilters(readFiltersFromParams(searchParams));
  }, [searchParams]);

  // -- Data state ------------------------------------------------------------
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [total,       setTotal]       = useState(0);
  const [totalPages,  setTotalPages]  = useState(1);
  const [simsLoading, setSimsLoading] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [simsError,   setSimsError]   = useState<string | null>(null);
  const [resultsKey,  setResultsKey]  = useState(0);   // increments to re-trigger card animation

  const [catalogTree,  setCatalogTree]  = useState<SimulationCatalog[]>([]);
  const [treeLoading,  setTreeLoading]  = useState(true);
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filterBarRef  = useRef<HTMLElement>(null);
  const mainRef       = useRef<HTMLDivElement>(null);

  // -- Sync filter-bar height into CSS variable so content offset stays correct --
  useEffect(() => {
    const el = filterBarRef.current;
    if (!el) return;
    const update = () =>
      document.documentElement.style.setProperty('--filter-h', `${el.offsetHeight}px`);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // -- Sync sidebar left position into CSS variable (fixed sidebar must match centered container) --
  useEffect(() => {
    const update = () => {
      const el = mainRef.current;
      if (!el) return;
      const left = el.getBoundingClientRect().left + 24; // 24px = container padding
      document.documentElement.style.setProperty('--sidebar-left', `${left}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    if (mainRef.current) ro.observe(mainRef.current);
    window.addEventListener('resize', update);
    return () => { ro.disconnect(); window.removeEventListener('resize', update); };
  }, []);

  // -- Catalog tree ----------------------------------------------------------
  useEffect(() => {
    getDemoCatalogTree()
      .then(setCatalogTree)
      .catch(() => setCatalogTree([]))
      .finally(() => setTreeLoading(false));
  }, []);

  // -- Simulations -----------------------------------------------------------
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
        setResultsKey((k) => k + 1);          // triggers stagger re-animation
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

  // -- Filter helpers --------------------------------------------------------

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

  // -- Active filter tags ----------------------------------------------------

  const activeFilterTags: { label: string; onRemove: () => void }[] = [];
  if (filters.search) {
    activeFilterTags.push({ label: `"${filters.search}"`, onRemove: () => resetPage({ search: undefined }) });
  }
  if (filters.difficulty) {
    activeFilterTags.push({ label: filters.difficulty, onRemove: () => resetPage({ difficulty: undefined }) });
  }
  if (filters.catalogId) {
    const found = findCatalogName(catalogTree, filters.catalogId);
    activeFilterTags.push({
      label:    found ?? 'Catalog',
      onRemove: () => resetPage({ catalogId: undefined, includeChildren: false }),
    });
  }

  const selectedCatalogKeys = filters.catalogId ? [filters.catalogId] : [];

  // -- Sidebar panel ---------------------------------------------------------

  const filterSidebar = (
    <div className="catalog-sidebar-inner">
      <div className="catalog-sidebar-section">
        <p className="catalog-sidebar-title">
          <AppstoreOutlined style={{ marginRight: 6 }} />
          Simulation Catalog
        </p>
        <CatalogTreeFilter
          catalogs={catalogTree}
          loading={treeLoading}
          selectedKeys={selectedCatalogKeys}
          onSelect={(keys, sub) => { handleCatalogSelect(keys, sub); setFiltersDrawerOpen(false); }}
        />
      </div>

      <div className="catalog-sidebar-divider" />

      <div className="catalog-sidebar-section">
        <p className="catalog-sidebar-title">Difficulty</p>
        <div className="catalog-diff-list">
          {DIFFICULTY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`catalog-filter-btn${
                (!filters.difficulty && !opt.value) || filters.difficulty === opt.value ? ' active' : ''
              }`}
              onClick={() => { handleDifficultyChange(opt.value); setFiltersDrawerOpen(false); }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // -- Results area ----------------------------------------------------------

  function renderResults() {
    if (simsError) {
      return (
        <Alert
          type="error"
          message="Failed to load simulations"
          description={simsError}
          showIcon
          action={
            <Button size="small" onClick={() => setFilters({ ...filters })}>Retry</Button>
          }
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

          {/* key={resultsKey} remounts list → re-triggers CSS animation per card */}
          <div
            key={resultsKey}
            className="sim-results-list"
            role="list"
            aria-label={`${total} simulations`}
            aria-busy={simsLoading}
          >
            {simulations.map((sim, i) => (
              <div
                key={sim.id}
                role="listitem"
                className="sim-card-anim"
                style={{ animationDelay: `${i * 45}ms` }}
              >
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

  // -- Render ----------------------------------------------------------------

  return (
    <Layout style={{ minHeight: '100vh', background: '#f9f9fa' }}>
      <PublicHeader />

      <div className="public-catalog-content">


        {/* ── Main layout: sidebar placeholder + results ──────────────────── */}
        <div className="catalog-main-layout" ref={mainRef}>
        {/* ── Sticky search + filter bar ──────────────────────────────────── */}
        <section ref={filterBarRef} className="catalog-filter-bar" aria-label="Search and filter">
          <div className="catalog-filter-bar-inner">
            <div className="catalog-filter-row">
              {/* Search */}
              <div className="catalog-search-wrap">
                <Search
                  placeholder="Search simulations by title, topic, or objective..."
                  defaultValue={filters.search ?? ''}
                  key={filters.search ?? ''}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onSearch={handleSearchChange}
                  allowClear
                  prefix={<SearchOutlined className="catalog-search-icon" />}
                  className="catalog-search-input"
                  aria-label="Search simulations"
                />
              </div>

              {/* Difficulty select */}
              <div className="catalog-select-wrap">
                <Select
                  value={filters.difficulty ?? ''}
                  onChange={handleDifficultyChange}
                  options={DIFFICULTY_OPTIONS}
                  style={{ width: '100%' }}
                  aria-label="Filter by difficulty"
                />
              </div>

              {/* Right-side controls */}
              <div className="catalog-controls-wrap">
                {/* <span className="catalog-result-count">
                  {simsLoading && isFirstLoad
                    ? '—'
                    : `${total.toLocaleString()} result${total !== 1 ? 's' : ''}`}
                </span> */}

                <Button
                  icon={<FilterOutlined />}
                  className="catalog-mobile-filter-btn"
                  onClick={() => setFiltersDrawerOpen(true)}
                  aria-label="Open filters"
                >
                  Filters
                  {activeFilterTags.length > 0 && (
                    <Badge count={activeFilterTags.length} size="small" style={{ marginLeft: 6 }} />
                  )}
                </Button>

                {activeFilterTags.length > 0 && (
                  <button className="catalog-reset-btn" onClick={handleResetAll}>
                    <ReloadOutlined style={{ marginRight: 4 }} />
                    Reset all
                  </button>
                )}
              </div>
            </div>

            {/* Active filter tags */}
            {activeFilterTags.length > 0 && (
              <div className="catalog-active-tags" role="list" aria-label="Active filters">
                {activeFilterTags.map((t, i) => (
                  <Tag
                    key={t.label}
                    closable
                    onClose={t.onRemove}
                    closeIcon={<CloseOutlined />}
                    className="catalog-active-tag"
                    role="listitem"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    {t.label}
                  </Tag>
                ))}
              </div>
            )}
          </div>
        </section>

          {/* Placeholder reserves sidebar width in flex; sidebar itself is position:fixed */}
          <div className="catalog-sidebar-placeholder">
            <aside className="catalog-sidebar-desktop" aria-label="Filter simulations">
              {filterSidebar}
            </aside>
          </div>

          {/* Results */}
          <main className="catalog-results-column">
            {renderResults()}
          </main>
        </div>
      </div>

      {/* Mobile filters drawer */}
      <Drawer
        title="Filters"
        placement="left"
        open={filtersDrawerOpen}
        onClose={() => setFiltersDrawerOpen(false)}
        styles={{ wrapper: { width: 280 }, body: { padding: '16px' } }}
      >
        {filterSidebar}
      </Drawer>
    </Layout>
  );
}

// ── utility ───────────────────────────────────────────────────────────────────

function findCatalogName(nodes: SimulationCatalog[], id: string): string | undefined {
  for (const n of nodes) {
    if (n.id === id) return n.name;
    if (n.children?.length) {
      const found = findCatalogName(n.children, id);
      if (found) return found;
    }
  }
  return undefined;
}
