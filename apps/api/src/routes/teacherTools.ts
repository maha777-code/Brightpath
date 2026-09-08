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

export default router;
