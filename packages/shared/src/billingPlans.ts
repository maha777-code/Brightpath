import type { AppRole, PlanType } from './rbac.js';

export type BillingCurrency = 'INR' | 'USD';
export type BillingCycle = 'monthly' | 'annual';

export const CHECKOUT_PLAN_IDS = [
  'student-pro',
  'teacher-pro',
  'parent-pro',
  'tutor-center',
  'tutor-center-pro',
  'school',
  'school-pro',
] as const;

export type CheckoutPlanId = (typeof CHECKOUT_PLAN_IDS)[number];

export interface CheckoutPlan {
  id: CheckoutPlanId;
  title: string;
  /** Plan type granted once Dodo reports the subscription as active. */
  planType: PlanType;
  /** Account roles allowed to buy this plan. */
  roles: AppRole[];
  /** Organization plans are billed to the admin's school or center. */
  scope: 'user' | 'organization';
  /** Seats included; null means unlimited. Only used for organization plans. */
  seats?: number | null;
}

export const CHECKOUT_PLANS: Record<CheckoutPlanId, CheckoutPlan> = {
  'student-pro': { id: 'student-pro', title: 'Student Pro', planType: 'student_pro', roles: ['student'], scope: 'user' },
  'teacher-pro': { id: 'teacher-pro', title: 'Teacher Pro', planType: 'teacher_pro', roles: ['teacher'], scope: 'user' },
  'parent-pro': { id: 'parent-pro', title: 'Parent Pro', planType: 'family_plan', roles: ['parent'], scope: 'user' },
  'tutor-center': {
    id: 'tutor-center',
    title: 'Academy Starter',
    planType: 'tutor_center_pro',
    roles: ['center_admin'],
    scope: 'organization',
    seats: 5,
  },
  'tutor-center-pro': {
    id: 'tutor-center-pro',
    title: 'Academy Pro',
    planType: 'tutor_center_pro',
    roles: ['center_admin'],
    scope: 'organization',
    seats: 20,
  },
  school: {
    id: 'school',
    title: 'School Campus',
    planType: 'school_enterprise',
    roles: ['org_admin'],
    scope: 'organization',
    seats: 30,
  },
  'school-pro': {
    id: 'school-pro',
    title: 'District / Large Campus',
    planType: 'school_enterprise',
    roles: ['org_admin'],
    scope: 'organization',
    seats: null,
  },
};

export function isCheckoutPlanId(value: unknown): value is CheckoutPlanId {
  return typeof value === 'string' && (CHECKOUT_PLAN_IDS as readonly string[]).includes(value);
}

/** Server env var holding the Dodo product id, e.g. DODO_PRODUCT_TEACHER_PRO_INR_ANNUAL. */
export function dodoProductEnvKey(planId: CheckoutPlanId, currency: BillingCurrency, cycle: BillingCycle): string {
  return `DODO_PRODUCT_${planId.toUpperCase().replace(/-/g, '_')}_${currency}_${cycle.toUpperCase()}`;
}
