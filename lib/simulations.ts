/**
 * Simulations & Catalog API helpers — SRS §4.7 SIM-01 to SIM-10; RBAC v2.
 * Tree-based catalog support added in migration 018.
 */

import { api, getAccessToken } from './api';
import { API_BASE_URL } from './constants';
import type { Simulation, SimulationCatalog, WebGLLaunchResult } from '@/types';
import type { PaginationMeta } from '@/types/api';

// ── Query / input types ───────────────────────────────────────────────────────

export interface SimulationQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: Simulation['status'];
  type?: Simulation['type'];
  visibility?: Simulation['visibility'];
  difficulty?: Simulation['difficulty'];
  scope?: 'assigned' | 'demo';
  catalog_id?: string;
  include_subtree?: 'true' | 'false';
}

export interface CreateSimulationData {
  title: string;
  description?: string;
  type: Simulation['type'];
  launchUrl: string;
  thumbnailUrl?: string;
  estimatedMinutes?: number;
  difficulty?: Simulation['difficulty'];
  visibility?: Simulation['visibility'];
  maxScore?: number;
  passScore?: number;
  maxAttempts?: number;
  version?: string;
}

export interface UpdateSimulationData {
  title?: string;
  description?: string;
  launchUrl?: string;
  thumbnailUrl?: string;
  estimatedMinutes?: number;
  difficulty?: Simulation['difficulty'];
  visibility?: Simulation['visibility'];
  status?: Simulation['status'];
  maxAttempts?: number;
  version?: string;
}

export interface CatalogItem {
  id: string;
  catalogId: string;
  simulationId: string;
  sortOrder: number;
  title: string;
  description?: string | null;
  type: Simulation['type'];
  visibility: Simulation['visibility'];
  status: Simulation['status'];
  thumbnailUrl?: string | null;
  estimatedMinutes?: number | null;
  difficulty: Simulation['difficulty'];
  learningObjectives: string[];
  addedAt: string;
}

export interface SimulationCatalogDetail extends SimulationCatalog {
  items: CatalogItem[];
  ancestors: SimulationCatalog[];
}

export interface AssignedInstitution {
  id: string;
  name: string;
  slug: string;
  domain?: string | null;
  logoUrl?: string | null;
  status: string;
  includeSubtree: boolean;
  assignedAt: string;
  assignedByEmail?: string | null;
  assignmentId?: string | null;
  isDirect: boolean;
  assignedViaCatalog?: string | null;
}

export interface CatalogUnassignImpact {
  catalogId: string;
  institutionId: string;
  includeSubtree: boolean;
  affectedCourses: number;
  affectedLessons: number;
  affectedStudents: number;
  affectedSimulationIds: string[];
  canUnassign: boolean;
  warnings: string[];
}

export interface LaunchResult {
  launchUrl: string;
  title: string;
  simulationId: string;
  type: string;
  launchType?: string | null;
  buildUuid?: string | null;
  buildStatus?: string | null;
  maxAttempts: number | null;
  scoringConfig: Record<string, unknown>;
  isDemo?: boolean;
}

// ── Catalog input types ───────────────────────────────────────────────────────

export interface CreateCatalogData {
  name: string;
  description?: string;
  parentId?: string | null;
  visibility?: SimulationCatalog['visibility'];
  institutionId?: string | null;
  isGlobal?: boolean;
  isDemo?: boolean;
  sortOrder?: number;
}

export interface UpdateCatalogData {
  name?: string;
  description?: string;
  status?: SimulationCatalog['status'];
  visibility?: SimulationCatalog['visibility'];
  isGlobal?: boolean;
  isDemo?: boolean;
  sortOrder?: number;
}

export interface MoveCatalogData {
  newParentId: string | null;
}

export interface AssignCatalogData {
  institutionId: string;
  includeSubtree?: boolean;
}

// ── Simulations ───────────────────────────────────────────────────────────────

export async function listSimulations(
  query?: SimulationQuery,
): Promise<{ simulations: Simulation[]; meta: PaginationMeta }> {
  const res = await api.get<Simulation[]>('/simulations', query as Record<string, unknown>);
  return { simulations: res.data ?? [], meta: res.meta! };
}

export async function listDemoSimulations(): Promise<Simulation[]> {
  const res = await api.get<Simulation[]>('/simulations/demo');
  return res.data ?? [];
}

