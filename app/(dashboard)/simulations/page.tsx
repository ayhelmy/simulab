'use client';

import { useState, useEffect, useCallback, useRef, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  Row, Col, Input, Select, Button, Typography, Spin, Alert,
  App, Empty, Pagination, Layout, Divider, Drawer,
} from 'antd';
import {
  ExperimentOutlined, EyeOutlined, PlusOutlined,
  ClockCircleOutlined, FilterOutlined, PlayCircleOutlined,
  FileTextOutlined, ThunderboltOutlined, AppstoreAddOutlined,
  SafetyOutlined, AuditOutlined, SearchOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { Chip, learningStyles as ls, type ChipTone } from '@/components/student/studentUi';
import {
  ADMIN_PAGE_CLASS, adminStyles as adm, AdminHeader, StatusChip, BuildChip,
  StateBlock, LoadErrorCard, ResultCount,
} from '@/components/admin/adminUi';
import CoursePickerModal, { type CoursePickerPurpose } from '@/components/instructor/CoursePickerModal';
import DeleteSimulationModal from '@/components/admin/DeleteSimulationModal';
import PageHeader from '@/components/common/PageHeader';
import skin from '@/components/layout/BedoAppSkin.module.css';
import CatalogTreeFilter from '@/components/public/CatalogTreeFilter';
import {
  listSimulations, getAssignedCatalogTree, launchSimulation,
  demoLaunchSimulation, type SimulationQuery,
} from '@/lib/simulations';
import type { Simulation, SimulationCatalog, SimulationDetail } from '@/types';
import type { PaginationMeta } from '@/types/api';
import { useRouteGuard } from '@/hooks/useRouteGuard';

const { Search } = Input;
const { Text, Title } = Typography;
const { Sider, Content } = Layout;

const DIFF_LABEL: Record<string, string> = {
  beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced',
};

// -- Simulation card ----------------------------------------------------------─
// Light card per BEDO §12: thumbnail · badges · title · description · metadata ·
// labelled actions. Instructors get Preview · Add to Course · View Activity ·
// Details; everyone else keeps Launch / Try Demo · Details.

const DIFF_TONE: Record<string, ChipTone> = {
  beginner: 'success', intermediate: 'info', advanced: 'error',
};

function SimCard({
  sim, discipline, canLaunch, canManage, isInstructor, institutionAdmin, onLaunch, onPick,
}: {
  sim: Simulation;
  discipline?: string | null;
  canLaunch: boolean;
  canManage: boolean;
  /** Instructor actions instead of learner launch actions. */
  isInstructor: boolean;
  /** Institution Admin: availability badge + Preview / Details, no learner launch. */
  institutionAdmin?: boolean;
  onLaunch: (sim: Simulation) => void;
  onPick: (sim: Simulation, purpose: CoursePickerPurpose) => void;
}) {
  const router = useRouter();
  const isDemo = sim.visibility === 'demo_public';
  const detailHref = `/simulations/${sim.id}`;
  const stop = (e: MouseEvent) => e.stopPropagation();

  return (
    <article className={`${ls.panel} ${ls.simCard}`} onClick={() => router.push(detailHref)}>
      <div
        className={ls.simCardThumb}
        style={sim.thumbnailUrl ? { backgroundImage: `url(${sim.thumbnailUrl})` } : undefined}
      >
        {!sim.thumbnailUrl && <ExperimentOutlined aria-hidden />}
        {isDemo && <Chip tone="primary" className={ls.thumbBadge}>Demo</Chip>}
        {!isDemo && (canManage || institutionAdmin) && (sim.visibility === 'institution' || sim.visibility === 'demo_and_institution') && (
          <Chip tone="info" className={ls.thumbBadge}>Institution</Chip>
        )}
      </div>

      <div className={ls.courseBody}>
        <h3 className={ls.courseTitle} title={sim.title}>
          <Link href={detailHref} onClick={stop}>{sim.title}</Link>
        </h3>
        <div className={ls.metaRow}>
          {sim.launchType === 'webgl' || sim.type === 'webgl'
            ? <Chip tone="info" className={ls.chipSm} icon={<ThunderboltOutlined />}>WebGL</Chip>
            : <Chip tone="neutral" className={ls.chipSm}>{sim.type.toUpperCase()}</Chip>}
          <Chip tone={DIFF_TONE[sim.difficulty] ?? 'neutral'} className={ls.chipSm}>
            {DIFF_LABEL[sim.difficulty] ?? sim.difficulty}
          </Chip>
          {sim.estimatedMinutes != null && (
            <Chip tone="neutral" className={ls.chipSm} icon={<ClockCircleOutlined />}>{sim.estimatedMinutes} min</Chip>
          )}
        </div>
        {discipline && <span className={ls.meta}>{discipline}</span>}
        <p className={`${ls.clamp2} ${ls.cardDesc}`}>{sim.description ?? 'No description provided.'}</p>

        <div className={ls.spacer} />
        <div className={ls.cardFooter} onClick={stop}>
          {institutionAdmin ? (
            <div className={adm.simActions} style={{ gridTemplateColumns: '1fr 1fr' }}>
              <Link href={`/simulations/${sim.id}/play`} style={{ gridColumn: 'auto' }}>
                <Button size="small" icon={<EyeOutlined />} disabled={sim.status !== 'active'}>Preview</Button>
              </Link>
              <Link href={detailHref}><Button size="small" icon={<FileTextOutlined />}>Details</Button></Link>
            </div>
          ) : isInstructor ? (
            <>
              <Link href={`/simulations/${sim.id}/play`}>
                <Button block type="primary" icon={<EyeOutlined />}>Preview</Button>
              </Link>
              <div className={ls.managerCardActions}>
                <Button size="small" onClick={() => onPick(sim, 'add')}>Add to Course</Button>
                <Button size="small" onClick={() => onPick(sim, 'activity')}>View Activity</Button>
              </div>
              <Link href={detailHref}><Button size="small" type="text" block icon={<FileTextOutlined />}>Details</Button></Link>
            </>
          ) : (
            <div className={ls.managerCardActions}>
              {(canLaunch || isDemo) && (
                <Button size="small" type="primary" icon={<PlayCircleOutlined />} onClick={() => onLaunch(sim)}>
                  {isDemo ? 'Try Demo' : 'Launch'}
                </Button>
              )}
              <Link href={detailHref}><Button size="small" icon={<FileTextOutlined />}>Details</Button></Link>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

// -- Admin simulation card ------------------------------------------------------
// Platform view: availability (demo / institution), lifecycle status, WebGL build
// state and catalog context, with labelled management actions.

const VISIBILITY_META: Record<Simulation['visibility'], { label: string; tone: ChipTone }> = {
  demo_public: { label: 'Demo', tone: 'primary' },
  institution: { label: 'Institution', tone: 'info' },
  demo_and_institution: { label: 'Demo + Institution', tone: 'info' },
  private: { label: 'Private', tone: 'neutral' },
};

function AdminSimCard({ sim, catalogName, onDelete }: {
  sim: Simulation;
  catalogName?: string | null;
  /** Shown only when the viewer can manage simulations globally (super_admin). */
  onDelete?: (sim: Simulation) => void;
}) {
  const router = useRouter();
  const detailHref = `/simulations/${sim.id}`;
  const isWebGL = sim.launchType === 'webgl' || sim.type === 'webgl';
  const vis = VISIBILITY_META[sim.visibility] ?? { label: sim.visibility, tone: 'neutral' as ChipTone };
  const stop = (e: MouseEvent) => e.stopPropagation();

  return (
    <article className={`${ls.panel} ${ls.simCard}`} onClick={() => router.push(detailHref)}>
      <div
        className={ls.simCardThumb}
        style={sim.thumbnailUrl ? { backgroundImage: `url(${sim.thumbnailUrl})` } : undefined}
      >
        {!sim.thumbnailUrl && <ExperimentOutlined aria-hidden />}
        <Chip tone={vis.tone} className={ls.thumbBadge}>{vis.label}</Chip>
      </div>

      <div className={ls.courseBody}>
        <div className={adm.simFacts}>
          <StatusChip status={sim.status} />
          {isWebGL && sim.buildStatus && sim.buildStatus !== 'ready' && <BuildChip status={sim.buildStatus} />}
        </div>
        <h3 className={ls.courseTitle} title={sim.title}>
          <Link href={detailHref} onClick={stop}>{sim.title}</Link>
        </h3>
        <div className={ls.metaRow}>
          {isWebGL
            ? <Chip tone="info" className={ls.chipSm} icon={<ThunderboltOutlined />}>WebGL</Chip>
            : <Chip tone="neutral" className={ls.chipSm}>{sim.type.toUpperCase()}</Chip>}
          <Chip tone={DIFF_TONE[sim.difficulty] ?? 'neutral'} className={ls.chipSm}>
            {DIFF_LABEL[sim.difficulty] ?? sim.difficulty}
          </Chip>
          {sim.estimatedMinutes != null && (
            <Chip tone="neutral" className={ls.chipSm} icon={<ClockCircleOutlined />}>{sim.estimatedMinutes} min</Chip>
          )}
        </div>
        <div className={adm.simCatalogLine}>
          <AppstoreAddOutlined aria-hidden />
          <span>{catalogName ? `Catalog: ${catalogName}` : 'Catalog assignment: see Sim Catalogs'}</span>
        </div>

        <div className={ls.spacer} />
        <div className={`${ls.cardFooter} ${adm.simActions}`} onClick={stop}>
          <Link href={`/simulations/${sim.id}/play`}>
            <Button icon={<EyeOutlined />} disabled={sim.status !== 'active'}>Preview</Button>
          </Link>
          <Link href={detailHref}><Button size="small" icon={<FileTextOutlined />}>Details</Button></Link>
          <Link href="/simulation-catalogs"><Button size="small" icon={<AppstoreAddOutlined />}>Assign Catalog</Button></Link>
          <Link href={`${detailHref}#access`}><Button size="small" icon={<SafetyOutlined />}>Manage Access</Button></Link>
          <Link href="/audit-logs"><Button size="small" icon={<AuditOutlined />}>Activity</Button></Link>
          {onDelete && (
            <Button size="small" danger icon={<DeleteOutlined />} style={{ gridColumn: '1 / -1' }} onClick={() => onDelete(sim)}>
              Delete
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

function findCatalogName(nodes: SimulationCatalog[], id: string): string | null {
  for (const n of nodes) {
    if (n.id === id) return n.name;
    const hit = n.children ? findCatalogName(n.children, id) : null;
    if (hit) return hit;
  }
  return null;
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
  const { message } = App.useApp();

  const canManageGlobal  = hasPermission('simulation_catalogs.manage_global');
  const isSuperAdmin     = hasRole('super_admin');
  const isInstitutionAdmin = hasRole('institution_admin');
  const isInstructor     = hasRole('instructor');
  const isStudent        = hasRole('student');
  const isTA             = hasRole('teaching_assistant');

  // Everyone with an institution (admin, instructor, student, TA) sees institution catalog
  const isInstitutionUser = isInstitutionAdmin || isInstructor || isStudent || isTA;
  // Platform operations view (Super Admin): management cards and filters.
  const adminView = !isInstitutionUser && (canManageGlobal || isSuperAdmin);

  // -- Filter state ------------------------------------------------------------
  const [search,     setSearch]     = useState('');
  const [searchText, setSearchText] = useState('');
  const [difficulty, setDifficulty] = useState('');
  // Admin-only filters — existing list-endpoint query params (SimulationQuery).
  const [visibility, setVisibility] = useState<Simulation['visibility'] | undefined>();
  const [simStatus,  setSimStatus]  = useState<Simulation['status'] | undefined>();
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

  // Add to Course / View Activity — instructor course picker
  const [picker, setPicker] = useState<{ sim: Simulation; purpose: CoursePickerPurpose } | null>(null);

  // Permanent delete (super_admin)
  const [deleteTarget, setDeleteTarget] = useState<Simulation | null>(null);

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
      } else {
        if (visibility) q.visibility = visibility;
        if (simStatus)  q.status     = simStatus;
      }

      const { simulations: rows, meta: m } = await listSimulations(q);
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
  }, [allowed, page, search, difficulty, catalogId, subtree, isInstitutionUser, canManageGlobal, isSuperAdmin, visibility, simStatus]);

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
  // Instructors manage courses: preview and attach simulations instead of launching them.
  const instructorActions = isInstructor && !isStudent;
  // Institution Admin: access-management framing, Preview / Details cards.
  const instAdminView = isInstitutionAdmin && !isInstructor && !isStudent && !isTA;
  const selectedCatalogName = catalogId ? findCatalogName(catalogTree, catalogId) : null;

  // -- Super Admin: platform simulation management ---------------------------
  if (adminView) {
    const hasFilters = !!(search || difficulty || visibility || simStatus);
    const clearFilters = () => {
      setSearchText(''); setSearch(''); setDifficulty(''); setVisibility(undefined); setSimStatus(undefined); setPage(1);
    };

    return (
      <div className={ADMIN_PAGE_CLASS}>
        <AdminHeader
          title="Simulations"
          subtitle="Manage simulation availability, demo access, WebGL status, and catalog assignments."
          actions={
            <Link href="/simulation-catalogs">
              <Button type="primary" icon={<AppstoreAddOutlined />}>Manage Catalogs</Button>
            </Link>
          }
        />

        <div className={skin.filterBar} role="search" style={{ marginBottom: 16 }}>
          <div className={adm.toolbarSearch}>
            <Input
              placeholder="Search simulations"
              aria-label="Search simulations"
              prefix={<SearchOutlined style={{ color: '#9CA3AF' }} />}
              allowClear
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                if (!e.target.value) { setSearch(''); setPage(1); } else handleSearchInput(e.target.value);
              }}
            />
          </div>
          <div className={adm.toolbarFilter}>
            <Select
              value={difficulty || undefined}
              placeholder="All levels"
              aria-label="Filter by level"
              allowClear
              style={{ width: '100%' }}
              onChange={(v) => { setDifficulty(v ?? ''); setPage(1); }}
              options={DIFFICULTY_OPTIONS.slice(1)}
            />
          </div>
          <div className={adm.toolbarFilter}>
            <Select
              value={visibility}
              placeholder="All types"
              aria-label="Filter by availability type"
              allowClear
              style={{ width: '100%' }}
              onChange={(v) => { setVisibility(v); setPage(1); }}
              options={[
                { value: 'demo_public', label: 'Demo' },
                { value: 'institution', label: 'Institution' },
                { value: 'demo_and_institution', label: 'Demo + Institution' },
                { value: 'private', label: 'Private' },
              ]}
            />
          </div>
          <div className={adm.toolbarFilter}>
            <Select
              value={simStatus}
              placeholder="All statuses"
              aria-label="Filter by status"
              allowClear
              style={{ width: '100%' }}
              onChange={(v) => { setSimStatus(v); setPage(1); }}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'draft', label: 'Draft' },
                { value: 'deprecated', label: 'Deprecated' },
              ]}
            />
          </div>
          {hasFilters && <Button type="link" onClick={clearFilters} style={{ paddingInline: 4 }}>Clear filters</Button>}
          <div className={adm.toolbarEnd}>
            {!error && <ResultCount total={meta?.total} noun="simulation" />}
          </div>
        </div>

        {error ? (
          <LoadErrorCard
            title="Could not load simulations"
            text="The simulation list could not be loaded. Check the connection or try again."
            detail={error}
            onRetry={load}
          />
        ) : loading && isFirstLoad ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}><Spin size="large" /></div>
        ) : simulations.length === 0 && !loading ? (
          <div className={adm.stateCard}>
            {hasFilters ? (
              <StateBlock
                kind="no-match"
                title="No simulations match your filters"
                text="Try a different search term, or clear the level, type, and status filters."
                actions={<Button onClick={clearFilters}>Clear filters</Button>}
              />
            ) : (
              <StateBlock
                icon={<ExperimentOutlined />}
                title="No simulations yet"
                text="Simulations uploaded to a catalog will appear here. Open Sim Catalogs to upload a WebGL simulation."
                actions={<Link href="/simulation-catalogs"><Button type="primary" icon={<AppstoreAddOutlined />}>Manage Catalogs</Button></Link>}
              />
            )}
          </div>
        ) : (
          <>
            <div style={{ position: 'relative' }}>
              {loading && !isFirstLoad && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                  <Spin />
                </div>
              )}
              <Row gutter={[16, 16]} style={{ opacity: loading && !isFirstLoad ? 0.35 : 1, transition: 'opacity 0.15s' }}>
                {simulations.map((sim) => (
                  <Col key={sim.id} xs={24} sm={12} lg={8} xxl={6}>
                    <AdminSimCard
                      sim={sim}
                      catalogName={(sim as Partial<SimulationDetail>).discipline}
                      onDelete={canManageGlobal ? setDeleteTarget : undefined}
                    />
                  </Col>
                ))}
              </Row>
            </div>

            {meta && meta.total > PAGE_SIZE && (
              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end' }}>
                <Pagination
                  current={page}
                  total={meta.total}
                  pageSize={PAGE_SIZE}
                  showSizeChanger={false}
                  onChange={(p) => setPage(p)}
                  showTotal={(t, r) => `Showing ${r[0]}–${r[1]} of ${t}`}
                />
              </div>
            )}
          </>
        )}

        <DeleteSimulationModal
          sim={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setDeleteTarget(null);
            // Deleting the last card on a page steps back a page; otherwise refresh in place.
            if (simulations.length === 1 && page > 1) setPage(page - 1);
            else load();
          }}
        />
      </div>
    );
  }

  // -- Sidebar content --------------------------------------------------------
  const sidebar = isInstitutionUser ? (
    <div style={{ padding: instAdminView ? '12px 12px 16px' : '0px 12px', height: instAdminView ? undefined : '75vh', display: 'flex', flexDirection: 'column', gap: instAdminView ? 8 : 12 }}>
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
    <div className={instAdminView ? ADMIN_PAGE_CLASS : ls.page}>
      {instAdminView ? (
        <AdminHeader
          title="Simulations"
          subtitle="Simulations available to your institution through its assigned catalogs. Preview them, review details, and monitor access."
          actions={<Link href="/simulation-catalogs"><Button icon={<AppstoreAddOutlined />}>View Catalogs</Button></Link>}
        />
      ) : (
      <PageHeader
        title="Simulations"
        subtitle={
          meta
            ? `${meta.total.toLocaleString()} simulation${meta.total !== 1 ? 's' : ''} available`
            : instructorActions
              ? 'Preview simulations and add them to your courses'
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
      )}

      {/* Filter bar */}
      <div className={skin.filterBar} style={{ marginBottom: 20 }}>
      <Row gutter={[12, 12]} style={{ flex: 1, minWidth: 0 }} align="middle">
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
          <Col xs={24} {...(instAdminView ? { lg: 0 } : { sm: 0 })}>
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
      </div>

      {error && (instAdminView ? (
        <LoadErrorCard
          title="Could not load simulations"
          text="The simulation list could not be loaded. Check the connection or try again."
          detail={error}
          onRetry={load}
        />
      ) : <Alert type="error" title={error} showIcon style={{ marginBottom: 16 }} />)}

      {/* Main: sidebar + grid */}
      <Layout style={{ background: 'transparent', gap: 0 }}>
        {/* Desktop sidebar */}
        {isInstitutionUser && (
          <Sider
            width={instAdminView ? 248 : 290}
            theme="light"
            style={{
              background: '#fff',
              border: '1px solid #DDDEDF',
              borderRadius: 12,
              boxShadow: instAdminView ? 'none' : '0 1px 4px rgba(0,0,0,0.04)',
              marginRight: instAdminView ? 16 : 20,
              flexShrink: 0,
              alignSelf: 'flex-start',
              position: 'sticky',
              top: 80,
              fontWeight: 500,
            }}
            breakpoint={instAdminView ? 'lg' : 'md'}
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
                    <Col
                      key={sim.id}
                      xs={24}
                      sm={12}
                      {...(instAdminView
                        ? { md: 8, lg: 12, xl: 8, xxl: 6 }
                        : { md: instructorActions ? 12 : 8, xl: instructorActions ? 8 : 6 })}
                    >
                      <SimCard
                        sim={sim}
                        discipline={(sim as Partial<SimulationDetail>).discipline ?? selectedCatalogName}
                        canLaunch={canLaunch}
                        canManage={canManageGlobal}
                        isInstructor={instructorActions}
                        institutionAdmin={instAdminView}
                        onLaunch={handleLaunch}
                        onPick={(s, purpose) => setPicker({ sim: s, purpose })}
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
      <CoursePickerModal
        open={!!picker}
        purpose={picker?.purpose ?? 'add'}
        simulation={picker ? { id: picker.sim.id, title: picker.sim.title } : null}
        onClose={() => setPicker(null)}
      />

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
