import { Router } from 'express';
import { z } from 'zod';
import { hasFeatureAccess, isOwnerAccess } from '@brightpath/shared';
import { prisma } from '../lib/prisma.js';
import { requireRoles, type AuthRequest } from '../middleware/auth.js';
import { toPlatformUser, uniqueInviteCode } from '../lib/platformSerializers.js';
import { isMailConfigured } from '../lib/mailer.js';
import { emailInvite, pendingInviteEmails, upsertInvite } from '../lib/accountInvites.js';

const router = Router();

router.use(requireRoles('org_admin', 'center_admin'));

const rowSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  classGrade: z.string().optional(),
  role: z.enum(['student', 'teacher']),
});

/** Invites people by email; each account is created only when its owner accepts the emailed link. */
router.post('/users/bulk-import', async (req: AuthRequest, res) => {
  try {
    if (!hasFeatureAccess(req.planType, 'bulk_csv')) {
      res.status(402).json({ error: 'Bulk CSV import requires a School or Tutor Center plan.' });
      return;
    }
    if (!req.organizationId) {
      res.status(400).json({ error: 'Organization required' });
      return;
    }

    const parsed = z.object({ rows: z.array(rowSchema).min(1).max(500) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    if (!isMailConfigured()) {
      res.status(503).json({ error: 'Email is not set up on the server, so invites cannot be sent.' });
      return;
    }

    const org = await prisma.organization.findUnique({ where: { id: req.organizationId } });
    if (!org) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }

    const memberCount = await prisma.platformUser.count({ where: { organizationId: org.id } });
    const pending = await pendingInviteEmails(org.id);
    const extra = new Set(
      parsed.data.rows.map((r) => r.email.trim().toLowerCase()).filter((email) => !pending.has(email)),
    ).size;
    if (memberCount + pending.size + extra > org.maxLicenses) {
      res.status(400).json({
        error: `Import would exceed license seats (${org.maxLicenses}). Current members: ${memberCount}, pending invites: ${pending.size}.`,
      });
      return;
    }

    const invited: { email: string; role: string; inviteSent: boolean }[] = [];
    const skipped: { email: string; reason: string }[] = [];
    const seen = new Set<string>();
    const inviterId = req.platformUserId ?? req.user?.id ?? '';

    for (const row of parsed.data.rows) {
      const email = row.email.trim().toLowerCase();
      if (seen.has(email)) continue;
      seen.add(email);
      const existing = await prisma.platformUser.findFirst({
        where: { email: { equals: email, mode: 'insensitive' } },
      });
      if (existing) {
        skipped.push({ email, reason: 'Email already registered' });
        continue;
      }

      let classBatchId: string | null = null;
      if (row.role === 'student' && row.classGrade) {
        const existingBatch = await prisma.classBatch.findFirst({
          where: { organizationId: org.id, name: row.classGrade },
        });
        classBatchId = existingBatch?.id ?? null;
        if (!classBatchId) {
          const teacher =
            (await prisma.teacher.findFirst({ where: { organizationId: org.id } })) ??
            (req.teacherId ? await prisma.teacher.findUnique({ where: { id: req.teacherId } }) : null);
          if (teacher) {
            const inviteCode = await uniqueInviteCode(async (c) =>
              Boolean(await prisma.classBatch.findUnique({ where: { inviteCode: c } })),
            );
            const batch = await prisma.classBatch.create({
              data: { name: row.classGrade, organizationId: org.id, teacherId: teacher.id, inviteCode },
            });
            classBatchId = batch.id;
          }
        }
      }

      const { invite, token } = await upsertInvite({
        email,
        name: row.name,
        role: row.role,
        organizationId: org.id,
        classBatchId,
        invitedByUserId: inviterId,
      });
      invited.push({ email, role: row.role, inviteSent: await emailInvite(invite, token) });
    }

    res.status(201).json({
      invitedCount: invited.length,
      skippedCount: skipped.length,
      invited,
      skipped,
      organization: { id: org.id, name: org.name },
    });
  } catch (err) {
    console.error('Bulk import failed:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Import failed' });
  }
});

router.get('/owner/overview', async (req: AuthRequest, res) => {
  if (!isOwnerAccess(req.auth?.role)) {
    res.status(403).json({ error: 'Owner access required' });
    return;
  }
  try {
    const grouped = await prisma.platformUser.groupBy({
      by: ['planType'],
      where: { subscriptionStatus: { in: ['active', 'trialing'] } },
      _count: { _all: true },
    });
    const feedback = await prisma.$queryRaw<
      { id: string; rating: string; createdAt: Date; email: string; planType: string }[]
    >`
      SELECT f.id, f.rating, f."createdAt", t.email, t."planType"
      FROM "TeacherToolFeedback" f
      JOIN "Teacher" t ON t.id = f."teacherId"
      ORDER BY f."createdAt" DESC
      LIMIT 20
    `;
    res.json({
      subscribers: grouped.map((row) => ({ planType: row.planType, count: row._count._all })),
      feedback: feedback.map((row) => ({
        id: row.id,
        email: row.email,
        planType: row.planType,
        rating: row.rating,
        text: null as string | null,
        createdAt: new Date(row.createdAt).toISOString(),
      })),
    });
  } catch (err) {
    console.error('Owner overview failed:', err);
    res.status(500).json({ error: 'Could not load owner overview' });
  }
});

router.get('/members', async (req: AuthRequest, res) => {
  if (!req.organizationId) {
    res.json({ members: [] });
    return;
  }
  const members = await prisma.platformUser.findMany({
    where: { organizationId: req.organizationId },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json({ members: members.map(toPlatformUser) });
});

export default router;
