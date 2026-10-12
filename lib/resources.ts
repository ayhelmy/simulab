/**
 * Static content for the public Resources page — guides/videos/tutorials with
 * no backing CMS records yet. See lib/pageContent.ts for the CMS-driven pages.
 */

export type ResourceFilterType = 'all' | 'guides' | 'videos' | 'lms' | 'technical' | 'faq';

export interface Resource {
  id: string;
  title: string;
  /** Badge text shown on the card, e.g. "GUIDE". */
  category: string;
  /** Filter bucket this resource belongs to. */
  type: Exclude<ResourceFilterType, 'all'>;
  image?: string;
  description: string;
  duration: string;
  actionText: string;
}

export const RESOURCE_FILTERS: { value: ResourceFilterType; label: string }[] = [
  { value: 'all',       label: 'All' },
  { value: 'guides',    label: 'Guides' },
  { value: 'videos',    label: 'Videos' },
  { value: 'lms',       label: 'LMS / LTI' },
  { value: 'technical', label: 'Technical' },
  { value: 'faq',       label: 'FAQ' },
];

export const RESOURCES: Resource[] = [
  {
    id: 'getting-started',
    title: 'Getting Started Guide',
    category: 'Guide',
    type: 'guides',
    description: 'Learn how to browse the simulation catalog, preview public demos, and open your first simulation.',
    duration: '6 min read',
    actionText: 'Read Guide',
  },
  {
    id: 'first-simulation',
    title: 'Running Your First Simulation',
    category: 'Video',
    type: 'videos',
    description: 'A short walkthrough of launching a browser-based simulation and using the basic controls.',
    duration: '5 min watch',
    actionText: 'Watch Video',
  },
  {
    id: 'lms-lti-setup',
    title: 'LMS / LTI Setup',
    category: 'Guide',
    type: 'lms',
    description: 'Understand how LMS / LTI access can support institutional simulation workflows.',
    duration: '7 min read',
    actionText: 'View Guide',
  },
  {
    id: 'catalog-guide',
    title: 'Simulation Catalog Guide',
    category: 'Tutorial',
    type: 'guides',
    description: 'Learn how to browse simulations by discipline, topic, level, and availability.',
    duration: '4 min read',
    actionText: 'Read Tutorial',
  },
  {
    id: 'webgl-requirements',
    title: 'Browser & WebGL Requirements',
    category: 'Technical Note',
    type: 'technical',
    description: 'Review basic browser requirements for opening supported WebGL simulations.',
    duration: '3 min read',
    actionText: 'View Requirements',
  },
  {
    id: 'faq',
    title: 'Frequently Asked Questions',
    category: 'FAQ',
    type: 'faq',
    description: 'Answers to common questions about public demos, browser access, and simulation availability.',
    duration: '5 min read',
    actionText: 'Browse FAQs',
  },
];
