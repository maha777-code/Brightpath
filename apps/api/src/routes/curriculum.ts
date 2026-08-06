import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import {
  buildSubjectCurriculum,
  completeVideo,
  getChapterQuiz,
  submitChapterQuiz,
  trackVideoProgress,
} from '../lib/curriculumEngine.js';

const router = Router();
router.use(requireAuth);

const trackSchema = z.object({
  videoId: z.string().min(1),
  watchTimeSeconds: z.number().min(0).max(86_400),
  maxWatchedTime: z.number().min(0).max(86_400),
});

const completeSchema = z.object({
  videoId: z.string().min(1),
  maxWatchedTime: z.number().min(0).max(86_400),
});

const quizSubmitSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      selectedIndex: z.number().int().min(0),
    }),
  ),
});

/** Subject → chapters → 5 videos + quiz progress */
router.get('/subjects/:subjectId', async (req: AuthRequest, res) => {
  try {
    const data = await buildSubjectCurriculum(req.parentId!, req.params.subjectId);
    if (!data) {
      res.status(404).json({ error: 'Subject not found' });
      return;
    }
    res.json(data);
  } catch (err) {
    console.error('[curriculum subject]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed' });
  }
});

router.post('/video/track-progress', async (req: AuthRequest, res) => {
  const parsed = trackSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const result = await trackVideoProgress({
      userId: req.parentId!,
      ...parsed.data,
    });
    res.json({
      videoId: result.progress.videoId,
      watchTimeSeconds: result.progress.watchTimeSeconds,
      maxWatchedTime: result.progress.maxWatchedTime,
      isCompleted: result.progress.isCompleted,
    });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Track failed' });
  }
});

router.post('/video/complete', async (req: AuthRequest, res) => {
  const parsed = completeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const result = await completeVideo({
      userId: req.parentId!,
      videoId: parsed.data.videoId,
      maxWatchedTime: parsed.data.maxWatchedTime,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Complete failed' });
  }
});

router.get('/chapters/:chapterId/quiz', async (req: AuthRequest, res) => {
  try {
    const quiz = await getChapterQuiz(req.parentId!, req.params.chapterId);
    res.json(quiz);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Quiz unavailable';
    res.status(msg.includes('locked') || msg.includes('Complete') ? 403 : 404).json({ error: msg });
  }
});

router.post('/chapters/:chapterId/quiz', async (req: AuthRequest, res) => {
  const parsed = quizSubmitSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const result = await submitChapterQuiz({
      userId: req.parentId!,
      chapterId: req.params.chapterId,
      answers: parsed.data.answers,
    });
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Submit failed';
    res.status(400).json({ error: msg });
  }
});

export default router;
