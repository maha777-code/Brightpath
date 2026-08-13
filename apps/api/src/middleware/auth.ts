import type { Response, NextFunction } from 'express';
import type { Request } from 'express';
import { verifyToken, type JwtPayload } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';

export interface AuthRequest extends Request {
  parentId?: string;
  teacherId?: string;
  auth?: JwtPayload;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const payload = verifyToken(header.slice(7));
    req.auth = payload;

    if (payload.role === 'teacher') {
      const teacher = await prisma.teacher.findUnique({ where: { id: payload.sub } });
      if (!teacher) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      req.teacherId = teacher.id;
      next();
      return;
    }

    const parent = await prisma.parent.findUnique({ where: { id: payload.sub } });
    if (!parent) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    req.parentId = parent.id;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export async function requireTeacher(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const payload = verifyToken(header.slice(7));
    if (payload.role !== 'teacher') {
      res.status(403).json({ error: 'Teacher access required' });
      return;
    }
    const teacher = await prisma.teacher.findUnique({ where: { id: payload.sub } });
    if (!teacher) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    req.auth = payload;
    req.teacherId = teacher.id;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
