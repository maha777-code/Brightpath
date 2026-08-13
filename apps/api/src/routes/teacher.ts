import { Router } from 'express';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../lib/prisma.js';
import { requireTeacher, type AuthRequest } from '../middleware/auth.js';
import {
  toChapter,
  toDoubt,
  toSubtopic,
  toTextbook,
} from '../lib/teacherSerializers.js';
import {
  DEFAULT_SAMPLE_DOUBTS,
  DEFAULT_SCIENCE_CHAPTERS,
} from '../lib/teacherCurriculumSeed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads/textbooks');
const MAX_PDF_BYTES = 80 * 1024 * 1024;

const router = Router();
router.use(requireTeacher);

function ensureUploadDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/** GET /teacher/chapters — course structure + textbook */
router.get('/chapters', async (req: AuthRequest, res) => {
  const teacherId = req.teacherId!;
  const textbook = await prisma.textbook.findFirst({
    where: { teacherId },
    orderBy: { updatedAt: 'desc' },
    include: {
      chapters: {
        orderBy: { sequenceOrder: 'asc' },
        include: { subtopics: { orderBy: { sequenceOrder: 'asc' } } },
      },
    },
  });

  if (!textbook) {
    res.json({ textbook: null, chapters: [] });
    return;
  }

  res.json({
    textbook: toTextbook(textbook),
    chapters: textbook.chapters.map(toChapter),
  });
});

