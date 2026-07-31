import { Router } from 'express';
import { z } from 'zod';
import type { TutorStatusResponse } from '@brightpath/shared';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { evaluateAnswer, generateGreeting } from '../lib/tutor/evaluate.js';
import { getActiveProvider, getActiveProviderName } from '../lib/llm/provider.js';
import { transcribeWithGemini } from '../lib/speech/transcribe.js';

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

const transcribeSchema = z.object({
  audioBase64: z.string().min(100).max(3_000_000),
  mimeType: z.string().min(3).max(80),
  locale: z.string().min(2).optional(),
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

/** Verifies auth + Gemini/OpenAI in one call (used by web on lesson page load). */
router.post('/warmup', requireAuth, async (_req: AuthRequest, res) => {
  const provider = getActiveProvider();
  if (!provider) {
    res.status(503).json({ error: 'LLM not configured' });
    return;
  }
  try {
    await provider.completeJson<{ ok: boolean }>({
      system: 'Reply with JSON only: {"ok":true}',
      user: 'warmup',
    });
    res.json({ ok: true, provider: provider.name });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Warmup failed';
    console.error('Tutor warmup error:', message);
    res.status(502).json({ error: message });
  }
});

router.post('/greeting', requireAuth, async (req: AuthRequest, res) => {
  const parsed = greetingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid greeting request', details: parsed.error.flatten() });
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

/** Speech-to-text via Gemini (records audio in browser, transcribes server-side). */
router.post('/transcribe', requireAuth, async (req: AuthRequest, res) => {
  const parsed = transcribeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid audio upload', details: parsed.error.flatten() });
    return;
  }

  if (!process.env.GEMINI_API_KEY?.trim()) {
    res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
    return;
  }

  try {
    const text = await transcribeWithGemini(
      parsed.data.audioBase64,
      parsed.data.mimeType,
      parsed.data.locale ?? 'en-US',
    );
    res.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Transcription failed';
    console.error('Tutor transcribe error:', message);
    res.status(502).json({ error: message });
  }
});

router.post('/respond', requireAuth, async (req: AuthRequest, res) => {
  const parsed = respondSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid respond request', details: parsed.error.flatten() });
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
