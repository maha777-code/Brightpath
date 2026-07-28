import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';

export interface AuthRequest extends Request {
  parentId?: string;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const payload = verifyToken(header.slice(7));
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
