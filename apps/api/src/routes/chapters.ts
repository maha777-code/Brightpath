import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { SAMPLE_VIDEOS } from '../data/chapterSeeds.js';

const router = Router();
router.use(requireAuth);

/** Word-level karaoke transcript for the eukaryotic cell explainer */
const CELL_TRANSCRIPT = [
  { t: 0.0, text: 'Welcome' },
  { t: 0.4, text: 'to' },
  { t: 0.55, text: 'Chapter' },
  { t: 0.9, text: 'One.' },
  { t: 1.4, text: 'Today' },
  { t: 1.7, text: 'we' },
  { t: 1.85, text: 'explore' },
  { t: 2.3, text: 'the' },
  { t: 2.45, text: 'eukaryotic' },
  { t: 3.1, text: 'cell' },
  { t: 3.5, text: '—' },
  { t: 3.8, text: 'the' },
  { t: 3.95, text: 'building' },
  { t: 4.4, text: 'block' },
  { t: 4.75, text: 'of' },
  { t: 4.9, text: 'complex' },
  { t: 5.4, text: 'life.' },
  { t: 6.0, text: 'Notice' },
  { t: 6.35, text: 'the' },
  { t: 6.5, text: 'Golgi' },
  { t: 6.9, text: 'apparatus' },
  { t: 7.5, text: 'packaging' },
  { t: 8.0, text: 'proteins,' },
  { t: 8.6, text: 'and' },
  { t: 8.8, text: 'vesicles' },
  { t: 9.3, text: 'moving' },
  { t: 9.7, text: 'materials' },
  { t: 10.2, text: 'across' },
  { t: 10.6, text: 'the' },
  { t: 10.75, text: 'cytoplasm.' },
  { t: 11.5, text: 'The' },
  { t: 11.65, text: 'nucleus' },
  { t: 12.1, text: 'holds' },
  { t: 12.4, text: 'DNA,' },
  { t: 12.9, text: 'while' },
  { t: 13.15, text: 'mitochondria' },
  { t: 13.9, text: 'power' },
  { t: 14.25, text: 'the' },
  { t: 14.4, text: 'cell' },
  { t: 14.7, text: 'with' },
  { t: 14.95, text: 'energy.' },
  { t: 15.6, text: 'Stay' },
  { t: 15.85, text: 'curious' },
  { t: 16.3, text: '—' },
  { t: 16.5, text: 'hold' },
  { t: 16.75, text: 'the' },
  { t: 16.9, text: 'mic' },
  { t: 17.2, text: 'anytime' },
  { t: 17.65, text: 'to' },
  { t: 17.8, text: 'ask' },
  { t: 18.05, text: 'a' },
  { t: 18.15, text: 'doubt.' },
];

const ORGANELLE_CALLOUTS = [
  { id: 'golgi', label: 'Golgi apparatus', xPct: 62, yPct: 38, appearAt: 6.2, hideAt: 10.5 },
  { id: 'vesicles', label: 'Vesicles', xPct: 48, yPct: 55, appearAt: 8.4, hideAt: 12.0 },
  { id: 'nucleus', label: 'Nucleus', xPct: 42, yPct: 42, appearAt: 11.2, hideAt: 14.5 },
  { id: 'mito', label: 'Mitochondria', xPct: 28, yPct: 58, appearAt: 13.0, hideAt: 16.5 },
];

/**
 * GET /chapters/:id/video-stream
 * Auto-generated chapter stage payload: video URL, transcript, callouts, tutor meta.
 */
router.get('/:id/video-stream', async (req: AuthRequest, res) => {
  try {
    const chapterId = String(req.params.id);

    // Prefer curriculum Chapter when present; fall back to teacher chapter / demo payload
    let title = 'Chapter 1: The Eukaryotic Cell';
    let subjectName = 'Biology';
    let sequenceOrder = 1;

    const curriculumChapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { subject: true, videos: { orderBy: { sequenceOrder: 'asc' }, take: 1 } },
    }).catch(() => null);

    if (curriculumChapter) {
      title = `Chapter ${curriculumChapter.sequenceOrder}: ${curriculumChapter.title}`;
      subjectName = curriculumChapter.subject.name;
      sequenceOrder = curriculumChapter.sequenceOrder;
    } else {
      const teacherChapter = await prisma.teacherChapter.findUnique({
        where: { id: chapterId },
      }).catch(() => null);
      if (teacherChapter) {
        title = `Chapter ${teacherChapter.sequenceOrder}: ${teacherChapter.title}`;
        sequenceOrder = teacherChapter.sequenceOrder;
      }
    }

    const sample = SAMPLE_VIDEOS[2] ?? SAMPLE_VIDEOS[0];
    const videoUrl =
      curriculumChapter?.videos[0]?.videoUrl ??
      sample.url;

    const durationSec = 23 * 60; // display budget 23:00 as in design
    const lessonDurationSec = Math.max(
      curriculumChapter?.videos[0]?.durationInSeconds ?? sample.durationInSeconds,
      20,
    );

    res.json({
      chapterId,
      title,
      subjectName,
      sequenceOrder,
      tutor: {
        name: 'Sarah',
        avatarUrl:
          'https://api.dicebear.com/7.x/avataaars/svg?seed=SarahTutor&backgroundColor=b6e3f4',
      },
      stream: {
        videoUrl,
        mimeType: 'video/mp4',
        durationSec: lessonDurationSec,
        displayDurationSec: durationSec,
        qualityOptions: ['480p', '720p', '1080p'],
        defaultQuality: '720p',
      },
      progress: {
        chapterPct: 25,
        timeSpentSec: 8 * 60 + 12,
        timeBudgetSec: durationSec,
      },
      transcript: CELL_TRANSCRIPT,
      callouts: ORGANELLE_CALLOUTS,
      captions: CELL_TRANSCRIPT.map((w, i, arr) => ({
        start: w.t,
        end: arr[i + 1]?.t ?? w.t + 0.6,
        text: w.text,
      })),
    });
  } catch (err) {
    console.error('[chapters/video-stream]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Stream unavailable' });
  }
});

export default router;
