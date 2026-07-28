import { Router } from 'express';
import { z } from 'zod';
import { ageToBand, SUBJECTS } from '@brightpath/shared';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

const subjectSchema = z.enum(SUBJECTS);
const localeSchema = z.enum(['en-IN', 'en-US', 'hi-IN', 'ar-AE', 'ar-KW']);

const createChildSchema = z.object({
  name: z.string().min(1).max(50),
  age: z.number().int().min(5).max(18),
  subjects: z.array(subjectSchema).min(1),
  locale: localeSchema.optional(),
});

const updateChildSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  age: z.number().int().min(5).max(18).optional(),
  subjects: z.array(subjectSchema).min(1).optional(),
  locale: localeSchema.optional(),
});

function serializeChild(c: {
  id: string;
  parentId: string;
  name: string;
  age: number;
  ageBand: string;
  subjects: string[];
  locale: string;
  createdAt: Date;
}) {
  return {
    id: c.id,
    parentId: c.parentId,
    name: c.name,
    age: c.age,
    ageBand: c.ageBand,
    subjects: c.subjects,
    locale: c.locale,
    createdAt: c.createdAt.toISOString(),
  };
}

router.use(requireAuth);

router.get('/', async (req: AuthRequest, res) => {
  const children = await prisma.child.findMany({
    where: { parentId: req.parentId! },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ children: children.map(serializeChild) });
});

router.post('/', async (req: AuthRequest, res) => {
  const parsed = createChildSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { name, age, subjects, locale } = parsed.data;
  const child = await prisma.child.create({
    data: {
      parentId: req.parentId!,
      name,
      age,
      ageBand: ageToBand(age),
      subjects,
      locale: locale ?? 'en-IN',
    },
  });

  res.status(201).json({ child: serializeChild(child) });
});

router.get('/:id', async (req: AuthRequest, res) => {
  const child = await prisma.child.findFirst({
    where: { id: req.params.id, parentId: req.parentId! },
  });
  if (!child) {
    res.status(404).json({ error: 'Child not found' });
    return;
  }
  res.json({ child: serializeChild(child) });
});

router.patch('/:id', async (req: AuthRequest, res) => {
  const parsed = updateChildSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const existing = await prisma.child.findFirst({
    where: { id: req.params.id, parentId: req.parentId! },
  });
  if (!existing) {
    res.status(404).json({ error: 'Child not found' });
    return;
  }

  const { name, age, subjects, locale } = parsed.data;
  const child = await prisma.child.update({
    where: { id: existing.id },
    data: {
      ...(name !== undefined && { name }),
      ...(age !== undefined && { age, ageBand: ageToBand(age) }),
      ...(subjects !== undefined && { subjects }),
      ...(locale !== undefined && { locale }),
    },
  });

  res.json({ child: serializeChild(child) });
});

router.delete('/:id', async (req: AuthRequest, res) => {
  const existing = await prisma.child.findFirst({
    where: { id: req.params.id, parentId: req.parentId! },
  });
  if (!existing) {
    res.status(404).json({ error: 'Child not found' });
    return;
  }

  await prisma.child.delete({ where: { id: existing.id } });
  res.status(204).send();
});

export default router;
