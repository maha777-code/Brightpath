import { Router, type NextFunction, type Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { hasFeatureAccess, maxPdfBytes, maxPdfCount } from '@brightpath/shared';
import { prisma } from '../lib/prisma.js';
import { requireTeacher, type AuthRequest } from '../middleware/auth.js';
import {
  toChapter,
  toDoubt,
  toSubtopic,
  toTextbook,
} from '../lib/teacherSerializers.js';
import activityRoutes from './activity.js';
import mediaRoutes from './media.js';
import { DEFAULT_SAMPLE_DOUBTS } from '../lib/teacherCurriculumSeed.js';
import {
  ensureCompleteChapterOneSubtopics,
  parseTextbookIntoChapters,
} from '../services/textbook.js';
import { latestActivitiesBySubtopic } from '../services/gamifiedActivity.js';
import { attachmentsBySubtopic } from '../services/attachMedia.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads/textbooks');
const HARD_MAX_PDF_BYTES = 80 * 1024 * 1024;
const MAX_PDF_ERROR = 'File size exceeds the 80 MB limit. Please select a smaller PDF.';

const router = Router();
router.use(requireTeacher);
router.use(activityRoutes);
router.use(mediaRoutes);

function ensureUploadDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const textbookUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      ensureUploadDir();
      cb(null, UPLOAD_DIR);
    },
    filename: (_req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      cb(null, `${Date.now()}-${safe}`);
    },
  }),
  limits: { fileSize: HARD_MAX_PDF_BYTES },
  fileFilter: (_req, file, cb) => {
    const isPdf =
      file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      cb(new Error('Only PDF textbooks are supported'));
      return;
    }
    cb(null, true);
  },
});

function handleTextbookUpload(req: AuthRequest, res: Response, next: NextFunction) {
  textbookUpload.single('file')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({ error: MAX_PDF_ERROR });
        return;
      }
      res.status(400).json({ error: err.message });
      return;
    }
    if (err instanceof Error) {
      res.status(400).json({ error: err.message });
      return;
    }
    next();
  });
}

