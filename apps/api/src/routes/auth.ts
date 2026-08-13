import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { AGE_GROUPS, LOCALES, type ParentUser } from '@brightpath/shared';
import { prisma } from '../lib/prisma.js';
import { signTeacherToken, signToken } from '../lib/jwt.js';
import { requireAuth, requireTeacher, type AuthRequest } from '../middleware/auth.js';
import {
  computeAgeUpgrade,
  initialCurriculumFromDob,
  parseDobInput,
  toParentUser,
} from '../lib/ageCurriculum.js';
import { toTeacherUser } from '../lib/teacherSerializers.js';

const router = Router();

const localeSchema = z.enum(['en-IN', 'en-US', 'hi-IN', 'ar-AE', 'ar-KW']);
const ageGroupSchema = z.enum(AGE_GROUPS);

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).optional(),
  locale: localeSchema.optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dateOfBirth must be YYYY-MM-DD'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const ageSettingsSchema = z
  .object({
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    ageGroup: ageGroupSchema.optional(),
  })
  .refine((d) => Boolean(d.dateOfBirth || d.ageGroup), {
    message: 'Provide dateOfBirth and/or ageGroup',
  });

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { email, password, name, locale, dateOfBirth } = parsed.data;
  const existing = await prisma.parent.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Email already registered' });
    return;
  }

  let dob: Date;
  try {
    dob = parseDobInput(dateOfBirth);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid dateOfBirth' });
    return;
  }

  const curriculum = initialCurriculumFromDob(dob);
  const passwordHash = await bcrypt.hash(password, 12);
  const parent = await prisma.parent.create({
    data: {
      email,
      passwordHash,
      name: name ?? null,
      locale: locale ?? 'en-IN',
      dateOfBirth: dob,
      calculatedAgeGroup: curriculum.calculatedAgeGroup,
      unlockedSubjects: curriculum.unlockedSubjects,
    },
  });

  const user = toParentUser(parent);
  res.status(201).json({
    token: signToken(user),
    parent: user,
    curriculum: {
      upgraded: false,
      previousGroup: null,
      newGroup: curriculum.calculatedAgeGroup,
      unlockedSubjects: curriculum.unlockedSubjects,
      currentAge: curriculum.age,
    },
  });
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

  let updated = parent;
  let curriculumEvent = undefined;

  if (parent.dateOfBirth) {
    const result = computeAgeUpgrade({
      dateOfBirth: parent.dateOfBirth,
      calculatedAgeGroup: parent.calculatedAgeGroup,
      unlockedSubjects: parent.unlockedSubjects,
    });

    if (
      result.calculatedAgeGroup !== parent.calculatedAgeGroup ||
      result.unlockedSubjects.length !== parent.unlockedSubjects.length ||
      result.unlockedSubjects.some((s) => !parent.unlockedSubjects.includes(s))
    ) {
      updated = await prisma.parent.update({
        where: { id: parent.id },
        data: {
          calculatedAgeGroup: result.calculatedAgeGroup,
          unlockedSubjects: result.unlockedSubjects,
        },
      });
    }

    curriculumEvent = result.event;
  }

  const user = toParentUser(updated);
  res.json({
    token: signToken(user),
    parent: user,
    curriculum: curriculumEvent,
  });
});

router.post('/teacher/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, password } = parsed.data;
  const teacher = await prisma.teacher.findUnique({ where: { email } });
  if (!teacher || !(await bcrypt.compare(password, teacher.passwordHash))) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }
  const user = toTeacherUser(teacher);
  res.json({ token: signTeacherToken(user), teacher: user, role: 'teacher' as const });
});

router.post('/teacher/register', async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1).optional(),
    schoolName: z.string().optional(),
    subjectFocus: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, password, name, schoolName, subjectFocus } = parsed.data;
  const existing = await prisma.teacher.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: 'Teacher already registered' });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const teacher = await prisma.teacher.create({
    data: { email, passwordHash, name: name ?? null, schoolName: schoolName ?? null, subjectFocus: subjectFocus ?? 'Science' },
  });
  const user = toTeacherUser(teacher);
  res.status(201).json({ token: signTeacherToken(user), teacher: user, role: 'teacher' as const });
});

router.get('/teacher/me', requireTeacher, async (req: AuthRequest, res) => {
  const teacher = await prisma.teacher.findUnique({ where: { id: req.teacherId! } });
  if (!teacher) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({ teacher: toTeacherUser(teacher), role: 'teacher' as const });
});

router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  if (req.auth?.role === 'teacher' || req.teacherId) {
    const teacher = await prisma.teacher.findUnique({ where: { id: req.teacherId! } });
    if (!teacher) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json({ teacher: toTeacherUser(teacher), role: 'teacher' as const });
    return;
  }

  const parent = await prisma.parent.findUnique({ where: { id: req.parentId! } });
  if (!parent) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  // Soft refresh curriculum on session restore (no celebration unless upgraded)
  if (parent.dateOfBirth) {
    const result = computeAgeUpgrade({
      dateOfBirth: parent.dateOfBirth,
      calculatedAgeGroup: parent.calculatedAgeGroup,
      unlockedSubjects: parent.unlockedSubjects,
    });
    if (
      result.calculatedAgeGroup !== parent.calculatedAgeGroup ||
      result.unlockedSubjects.some((s) => !parent.unlockedSubjects.includes(s))
    ) {
      const updated = await prisma.parent.update({
        where: { id: parent.id },
        data: {
          calculatedAgeGroup: result.calculatedAgeGroup,
          unlockedSubjects: result.unlockedSubjects,
        },
      });
      res.json({ parent: toParentUser(updated), curriculum: result.event });
      return;
    }
  }

  res.json({ parent: toParentUser(parent) });
});

/** Update DOB / age group and refresh unlocked curriculum (keeps prior unlocks). */
router.patch('/age-settings', requireAuth, async (req: AuthRequest, res) => {
  const parsed = ageSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const parent = await prisma.parent.findUnique({ where: { id: req.parentId! } });
  if (!parent) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  let dob: Date | undefined;
  try {
    if (parsed.data.dateOfBirth) dob = parseDobInput(parsed.data.dateOfBirth);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid dateOfBirth' });
    return;
  }

  try {
    const result = computeAgeUpgrade(
      {
        dateOfBirth: parent.dateOfBirth,
        calculatedAgeGroup: parent.calculatedAgeGroup,
        unlockedSubjects: parent.unlockedSubjects,
      },
      { dateOfBirth: dob, forceGroup: parsed.data.ageGroup },
    );

    const updated = await prisma.parent.update({
      where: { id: parent.id },
      data: {
        dateOfBirth: result.dateOfBirth,
        calculatedAgeGroup: result.calculatedAgeGroup,
        unlockedSubjects: result.unlockedSubjects,
      },
    });

    res.json({
      parent: toParentUser(updated),
      curriculum: {
        ...result.event,
        upgraded: true,
        message:
          result.event.message ??
          `Curriculum refreshed for ${result.event.newGroup.replace(/_/g, ' ')}.`,
      },
    });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Update failed' });
  }
});

router.get('/locales', (_req, res) => {
  res.json({ locales: LOCALES });
});

export default router;
