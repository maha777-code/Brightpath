/** Public subscription catalog for the five account roles. */

export type AccountCategory = 'student' | 'teacher' | 'tutor_center' | 'school' | 'parent';

export interface CategoryPlan {
  category: AccountCategory;
  categoryLabel: string;
  badge: string;
  badgeColor: string;
  monthlyPrice: number;
  yearlyPrice: number;
  description: string;
  features: string[];
  cta: string;
  ctaHref: string;
  /** Plan types whose registered accounts belong in this category. */
  planTypes: string[];
  /** Plan types that contribute to estimated recurring revenue. */
  paidPlanTypes: string[];
}

export const CATEGORY_PLANS_DATA: CategoryPlan[] = [
  {
    category: 'student',
    categoryLabel: 'Student Plan',
    badge: 'Student',
    badgeColor: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    monthlyPrice: 199,
    yearlyPrice: 1990,
    description: 'Interactive AI tutoring, flashcards, homework help, and gamified practice sets.',
    features: [
      'Unlimited Sharada AI Tutor chats',
      'Interactive study flashcards and quizzes',
      'Homework step-by-step solver',
      'Learning streak and progress analytics',
    ],
    cta: 'Start Student Plan',
    ctaHref: '/register',
    planTypes: ['student_free', 'student_pro'],
    paidPlanTypes: ['student_pro'],
  },
  {
    category: 'teacher',
    categoryLabel: 'Teacher Pro',
    badge: 'Teacher',
    badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    monthlyPrice: 499,
    yearlyPrice: 4990,
    description: 'AI lesson plans, instant test and quiz creation, rubric generators, and automated grading.',
    features: [
      'Lesson plan and worksheet generator',
      'Instant MCQ and rubric maker',
      'Custom PDF export',
      'Unlimited AI doubt solving',
    ],
    cta: 'Start Teacher Pro',
    ctaHref: '/register',
    planTypes: ['free', 'teacher_free', 'teacher_pro', 'pro'],
    paidPlanTypes: ['teacher_pro', 'pro'],
  },
  {
    category: 'tutor_center',
    categoryLabel: 'Tutor Center',
    badge: 'Tutor Center',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    monthlyPrice: 2499,
    yearlyPrice: 24990,
    description: 'For coaching institutes and learning centers managing multi-tutor classrooms.',
    features: [
      'Up to 10 tutor seats',
      'Multi-student performance tracking',
      'Custom center branding and logo',
      'Bulk student enrollment',
    ],
    cta: 'Launch Center Pro',
    ctaHref: '/register',
    planTypes: ['tutor_center_pro', 'center_pro'],
    paidPlanTypes: ['tutor_center_pro', 'center_pro'],
  },
  {
    category: 'school',
    categoryLabel: 'School / Enterprise',
    badge: 'School',
    badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    monthlyPrice: 9999,
    yearlyPrice: 99990,
    description: 'Institutional deployment with curriculum mapping, admin analytics, and priority support.',
    features: [
      'Unlimited teacher and student seats',
      'Custom curriculum integration',
      'Dedicated account manager',
      'District-level analytics and LMS sync',
    ],
    cta: 'Contact School Sales',
    ctaHref: '/contact',
    planTypes: ['school_enterprise'],
    paidPlanTypes: ['school_enterprise'],
  },
  {
    category: 'parent',
    categoryLabel: 'Parent Care',
    badge: 'Parent',
    badgeColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    monthlyPrice: 299,
    yearlyPrice: 2990,
    description: 'Child progress monitoring, weakness insights, and weekly activity reports.',
    features: [
      'Real-time activity alerts',
      'Detailed progress and weakness insights',
      'Multi-child tracking',
      'Custom practice assignment launcher',
    ],
    cta: 'Start Parent Care',
    ctaHref: '/register',
    planTypes: ['parent_free', 'family_plan'],
    paidPlanTypes: ['family_plan'],
  },
];

const PLAN_CATEGORY = new Map<string, AccountCategory>(
  CATEGORY_PLANS_DATA.flatMap((plan) => plan.planTypes.map((planType) => [planType, plan.category] as const)),
);

export function categoryForPlanType(planType: string): AccountCategory | null {
  return PLAN_CATEGORY.get(planType) ?? null;
}

export function categoryPlanById(category: AccountCategory): CategoryPlan {
  const plan = CATEGORY_PLANS_DATA.find((item) => item.category === category);
  if (!plan) throw new Error(`Unknown account category: ${category}`);
  return plan;
}