/** POST /teacher/textbooks/upload — accept PDF (base64) for RAG pipeline */
router.post('/textbooks/upload', async (req: AuthRequest, res) => {
  const schema = z.object({
    title: z.string().min(2),
    subject: z.string().optional(),
    gradeLabel: z.string().optional(),
    fileName: z.string().min(1),
    fileBase64: z.string().min(16),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { title, subject, gradeLabel, fileName, fileBase64 } = parsed.data;
  if (!fileName.toLowerCase().endsWith('.pdf')) {
    res.status(400).json({ error: 'Only PDF textbooks are supported' });
    return;
  }

  ensureUploadDir();
  const buffer = Buffer.from(fileBase64.replace(/^data:application\/pdf;base64,/, ''), 'base64');
  if (buffer.length > MAX_PDF_BYTES) {
    res.status(413).json({
      error: 'File size exceeds the 80 MB limit. Please select a smaller PDF.',
    });
    return;
  }
  const storageName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const storagePath = path.join(UPLOAD_DIR, storageName);
  fs.writeFileSync(storagePath, buffer);

  const textbook = await prisma.textbook.create({
    data: {
      teacherId: req.teacherId!,
      title,
      fileName,
      fileSizeBytes: buffer.length,
      subject: subject ?? 'Science',
      gradeLabel: gradeLabel ?? 'Class 9',
      status: 'UPLOADED',
      pageCount: null,
      indexedChunkCount: 0,
      storagePath,
    },
  });

  res.status(201).json({
    textbook: toTextbook(textbook),
    message: 'Textbook uploaded. Click Verify Document to parse chapters and build the RAG index.',
  });
});

/** POST /teacher/textbooks/:id/verify — parse + vector index pipeline (simulated) */
router.post('/textbooks/:id/verify', async (req: AuthRequest, res) => {
  const teacherId = req.teacherId!;
  const textbook = await prisma.textbook.findFirst({
    where: { id: req.params.id, teacherId },
  });
  if (!textbook) {
    res.status(404).json({ error: 'Textbook not found' });
    return;
  }

  await prisma.textbook.update({
    where: { id: textbook.id },
    data: { status: 'VERIFYING' },
  });

  // Clear prior structure for re-verify
  await prisma.studentDoubt.deleteMany({ where: { teacherId, chapter: { textbookId: textbook.id } } });
  await prisma.teacherChapter.deleteMany({ where: { textbookId: textbook.id } });

  // Simulated PDF parse → chapter/subtopic extraction + embedding index
  let chaptersCreated = 0;
  for (let i = 0; i < DEFAULT_SCIENCE_CHAPTERS.length; i++) {
    const ch = DEFAULT_SCIENCE_CHAPTERS[i];
    const created = await prisma.teacherChapter.create({
      data: {
        textbookId: textbook.id,
        title: ch.title,
        sequenceOrder: i + 1,
        summary: ch.summary,
        classProgressPct: ch.classProgressPct,
        studentCount: ch.studentCount,
        completedCount: ch.completedCount,
        subtopics: {
          create: ch.subtopics.map((s, si) => ({
            code: s.code,
            title: s.title,
            sequenceOrder: si + 1,
            hasVideoExplainer: s.hasVideoExplainer,
            hasGamifiedActivity: s.hasGamifiedActivity,
            videoTitle: s.videoTitle,
            activityTitle: s.activityTitle,
            videoUrl: s.videoUrl,
          })),
        },
      },
      include: { subtopics: true },
    });
    chaptersCreated += 1;

    // Seed sample doubts on first verify
    for (const sample of DEFAULT_SAMPLE_DOUBTS.filter((d) => d.chapterIndex === i)) {
      const sub = created.subtopics.find((s) => s.code === sample.subtopicCode);
      await prisma.studentDoubt.create({
        data: {
          teacherId,
          chapterId: created.id,
          subtopicId: sub?.id,
          studentName: sample.studentName,
          question: sample.question,
          status: sample.status,
          aiAnswerText: sample.aiAnswerText,
          aiGroundedSources: [...sample.aiGroundedSources],
          aiConfidence: sample.aiConfidence,
        },
      });
    }
  }

  const indexed = await prisma.textbook.update({
    where: { id: textbook.id },
    data: {
      status: 'INDEXED',
      pageCount: 186,
      indexedChunkCount: chaptersCreated * 42,
    },
  });

  res.json({
    textbook: toTextbook(indexed),
    chaptersCreated,
    message: `Verified & indexed ${chaptersCreated} chapters into the RAG knowledge base.`,
  });
});

/** GET /teacher/chapters/:id — single chapter with subtopics */
router.get('/chapters/:id', async (req: AuthRequest, res) => {
  const chapter = await prisma.teacherChapter.findFirst({
    where: { id: req.params.id, textbook: { teacherId: req.teacherId! } },
    include: { subtopics: { orderBy: { sequenceOrder: 'asc' } } },
  });
  if (!chapter) {
    res.status(404).json({ error: 'Chapter not found' });
    return;
  }
  res.json({ chapter: toChapter(chapter) });
});

/** PATCH /teacher/subtopics/:id — attach video / activity */
router.patch('/subtopics/:id', async (req: AuthRequest, res) => {
  const schema = z.object({
    videoTitle: z.string().optional(),
    videoUrl: z.string().url().optional().nullable(),
    activityTitle: z.string().optional().nullable(),
    hasVideoExplainer: z.boolean().optional(),
    hasGamifiedActivity: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const existing = await prisma.teacherSubtopic.findFirst({
    where: {
      id: req.params.id,
      chapter: { textbook: { teacherId: req.teacherId! } },
    },
  });
  if (!existing) {
    res.status(404).json({ error: 'Subtopic not found' });
    return;
  }

  const updated = await prisma.teacherSubtopic.update({
    where: { id: existing.id },
    data: {
      ...parsed.data,
      hasVideoExplainer:
        parsed.data.hasVideoExplainer ??
        Boolean(parsed.data.videoUrl ?? parsed.data.videoTitle ?? existing.hasVideoExplainer),
      hasGamifiedActivity:
        parsed.data.hasGamifiedActivity ??
        Boolean(parsed.data.activityTitle ?? existing.hasGamifiedActivity),
    },
  });

  res.json({ subtopic: toSubtopic(updated) });
});

/** GET /teacher/doubts — student doubts + AI drafts */
router.get('/doubts', async (req: AuthRequest, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const doubts = await prisma.studentDoubt.findMany({
    where: {
      teacherId: req.teacherId!,
      ...(status ? { status: status as 'PENDING' | 'AI_DRAFT' | 'APPROVED' | 'OVERRIDDEN' | 'REJECTED' } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ doubts: doubts.map(toDoubt) });
});

/** POST /teacher/doubts/:id/review — approve / override / reject AI answer */
router.post('/doubts/:id/review', async (req: AuthRequest, res) => {
  const schema = z.object({
    action: z.enum(['approve', 'override', 'reject']),
    teacherOverrideText: z.string().optional(),
    pointsAwarded: z.number().int().min(0).max(100).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const doubt = await prisma.studentDoubt.findFirst({
    where: { id: req.params.id, teacherId: req.teacherId! },
  });
  if (!doubt) {
    res.status(404).json({ error: 'Doubt not found' });
    return;
  }

  const { action, teacherOverrideText, pointsAwarded } = parsed.data;
  const updated = await prisma.studentDoubt.update({
    where: { id: doubt.id },
    data: {
      status:
        action === 'approve' ? 'APPROVED' : action === 'override' ? 'OVERRIDDEN' : 'REJECTED',
      teacherOverrideText:
        action === 'override' ? teacherOverrideText ?? doubt.teacherOverrideText : doubt.teacherOverrideText,
      pointsAwarded: pointsAwarded ?? (action === 'reject' ? 0 : doubt.pointsAwarded || 10),
    },
  });

  res.json({ doubt: toDoubt(updated) });
});

export default router;
