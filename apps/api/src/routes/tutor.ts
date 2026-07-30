import { Router } from 'express';
import { z } from 'zod';
import type { TutorStatusResponse } from '@brightpath/shared';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { evaluateAnswer, generateGreeting } from '../lib/tutor/evaluate.js';
import { getActiveProviderName } from '../lib/llm/provider.js';

const ageBands = ['5-7', '8-10', '11-14', '15-18'] as const;

const router = Router();

const stepSchema = z.object({
  id: z.string(),
  tutorPrompt: z.string(),
  hint: z.string(),
  explanation: z.string(),
  skillTag: z.string(),
  acceptableAnswers: z.array(z.string()).optional(),
});

const respondSchema = z.object({
  childName: z.string().min(1),
  age: z.number().int().min(5).max(18),
  ageBand: z.enum(ageBands),
  locale: z.string().min(2),
  subject: z.string().min(3),
  lessonId: z.string(),
  lessonTitle: z.string(),
  stepIndex: z.number().int().min(0),
  totalSteps: z.number().int().min(1),
  step: stepSchema,
  studentAnswer: z.string().min(1),
  priorHintShown: z.boolean(),
  history: z.array(
    z.object({
      role: z.enum(['tutor', 'learner']),
      content: z.string(),
    }),
  ),
});

const greetingSchema = z.object({
  childName: z.string().min(1),
  age: z.number().int().min(5).max(18),
  ageBand: z.enum(ageBands),
  locale: z.string().min(2),
  subject: z.string().min(3),
  lessonTitle: z.string(),
  firstPrompt: z.string(),
});

router.get('/status', (_req, res) => {
  const provider = getActiveProviderName();
  const body: TutorStatusResponse = {
    llmAvailable: provider !== null,
    provider,
    phase: 1,
  };
  res.json(body);
});

router.post('/greeting', requireAuth, async (req: AuthRequest, res) => {
  const parsed = greetingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  if (!getActiveProviderName()) {
    res.status(503).json({ error: 'LLM not configured', fallback: true });
    return;
  }

  try {
    const result = await generateGreeting(parsed.data);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Tutor unavailable';
    console.error('Tutor greeting error:', message);
    res.status(502).json({ error: message, fallback: true });
  }
});

router.post('/respond', requireAuth, async (req: AuthRequest, res) => {
  const parsed = respondSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  if (!getActiveProviderName()) {
    res.status(503).json({ error: 'LLM not configured', fallback: true });
    return;
  }

  try {
    const result = await evaluateAnswer(parsed.data);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Tutor unavailable';
    console.error('Tutor respond error:', message);
    res.status(502).json({ error: message, fallback: true });
  }
});

export default router;
