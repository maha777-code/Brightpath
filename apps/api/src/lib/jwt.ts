import jwt from 'jsonwebtoken';
import type { ParentUser, TeacherUser, UserRole } from '@brightpath/shared';

const JWT_SECRET = process.env.JWT_SECRET ?? 'brightpath-dev-secret-change-me';

export type JwtPayload = {
  sub: string;
  email: string;
  role: UserRole;
};

export function signParentToken(parent: ParentUser): string {
  return jwt.sign(
    { sub: parent.id, email: parent.email, role: 'parent' satisfies UserRole },
    JWT_SECRET,
    { expiresIn: '30d' },
  );
}

/** @deprecated use signParentToken — kept for existing imports */
export function signToken(parent: ParentUser): string {
  return signParentToken(parent);
}

export function signTeacherToken(teacher: TeacherUser): string {
  return jwt.sign(
    { sub: teacher.id, email: teacher.email, role: 'teacher' satisfies UserRole },
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
  };
}
