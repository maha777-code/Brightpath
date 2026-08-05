import { Router } from 'express';
import { z } from 'zod';
import { formatStudyTime, toLocalDateString } from '@brightpath/shared';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { applyActivityHeartbeat, toParentUser } from '../lib/ageCurriculum.js';

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

router.use(requireAuth);

/**
 * Heartbeat from the client session timer.
 * Updates weekly study seconds + consecutive-day streak.
 */
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

export default router;
