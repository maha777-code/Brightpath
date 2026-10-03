import { randomUUID } from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { MailerUnconfiguredError, sendProductFeedback } from '../lib/mailer.js';

const router = Router();

const CATEGORIES = [
  'General Feedback',
  'Feature Request',
  'Report a Bug',
  'AI Accuracy / Content Quality',
] as const;

const bodySchema = z.object({
  rating: z.number().int().min(1).max(5),
  category: z.enum(CATEGORIES),
  comments: z.string().trim().max(5000).optional().default(''),
  pageUrl: z.string().trim().min(1).max(500),
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Choose a rating from 1 to 5 and a feedback type.' });
    return;
  }

  const auth = req.auth;
  if (!auth) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const userId = req.platformUserId ?? auth.sub;
  const userName = await resolveUserName(req, auth.email);
  try {
    await prisma.$executeRaw`
      INSERT INTO "ProductFeedback" ("id", "userId", "userEmail", "userRole", "rating", "category", "comments", "pageUrl", "createdAt")
      VALUES (
        ${randomUUID()},
        ${userId},
        ${auth.email},
        ${auth.role},
        ${parsed.data.rating},
        ${parsed.data.category},
        ${parsed.data.comments},
        ${parsed.data.pageUrl},
        NOW()
      )
    `;
    await sendProductFeedback({
      userName,
      userEmail: auth.email,
      userRole: auth.role,
      rating: parsed.data.rating,
      category: parsed.data.category,
      comments: parsed.data.comments,
      pageUrl: parsed.data.pageUrl,
    });
    res.status(201).json({ ok: true });
  } catch (error) {
    console.error('Feedback submission failed', error);
    if (error instanceof MailerUnconfiguredError) {
      res.status(503).json({
        error: 'Email delivery is not configured yet. Please email customersupport@mindvault.academy directly.',
      });
      return;
    }
    res.status(500).json({ error: 'Could not send feedback. Please try again.' });
  }
});

async function resolveUserName(req: AuthRequest, fallbackEmail: string): Promise<string> {
  if (req.platformUserId) {
    const user = await prisma.platformUser.findUnique({
      where: { id: req.platformUserId },
      select: { name: true },
    });
    if (user?.name?.trim()) return user.name.trim();
  }
  if (req.teacherId) {
    const teacher = await prisma.teacher.findUnique({
      where: { id: req.teacherId },
      select: { name: true },
    });
    if (teacher?.name?.trim()) return teacher.name.trim();
  }
  if (req.parentId) {
    const parent = await prisma.parent.findUnique({
      where: { id: req.parentId },
      select: { name: true },
    });
    if (parent?.name?.trim()) return parent.name.trim();
  }
  return fallbackEmail;
}

export default router;
