/**
 * Page Content API helpers.
 * Public endpoints (getPageContent, getPlatformStats) require no auth.
 * Admin endpoints require super_admin role.
 */

import { api } from './api';
import type { Simulation } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PageContentItem {
  id: string;
  page: string;
  section: string;
  sortOrder: number;
  title: string | null;
  description: string | null;
  iconName: string | null;
  iconColor: string | null;
  category: string | null;
  categoryColor: string | null;
  ctaText: string | null;
  extra: Record<string, unknown>;
  isActive: boolean;
  updatedAt: string;
}

export interface PlatformStats {
  simulationsCount: number;
  institutionsCount: number;
  disciplinesCount: number;
  uptime: string;
}

export type PageContentMap = Record<string, PageContentItem[]>;

// ── Home page ─────────────────────────────────────────────────────────────────

export interface HeroExtra {
  badgeText?: string;
  highlightedText?: string;
  primaryButtonLabel?: string;
  primaryButtonUrl?: string;
  secondaryButtonLabel?: string;
  secondaryButtonUrl?: string;
  heroImageUrl?: string | null;
  backgroundImageUrl?: string | null;
  /** Highlight stat chips shown under the hero CTAs, e.g. { value: "19+", label: "Simulations" }. */
  badges?: { value: string; label: string; icon?: string }[];
}

export interface DemoExtra {
  thumbnailUrl?: string | null;
  videoUrl?: string | null;
  sampleSimulationId?: string | null;
  watchButtonLabel?: string;
  launchButtonLabel?: string;
}

export interface CtaExtra {
  backgroundImageUrl?: string | null;
  primaryButtonLabel?: string;
  primaryButtonUrl?: string;
  secondaryButtonLabel?: string;
  secondaryButtonUrl?: string;
}

export interface StatCard {
  label: string;
  value: string;
  shortDescription: string | null;
  icon: string | null;
}

export interface FeaturedSimulationCard extends Simulation {
  discipline: string | null;
}

export interface HomePagePayload {
  hero: PageContentItem | null;
  statistics: StatCard[];
  features: {
    intro: PageContentItem | null;
    cards: PageContentItem[];
  };
  featuredSimulations: {
    intro: PageContentItem | null;
    items: FeaturedSimulationCard[];
  };
  demo: PageContentItem | null;
  benefits: {
    intro: PageContentItem | null;
    cards: PageContentItem[];
  };
  lms: {
    intro: PageContentItem | null;
    cards: PageContentItem[];
  };
  callToAction: PageContentItem | null;
}

export interface CreatePageContentData {
  page: string;
  section: string;
  sortOrder?: number;
  title?: string;
  description?: string;
  iconName?: string;
  iconColor?: string;
  category?: string;
  categoryColor?: string;
  ctaText?: string;
  extra?: Record<string, unknown>;
}

export type UpdatePageContentData = Partial<Omit<CreatePageContentData, 'page' | 'section'> & {
  isActive: boolean;
}>;

// ── Public ────────────────────────────────────────────────────────────────────

/** Fetch all active content for a page, grouped by section. */
export async function getPageContent(page: string): Promise<PageContentMap> {
  const res = await api.get<PageContentMap>(`/page-content/${page}`);
  return res.data;
}

/** Fetch live platform statistics from the database. */
export async function getPlatformStats(): Promise<PlatformStats> {
  const res = await api.get<PlatformStats>('/page-content/stats');
  return res.data;
}

/** Fetch the full public home page payload in a single call. */
export async function getHomePageData(): Promise<HomePagePayload> {
  const res = await api.get<HomePagePayload>('/page-content/home-page');
  return res.data;
}

// ── Admin (super_admin only) ──────────────────────────────────────────────────

/** Fetch all items (including inactive) for a page — admin view. */
export async function getPageContentAdmin(page: string): Promise<PageContentItem[]> {
  const res = await api.get<PageContentItem[]>(`/page-content/${page}/admin`);
  return res.data;
}

export async function createPageContentItem(data: CreatePageContentData): Promise<PageContentItem> {
  const res = await api.post<PageContentItem>('/page-content/items', data);
  return res.data;
}

export async function updatePageContentItem(id: string, data: UpdatePageContentData): Promise<PageContentItem> {
  const res = await api.put<PageContentItem>(`/page-content/items/${id}`, data);
  return res.data;
}

export async function deletePageContentItem(id: string): Promise<void> {
  await api.delete(`/page-content/items/${id}`);
}

export async function updatePlatformStats(uptime: string): Promise<{ uptime: string }> {
  const res = await api.patch<{ uptime: string }>('/page-content/stats', { uptime });
  return res.data;
}