/** GET /teacher/chapters — course structure + textbook */
router.get('/chapters', async (req: AuthRequest, res) => {
  const teacherId = req.teacherId!;
  const latest = await prisma.textbook.findFirst({
    where: { teacherId },
    orderBy: { updatedAt: 'desc' },
    select: { id: true },
  });

  if (!latest) {
    res.json({ textbook: null, chapters: [] });
    return;
  }

  await ensureCompleteChapterOneSubtopics(latest.id);

  const textbook = await prisma.textbook.findFirst({
    where: { id: latest.id },
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

  const subtopicIds = textbook.chapters.flatMap((ch) => ch.subtopics.map((s) => s.id));
  const [activityMap, attachmentMap] = await Promise.all([
    latestActivitiesBySubtopic(subtopicIds),
    attachmentsBySubtopic(subtopicIds),
  ]);

  res.json({
    textbook: toTextbook(textbook),
    chapters: textbook.chapters.map((ch) => toChapter(ch, activityMap, attachmentMap)),
  });
});

/** POST /teacher/textbooks/upload — multipart PDF (field: file) for RAG pipeline */
router.post('/textbooks/upload', handleTextbookUpload, async (req: AuthRequest, res) => {
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: 'PDF file is required (multipart field name: file)' });
    return;
  }

  const planType = req.planType ?? 'teacher_free';
  const planMaxBytes = maxPdfBytes(planType);
  const planMaxCount = maxPdfCount(planType);

  if (file.size > planMaxBytes) {
    fs.unlink(file.path, () => undefined);
    res.status(413).json({
      error: `File size exceeds the ${Math.round(planMaxBytes / (1024 * 1024))} MB limit for your plan. Upgrade to upload larger textbooks.`,
      planType,
    });
    return;
  }

  if (planMaxCount !== null) {
    const existingCount = await prisma.textbook.count({ where: { teacherId: req.teacherId! } });
    if (existingCount >= planMaxCount) {
      fs.unlink(file.path, () => undefined);
      res.status(402).json({
        error: `Free plan allows ${planMaxCount} PDF upload. Upgrade to Teacher Pro for unlimited textbooks.`,
        planType,
      });
      return;
    }
  }

  const schema = z.object({
    title: z.string().min(2),
    subject: z.string().optional(),
    gradeLabel: z.string().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    fs.unlink(file.path, () => undefined);
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { title, subject, gradeLabel } = parsed.data;
  const fileName = file.originalname;

  const teacherRow = await prisma.teacher.findUnique({ where: { id: req.teacherId! } });
  const organizationId = req.organizationId ?? teacherRow?.organizationId ?? null;

  const textbook = await prisma.textbook.create({
    data: {
      teacherId: req.teacherId!,
      organizationId,
      isGlobal: false,
      title,
      fileName,
      fileSizeBytes: file.size,
      subject: subject ?? 'Science',
      gradeLabel: gradeLabel ?? 'Class 9',
      status: 'UPLOADED',
      pageCount: null,
      indexedChunkCount: 0,
      storagePath: file.path,
    },
  });

  res.status(201).json({
    textbook: toTextbook(textbook),
    message: 'Textbook uploaded. Click Verify Document to parse chapters and build the RAG index.',
    planType,
    ragIndexing: hasFeatureAccess(planType, 'rag_indexing'),
    organizationId,
  });
});

/** POST /teacher/textbooks/:id/verify — parse + vector index pipeline (simulated) */
router.post('/textbooks/:id/verify', async (req: AuthRequest, res) => {
  const teacherId = req.teacherId!;
  if (!hasFeatureAccess(req.planType ?? 'teacher_free', 'rag_indexing')) {
    res.status(402).json({
      error: 'RAG indexing requires Teacher Pro or an organization plan. Upgrade to verify documents.',
      planType: req.planType,
    });
    return;
  }
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
  await prisma.ragChunk.deleteMany({ where: { textbookId: textbook.id } });
  await prisma.teacherChapter.deleteMany({ where: { textbookId: textbook.id } });

  const teacherRow = await prisma.teacher.findUnique({ where: { id: teacherId } });
  const organizationId = textbook.organizationId ?? teacherRow?.organizationId ?? req.organizationId ?? null;

  // PDF parse → chapter/subtopic extraction + embedding index (falls back to NCERT seed)
  const parsedChapters = parseTextbookIntoChapters(textbook.storagePath);
  let chaptersCreated = 0;
  const ragChunkCreates: { content: string; pageHint: string; sequence: number }[] = [];
  for (let i = 0; i < parsedChapters.length; i++) {
    const ch = parsedChapters[i];
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
            videoStatus: s.hasVideoExplainer && s.videoUrl ? 'published' : 'none',
            videoProgress: s.hasVideoExplainer && s.videoUrl ? 100 : 0,
            generatedVideoUrl: s.videoUrl,
          })),
        },
      },
      include: { subtopics: true },
    });
    chaptersCreated += 1;

    ragChunkCreates.push({
      content: `${ch.title}. ${ch.summary}. Subtopics: ${ch.subtopics.map((s) => s.title).join(', ')}.`,
      pageHint: `Chapter ${i + 1}`,
      sequence: i + 1,
    });
    for (const s of created.subtopics) {
      ragChunkCreates.push({
        content: `${ch.title} — ${s.code} ${s.title}. ${ch.summary}`,
        pageHint: `Chapter ${i + 1} / ${s.code}`,
        sequence: ragChunkCreates.length + 1,
      });
    }

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

  await prisma.ragChunk.createMany({
    data: ragChunkCreates.map((c) => ({
      textbookId: textbook.id,
      content: c.content,
      pageHint: c.pageHint,
      sequence: c.sequence,
    })),
  });

  const indexed = await prisma.textbook.update({
    where: { id: textbook.id },
    data: {
      status: 'INDEXED',
      organizationId,
      indexedChunkCount: ragChunkCreates.length,
      pageCount: parsedChapters.length * 12,
    },
  });

  res.json({
    textbook: toTextbook(indexed),
    chaptersCreated,
    message: `Verified & indexed ${chaptersCreated} chapters (${ragChunkCreates.length} RAG chunks) into the shared school library.`,
  });
});

