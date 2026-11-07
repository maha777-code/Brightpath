import type { CheckoutPlanId } from '@brightpath/shared';

const PRO_PLAN_BY_ROLE: Record<string, CheckoutPlanId> = {
  teacher: 'teacher-pro',
  org_admin: 'school-pro',
  center_admin: 'tutor-center-pro',
  student: 'student-pro',
  parent: 'parent-pro',
};

export function proPlanForRole(role: string | null | undefined): CheckoutPlanId {
  return PRO_PLAN_BY_ROLE[role ?? ''] ?? 'teacher-pro';
}

/** Pricing page focused on the Pro plan for this role, with its checkout button. */
export function proUpgradeHref(role: string | null | undefined): string {
  return `/pricing?plan=${proPlanForRole(role)}`;
}
