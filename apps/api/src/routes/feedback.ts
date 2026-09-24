import { randomUUID } from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

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
    res.status(201).json({ ok: true });
  } catch (error) {
    console.error('Feedback submission failed', error);
    res.status(500).json({ error: 'Could not save feedback. Please try again.' });
  }
});

export default router;
