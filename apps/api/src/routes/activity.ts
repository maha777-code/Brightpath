import { Router } from 'express';
import { z } from 'zod';
import { hasFeatureAccess } from '@brightpath/shared';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';
import { toSubtopic } from '../lib/teacherSerializers.js';
import { generateGamifiedActivity } from '../services/gamifiedActivity.js';

const router = Router();

const generateSchema = z.object({
  subtopicId: z.string().min(1),
  chapterId: z.string().min(1),
  type: z.literal('gamified_quiz'),
});

/** POST /teacher/generate-activity — RAG-grounded 5-question gamified quiz */
router.post('/generate-activity', async (req: AuthRequest, res) => {
  if (!hasFeatureAccess(req.planType ?? 'teacher_free', 'gamified_activities')) {
    res.status(402).json({
      error: 'Gamified activities require Teacher Pro or an organization plan.',
      planType: req.planType,
    });
    return;
  }

  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'subtopicId, chapterId, and type "gamified_quiz" are required' });
    return;
  }

  try {
    const result = await generateGamifiedActivity({
      teacherId: req.teacherId!,
      ...parsed.data,
    });

    const subtopic = await prisma.teacherSubtopic.findUnique({ where: { id: result.subtopicId } });
    if (!subtopic) {
      res.status(404).json({ error: 'Subtopic not found' });
      return;
    }

    res.status(201).json({
      activity: result.activity,
      subtopic: toSubtopic(subtopic, result.activity),
    });
  } catch (err) {
    const status = typeof (err as { status?: number }).status === 'number' ? (err as { status: number }).status : 502;
    const message =
      err instanceof Error && err.message
        ? err.message
        : 'Failed to generate activity. Please try again.';
    const friendly =
      status === 404 ? message : /timed out/i.test(message) || status >= 500
        ? 'Failed to generate activity. Please try again.'
        : message;
    res.status(status === 404 ? 404 : 502).json({ error: friendly });
  }
});

export default router;
