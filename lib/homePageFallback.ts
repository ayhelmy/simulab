/**
 * Static home page content used when GET /page-content/home-page is
 * unreachable (backend down or not deployed yet), so the public landing page
 * still renders instead of an error screen. Mirrors the backend's seed data
 * (migration 064_seed_home_page_content.sql); the live CMS content replaces it
 * as soon as the API responds.
 */

import type { HomePagePayload, PageContentItem } from './pageContent';

function item(
  section: string,
  sortOrder: number,
  fields: Partial<Omit<PageContentItem, 'id' | 'page' | 'section' | 'sortOrder'>>,
): PageContentItem {
  return {
    id: `fallback-${section}-${sortOrder}`,
    page: 'home',
    section,
    sortOrder,
    title: null,
    description: null,
    iconName: null,
    iconColor: null,
    category: null,
    categoryColor: null,
    ctaText: null,
    extra: {},
    isActive: true,
    updatedAt: '1970-01-01T00:00:00.000Z',
    ...fields,
  };
}

export const HOME_PAGE_FALLBACK: HomePagePayload = {
  hero: item('hero', 0, {
    title: 'Explore BEDO Interactive 3D Simulations',
    description:
      'Access browser-based interactive 3D simulations for engineering and computer science labs. Preview simulations online, explore learning objectives, and support institutional access through LMS/LTI integration.',
    ctaText: 'Explore Simulations',
    extra: {
      badgeText: 'Explore',
      highlightedText: 'Interactive 3D',
      primaryButtonLabel: 'Explore Simulations',
      primaryButtonUrl: '/public-catalog',
      secondaryButtonLabel: 'Try Demo',
      secondaryButtonUrl: '/public-catalog?scope=demo',
      heroImageUrl: null,
      backgroundImageUrl: null,
    },
  }),
  statistics: [
    { label: 'Disciplines', value: 'ENG & CS', shortDescription: 'Engineering & Computer Science', icon: 'ApartmentOutlined' },
    { label: 'WebGL', value: 'WebGL', shortDescription: 'Browser-based', icon: 'GlobalOutlined' },
    { label: 'LTI Ready', value: 'LTI Ready', shortDescription: 'LMS Integration', icon: 'ApiOutlined' },
  ],
  features: {
    intro: item('features_intro', 0, {
      title: 'Built for practical, interactive learning',
      description: 'Designed to help learners explore technical concepts through interactive 3D environments.',
      ctaText: 'View All Features',
      extra: { linkUrl: '/why-simlearn' },
    }),
    cards: [
      item('features', 0, {
        title: 'Interactive 3D Environment',
        description: 'Explore lab equipment and technical concepts through a browser-based 3D simulation.',
        iconName: 'ExperimentOutlined', iconColor: '#F59324',
      }),
      item('features', 1, {
        title: 'WebGL-Based Access',
        description: 'Run supported simulations online through the browser.',
        iconName: 'GlobalOutlined', iconColor: '#0284C7',
      }),
      item('features', 2, {
        title: 'Guided Lab Interaction',
        description: 'Use structured steps and learning objectives to support practical understanding.',
        iconName: 'CompassOutlined', iconColor: '#059669',
      }),
      item('features', 3, {
        title: 'LMS / LTI Ready',
        description: 'Support institutional access through learning management system integration.',
        iconName: 'ApiOutlined', iconColor: '#722ed1',
      }),
    ],
  },
  featuredSimulations: {
    intro: item('featured_simulations_intro', 0, {
      title: 'Start Exploring BEDO Interactive 3D Simulations',
      description: 'Preview selected simulations or browse the full catalog by discipline and topic.',
      ctaText: 'View Full Catalog',
      extra: { linkUrl: '/public-catalog' },
    }),
    items: [],
  },
  demo: item('demo', 0, {
    title: 'See SimuLearn in Action',
    description:
      'Explore BEDO lab experiences through interactive 3D simulations designed to help learners visualize, practice, and understand complex lab concepts online.',
    extra: {
      thumbnailUrl: null,
      videoUrl: null,
      sampleSimulationId: null,
      watchButtonLabel: 'Watch Demo',
      launchButtonLabel: 'Launch Sample Simulation',
    },
  }),
  benefits: {
    intro: item('benefits_intro', 0, {
      title: 'Built for practical, interactive learning',
      extra: { imageUrl: null },
    }),
    cards: [
      item('benefits', 0, {
        title: 'Bring BEDO Labs Online',
        description:
          'Present engineering and computer science lab concepts through browser-based interactive 3D simulations that learners can access online.',
        iconName: 'CloudServerOutlined', iconColor: '#F59324',
      }),
      item('benefits', 1, {
        title: 'Learn Through Interactive 3D Simulation',
        description:
          'Learners can explore lab environments, interact with tools, adjust values, and observe system behavior through guided visual interaction.',
        iconName: 'RocketOutlined', iconColor: '#0284C7',
      }),
      item('benefits', 2, {
        title: 'Make Lab Access Easier for Every Learner',
        description:
          'Give learners more opportunities to preview, repeat, and understand selected lab activities beyond limited physical lab time.',
        iconName: 'TeamOutlined', iconColor: '#059669',
      }),
      item('benefits', 3, {
        title: 'Designed for Digital Learning',
        description: 'Support institutional learning workflows with browser-based access and LMS / LTI integration.',
        iconName: 'BookOutlined', iconColor: '#722ed1',
      }),
    ],
  },
  lms: {
    intro: item('lms_intro', 0, {
      title: 'Ready for Your LMS',
      description:
        'BEDO SimuLearn integrates with learning management systems through LTI, helping institutions launch simulations from their existing learning platforms.',
      ctaText: 'Learn About LTI Integration',
      extra: { linkUrl: '/lti-info' },
    }),
    cards: [
      item('lms', 0, {
        title: 'LTI Compatible',
        description: 'Connect SimuLearn with supported learning systems through LTI-based workflows.',
        iconName: 'ApiOutlined', iconColor: '#F59324',
      }),
      item('lms', 1, {
        title: 'Easy Student Access',
        description: "Allow learners to access simulations directly from their institution's learning environment.",
        iconName: 'UserOutlined', iconColor: '#0284C7',
      }),
      item('lms', 2, {
        title: 'Institution-Ready Deployment',
        description: 'Support scalable digital lab access across courses, departments, and learning programs.',
        iconName: 'BankOutlined', iconColor: '#059669',
      }),
    ],
  },
  callToAction: item('cta', 0, {
    title: 'Bring BEDO Interactive 3D Simulation to Your Institution',
    description:
      'Explore browser-based simulations for engineering and computer science labs, and see how they can support practical learning online.',
    extra: {
      backgroundImageUrl: null,
      primaryButtonLabel: 'Explore Simulations',
      primaryButtonUrl: '/public-catalog',
      secondaryButtonLabel: 'Book Demo',
      secondaryButtonUrl: '/register',
    },
  }),
};
