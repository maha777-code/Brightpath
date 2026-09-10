import { Router, type Response } from 'express';
import { z } from 'zod';
import {
  TEACHER_TOOL_FOCUS_LABELS,
  TEACHER_TOOLS_CATALOG,
  getTeacherToolById,
  type TeacherToolsCatalogResponse,
  type ToggleTeacherToolFavoriteResponse,
  type WorksheetGeneratorResponse,
  type WorksheetHistoryItem,
  type WorksheetHistoryResponse,
  type TeacherToolFeedbackResponse,
} from '@brightpath/shared';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';
import { generateMultipleChoiceQuiz, generateWorksheet, refineWorksheet, translateWorksheet } from '../services/llm.js';
import { randomUUID } from 'node:crypto';

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

const refineBody = z.object({
  worksheetId: z.string().max(80).optional(),
  gradeLevel: z.string().min(1).max(80),
  topicOrText: z.string().min(1).max(400_000),
  instruction: z.string().min(1).max(20_000),
  attachments: z.array(z.string().max(240)).max(20).optional(),
  currentWorksheet: z
    .object({
      id: z.string().optional(),
      title: z.string(),
      gradeLevel: z.string(),
      instructions: z.string().optional(),
      passage: z.string().optional(),
      sections: z.array(
        z.object({
          heading: z.string(),
          items: z.array(z.object({ id: z.number(), prompt: z.string() })),
        }),
      ),
    })
    .optional(),
});

const feedbackBody = z.object({
  worksheetId: z.string().min(1).max(80),
  rating: z.enum(['positive', 'negative']),
});

const translateBody = z.object({
  worksheetId: z.string().max(80).optional(),
  targetLanguage: z.string().min(1).max(80),
  currentWorksheet: refineBody.shape.currentWorksheet,
});

let worksheetTablesReady = false;

async function ensureWorksheetTables(): Promise<void> {
  if (worksheetTablesReady) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TeacherWorksheetHistory" (
      "id" TEXT NOT NULL,
      "teacherId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "gradeLevel" TEXT NOT NULL,
      "topicOrText" TEXT NOT NULL,
      "payloadJson" JSONB NOT NULL,
      "worksheetJson" JSONB NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TeacherWorksheetHistory_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "TeacherWorksheetHistory_teacherId_fkey"
        FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "TeacherWorksheetHistory_teacherId_createdAt_idx"
    ON "TeacherWorksheetHistory"("teacherId", "createdAt")
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TeacherToolFeedback" (
      "id" TEXT NOT NULL,
      "teacherId" TEXT NOT NULL,
      "worksheetId" TEXT NOT NULL,
      "rating" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TeacherToolFeedback_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "TeacherToolFeedback_teacherId_fkey"
        FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "TeacherToolFeedback_teacherId_idx"
    ON "TeacherToolFeedback"("teacherId")
  `);
  worksheetTablesReady = true;
}

async function saveWorksheetHistory(
  teacherId: string,
  payload: { gradeLevel: string; topicOrText: string; attachments?: string[] },
  worksheet: WorksheetGeneratorResponse,
): Promise<string> {
  const id = worksheet.id || randomUUID();
  await ensureWorksheetTables();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "TeacherWorksheetHistory"
      ("id", "teacherId", "title", "gradeLevel", "topicOrText", "payloadJson", "worksheetJson")
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb)`,
    id,
    teacherId,
    worksheet.title,
    worksheet.gradeLevel,
    payload.topicOrText,
    JSON.stringify(payload),
    JSON.stringify({ ...worksheet, id }),
  );
  return id;
}

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
    const id = await saveWorksheetHistory(teacherId, parsed.data, worksheet).catch((err) => {
      console.error('[teacher/tools/worksheet-generator] history save failed', err);
      return randomUUID();
    });
    res.json({ ...worksheet, id });
  } catch (err) {
    console.error('[teacher/tools/worksheet-generator] failed', err);
    res.status(500).json({ error: 'Failed to generate worksheet' });
  }
});

