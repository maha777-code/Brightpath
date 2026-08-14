/** Multi-tenant RBAC, plans, and feature gating */

export type AppRole = 'org_admin' | 'center_admin' | 'teacher' | 'parent' | 'student';

/** Signup segments (same as AppRole for new accounts). */
export type SignupRole = AppRole;

/** Legacy JWT roles still accepted for older sessions. */
export type LegacyUserRole = 'parent' | 'student' | 'teacher';

export type UserRole = AppRole | LegacyUserRole;

export type OrgType = 'school' | 'tutor_center';

export type PlanType =
  | 'free'
  | 'teacher_free'
  | 'teacher_pro'
  | 'tutor_center_pro'
  | 'school_enterprise'
  | 'family_plan'
  | 'parent_free'
  | 'student_free'
  | 'student_pro';

export type FeatureName =
  | 'pdf_upload'
  | 'rag_indexing'
  | 'doubt_override'
  | 'video_explainers'
  | 'gamified_activities'
  | 'bulk_csv'
  | 'custom_branding'
  | 'unlimited_ai_doubts'
  | 'multi_tutor'
  | 'school_analytics';

export const DEFAULT_PLAN_FOR_ROLE: Record<AppRole, PlanType> = {
  org_admin: 'school_enterprise',
  center_admin: 'tutor_center_pro',
  teacher: 'teacher_free',
  parent: 'parent_free',
  student: 'student_free',
};

export const HOME_PATH_FOR_ROLE: Record<AppRole, string> = {
  org_admin: '/admin/school-dashboard',
  center_admin: '/admin/center-dashboard',
  teacher: '/teacher/dashboard',
  parent: '/parent/dashboard',
  student: '/student/dashboard',
};

export function homePathForRole(role: string | null | undefined): string {
  if (role === 'org_admin') return HOME_PATH_FOR_ROLE.org_admin;
  if (role === 'center_admin') return HOME_PATH_FOR_ROLE.center_admin;
  if (role === 'teacher') return HOME_PATH_FOR_ROLE.teacher;
  if (role === 'parent') return HOME_PATH_FOR_ROLE.parent;
  if (role === 'student') return HOME_PATH_FOR_ROLE.student;
  return '/login';
}

export function isAppRole(role: string | null | undefined): role is AppRole {
  return (
    role === 'org_admin' ||
    role === 'center_admin' ||
    role === 'teacher' ||
    role === 'parent' ||
    role === 'student'
  );
}

/** Normalize legacy JWT roles onto AppRole. */
export function toAppRole(role: string | null | undefined): AppRole | null {
  if (isAppRole(role)) return role;
  return null;
}

export interface FeatureLimits {
  pdfUploadMb: number;
  pdfUploadCount: number | null; // null = unlimited
  aiDoubtsPerDay: number | null; // null = unlimited
  features: FeatureName[];
}

const TEACHER_FREE_FEATURES: FeatureName[] = ['pdf_upload'];
const TEACHER_PRO_FEATURES: FeatureName[] = [
  'pdf_upload',
  'rag_indexing',
  'doubt_override',
  'video_explainers',
  'gamified_activities',
];
const ORG_FEATURES: FeatureName[] = [
  ...TEACHER_PRO_FEATURES,
  'bulk_csv',
  'custom_branding',
  'multi_tutor',
  'school_analytics',
  'unlimited_ai_doubts',
];
const STUDENT_FREE_FEATURES: FeatureName[] = ['pdf_upload'];
const STUDENT_PRO_FEATURES: FeatureName[] = [
  'video_explainers',
  'gamified_activities',
  'unlimited_ai_doubts',
];
const PARENT_FEATURES: FeatureName[] = ['video_explainers'];

export const PLAN_LIMITS: Record<PlanType, FeatureLimits> = {
  free: { pdfUploadMb: 20, pdfUploadCount: 1, aiDoubtsPerDay: 5, features: TEACHER_FREE_FEATURES },
  teacher_free: {
    pdfUploadMb: 20,
    pdfUploadCount: 1,
    aiDoubtsPerDay: 5,
    features: TEACHER_FREE_FEATURES,
  },
  teacher_pro: {
    pdfUploadMb: 80,
    pdfUploadCount: null,
    aiDoubtsPerDay: null,
    features: TEACHER_PRO_FEATURES,
  },
  tutor_center_pro: {
    pdfUploadMb: 80,
    pdfUploadCount: null,
    aiDoubtsPerDay: null,
    features: [...TEACHER_PRO_FEATURES, 'multi_tutor', 'bulk_csv'],
  },
  school_enterprise: {
    pdfUploadMb: 80,
    pdfUploadCount: null,
    aiDoubtsPerDay: null,
    features: ORG_FEATURES,
  },
  family_plan: {
    pdfUploadMb: 20,
    pdfUploadCount: 0,
    aiDoubtsPerDay: null,
    features: [...PARENT_FEATURES, 'unlimited_ai_doubts', 'video_explainers', 'gamified_activities'],
  },
  parent_free: {
    pdfUploadMb: 20,
    pdfUploadCount: 0,
    aiDoubtsPerDay: 5,
    features: PARENT_FEATURES,
  },
  student_free: {
    pdfUploadMb: 20,
    pdfUploadCount: 0,
    aiDoubtsPerDay: 5,
    features: STUDENT_FREE_FEATURES,
  },
  student_pro: {
    pdfUploadMb: 20,
    pdfUploadCount: 0,
    aiDoubtsPerDay: null,
    features: STUDENT_PRO_FEATURES,
  },
};

export function getPlanLimits(planType: PlanType | string | null | undefined): FeatureLimits {
  if (planType && planType in PLAN_LIMITS) return PLAN_LIMITS[planType as PlanType];
  return PLAN_LIMITS.free;
}

export function hasFeatureAccess(
  planType: PlanType | string | null | undefined,
  feature: FeatureName,
): boolean {
  return getPlanLimits(planType).features.includes(feature);
}

export function maxPdfBytes(planType: PlanType | string | null | undefined): number {
  return getPlanLimits(planType).pdfUploadMb * 1024 * 1024;
}

export function maxPdfCount(planType: PlanType | string | null | undefined): number | null {
  return getPlanLimits(planType).pdfUploadCount;
}

export interface PlatformUserPublic {
  id: string;
  email: string;
  name: string | null;
  role: AppRole;
  planType: PlanType;
  organizationId: string | null;
  teacherId: string | null;
  parentProfileId: string | null;
  parentLinkCode: string | null;
  createdAt: string;
}

export interface OrganizationPublic {
  id: string;
  name: string;
  type: OrgType;
  logoUrl: string | null;
  planType: PlanType;
  maxLicenses: number;
  adminUserId: string | null;
}

export interface ClassBatchPublic {
  id: string;
  name: string;
  inviteCode: string;
  teacherId: string;
  organizationId: string | null;
}
