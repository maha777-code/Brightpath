import { Router, type Response } from 'express';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import {
  FREE_SONGS_PER_WEEK,
  PLUS_SONGS_PER_WEEK,
  SONG_VOICES,
  lyricsPreview,
  nextMondayIso,
  type TeacherSong,
  type TeacherSongsListResponse,
} from '@brightpath/shared';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from '../middleware/auth.js';
import { generateSongLyrics } from '../services/llm.js';
import { albumArtDataUrl, renderSongAudio } from '../lib/songAudio.js';

const lyricsBody = z.object({
  topic: z.string().min(1).max(400),
  gradeLevel: z.string().min(1).max(40),
  songStyle: z.string().min(1).max(80),
  customInstructions: z.string().max(2000).optional(),
});

const renderBody = lyricsBody.extend({
  title: z.string().min(1).max(160),
  lyrics: z.string().min(8).max(8000),
  voiceId: z.string().min(1).max(40),
});

const router = Router();
let songsTableReady = false;

async function ensureSongsTable(): Promise<void> {
  if (songsTableReady) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TeacherSong" (
      "id" TEXT NOT NULL,
      "teacherId" TEXT NOT NULL,
      "title" TEXT NOT NULL,
      "topic" TEXT NOT NULL,
      "lyrics" TEXT NOT NULL,
      "songStyle" TEXT NOT NULL,
      "gradeLevel" TEXT NOT NULL,
      "voiceId" TEXT NOT NULL,
      "voiceLabel" TEXT NOT NULL,
      "artUrl" TEXT NOT NULL,
      "audioUrl" TEXT,
      "audioPath" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TeacherSong_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "TeacherSong_teacherId_fkey"
        FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "TeacherSong_teacherId_createdAt_idx"
    ON "TeacherSong"("teacherId", "createdAt")
  `);
  songsTableReady = true;
}

function startOfWeekMonday(from = new Date()): Date {
  const date = new Date(from);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

async function weeklyLimitForTeacher(teacherId: string): Promise<number> {
  try {
    const teacher = await prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { planType: true },
    });
    const plan = String(teacher?.planType ?? '');
    if (/plus|pro|school|org/i.test(plan) && !/free/i.test(plan)) return PLUS_SONGS_PER_WEEK;
  } catch {
    /* default free */
  }
  return FREE_SONGS_PER_WEEK;
}

function toSong(row: {
  id: string;
  title: string;
  topic: string;
  lyrics: string;
  songStyle: string;
  gradeLevel: string;
  voiceId: string;
  voiceLabel: string;
  artUrl: string;
  audioUrl: string | null;
  createdAt: Date;
}): TeacherSong {
  return {
    id: row.id,
    title: row.title,
    topic: row.topic,
    lyrics: row.lyrics,
    lyricsPreview: lyricsPreview(row.lyrics),
    songStyle: row.songStyle,
    gradeLevel: row.gradeLevel,
    voiceId: row.voiceId,
    voiceLabel: row.voiceLabel,
    artUrl: row.artUrl,
    audioUrl: row.audioUrl ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

/** GET /teacher/songs */
router.get('/songs', async (req: AuthRequest, res: Response) => {
  const teacherId = req.teacherId;
  if (!teacherId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    await ensureSongsTable();
    const weeklyLimit = await weeklyLimitForTeacher(teacherId);
    const weekStart = startOfWeekMonday();
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        id: string;
        title: string;
        topic: string;
        lyrics: string;
        songStyle: string;
        gradeLevel: string;
        voiceId: string;
        voiceLabel: string;
        artUrl: string;
        audioUrl: string | null;
        createdAt: Date;
      }>
    >(
      `SELECT "id", "title", "topic", "lyrics", "songStyle", "gradeLevel", "voiceId", "voiceLabel", "artUrl", "audioUrl", "createdAt"
       FROM "TeacherSong"
       WHERE "teacherId" = $1
       ORDER BY "createdAt" DESC
       LIMIT 100`,
      teacherId,
    );
    const usedThisWeek = rows.filter((row) => row.createdAt >= weekStart).length;
    const payload: TeacherSongsListResponse = {
      items: rows.map(toSong),
      usedThisWeek,
      weeklyLimit,
      resetsAt: nextMondayIso(),
      plusLimit: PLUS_SONGS_PER_WEEK,
    };
    res.json(payload);
  } catch (err) {
    console.error('[teacher/songs] list failed', err);
    res.status(500).json({ error: 'Failed to load songs' });
  }
});

/** POST /teacher/songs/generate-lyrics */
router.post('/songs/generate-lyrics', async (req: AuthRequest, res: Response) => {
  const teacherId = req.teacherId;
  if (!teacherId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const parsed = lyricsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Topic, grade level, and song style are required' });
    return;
  }

  try {
    const draft = await generateSongLyrics(parsed.data);
    res.json(draft);
  } catch (err) {
    console.error('[teacher/songs/generate-lyrics] failed', err);
    res.status(500).json({ error: 'Failed to generate lyrics' });
  }
});

/** POST /teacher/songs/render-audio */
router.post('/songs/render-audio', async (req: AuthRequest, res: Response) => {
  const teacherId = req.teacherId;
  if (!teacherId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const parsed = renderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Song title, lyrics, and voice are required' });
    return;
  }

  try {
    await ensureSongsTable();
    const weeklyLimit = await weeklyLimitForTeacher(teacherId);
    const weekStart = startOfWeekMonday();
    const usedRows = await prisma.$queryRawUnsafe<Array<{ count: bigint | number }>>(
      `SELECT COUNT(*)::int AS count FROM "TeacherSong" WHERE "teacherId" = $1 AND "createdAt" >= $2`,
      teacherId,
      weekStart,
    );
    const used = Number(usedRows[0]?.count ?? 0);
    if (used >= weeklyLimit) {
      res.status(429).json({
        error: `Weekly limit reached. You get ${weeklyLimit} free song${weeklyLimit === 1 ? '' : 's'} per week.`,
      });
      return;
    }

    const id = randomUUID();
    const voice = SONG_VOICES.find((item) => item.id === parsed.data.voiceId) ?? SONG_VOICES[0];
    const audio = await renderSongAudio(id, parsed.data.lyrics, parsed.data.voiceId);
    const artUrl = albumArtDataUrl(parsed.data.topic || parsed.data.title);

    await prisma.$executeRawUnsafe(
      `INSERT INTO "TeacherSong"
        ("id", "teacherId", "title", "topic", "lyrics", "songStyle", "gradeLevel", "voiceId", "voiceLabel", "artUrl", "audioUrl", "audioPath")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      id,
      teacherId,
      parsed.data.title,
      parsed.data.topic,
      parsed.data.lyrics,
      parsed.data.songStyle,
      parsed.data.gradeLevel,
      voice.id,
      voice.label,
      artUrl,
      audio.audioUrl,
      audio.audioPath,
    );

    const song: TeacherSong = {
      id,
      title: parsed.data.title,
      topic: parsed.data.topic,
      lyrics: parsed.data.lyrics,
      lyricsPreview: lyricsPreview(parsed.data.lyrics),
      songStyle: parsed.data.songStyle,
      gradeLevel: parsed.data.gradeLevel,
      voiceId: voice.id,
      voiceLabel: voice.label,
      artUrl,
      audioUrl: audio.audioUrl,
      createdAt: new Date().toISOString(),
    };
    res.json(song);
  } catch (err) {
    console.error('[teacher/songs/render-audio] failed', err);
    res.status(500).json({ error: 'Failed to render song audio' });
  }
});

/** DELETE /teacher/songs/:id */
router.delete('/songs/:id', async (req: AuthRequest, res: Response) => {
  const teacherId = req.teacherId;
  const id = String(req.params.id ?? '');
  if (!teacherId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  if (!id) {
    res.status(400).json({ error: 'Song id is required' });
    return;
  }

  try {
    await ensureSongsTable();
    await prisma.$executeRawUnsafe(
      `DELETE FROM "TeacherSong" WHERE "id" = $1 AND "teacherId" = $2`,
      id,
      teacherId,
    );
    res.json({ ok: true, id });
  } catch (err) {
    console.error('[teacher/songs] delete failed', err);
    res.status(500).json({ error: 'Failed to delete song' });
  }
});

export default router;