/** GET /teacher/tools/worksheet-generator/history */
router.get('/tools/worksheet-generator/history', async (req: AuthRequest, res: Response) => {
  const teacherId = req.teacherId;
  if (!teacherId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const topic = typeof req.query.topic === 'string' ? req.query.topic.trim() : '';

  try {
    await ensureWorksheetTables();
    const rows = topic
      ? await prisma.$queryRawUnsafe<
          Array<{
            id: string;
            title: string;
            gradeLevel: string;
            topicOrText: string;
            payloadJson: unknown;
            worksheetJson: unknown;
            createdAt: Date;
          }>
        >(
          `SELECT "id", "title", "gradeLevel", "topicOrText", "payloadJson", "worksheetJson", "createdAt"
           FROM "TeacherWorksheetHistory"
           WHERE "teacherId" = $1 AND "topicOrText" ILIKE $2
           ORDER BY "createdAt" DESC
           LIMIT 40`,
          teacherId,
          `%${topic}%`,
        )
      : await prisma.$queryRawUnsafe<
          Array<{
            id: string;
            title: string;
            gradeLevel: string;
            topicOrText: string;
            payloadJson: unknown;
            worksheetJson: unknown;
            createdAt: Date;
          }>
        >(
          `SELECT "id", "title", "gradeLevel", "topicOrText", "payloadJson", "worksheetJson", "createdAt"
           FROM "TeacherWorksheetHistory"
           WHERE "teacherId" = $1
           ORDER BY "createdAt" DESC
           LIMIT 40`,
          teacherId,
        );

    const items: WorksheetHistoryItem[] = rows.map((row) => {
      const payload =
        typeof row.payloadJson === 'object' && row.payloadJson
          ? (row.payloadJson as WorksheetHistoryItem['payload'])
          : { gradeLevel: row.gradeLevel, topicOrText: row.topicOrText };
      const worksheet =
        typeof row.worksheetJson === 'object' && row.worksheetJson
          ? (row.worksheetJson as WorksheetGeneratorResponse)
          : { title: row.title, gradeLevel: row.gradeLevel, sections: [] };
      return {
        id: row.id,
        createdAt: new Date(row.createdAt).toISOString(),
        title: row.title,
        gradeLevel: row.gradeLevel,
        topicOrText: row.topicOrText,
        payload,
        worksheet: { ...worksheet, id: row.id },
      };
    });
    const payload: WorksheetHistoryResponse = { items };
    res.json(payload);
  } catch (err) {
    console.error('[teacher/tools/worksheet-generator/history] failed', err);
    res.status(500).json({ error: 'Failed to load worksheet history' });
  }
});

/** POST /teacher/tools/worksheet-generator/refine */
router.post('/tools/worksheet-generator/refine', async (req: AuthRequest, res: Response) => {
  const teacherId = req.teacherId;
  if (!teacherId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const parsed = refineBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid worksheet refine payload' });
    return;
  }

  try {
    const worksheet = await refineWorksheet({
      gradeLevel: parsed.data.gradeLevel,
      topicOrText: parsed.data.topicOrText,
      instruction: parsed.data.instruction,
      attachments: parsed.data.attachments,
      current: parsed.data.currentWorksheet,
    });
    const id = await saveWorksheetHistory(
      teacherId,
      {
        gradeLevel: parsed.data.gradeLevel,
        topicOrText: `${parsed.data.topicOrText}\n\nTeacher follow-up: ${parsed.data.instruction}`,
        attachments: parsed.data.attachments,
      },
      { ...worksheet, id: parsed.data.worksheetId },
    ).catch((err) => {
      console.error('[teacher/tools/worksheet-generator/refine] history save failed', err);
      return parsed.data.worksheetId || randomUUID();
    });
    res.json({ ...worksheet, id });
  } catch (err) {
    console.error('[teacher/tools/worksheet-generator/refine] failed', err);
    res.status(500).json({ error: 'Failed to refine worksheet' });
  }
});

/** POST /teacher/tools/worksheet-generator/translate */
router.post('/tools/worksheet-generator/translate', async (req: AuthRequest, res: Response) => {
  const teacherId = req.teacherId;
  if (!teacherId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const parsed = translateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid worksheet translate payload' });
    return;
  }

  try {
    let current = parsed.data.currentWorksheet as WorksheetGeneratorResponse | undefined;
    if (!current && parsed.data.worksheetId) {
      await ensureWorksheetTables();
      const rows = await prisma.$queryRawUnsafe<Array<{ worksheetJson: unknown }>>(
        `SELECT "worksheetJson" FROM "TeacherWorksheetHistory"
         WHERE "id" = $1 AND "teacherId" = $2
         LIMIT 1`,
        parsed.data.worksheetId,
        teacherId,
      );
      if (rows[0]?.worksheetJson && typeof rows[0].worksheetJson === 'object') {
        current = rows[0].worksheetJson as WorksheetGeneratorResponse;
      }
    }
    if (!current) {
      res.status(400).json({ error: 'Worksheet content is required to translate' });
      return;
    }

    const worksheet = await translateWorksheet({
      targetLanguage: parsed.data.targetLanguage,
      current,
      gradeLevel: current.gradeLevel,
    });
    const id = await saveWorksheetHistory(
      teacherId,
      {
        gradeLevel: current.gradeLevel,
        topicOrText: `${current.title}\n\nTranslated to ${parsed.data.targetLanguage}`,
      },
      { ...worksheet, id: parsed.data.worksheetId },
    ).catch((err) => {
      console.error('[teacher/tools/worksheet-generator/translate] history save failed', err);
      return parsed.data.worksheetId || randomUUID();
    });
    res.json({ ...worksheet, id });
  } catch (err) {
    console.error('[teacher/tools/worksheet-generator/translate] failed', err);
    res.status(500).json({ error: 'Failed to translate worksheet' });
  }
});

/** POST /teacher/tools/feedback */
router.post('/tools/feedback', async (req: AuthRequest, res: Response) => {
  const teacherId = req.teacherId;
  if (!teacherId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const parsed = feedbackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid feedback payload' });
    return;
  }

  try {
    await ensureWorksheetTables();
    await prisma.$executeRawUnsafe(
      `INSERT INTO "TeacherToolFeedback" ("id", "teacherId", "worksheetId", "rating")
       VALUES ($1, $2, $3, $4)`,
      randomUUID(),
      teacherId,
      parsed.data.worksheetId,
      parsed.data.rating,
    );
    const payload: TeacherToolFeedbackResponse = {
      ok: true,
      worksheetId: parsed.data.worksheetId,
      rating: parsed.data.rating,
    };
    res.json(payload);
  } catch (err) {
    console.error('[teacher/tools/feedback] failed', err);
    res.json({
      ok: true,
      worksheetId: parsed.data.worksheetId,
      rating: parsed.data.rating,
    } satisfies TeacherToolFeedbackResponse);
  }
});

export default router;
