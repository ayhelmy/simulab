'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  Row, Col, Card, Tag, Input, Select, Button, Typography, Spin, Alert,
  Tooltip, App, Empty, Pagination, Layout, Divider, Drawer,
} from 'antd';
import {
  ExperimentOutlined, EyeOutlined, PlusOutlined,
  ClockCircleOutlined, FilterOutlined, PlayCircleOutlined,
} from '@ant-design/icons';
import PageHeader from '@/components/common/PageHeader';
import CatalogTreeFilter from '@/components/public/CatalogTreeFilter';
import {
  listSimulations, getAssignedCatalogTree, launchSimulation,
  demoLaunchSimulation, type SimulationQuery,
} from '@/lib/simulations';
import type { Simulation, SimulationCatalog } from '@/types';
import type { PaginationMeta } from '@/types/api';
import { useRouteGuard } from '@/hooks/useRouteGuard';

const { Search } = Input;
const { Text, Title } = Typography;
const { Sider, Content } = Layout;

const DIFF_COLOR: Record<string, string> = {
  beginner: '#52c41a', intermediate: '#1677ff', advanced: '#f5222d',
};
const DIFF_LABEL: Record<string, string> = {
  beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced',
};

// -- Simulation card ----------------------------------------------------------─

function SimCard({
  sim, canLaunch, canManage, onLaunch, onClick,
}: {
  sim: Simulation;
  canLaunch: boolean;
  canManage: boolean;
  onLaunch: (sim: Simulation) => void;
  onClick:  (sim: Simulation) => void;
}) {
  const isDemo = sim.visibility === 'demo_public';

  return (
    <Card
      hoverable
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      cover={
        sim.thumbnailUrl ? (
          <img src={sim.thumbnailUrl} alt={sim.title}
            style={{ height: 140, objectFit: 'cover', width: '100%' }} />
        ) : (
          <div style={{
            height: 140,
            background: 'linear-gradient(135deg, #fef3e2 0%, #fde8c6 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ExperimentOutlined style={{ fontSize: 44, color: 'rgba(255,255,255,0.6)' }} />
          </div>
        )
      }
      actions={[
        <Tooltip key="view" title="View details">
          <EyeOutlined onClick={() => onClick(sim)} />
        </Tooltip>,
        ...(canLaunch || isDemo ? [
          <Tooltip key="launch" title={isDemo ? 'Try demo' : 'Launch'}>
            <PlayCircleOutlined
              onClick={() => onLaunch(sim)}
              style={{ color: '#F59324' }}
            />
          </Tooltip>,
        ] : []),
      ]}
    >
      <Card.Meta
        title={
          <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {sim.title}
            </span>
            {isDemo && (
              <Tag color="success" style={{ margin: 0, fontSize: 10, flexShrink: 0 }}>Demo</Tag>
            )}
            {canManage && sim.visibility === 'institution' && (
              <Tag color="processing" style={{ margin: 0, fontSize: 10, flexShrink: 0 }}>Inst.</Tag>
            )}
          </div>
        }
        description={
          <div>
            <Text type="secondary" style={{
              fontSize: 12, display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {sim.description ?? 'No description provided.'}
            </Text>
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Tag color={DIFF_COLOR[sim.difficulty] ?? '#1677ff'} style={{ fontSize: 11, border: 'none' }}>
                {DIFF_LABEL[sim.difficulty] ?? sim.difficulty}
              </Tag>
              {sim.estimatedMinutes && (
                <Tag icon={<ClockCircleOutlined />} style={{ fontSize: 11 }}>
                  {sim.estimatedMinutes}m
                </Tag>
              )}
            </div>
          </div>
        }
      />
    </Card>
  );
}

// -- Main page ----------------------------------------------------------------─

const PAGE_SIZE = 12;

const DIFFICULTY_OPTIONS = [
  { value: '',             label: 'All Levels' },
  { value: 'beginner',     label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced',     label: 'Advanced' },
];

export default function SimulationsPage() {
  const allowed = useRouteGuard(
    'simulations.view_catalog', 'simulation_catalogs.view_assigned',
    'simulations.view_demo', 'simulation_catalogs.manage_global',
  );
  const { hasPermission, hasRole } = useAuth();
  const router  = useRouter();
  const { message } = App.useApp();

  const canManageGlobal  = hasPermission('simulation_catalogs.manage_global');
  const isSuperAdmin     = hasRole('super_admin');
  const isInstitutionAdmin = hasRole('institution_admin');
  const isInstructor     = hasRole('instructor');
  const isStudent        = hasRole('student');
  const isTA             = hasRole('teaching_assistant');

  // Everyone with an institution (admin, instructor, student, TA) sees institution catalog
  const isInstitutionUser = isInstitutionAdmin || isInstructor || isStudent || isTA;

  // -- Filter state ------------------------------------------------------------
  const [search,     setSearch]     = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [catalogId,  setCatalogId]  = useState<string | undefined>();
  const [subtree,    setSubtree]    = useState(false);
  const [page,       setPage]       = useState(1);

  // -- Data state --------------------------------------------------------------
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [meta,        setMeta]        = useState<PaginationMeta | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [error,       setError]       = useState<string | null>(null);

  const [catalogTree,  setCatalogTree]  = useState<SimulationCatalog[]>([]);
  const [treeLoading,  setTreeLoading]  = useState(true);
  const [mobileFilter, setMobileFilter] = useState(false);

  // Debounce for search input
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // -- Load catalog tree (institution-scoped users only) --------------------─
  useEffect(() => {
    if (!allowed || !isInstitutionUser) return;
    getAssignedCatalogTree()
      .then(setCatalogTree)
      .catch(() => setCatalogTree([]))
      .finally(() => setTreeLoading(false));
  }, [allowed, isInstitutionUser]);

  // -- Load simulations ------------------------------------------------------─
  const load = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    setError(null);
    try {
      const q: SimulationQuery = { page, limit: PAGE_SIZE };
      if (search)     q.search     = search;
      if (difficulty) q.difficulty = difficulty as Simulation['difficulty'];

      if (isInstitutionUser) {
        // No scope filter — backend returns demo_public + institution-assigned simulations.
        // scope=assigned would exclude demo_public simulations even when they're in
        // assigned catalogs, causing catalogs with items to appear empty.
        if (catalogId) {
          q.catalog_id      = catalogId;
          q.include_subtree = subtree ? 'true' : 'false';
        }
      } else if (!canManageGlobal && !isSuperAdmin) {
        // Non-institution users with no management role: demo only
        q.scope = 'demo';
      }

      const { simulations: rows, meta: m } = await listSimulations(q);
      console.log('Loaded simulations', { rows, meta: m, query: q , catalogId, subtree });
      setSimulations(rows);
      setMeta(m);
      setIsFirstLoad(false);
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string };
      setError(e.title ?? e.detail ?? 'Failed to load simulations');
      setIsFirstLoad(false);
    } finally {
      setLoading(false);
    }
  }, [allowed, page, search, difficulty, catalogId, subtree, isInstitutionUser, canManageGlobal, isSuperAdmin]);

  useEffect(() => { load(); }, [load]);

  // -- Launch ----------------------------------------------------------------
  async function handleLaunch(sim: Simulation) {
    try {
      const result = sim.visibility === 'demo_public'
        ? await demoLaunchSimulation(sim.id)
        : await launchSimulation(sim.id);
      window.open(result.launchUrl, '_blank', 'noopener,noreferrer');
    } catch (err: unknown) {
      const e = err as { title?: string; detail?: string };
      message.error(e.title ?? e.detail ?? 'Failed to launch simulation');
    }
  }

  function handleSearchInput(value: string) {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      setSearch(value);
      setPage(1);
    }, 350);
  }

  function handleCatalogSelect(keys: string[], inc: boolean) {
    setCatalogId(keys[0] ?? undefined);
    setSubtree(keys[0] ? inc : false);
    setPage(1);
  }

  if (!allowed) return null;

  const canLaunch = isInstitutionUser || hasPermission('simulations.view_catalog');

  // -- Sidebar content --------------------------------------------------------
  const sidebar = isInstitutionUser ? (
    <div style={{ padding: '0px 12px',height: '75vh', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Title level={5} style={{
        fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.05em', color: '#6B7280', marginBottom: 8,
      }}>
        Catalog
      </Title>
      <CatalogTreeFilter
        catalogs={catalogTree}
        loading={treeLoading}
        selectedKeys={catalogId ? [catalogId] : []}
        onSelect={(keys, inc) => { handleCatalogSelect(keys, inc); setMobileFilter(false); }}
      />

      <Divider style={{ margin: '12px 0' }} />

      <Title level={5} style={{
        fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.05em', color: '#6B7280', marginBottom: 8,
      }}>
        Difficulty
      </Title>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
        {DIFFICULTY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => { setDifficulty(opt.value); setPage(1); }}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              background: difficulty === opt.value ? '#FEF3E2' : 'none',
              color: difficulty === opt.value ? '#F59324' : '#374151',
              fontWeight: difficulty === opt.value ? 600 : 400,
              border: 'none', padding: '6px 10px', borderRadius: 6,
              fontSize: 14, cursor: 'pointer', transition: 'background 0.12s',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <div>
      <PageHeader
        title="Simulations"
        subtitle={
          meta
            ? `${meta.total.toLocaleString()} simulation${meta.total !== 1 ? 's' : ''} available`
            : 'Browse and launch your institution\'s virtual lab simulations'
        }
        extra={
          canManageGlobal ? (
            <Link href="/simulation-catalogs">
              <Button type="primary" icon={<PlusOutlined />}>
                Manage Catalogs
              </Button>
            </Link>
          ) : undefined
        }
      />

      {/* Filter bar */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }} align="middle">
        <Col flex="1 1 240px">
          <Search
            placeholder="Search simulations…"
            allowClear
            defaultValue={search}
            onSearch={handleSearchInput}
            onChange={(e) => { if (!e.target.value) { setSearch(''); setPage(1); } else handleSearchInput(e.target.value); }}
          />
        </Col>
        <Col flex="0 0 160px">
          <Select
            value={difficulty || undefined}
            placeholder="All Levels"
            allowClear
            style={{ width: '100%' }}
            onChange={(v) => { setDifficulty(v ?? ''); setPage(1); }}
            options={DIFFICULTY_OPTIONS.slice(1)}
          />
        </Col>
        {canManageGlobal && (
          <Col flex="0 0 160px">
            <Select
              placeholder="All Types"
              allowClear
              style={{ width: '100%' }}
              onChange={() => {}}
              options={[
                { value: 'scorm',    label: 'SCORM' },
                { value: 'lti',      label: 'LTI' },
                { value: 'webgl',    label: 'WebGL' },
                { value: 'internal', label: 'Internal' },
              ]}
            />
          </Col>
        )}
        {/* Mobile filter toggle */}
        {isInstitutionUser && (
          <Col xs={24} sm={0}>
            <Button
              block
              icon={<FilterOutlined />}
              onClick={() => setMobileFilter(true)}
            >
              Filter by Catalog / Difficulty
            </Button>
          </Col>
        )}
      </Row>

      {error && <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />}

      {/* Main: sidebar + grid */}
      <Layout style={{ background: 'transparent', gap: 0 }}>
        {/* Desktop sidebar */}
        {isInstitutionUser && (
          <Sider
            width={290}
            theme="light"
            style={{
              background: '#fff',
              border: '1px solid #E5E7EB',
              borderRadius: 10,
              marginRight: 20,
              flexShrink: 0,
              alignSelf: 'flex-start',
              position: 'sticky',
              top: 80,
              fontWeight: 500,
            }}
            breakpoint="md"
            collapsedWidth={0}
            trigger={null}
          >
            {sidebar}
          </Sider>
        )}

        <Content style={{ background: 'transparent', minWidth: 0 }}>
          {loading && isFirstLoad ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
              <Spin size="large" />
            </div>
          ) : simulations.length === 0 && !loading ? (
            <Empty
              image={<ExperimentOutlined style={{ fontSize: 64, color: '#9CA3AF' }} />}
              description={
                <>
                  <Text strong>No simulations found</Text>
                  <br />
                  <Text type="secondary">
                    {catalogId
                      ? 'No simulations in this catalog section match your filters.'
                      : isInstitutionUser
                        ? 'Your institution has no simulations assigned to its catalog yet.'
                        : 'No simulations are available for your account.'}
                  </Text>
                </>
              }
              style={{ padding: '3rem 0' }}
            />
          ) : (
            <>
              <div style={{ position: 'relative' }}>
                {loading && !isFirstLoad && (
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 10, borderRadius: 8,
                  }}>
                    <Spin />
                  </div>
                )}
                <Row gutter={[16, 16]} style={{ opacity: loading && !isFirstLoad ? 0.5 : 1, transition: 'opacity 0.15s' }}>
                  {simulations.map((sim) => (
                    <Col key={sim.id} xs={24} sm={12} md={8} xl={6}>
                      <SimCard
                        sim={sim}
                        canLaunch={canLaunch}
                        canManage={canManageGlobal}
                        onLaunch={handleLaunch}
                        onClick={(s) => router.push(`/simulations/${s.id}`)}
                      />
                    </Col>
                  ))}
                </Row>
              </div>

              {meta && meta.total > PAGE_SIZE && (
                <div style={{ marginTop: 24, display: 'flex', justifyContent: 'center' }}>
                  <Pagination
                    current={page}
                    total={meta.total}
                    pageSize={PAGE_SIZE}
                    showSizeChanger={false}
                    onChange={(p) => setPage(p)}
                    showTotal={(t, r) => `${r[0]}–${r[1]} of ${t}`}
                  />
                </div>
              )}
            </>
          )}
        </Content>
      </Layout>
      {/* Mobile catalog/difficulty drawer */}
      {isInstitutionUser && (
        <Drawer
          title="Filter Simulations"
          placement="left"
          open={mobileFilter}
          onClose={() => setMobileFilter(false)}
          styles={{ body: { padding: 0 }, wrapper: { width: 280 } }}
        >
          {sidebar}
        </Drawer>
      )}
    </div>
  );
}
