import {
  FREE_SONGS_PER_WEEK,
  PLUS_SONGS_PER_WEEK,
  TEACHER_TOOLS_CATALOG,
} from '../../../../packages/shared/src/teacherTools';

/** Classroom only opens for school and academy admins (toolsRegistry allowedRoles and the API both check). */
const ORG_ADMIN_TOOL_IDS = new Set(['classroom']);

export const AI_TOOL_COUNT = TEACHER_TOOLS_CATALOG.length;

/** Tools a Teacher, Student or Parent Basic account can open. */
export const FREE_TOOL_COUNT = TEACHER_TOOLS_CATALOG.filter(
  (tool) => tool.requiredPlan === 'free' && !ORG_ADMIN_TOOL_IDS.has(tool.id),
).length;

const TEACHER_PRO_TOOL_COUNT = TEACHER_TOOLS_CATALOG.filter(
  (tool) => tool.requiredPlan !== 'center_pro' && !ORG_ADMIN_TOOL_IDS.has(tool.id),
).length;

export function songsPerWeek(count: number): string {
  return `${count} educational song${count === 1 ? '' : 's'} per week`;
}

export interface PlanPrice {
  monthly: number | string;
  annualMonthly: number | string;
}

export interface PricingPlan {
  id: string;
  badge: string;
  title: string;
  roleCategory: 'Students' | 'Teachers' | 'Tutor Centers' | 'Schools' | 'Parents' | 'Enterprise';
  isPro?: boolean;
  priceINR: PlanPrice;
  priceUSD: PlanPrice;
  description: string;
  buttonText: string;
  buttonVariant: 'cyan' | 'purple' | 'emerald' | 'amber' | 'slate';
  href: string;
  features: string[];
}

export type PriceCurrency = 'AED' | 'USD' | 'INR';

export const DEFAULT_CURRENCY: PriceCurrency = 'AED';

/** The dirham is pegged to the dollar; AED checkout bills the USD product in AED. */
export const AED_PER_USD = 3.6725;

function toAed(value: number | string): number | string {
  return typeof value === 'number' ? Math.round(value * AED_PER_USD * 100) / 100 : value;
}

export function planPrice(plan: PricingPlan, currency: PriceCurrency): PlanPrice {
  if (currency === 'INR') return plan.priceINR;
  if (currency === 'USD') return plan.priceUSD;
  return { monthly: toAed(plan.priceUSD.monthly), annualMonthly: toAed(plan.priceUSD.annualMonthly) };
}

/** Yearly total for annual billing; AED is converted from the USD total so it matches checkout. */
export function planYearlyTotal(plan: PricingPlan, currency: PriceCurrency): number | string {
  const base = currency === 'INR' ? plan.priceINR.annualMonthly : plan.priceUSD.annualMonthly;
  if (typeof base === 'string') return base;
  const yearly = Math.round(base * 12 * 100) / 100;
  return currency === 'AED' ? toAed(yearly) : yearly;
}

export function formatMoney(value: number, currency: PriceCurrency): string {
  const digits = Number.isInteger(value) ? 0 : 2;
  if (currency === 'INR') return `₹${value.toLocaleString('en-IN')}`;
  const amount = value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  return currency === 'USD' ? `$${amount}` : `AED ${amount}`;
}

/** "Free", "Custom", or a formatted amount. */
export function formatPlanAmount(value: number | string, currency: PriceCurrency): string {
  if (typeof value === 'string') return value;
  return value === 0 ? 'Free' : formatMoney(value, currency);
}

