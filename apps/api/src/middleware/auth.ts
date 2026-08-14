import type { Response, NextFunction, Request } from 'express';
import {
  hasFeatureAccess,
  type AppRole,
  type FeatureName,
  type PlanType,
} from '@brightpath/shared';
import { verifyToken, type JwtPayload } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';

export interface AuthRequest extends Request {
  parentId?: string;
  teacherId?: string;
  platformUserId?: string;
  organizationId?: string | null;
  planType?: PlanType;
  auth?: JwtPayload;
}

async function attachAuth(req: AuthRequest, payload: JwtPayload): Promise<boolean> {
  req.auth = payload;
  req.planType = payload.planType;
  req.organizationId = payload.organizationId ?? null;

  if (payload.platform) {
    const user = await prisma.platformUser.findUnique({ where: { id: payload.sub } });
    if (!user) return false;
    req.platformUserId = user.id;
    req.planType = user.planType;
    req.organizationId = user.organizationId;
    if (user.teacherId) req.teacherId = user.teacherId;
    if (user.parentProfileId) req.parentId = user.parentProfileId;
    return true;
  }

  if (payload.role === 'teacher') {
    const teacher = await prisma.teacher.findUnique({ where: { id: payload.sub } });
    if (!teacher) return false;
    req.teacherId = teacher.id;
    req.planType = teacher.planType;
    req.organizationId = teacher.organizationId;
    return true;
  }

  const parent = await prisma.parent.findUnique({ where: { id: payload.sub } });
  if (!parent) return false;
  req.parentId = parent.id;
  return true;
}

function readBearer(req: AuthRequest): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice(7);
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = readBearer(req);
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const payload = verifyToken(token);
    const ok = await attachAuth(req, payload);
    if (!ok) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export async function requireTeacher(req: AuthRequest, res: Response, next: NextFunction) {
  const token = readBearer(req);
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const payload = verifyToken(token);
    const ok = await attachAuth(req, payload);
    if (!ok) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    let teacherId = req.teacherId ?? null;
    if (!teacherId && payload.role === 'teacher' && !payload.platform) {
      teacherId = payload.sub;
    }
    if (!teacherId || payload.role !== 'teacher') {
      res.status(403).json({ error: 'Teacher access required' });
      return;
    }

    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
    if (!teacher) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    req.teacherId = teacher.id;
    req.planType = teacher.planType ?? req.planType;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRoles(...roles: AppRole[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = readBearer(req);
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    try {
      const payload = verifyToken(token);
      const ok = await attachAuth(req, payload);
      if (!ok) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      const role = payload.role as AppRole;
      if (!roles.includes(role)) {
        res.status(403).json({ error: `Requires one of: ${roles.join(', ')}` });
        return;
      }
      next();
    } catch {
      res.status(401).json({ error: 'Invalid token' });
    }
  };
}

export function requireFeature(feature: FeatureName) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = readBearer(req);
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    try {
      const payload = verifyToken(token);
      const ok = await attachAuth(req, payload);
      if (!ok) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      if (!hasFeatureAccess(req.planType, feature)) {
        res.status(402).json({
          error: `Upgrade required for feature: ${feature}`,
          feature,
          planType: req.planType ?? 'free',
        });
        return;
      }
      next();
    } catch {
      res.status(401).json({ error: 'Invalid token' });
    }
  };
}
