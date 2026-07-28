import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { LOCALES, type ParentUser } from '@brightpath/shared';
import { prisma } from '../lib/prisma.js';
import { signToken } from '../lib/jwt.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

const localeSchema = z.enum(['en-IN', 'en-US', 'hi-IN', 'ar-AE', 'ar-KW']);

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
  locale: localeSchema.optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function toParentUser(p: { id: string; email: string; name: string | null; locale: string; createdAt: Date }): ParentUser {
  return {
    id: p.id,
    email: p.email,
    name: p.name,
    locale: p.locale as ParentUser['locale'],
    createdAt: p.createdAt.toISOString(),
  };
}

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { email, password, name, locale } = parsed.data;
  const existing = await prisma.parent.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const parent = await prisma.parent.create({
    data: {
      email,
      passwordHash,
      name: name ?? null,
      locale: locale ?? 'en-IN',
    },
  });

  const user = toParentUser(parent);
  res.status(201).json({ token: signToken(user), parent: user });
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { email, password } = parsed.data;
  const parent = await prisma.parent.findUnique({ where: { email } });
  if (!parent || !(await bcrypt.compare(password, parent.passwordHash))) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const user = toParentUser(parent);
  res.json({ token: signToken(user), parent: user });
});

router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  const parent = await prisma.parent.findUnique({ where: { id: req.parentId! } });
  if (!parent) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({ parent: toParentUser(parent) });
});

router.get('/locales', (_req, res) => {
  res.json({ locales: LOCALES });
});

export default router;