/** Paginated demo simulations with search / filter support (public catalog). */
export async function listDemoSimulationsPaginated(
  filters: import('@/types').SimulationSearchFilters,
): Promise<import('@/types').SimulationSearchResponse> {
  const params: Record<string, unknown> = {
    page:   filters.page   ?? 1,
    limit:  filters.limit  ?? 12,
  };
  if (filters.search)          params.search           = filters.search;
  if (filters.difficulty)      params.difficulty       = filters.difficulty;
  if (filters.catalogId)       params.catalog_id       = filters.catalogId;
  if (filters.includeChildren) params.include_children = 'true';

  const res = await api.get<import('@/types').SimulationSearchResponse['simulations']>(
    '/simulations/demo',
    params,
  );
  return {
    simulations: res.data ?? [],
    meta: res.meta as import('@/types').SimulationSearchMeta ?? {
      page: filters.page ?? 1,
      limit: filters.limit ?? 12,
      total: (res.data ?? []).length,
      totalPages: 1,
    },
  };
}

export async function getSimulation(id: string): Promise<Simulation> {
  const res = await api.get<Simulation>(`/simulations/${id}`);
  return res.data;
}

export async function createSimulation(data: CreateSimulationData): Promise<Simulation> {
  const res = await api.post<Simulation>('/simulations', data);
  return res.data;
}

export async function updateSimulation(id: string, data: UpdateSimulationData): Promise<Simulation> {
  const res = await api.patch<Simulation>(`/simulations/${id}`, data);
  return res.data;
}

export async function deleteSimulation(id: string): Promise<void> {
  await api.delete(`/simulations/${id}`);
}

export async function launchSimulation(id: string): Promise<LaunchResult> {
  const res = await api.post<LaunchResult>(`/simulations/${id}/launch`);
  return res.data;
}

export async function demoLaunchSimulation(id: string): Promise<LaunchResult> {
  const res = await api.post<LaunchResult>(`/simulations/${id}/demo-launch`);
  return res.data;
}

// ── Catalog tree reads ────────────────────────────────────────────────────────

/** Returns the full tree (super_admin) or assigned subtree (others). */
export async function getCatalogTree(
  query?: { visibility?: string; institutionId?: string },
): Promise<SimulationCatalog[]> {
  const res = await api.get<SimulationCatalog[]>('/simulation-catalogs/tree', query as Record<string, unknown>);
  return res.data ?? [];
}

/** Returns catalog tree assigned to the current user's institution. */
export async function getAssignedCatalogTree(): Promise<SimulationCatalog[]> {
  const res = await api.get<SimulationCatalog[]>('/simulation-catalogs/assigned-tree');
  return res.data ?? [];
}

/** Returns the subtree rooted at a specific catalog node. */
export async function getCatalogSubtree(id: string): Promise<SimulationCatalog[]> {
  const res = await api.get<SimulationCatalog[]>(`/simulation-catalogs/${id}/tree`);
  return res.data ?? [];
}

/** Returns demo_public catalog tree (no auth required). */
export async function getDemoCatalogTree(): Promise<SimulationCatalog[]> {
  const res = await api.get<SimulationCatalog[]>('/simulation-catalogs/demo-tree');
  return res.data ?? [];
}

/** Returns assigned catalog tree for a specific institution (super_admin uses query param). */
export async function getInstitutionCatalogTree(institutionId: string): Promise<SimulationCatalog[]> {
  return getCatalogTree({ institutionId });
}

// ── Catalog CRUD ──────────────────────────────────────────────────────────────

/** Flat list — backward compat (super_admin only). */
export async function listCatalogs(query?: { status?: string }): Promise<SimulationCatalog[]> {
  const res = await api.get<SimulationCatalog[]>('/simulation-catalogs', query as Record<string, unknown>);
  return res.data ?? [];
}

export async function getCatalog(id: string): Promise<SimulationCatalogDetail> {
  const res = await api.get<SimulationCatalogDetail>(`/simulation-catalogs/${id}`);
  return res.data;
}

export async function createCatalog(data: CreateCatalogData): Promise<SimulationCatalog> {
  const res = await api.post<SimulationCatalog>('/simulation-catalogs', data);
  return res.data;
}