export const PRICING_FILTERS = ['All Plans', 'Students', 'Teachers', 'Tutor Centers', 'Schools', 'Parents'] as const;

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'student-free',
    badge: 'STUDENT',
    title: 'Student Basic',
    roleCategory: 'Students',
    priceINR: { monthly: 0, annualMonthly: 0 },
    priceUSD: { monthly: 0, annualMonthly: 0 },
    description: 'Essential AI study assistance, flashcards, and homework help at no cost.',
    buttonText: 'Get Started Free',
    buttonVariant: 'cyan',
    href: '/register',
    features: [
      'Sharada chatbot (Basic tier)',
      'Quizzes & Homework helper',
      `${FREE_TOOL_COUNT} AI tools`,
      'Standard response speed',
    ],
  },
  {
    id: 'student-pro',
    badge: 'STUDENT PRO',
    title: 'Student Pro',
    roleCategory: 'Students',
    isPro: true,
    priceINR: { monthly: 199, annualMonthly: 149 },
    priceUSD: { monthly: 4.99, annualMonthly: 3.99 },
    description: 'Unlimited study assistance, exam preparation, and instant AI tutor responses.',
    buttonText: 'Upgrade Student Pro',
    buttonVariant: 'cyan',
    href: '/register',
    features: [
      'Unlimited AI generations',
      'Unlimited Sharada AI tutor chats',
      'Full study history & PDF export',
      'Priority AI speed',
    ],
  },
  {
    id: 'teacher-free',
    badge: 'TEACHER',
    title: 'Teacher Basic',
    roleCategory: 'Teachers',
    priceINR: { monthly: 0, annualMonthly: 0 },
    priceUSD: { monthly: 0, annualMonthly: 0 },
    description: 'Free forever tools for teachers to generate lesson plans, rubrics, and quizzes.',
    buttonText: 'Start Free Plan',
    buttonVariant: 'purple',
    href: '/register',
    features: [
      `${FREE_TOOL_COUNT} AI teacher tools (all except Curriculum & Textbook Studio and Classroom)`,
      'Lesson plans, quizzes, worksheets & slides',
      songsPerWeek(FREE_SONGS_PER_WEEK),
      'Sharada assistant (Standard speed)',
      'No training on your or your students’ data',
    ],
  },
  {
    id: 'teacher-pro',
    badge: 'TEACHER PRO',
    title: 'Teacher Pro',
    roleCategory: 'Teachers',
    isPro: true,
    priceINR: { monthly: 699, annualMonthly: 499 },
    priceUSD: { monthly: 12.99, annualMonthly: 9.99 },
    description: 'The full toolkit for educators, with your own textbooks and syllabus behind every tool.',
    buttonText: 'Upgrade Teacher Pro',
    buttonVariant: 'purple',
    href: '/register',
    features: [
      'Unlimited AI lesson plan & quiz generation',
      `${TEACHER_PRO_TOOL_COUNT} AI tools, including Curriculum & Textbook Studio`,
      'Textbook & syllabus PDFs up to 80 MB',
      songsPerWeek(PLUS_SONGS_PER_WEEK),
      'Class writing feedback & rubric generator',
      'Print-ready PDF export',
    ],
  },
  {
    id: 'parent-free',
    badge: 'PARENT',
    title: 'Parent Basic',
    roleCategory: 'Parents',
    priceINR: { monthly: 0, annualMonthly: 0 },
    priceUSD: { monthly: 0, annualMonthly: 0 },
    description: 'Monitor student progress and generate practice quizzes for home study.',
    buttonText: 'Start Free',
    buttonVariant: 'amber',
    href: '/register',
    features: [
      'Basic child progress overview',
      `${FREE_TOOL_COUNT} AI tools, including the quiz generator`,
      'Sharada parent assistant',
      'Safe learning environment',
    ],
  },
  {
    id: 'parent-pro',
    badge: 'PARENT PRO',
    title: 'Parent Pro',
    roleCategory: 'Parents',
    isPro: true,
    priceINR: { monthly: 399, annualMonthly: 299 },
    priceUSD: { monthly: 8.99, annualMonthly: 6.99 },
    description: 'Deeper insights into your children’s strengths, weaknesses, and personalized study sets.',
    buttonText: 'Upgrade Parent Pro',
    buttonVariant: 'amber',
    href: '/register',
    features: [
      'Multi-child activity tracking',
      'Unlimited practice set generations',
      'Weekly weakness & improvement reports',
      'Custom tutor prompts & study plans',
      'Priority support',
    ],
  },
  {
    id: 'tutor-center',
    badge: 'TUTOR CENTER',
    title: 'Academy Starter',
    roleCategory: 'Tutor Centers',
    priceINR: { monthly: 2499, annualMonthly: 1999 },
    priceUSD: { monthly: 49, annualMonthly: 39 },
    description: 'Built for coaching institutes and learning centers with multiple instructors.',
    buttonText: 'Launch Academy Plan',
    buttonVariant: 'emerald',
    href: '/register',
    features: [
      'Up to 50 tutor and student accounts',
      'Centralized student analytics',
      'Batch quiz & test generation',
      'Custom center branding on exported sheets',
      `All ${AI_TOOL_COUNT} AI tools, with Classroom on the academy admin account`,
    ],
  },
  {
    id: 'tutor-center-pro',
    badge: 'TUTOR CENTER PRO',
    title: 'Academy Pro',
    roleCategory: 'Tutor Centers',
    isPro: true,
    priceINR: { monthly: 4999, annualMonthly: 3999 },
    priceUSD: { monthly: 99, annualMonthly: 79 },
    description: 'Unlimited scale for growing coaching institutes requiring team collaboration.',
    buttonText: 'Upgrade Academy Pro',
    buttonVariant: 'emerald',
    href: '/register',
    features: [
      'Up to 50 tutor and student accounts',
      'Unlimited student performance insights',
      'White-labeled student portal & exports',
      'Dedicated account onboarding',
      'Priority AI speed',
    ],
  },
  {
    id: 'school',
    badge: 'SCHOOL',
    title: 'School Campus',
    roleCategory: 'Schools',
    priceINR: { monthly: 14999, annualMonthly: 11999 },
    priceUSD: { monthly: 299, annualMonthly: 249 },
    description: 'Complete campus deployment with admin controls and role-based privacy for every user.',
    buttonText: 'Deploy to School',
    buttonVariant: 'cyan',
    href: '/contact',
    features: [
      'Up to 200 teacher and student accounts',
      'Admin dashboard & analytics',
      'Class and parent invite codes',
      'No training on student data',
      'Dedicated staff training session',
    ],
  },
  {
    id: 'school-pro',
    badge: 'SCHOOL PRO',
    title: 'District / Large Campus',
    roleCategory: 'Schools',
    isPro: true,
    priceINR: { monthly: 29999, annualMonthly: 24999 },
    priceUSD: { monthly: 599, annualMonthly: 499 },
    description: 'Full enterprise license for entire school districts, networks, and colleges.',
    buttonText: 'Upgrade District Pro',
    buttonVariant: 'purple',
    href: '/contact',
    features: [
      'Unlimited Teacher & Student licenses',
      'Custom curriculum mapping & AI alignment',
      'Custom school branding',
      'Dedicated Customer Success Manager',
      'Custom AI safety & policy guardrails',
    ],
  },
  {
    id: 'customization',
    badge: 'ENTERPRISE',
    title: 'Custom Enterprise',
    roleCategory: 'Enterprise',
    isPro: true,
    priceINR: { monthly: 'Custom', annualMonthly: 'Custom' },
    priceUSD: { monthly: 'Custom', annualMonthly: 'Custom' },
    description: 'Custom rollouts and bespoke educational tools for large school networks.',
    buttonText: 'Contact Sales / Custom Quote',
    buttonVariant: 'slate',
    href: '/contact',
    features: [
      'Custom tools built around your curriculum',
      'Full white-labeling',
      'Custom integrations, scoped with your team',
      'Dedicated security review & support agreement',
    ],
  },
];

export const buttonVariantClass: Record<PricingPlan['buttonVariant'], string> = {
  purple: 'border-transparent bg-purple-600 text-white hover:bg-purple-500',
  emerald: 'border-transparent bg-emerald-500 text-slate-950 hover:bg-emerald-400',
  amber: 'border-transparent bg-amber-500 text-slate-950 hover:bg-amber-400',
  slate: 'border-slate-700 bg-slate-800 text-white hover:bg-slate-700',
  cyan: 'border-transparent bg-cyan-500 text-slate-950 hover:bg-cyan-400',
};