/** GET /teacher/chapters/:id — single chapter with subtopics */
router.get('/chapters/:id', async (req: AuthRequest, res) => {
  const existing = await prisma.teacherChapter.findFirst({
    where: { id: req.params.id, textbook: { teacherId: req.teacherId! } },
    select: { textbookId: true },
  });
  if (!existing) {
    res.status(404).json({ error: 'Chapter not found' });
    return;
  }

  await ensureCompleteChapterOneSubtopics(existing.textbookId);

  const chapter = await prisma.teacherChapter.findFirst({
    where: { id: req.params.id, textbook: { teacherId: req.teacherId! } },
    include: { subtopics: { orderBy: { sequenceOrder: 'asc' } } },
  });
  if (!chapter) {
    res.status(404).json({ error: 'Chapter not found' });
    return;
  }
  const activityMap = await latestActivitiesBySubtopic(chapter.subtopics.map((s) => s.id));
  const attachmentMap = await attachmentsBySubtopic(chapter.subtopics.map((s) => s.id));
  res.json({ chapter: toChapter(chapter, activityMap, attachmentMap) });
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

/** POST /teacher/topics/:topicId/generate-video — start hybrid Remotion pipeline */
router.post('/topics/:topicId/generate-video', async (req: AuthRequest, res) => {
  const schema = z.object({
    prompt: z.string().max(500).optional(),
    templateId: z.string().min(1).optional(),
  });
  const parsed = schema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const existing = await prisma.teacherSubtopic.findFirst({
    where: {
      id: req.params.topicId,
      chapter: { textbook: { teacherId: req.teacherId! } },
    },
  });
  if (!existing) {
    res.status(404).json({ error: 'Topic not found' });
    return;
  }

  const { enqueueHybridVideoJob } = await import('../lib/videoPipeline/runPipeline.js');

  const updated = await prisma.teacherSubtopic.update({
    where: { id: existing.id },
    data: {
      videoStatus: 'generating',
      videoProgress: 2,
      videoJobStage: 'queued',
      videoJobStartedAt: new Date(),
      generatedVideoUrl: null,
      videoAudioUrl: null,
      videoError: null,
      videoManifestJson: Prisma.JsonNull,
      videoScript: null,
      animationCuesJson: Prisma.JsonNull,
      hasVideoExplainer: false,
    },
  });

  // Clear any stuck in-memory lock by enqueueing fresh job
  const templateId = parsed.data.templateId ?? 'tom_and_jerry';
  enqueueHybridVideoJob(existing.id, parsed.data.prompt, templateId);

  res.status(202).json({
    subtopic: toSubtopic(updated),
    message: 'Hybrid video pipeline queued (RAG → LLM → TTS → Remotion)',
  });
});

/** GET /teacher/topics/:topicId/video-status — poll generation progress */
router.get('/topics/:topicId/video-status', async (req: AuthRequest, res) => {
  try {
    const existing = await prisma.teacherSubtopic.findFirst({
      where: {
        id: req.params.topicId,
        chapter: { textbook: { teacherId: req.teacherId! } },
      },
    });
    if (!existing) {
      res.status(404).json({ error: 'Topic not found' });
      return;
    }

    const { reconcileVideoJobStatus } = await import('../lib/videoPipeline/runPipeline.js');
    const { toAbsolutePublicMediaUrl, publicVideoUrl } = await import(
      '../lib/videoPipeline/mediaPaths.js'
    );
    const row = (await reconcileVideoJobStatus(existing.id)) ?? existing;
    const subtopic = toSubtopic(row);

    let status: 'generating' | 'pending_review' | 'failed' = 'generating';
    if (subtopic.videoStatus === 'pending_review' || subtopic.videoStatus === 'published') {
      status = 'pending_review';
    } else if (subtopic.videoStatus === 'failed' || subtopic.videoStatus === 'rejected') {
      status = 'failed';
    } else if (subtopic.videoStatus === 'generating') {
      status = 'generating';
    } else if (subtopic.videoError) {
      status = 'failed';
    }

    const absoluteVideoUrl =
      toAbsolutePublicMediaUrl(subtopic.generatedVideoUrl || subtopic.videoUrl, subtopic.id) ||
      (subtopic.videoStatus === 'pending_review' || subtopic.videoStatus === 'published'
        ? publicVideoUrl(subtopic.id)
        : null);

    // Ensure nested subtopic also carries absolute URL for the review modal
    if (absoluteVideoUrl) {
      subtopic.generatedVideoUrl = absoluteVideoUrl;
    }

    res.json({
      topicId: subtopic.id,
      status,
      progress: Math.max(0, Math.min(100, subtopic.videoProgress ?? 0)),
      error: subtopic.videoError,
      videoUrl: absoluteVideoUrl,
      stage: subtopic.videoJobStage,
      subtopic,
    });
  } catch (err) {
    console.error('[video-status]', err);
    res.status(500).json({
      topicId: req.params.topicId,
      status: 'failed',
      progress: 0,
      error: err instanceof Error ? err.message : 'Status check failed',
      videoUrl: null,
    });
  }
});

/** PATCH /teacher/topics/:topicId/video-script — edit script before re-render / approve */
router.patch('/topics/:topicId/video-script', async (req: AuthRequest, res) => {
  const schema = z.object({
    videoScript: z.string().min(1).max(20_000),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const existing = await prisma.teacherSubtopic.findFirst({
    where: {
      id: req.params.topicId,
      chapter: { textbook: { teacherId: req.teacherId! } },
    },
  });
  if (!existing) {
    res.status(404).json({ error: 'Topic not found' });
    return;
  }

  const updated = await prisma.teacherSubtopic.update({
    where: { id: existing.id },
    data: { videoScript: parsed.data.videoScript },
  });
  res.json({ subtopic: toSubtopic(updated) });
});

/** POST /teacher/topics/:topicId/reject-video — clear generated draft */
router.post('/topics/:topicId/reject-video', async (req: AuthRequest, res) => {
  const existing = await prisma.teacherSubtopic.findFirst({
    where: {
      id: req.params.topicId,
      chapter: { textbook: { teacherId: req.teacherId! } },
    },
  });
  if (!existing) {
    res.status(404).json({ error: 'Topic not found' });
    return;
  }

  const updated = await prisma.teacherSubtopic.update({
    where: { id: existing.id },
    data: {
      videoStatus: 'none',
      videoProgress: 0,
      generatedVideoUrl: null,
      videoAudioUrl: null,
      videoScript: null,
      animationCuesJson: Prisma.JsonNull,
      videoManifestJson: Prisma.JsonNull,
      videoJobStartedAt: null,
      videoJobStage: null,
      videoError: null,
      hasVideoExplainer: false,
      videoUrl: null,
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