export async function updateCatalog(id: string, data: UpdateCatalogData): Promise<SimulationCatalog> {
  const res = await api.patch<SimulationCatalog>(`/simulation-catalogs/${id}`, data);
  return res.data;
}

export async function moveCatalog(id: string, data: MoveCatalogData): Promise<SimulationCatalog> {
  const res = await api.patch<SimulationCatalog>(`/simulation-catalogs/${id}/move`, data);
  return res.data;
}

export async function reorderCatalog(id: string, sortOrder: number): Promise<SimulationCatalog> {
  const res = await api.patch<SimulationCatalog>(`/simulation-catalogs/${id}/reorder`, { sortOrder });
  return res.data;
}

export async function deleteCatalog(id: string): Promise<void> {
  await api.delete(`/simulation-catalogs/${id}`);
}

// ── Catalog items ─────────────────────────────────────────────────────────────

export async function addSimulationToCatalog(catalogId: string, simulationId: string): Promise<void> {
  await api.post(`/simulation-catalogs/${catalogId}/items`, { simulationId });
}

export async function removeSimulationFromCatalog(catalogId: string, simulationId: string): Promise<void> {
  await api.delete(`/simulation-catalogs/${catalogId}/items/${simulationId}`);
}

// ── Institution assignment ────────────────────────────────────────────────────

export async function listCatalogInstitutions(catalogId: string): Promise<AssignedInstitution[]> {
  const res = await api.get<AssignedInstitution[]>(`/simulation-catalogs/${catalogId}/institutions`);
  return res.data ?? [];
}

export async function listInstitutionCatalogs(institutionId: string): Promise<SimulationCatalog[]> {
  const res = await api.get<SimulationCatalog[]>(`/institutions/${institutionId}/simulation-catalogs`);
  return res.data ?? [];
}

export async function assignCatalogToInstitution(
  institutionId: string,
  catalogId: string,
  includeSubtree = true,
): Promise<void> {
  await api.post(`/institutions/${institutionId}/simulation-catalogs`, { catalogId, includeSubtree });
}

export async function revokeCatalogFromInstitution(institutionId: string, catalogId: string): Promise<void> {
  await api.delete(`/institutions/${institutionId}/simulation-catalogs/${catalogId}`);
}

export async function getCatalogUnassignImpact(
  catalogId: string,
  institutionId: string,
): Promise<CatalogUnassignImpact> {
  const res = await api.get<CatalogUnassignImpact>(
    `/simulation-catalogs/${catalogId}/institutions/${institutionId}/unassign-impact`,
  );
  return res.data;
}

// ── Flatten tree helper (frontend utility) ────────────────────────────────────

/** Flattens a nested SimulationCatalog tree into a flat array (BFS). */
export function flattenTree(nodes: SimulationCatalog[]): SimulationCatalog[] {
  const result: SimulationCatalog[] = [];
  const queue = [...nodes];
  while (queue.length) {
    const node = queue.shift()!;
    result.push(node);
    if (node.children?.length) queue.push(...node.children);
  }
  return result;
}

// ── Simulation CRUD within catalog context (new flow) ─────────────────────────

export interface CreateSimulationInCatalogData {
  title: string;
  description?: string;
  type?: Simulation['type'];
  launchUrl: string;
  thumbnailUrl?: string;
  estimatedMinutes?: number;
  difficulty?: Simulation['difficulty'];
  visibility?: Simulation['visibility'];
  maxScore?: number;
  passScore?: number;
  maxAttempts?: number;
  version?: string;
  learningObjectives?: string[];
}

/** Creates a new simulation and links it to the given catalog in one call. */
export async function createSimulationInCatalog(
  catalogId: string,
  data: CreateSimulationInCatalogData,
): Promise<{ simulation: Simulation; catalogId: string }> {
  const res = await api.post<{ simulation: Simulation; catalogId: string }>(
    `/simulation-catalogs/${catalogId}/simulations`,
    data,
  );
  return res.data;
}

/** Lists simulations in a catalog, optionally including all descendant catalogs. */
export async function getCatalogSimulations(
  catalogId: string,
  options?: { includeChildren?: boolean },
): Promise<Simulation[]> {
  const q = options?.includeChildren ? { include_children: 'true' } : undefined;
  const res = await api.get<Simulation[]>(`/simulation-catalogs/${catalogId}/simulations`, q);
  return res.data ?? [];
}

