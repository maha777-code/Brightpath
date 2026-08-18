import { Router } from 'express';
import { requireTeacher, type AuthRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { toSubtopic } from '../lib/teacherSerializers.js';
import { syncPublishedVideoToStudents } from '../lib/topicVideoGeneration.legacy.js';

const router = Router();
router.use(requireTeacher);

/**
 * POST /topics/:topicId/approve-video
 * Publishes the generated video to enrolled students' curriculum.
 */
router.post('/:topicId/approve-video', async (req: AuthRequest, res) => {
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

    const draftUrl = existing.generatedVideoUrl || existing.videoUrl;
    if (!draftUrl) {
      res.status(400).json({ error: 'No generated video to approve. Generate a video first.' });
      return;
    }

    if (existing.videoStatus !== 'pending_review' && existing.videoStatus !== 'published') {
      // Allow approve from pending_review; also tolerate legacy drafts with generated URL
      if (existing.videoStatus === 'generating') {
        res.status(400).json({ error: 'Video is still generating' });
        return;
      }
    }

    const updated = await prisma.teacherSubtopic.update({
      where: { id: existing.id },
      data: {
        videoStatus: 'published',
        videoProgress: 100,
        videoUrl: draftUrl,
        generatedVideoUrl: draftUrl,
        hasVideoExplainer: true,
        videoTitle: existing.videoTitle || `${existing.code} Video Explainer`,
      },
    });

    const sync = await syncPublishedVideoToStudents(updated.id);

    res.json({
      subtopic: toSubtopic(updated),
      published: true,
      studentSync: sync,
      message: 'Video approved and published to students',
    });
  } catch (err) {
    console.error('[topics/approve-video]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Approve failed' });
  }
});

export default router;
