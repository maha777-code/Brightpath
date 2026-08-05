import { Router } from 'express';
import { z } from 'zod';
import {
  SUBJECTS,
  ageToBand,
  getAgeGroupFromAge,
  getAgeFromDOB,
  mergeUnlockedSubjects,
  ageGroupToLegacyBand,
  type AgeGroup,
} from '@brightpath/shared';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { parseDobInput } from '../lib/ageCurriculum.js';

const router = Router();

const subjectSchema = z.enum(SUBJECTS);
const localeSchema = z.enum(['en-IN', 'en-US', 'hi-IN', 'ar-AE', 'ar-KW']);

const createChildSchema = z
  .object({
    name: z.string().min(1).max(50),
    age: z.number().int().min(1).max(18).optional(),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    subjects: z.array(subjectSchema).min(1),
    locale: localeSchema.optional(),
  })
  .refine((d) => d.age !== undefined || d.dateOfBirth, {
    message: 'Provide age or dateOfBirth',
  });

const updateChildSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  age: z.number().int().min(1).max(18).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  subjects: z.array(subjectSchema).min(1).optional(),
  locale: localeSchema.optional(),
});

function serializeChild(c: {
  id: string;
  parentId: string;
  name: string;
  age: number;
  ageBand: string;
  dateOfBirth: Date | null;
  calculatedAgeGroup: AgeGroup;
  unlockedSubjects: string[];
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
    dateOfBirth: c.dateOfBirth ? c.dateOfBirth.toISOString().slice(0, 10) : null,
    calculatedAgeGroup: c.calculatedAgeGroup,
    unlockedSubjects: c.unlockedSubjects ?? [],
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

  const { name, subjects, locale } = parsed.data;
  let dob: Date | null = null;
  let age = parsed.data.age;
  try {
    if (parsed.data.dateOfBirth) {
      dob = parseDobInput(parsed.data.dateOfBirth);
      age = getAgeFromDOB(dob);
    }
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid dateOfBirth' });
    return;
  }

  if (age === undefined) {
    res.status(400).json({ error: 'Age could not be determined' });
    return;
  }

  const group = getAgeGroupFromAge(age);
  const child = await prisma.child.create({
    data: {
      parentId: req.parentId!,
      name,
      age,
      ageBand: ageToBand(age),
      dateOfBirth: dob,
      calculatedAgeGroup: group,
      unlockedSubjects: mergeUnlockedSubjects([], group),
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

  const { name, subjects, locale } = parsed.data;
  let dob = existing.dateOfBirth;
  let age = existing.age;
  let group = existing.calculatedAgeGroup as AgeGroup;
  let unlocked = existing.unlockedSubjects;

  try {
    if (parsed.data.dateOfBirth) {
      dob = parseDobInput(parsed.data.dateOfBirth);
      age = getAgeFromDOB(dob);
      group = getAgeGroupFromAge(age);
      unlocked = mergeUnlockedSubjects(unlocked, group);
    } else if (parsed.data.age !== undefined) {
      age = parsed.data.age;
      group = getAgeGroupFromAge(age);
      unlocked = mergeUnlockedSubjects(unlocked, group);
    }
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid dateOfBirth' });
    return;
  }

  const child = await prisma.child.update({
    where: { id: existing.id },
    data: {
      ...(name !== undefined && { name }),
      age,
      ageBand: ageGroupToLegacyBand(group),
      dateOfBirth: dob,
      calculatedAgeGroup: group,
      unlockedSubjects: unlocked,
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