/** Updates simulation metadata from within a catalog context. */
export async function updateCatalogSimulation(
  catalogId: string,
  simId: string,
  data: Partial<CreateSimulationInCatalogData> & { status?: Simulation['status'] },
): Promise<Simulation> {
  const res = await api.patch<Simulation>(`/simulation-catalogs/${catalogId}/simulations/${simId}`, data);
  return res.data;
}

/** Removes a simulation from a catalog (does not delete the simulation). */
export async function removeCatalogSimulation(catalogId: string, simId: string): Promise<void> {
  await api.delete(`/simulation-catalogs/${catalogId}/simulations/${simId}`);
}

/**
 * Uploads a thumbnail image for a simulation within a catalog.
 * Returns the public thumbnailUrl stored on the server.
 */
export async function uploadSimulationThumbnail(
  catalogId: string,
  simId: string,
  file: File,
): Promise<{ thumbnailUrl: string }> {
  const formData = new FormData();
  formData.append('thumbnail', file, file.name);

  const token   = getAccessToken();
  const baseUrl = API_BASE_URL.replace(/\/+$/, '');
  const res = await fetch(
    `${baseUrl}/simulation-catalogs/${catalogId}/simulations/${simId}/thumbnail`,
    {
      method:      'PATCH',
      body:        formData,
      credentials: 'include',
      headers:     token ? { Authorization: `Bearer ${token}` } : {},
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw { status: res.status, title: (err as { title?: string }).title ?? 'Upload failed', detail: (err as { detail?: string }).detail };
  }
  const json = await res.json();
  return json.data as { thumbnailUrl: string };
}

/**
 * Uploads a reference screenshot + a regions JSON (COCO-style
 * `{ categories, annotations }`) for a single simulation. Used to map
 * recorded click coordinates to named component categories in the
 * click-tracking CSV export. Each simulation has its own independent
 * region map — uploading replaces any existing one for that simulation.
 */
export async function uploadSimulationClickRegions(
  catalogId: string,
  simId: string,
  imageFile: File,
  regionsJson: string,
): Promise<{ imageWidth: number; imageHeight: number; regionCount: number }> {
  const formData = new FormData();
  formData.append('image', imageFile, imageFile.name);
  formData.append('regions', regionsJson);

  const token   = getAccessToken();
  const baseUrl = API_BASE_URL.replace(/\/+$/, '');
  const res = await fetch(
    `${baseUrl}/simulation-catalogs/${catalogId}/simulations/${simId}/click-regions`,
    {
      method:      'PATCH',
      body:        formData,
      credentials: 'include',
      headers:     token ? { Authorization: `Bearer ${token}` } : {},
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw { status: res.status, title: (err as { title?: string }).title ?? 'Upload failed', detail: (err as { detail?: string }).detail };
  }
  const json = await res.json();
  return json.data as { imageWidth: number; imageHeight: number; regionCount: number };
}

/** Converts a SimulationCatalog tree to AntD TreeSelect-compatible data. */
export function toTreeSelectData(
  nodes: SimulationCatalog[],
  excludeId?: string,
): { value: string; title: string; children?: unknown[] }[] {
  return nodes
    .filter((n) => n.id !== excludeId)
    .map((n) => ({
      value: n.id,
      title: n.name,
      children: n.children?.length ? toTreeSelectData(n.children, excludeId) : undefined,
    }));
}

// ── WebGL simulation upload ───────────────────────────────────────────────────

export interface WebGLUploadData {
  title: string;
  description?: string;
  difficulty?: Simulation['difficulty'];
  estimatedMinutes?: number;
  visibility?: Simulation['visibility'];
  status?: Simulation['status'];
  thumbnailUrl?: string;
}

/**
 * Uploads a Unity WebGL ZIP file and creates the simulation in the given catalog.
 * Uses multipart/form-data with XMLHttpRequest to support upload progress.
 *
 * @param catalogId  - Catalog node to link the simulation to
 * @param data       - Simulation metadata fields
 * @param zipFile    - The ZIP File object from the browser
 * @param onProgress - Optional progress callback (0-100)
 */
export async function uploadWebGLSimulation(
  catalogId: string,
  data: WebGLUploadData,
  zipFile: File,
  onProgress?: (percent: number) => void,
): Promise<{ simulation: Simulation; catalogId: string }> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('zip_file', zipFile, zipFile.name);
    formData.append('title', data.title);
    if (data.description) formData.append('description', data.description);
    if (data.difficulty) formData.append('difficulty', data.difficulty);
    if (data.estimatedMinutes) formData.append('estimatedMinutes', String(data.estimatedMinutes));
    if (data.visibility) formData.append('visibility', data.visibility);
    if (data.status) formData.append('status', data.status);
    if (data.thumbnailUrl) formData.append('thumbnailUrl', data.thumbnailUrl);

    const xhr = new XMLHttpRequest();

    const baseUrl = API_BASE_URL.replace(/\/+$/, '');
    const uploadUrl =
      `${baseUrl}/simulation-catalogs/${catalogId}/simulations/webgl-upload`;

    console.log('WebGL upload URL:', uploadUrl);

    xhr.open('POST', uploadUrl, true);

    // Match the credentials behavior used by the shared API helper.
    xhr.withCredentials = true;

    // Unity ZIP extraction may require several minutes.
    xhr.timeout = 10 * 60 * 1000;

    xhr.setRequestHeader('Accept', 'application/json');

    const token = getAccessToken();

    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    // Do not manually set Content-Type.
    // The browser must generate the multipart boundary.

    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      });
    }

    xhr.onload = () => {
      let body: Record<string, any> = {};

      try {
        body = xhr.responseText ? JSON.parse(xhr.responseText) : {};
      } catch {
        body = {};
      }

      console.log('WebGL upload response:', {
        status: xhr.status,
        response: xhr.responseText,
      });

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body.data ?? body);
        return;
      }

      reject({
        title:
          body.title ??
          body.message ??
          `Upload failed with HTTP ${xhr.status}`,
        detail:
          body.detail ??
          body.errors?.[0]?.msg ??
          xhr.responseText ??
          xhr.statusText,
      });
    };

    xhr.onerror = () => {
      console.error('WebGL upload network error:', {
        url: uploadUrl,
        status: xhr.status,
        readyState: xhr.readyState,
        response: xhr.responseText,
      });

      reject({
        title: 'Upload network error',
        detail:
          'The browser blocked or lost the upload request. Check CORS, the request URL, proxy upload limits, and the backend logs.',
      });
    };

    xhr.ontimeout = () => {
      reject({
        title: 'Upload timeout',
        detail: 'The ZIP upload or extraction exceeded the allowed request time.',
      });
    };

    xhr.onabort = () => {
      reject({
        title: 'Upload cancelled',
        detail: 'The upload request was aborted.',
      });
    };

    xhr.send(formData);
  });
}

