import jwt from 'jsonwebtoken';
import type { ParentUser } from '@brightpath/shared';

const JWT_SECRET = process.env.JWT_SECRET ?? 'brightpath-dev-secret-change-me';

export function signToken(parent: ParentUser): string {
  return jwt.sign(
    { sub: parent.id, email: parent.email },
    JWT_SECRET,
    { expiresIn: '30d' },
  );
}

export function verifyToken(token: string): { sub: string; email: string } {
  return jwt.verify(token, JWT_SECRET) as { sub: string; email: string };
}
