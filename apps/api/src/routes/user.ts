import { Router } from 'express';
import { z } from 'zod';
import { formatStudyTime, toLocalDateString, AGE_GROUPS } from '@brightpath/shared';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { applyActivityHeartbeat, toParentUser } from '../lib/ageCurriculum.js';
import { buildLearningPath, submitModuleAssessment } from '../lib/learningPath.js';

const router = Router();

const trackSchema = z.object({
  durationInSeconds: z.number().min(1).max(600),
  timestamp: z.string().min(8),
  localDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  timeZone: z.string().min(1).max(80).optional(),
});

const assessmentSchema = z.object({
  nodeId: z.string().min(1),
  scorePercent: z.number().min(0).max(100),
});

router.use(requireAuth);

router.post('/track-activity', async (req: AuthRequest, res) => {
  const parsed = trackSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const parent = await prisma.parent.findUnique({ where: { id: req.parentId! } });
  if (!parent) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const now = new Date();
  const clientTs = new Date(parsed.data.timestamp);
  const ref = Number.isNaN(clientTs.getTime()) ? now : clientTs;

  const localDate =
    parsed.data.localDate ??
    toLocalDateString(ref, parsed.data.timeZone) ??
    toLocalDateString(now);

  const patch = applyActivityHeartbeat(
    {
      currentStreak: parent.currentStreak,
      longestStreak: parent.longestStreak,
      lastActiveDate: parent.lastActiveDate,
      timeStudiedThisWeek: parent.timeStudiedThisWeek,
      lastWeekResetTimestamp: parent.lastWeekResetTimestamp,
    },
    {
      durationInSeconds: parsed.data.durationInSeconds,
      localDate,
      now,
    },
  );

  const updated = await prisma.parent.update({
    where: { id: parent.id },
    data: {
      currentStreak: patch.currentStreak,
      longestStreak: patch.longestStreak,
      lastActiveDate: patch.lastActiveDate,
      timeStudiedThisWeek: patch.timeStudiedThisWeek,
      lastWeekResetTimestamp: patch.lastWeekResetTimestamp,
    },
  });

  const user = toParentUser(updated);
  res.json({
    parent: user,
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    timeStudiedThisWeek: user.timeStudiedThisWeek,
    timeStudiedFormatted: formatStudyTime(user.timeStudiedThisWeek),
  });
});

router.get('/stats', async (req: AuthRequest, res) => {
  const parent = await prisma.parent.findUnique({ where: { id: req.parentId! } });
  if (!parent) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const user = toParentUser(parent);
  res.json({
    parent: user,
    currentStreak: user.currentStreak,
    longestStreak: user.longestStreak,
    timeStudiedThisWeek: user.timeStudiedThisWeek,
    timeStudiedFormatted: formatStudyTime(user.timeStudiedThisWeek),
  });
});

/** Adaptive personalized learning path for the logged-in user's age group */
router.get('/learning-path', async (req: AuthRequest, res) => {
  const parent = await prisma.parent.findUnique({ where: { id: req.parentId! } });
  if (!parent) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const ageGroup = parent.calculatedAgeGroup ?? 'EARLY_4_7';
  if (!(AGE_GROUPS as readonly string[]).includes(ageGroup)) {
    res.status(400).json({ error: 'Invalid age group' });
    return;
  }

  try {
    const nodes = await buildLearningPath(parent.id, ageGroup);
    res.json({ ageGroup, nodes });
  } catch (err) {
    console.error('[learning-path]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to build path' });
  }
});

/** Recalculate mastery for a module node and refresh path statuses */
router.post('/submit-assessment', async (req: AuthRequest, res) => {
  const parsed = assessmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  try {
    const result = await submitModuleAssessment({
      userId: req.parentId!,
      nodeId: parsed.data.nodeId,
      scorePercent: parsed.data.scorePercent,
    });
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Assessment failed';
    res.status(msg.includes('not found') ? 404 : 500).json({ error: msg });
  }
});

export default router;