// ── Simulation launch ─────────────────────────────────────────────────────────

/**
 * Course-safe simulation launch — validates enrollment, build status, and
 * returns the full launch URL resolved from the backend origin.
 */
export async function getLessonSimulationLaunch(
  courseId: string,
  lessonId: string,
): Promise<WebGLLaunchResult> {
  const res = await api.get<WebGLLaunchResult>(
    `/courses/${courseId}/lessons/${lessonId}/simulation-launch`,
  );
  return res.data;
}

/** Direct simulation launch (for admins / non-course context). */
export async function getSimulationLaunch(simulationId: string): Promise<WebGLLaunchResult> {
  const res = await api.post<WebGLLaunchResult>(`/simulations/${simulationId}/launch`);
  return res.data;
}

// ── Simulation completion steps ───────────────────────────────────────────────

export interface SimulationStep {
  id:           string;
  stepOrder:    number;
  label:        string;
  categoryName: string;
}

/** Fetch the ordered step list for a simulation (super-admin only). */
export async function getSimulationSteps(
  catalogId: string,
  simId:     string,
): Promise<SimulationStep[]> {
  const res = await api.get<SimulationStep[]>(
    `/simulation-catalogs/${catalogId}/simulations/${simId}/steps`,
  );
  return res.data ?? [];
}

/** Replace the complete step list for a simulation (super-admin only). */
export async function saveSimulationSteps(
  catalogId: string,
  simId:     string,
  steps:     Pick<SimulationStep, 'stepOrder' | 'label' | 'categoryName'>[],
): Promise<SimulationStep[]> {
  const res = await api.put<SimulationStep[]>(
    `/simulation-catalogs/${catalogId}/simulations/${simId}/steps`,
    { steps },
  );
  return res.data ?? [];
}
