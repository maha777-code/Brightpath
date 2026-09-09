import { Router, type Response } from 'express';
import { z } from 'zod';
import {
  TEACHER_TOOL_FOCUS_LABELS,
  TEACHER_TOOLS_CATALOG,
  getTeacherToolById,
  type TeacherToolsCatalogResponse,
  type ToggleTeacherToolFavoriteResponse,
} from '@brightpath/shared';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';
import { generateMultipleChoiceQuiz, generateWorksheet } from '../services/llm.js';

const favoriteBody = z.object({
  toolId: z.string().min(1).max(80),
});

const FOCUS_AREAS: TeacherToolsCatalogResponse['focusAreas'] = [
  { id: 'all', label: 'Discover tools by focus area' },
  { id: 'curriculum', label: TEACHER_TOOL_FOCUS_LABELS.curriculum },
  { id: 'content', label: TEACHER_TOOL_FOCUS_LABELS.content },
  { id: 'assessment', label: TEACHER_TOOL_FOCUS_LABELS.assessment },
  { id: 'communication', label: TEACHER_TOOL_FOCUS_LABELS.communication },
];

let favoritesTableReady = false;

async function ensureFavoritesTable(): Promise<void> {
  if (favoritesTableReady) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TeacherToolFavorite" (
      "id" TEXT NOT NULL,
      "teacherId" TEXT NOT NULL,
      "toolId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TeacherToolFavorite_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "TeacherToolFavorite_teacherId_fkey"
        FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "TeacherToolFavorite_teacherId_toolId_key"
    ON "TeacherToolFavorite"("teacherId", "toolId")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "TeacherToolFavorite_teacherId_idx"
    ON "TeacherToolFavorite"("teacherId")
  `);
  favoritesTableReady = true;
}

async function favoriteIdsForTeacher(teacherId: string): Promise<string[]> {
  await ensureFavoritesTable();
  const rows = await prisma.teacherToolFavorite.findMany({
    where: { teacherId },
    select: { toolId: true },
    orderBy: { createdAt: 'asc' },
  });
  const known = new Set(TEACHER_TOOLS_CATALOG.map((t) => t.id));
  return rows.map((r) => r.toolId).filter((id) => known.has(id));
}

const router = Router();

/** GET /teacher/tools — catalog + this teacher's favorite IDs */
router.get('/tools', async (req: AuthRequest, res: Response) => {
  const teacherId = req.teacherId;
  if (!teacherId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const favoriteIds = await favoriteIdsForTeacher(teacherId);
    const payload: TeacherToolsCatalogResponse = {
      tools: TEACHER_TOOLS_CATALOG,
      focusAreas: FOCUS_AREAS,
      favoriteIds,
    };
    res.json(payload);
  } catch (err) {
    console.error('[teacher/tools] catalog failed', err);
    res.status(500).json({ error: 'Failed to load teacher tools' });
  }
});

/** POST /teacher/tools/favorite — toggle pin for this teacher */
router.post('/tools/favorite', async (req: AuthRequest, res: Response) => {
  const teacherId = req.teacherId;
  if (!teacherId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const parsed = favoriteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'toolId is required' });
    return;
  }

  const { toolId } = parsed.data;
  if (!getTeacherToolById(toolId)) {
    res.status(400).json({ error: 'Unknown teacher tool' });
    return;
  }

  try {
    await ensureFavoritesTable();
    const existing = await prisma.teacherToolFavorite.findUnique({
      where: { teacherId_toolId: { teacherId, toolId } },
    });

    if (existing) {
      await prisma.teacherToolFavorite.delete({ where: { id: existing.id } });
    } else {
      await prisma.teacherToolFavorite.create({
        data: { teacherId, toolId },
      });
    }

    const favoriteIds = await favoriteIdsForTeacher(teacherId);
    const payload: ToggleTeacherToolFavoriteResponse = {
      toolId,
      favorited: favoriteIds.includes(toolId),
      favoriteIds,
    };
    res.json(payload);
  } catch (err) {
    console.error('[teacher/tools/favorite] toggle failed', err);
    res.status(500).json({ error: 'Failed to update favorite' });
  }
});

const quizBody = z
  .object({
    gradeLevel: z.string().min(1).max(80),
    numberOfQuestions: z.coerce.number().int().min(1).max(40),
    optionsPerQuestion: z.coerce.number().int().min(3).max(7),
    topicDescription: z.string().max(400_000).optional(),
    assessmentDescription: z.string().max(400_000).optional(),
    standardsAlignment: z.string().max(400_000).optional(),
    attachments: z.array(z.string().max(240)).max(20).optional(),
  })
  .refine((d) => Boolean((d.topicDescription ?? d.assessmentDescription ?? '').trim()), {
    message: 'topicDescription is required',
  });

/** POST /teacher/tools/quiz-generator */
router.post('/tools/quiz-generator', async (req: AuthRequest, res: Response) => {
  const teacherId = req.teacherId;
  if (!teacherId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const parsed = quizBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid quiz generator payload' });
    return;
  }

  const input = parsed.data;
  const topicDescription = (input.topicDescription ?? input.assessmentDescription ?? '').trim();

  try {
    const quiz = await generateMultipleChoiceQuiz({
      gradeLevel: input.gradeLevel,
      numberOfQuestions: input.numberOfQuestions,
      optionsPerQuestion: input.optionsPerQuestion,
      topicDescription,
      standardsAlignment: input.standardsAlignment,
      attachments: input.attachments,
    });
    res.json(quiz);
  } catch (err) {
    console.error('[teacher/tools/quiz-generator] failed', err);
    res.status(500).json({ error: 'Failed to generate quiz' });
  }
});

const worksheetBody = z.object({
  gradeLevel: z.string().min(1).max(80),
  topicOrText: z.string().min(1).max(400_000),
  attachments: z.array(z.string().max(240)).max(20).optional(),
});

/** POST /teacher/tools/worksheet-generator */
router.post('/tools/worksheet-generator', async (req: AuthRequest, res: Response) => {
  const teacherId = req.teacherId;
  if (!teacherId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const parsed = worksheetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid worksheet generator payload' });
    return;
  }

  try {
    const worksheet = await generateWorksheet(parsed.data);
    res.json(worksheet);
  } catch (err) {
    console.error('[teacher/tools/worksheet-generator] failed', err);
    res.status(500).json({ error: 'Failed to generate worksheet' });
  }
});

export default router;
