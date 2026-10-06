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
      '20+ MindVault student tools',
      'Sharada chatbot (Basic tier)',
      'Quizzes & Homework helper',
      '5 AI generations / day',
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
      '50+ MindVault student tools',
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
      '20+ Teacher automation tools',
      'Basic lesson plan & quiz builder',
      'Sharada assistant (Standard speed)',
      'Community template access',
      'Best in class privacy & safety',
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
    description: 'Complete power suite for educators. Save 10+ hours a week with unlimited tools.',
    buttonText: 'Upgrade Teacher Pro',
    buttonVariant: 'purple',
    href: '/register',
    features: [
      'Unlimited AI lesson plan & quiz generation',
      '50+ MindVault Teacher tools',
      'Unlimited document & PDF uploads',
      'Class writing feedback & rubric generator',
      'Export directly to Google Docs, PDF, & Word',
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
      '5 Practice quiz generations / month',
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
      'Up to 5 Tutor accounts included',
      'Centralized student analytics',
      'Batch quiz & test generation',
      'Custom center branding on exported sheets',
      '50+ Academy AI tools',
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
      'Up to 20 Tutor accounts included',
      'Unlimited student performance insights',
      'White-labeled student portal & exports',
      'Dedicated account onboarding',
      'Priority AI speed & API access',
    ],
  },
  {
    id: 'school',
    badge: 'SCHOOL',
    title: 'School Campus',
    roleCategory: 'Schools',
    priceINR: { monthly: 14999, annualMonthly: 11999 },
    priceUSD: { monthly: 299, annualMonthly: 249 },
    description: 'Complete campus deployment with admin controls and district privacy compliance.',
    buttonText: 'Deploy to School',
    buttonVariant: 'cyan',
    href: '/contact',
    features: [
      'Up to 30 Teacher licenses',
      'Admin dashboard & analytics',
      'Roster integration (Google Classroom / Cleve)',
      'FERPA & COPPA privacy compliance',
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
      'Single Sign-On (SSO / SAML / LTI)',
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
    description: 'Custom model training, private cloud deployment, and bespoke educational tools.',
    buttonText: 'Contact Sales / Custom Quote',
    buttonVariant: 'slate',
    href: '/contact',
    features: [
      'Private cloud / On-premise deployment',
      'Fine-tuned LLMs on internal institution data',
      'Full white-labeling & custom domain',
      'Custom API integrations & webhooks',
      '24/7 SLA & dedicated security review',
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
