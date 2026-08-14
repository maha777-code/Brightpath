import jwt from 'jsonwebtoken';
import type { AppRole, ParentUser, PlanType, TeacherUser, UserRole } from '@brightpath/shared';

const JWT_SECRET = process.env.JWT_SECRET ?? 'brightpath-dev-secret-change-me';

export type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
  planType?: PlanType;
  organizationId?: string | null;
  teacherId?: string | null;
  parentProfileId?: string | null;
  /** True when sub is PlatformUser.id */
  platform?: boolean;
};

export function signPlatformToken(input: {
  id: string;
  email: string;
  role: AppRole;
  planType: PlanType;
  organizationId?: string | null;
  teacherId?: string | null;
  parentProfileId?: string | null;
}): string {
  return jwt.sign(
    {
      sub: input.id,
      email: input.email,
      role: input.role,
      planType: input.planType,
      organizationId: input.organizationId ?? null,
      teacherId: input.teacherId ?? null,
      parentProfileId: input.parentProfileId ?? null,
      platform: true,
    } satisfies JwtPayload,
    JWT_SECRET,
    { expiresIn: '30d' },
  );
}

export function signParentToken(
  parent: ParentUser,
  role: Extract<UserRole, 'parent' | 'student'> = 'parent',
): string {
  return jwt.sign(
    {
      sub: parent.id,
      email: parent.email,
      role,
      planType: role === 'student' ? 'student_free' : 'parent_free',
      parentProfileId: parent.id,
      platform: false,
    } satisfies JwtPayload,
    JWT_SECRET,
    { expiresIn: '30d' },
  );
}

/** @deprecated use signParentToken — kept for existing imports */
export function signToken(
  parent: ParentUser,
  role: Extract<UserRole, 'parent' | 'student'> = 'parent',
): string {
  return signParentToken(parent, role);
}

export function signTeacherToken(teacher: TeacherUser): string {
  return jwt.sign(
    {
      sub: teacher.id,
      email: teacher.email,
      role: 'teacher',
      planType: teacher.planType ?? 'teacher_free',
      teacherId: teacher.id,
      organizationId: teacher.organizationId ?? null,
      platform: false,
    } satisfies JwtPayload,
    JWT_SECRET,
    { expiresIn: '30d' },
  );
}

export function verifyToken(token: string): JwtPayload {
  const payload = jwt.verify(token, JWT_SECRET) as JwtPayload & { role?: UserRole };
  return {
    sub: payload.sub,
    email: payload.email,
    role: payload.role ?? 'parent',
    planType: payload.planType,
    organizationId: payload.organizationId ?? null,
    teacherId: payload.teacherId ?? null,
    parentProfileId: payload.parentProfileId ?? null,
    platform: Boolean(payload.platform),
  };
}
