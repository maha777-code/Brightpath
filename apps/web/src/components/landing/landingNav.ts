/** Content shared by the desktop header (AiSolutionsMenu, centre links) and the mobile menu. */

export type LandingNavLink = { label: string; href: string };

export const LANDING_NAV_LINKS: LandingNavLink[] = [
  { label: 'Pricing', href: '/pricing' },
  { label: 'For Schools', href: '#for-schools' },
  { label: 'Compare', href: '/compare' },
  { label: 'FAQs', href: '/faq' },
  { label: 'Contact Us', href: '/contact' },
];

export const AI_SOLUTION_AUDIENCES = [
  {
    icon: '🏛️',
    title: 'For Schools',
    description:
      'Empower entire districts with administrative AI, enterprise security, and seamless integration.',
    href: '#for-schools',
  },
  {
    icon: '📖',
    title: 'For Teachers',
    description: 'Save time, spark creativity, and support every learner.',
    href: '#for-teachers',
  },
  {
    icon: '🎓',
    title: 'For Students',
    description: 'Give students the tools to explore, create, and grow with AI.',
    href: '#for-students',
  },
] as const;

export const AI_SOLUTION_FEATURE = {
  badge: 'NEW · BETA',
  image: '/gamified-video.jpg',
  imageAlt: 'A textbook PDF turning into a game-style video lesson with stars and quiz coins',
  text: 'Turn a PDF into a gamified video or class activity.',
  linkLabel: 'Explore the tools',
  href: '#ai-solutions',
} as const;

export const AI_SOLUTION_WHY = [
  { icon: '🛡️', label: 'Protect Privacy & Security' },
  { icon: '💡', label: 'Build AI Literacy' },
  { icon: '📈', label: 'Develop AI Readiness' },
  { icon: '🎯', label: 'Support Student Success' },
  { icon: '⚙️', label: 'Integrate Quickly' },
  { icon: '🔗', label: 'Connect AI Workflows' },
] as const;
