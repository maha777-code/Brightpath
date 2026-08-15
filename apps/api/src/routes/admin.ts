import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { hasFeatureAccess, type AppRole, type PlanType } from '@brightpath/shared';
import { prisma } from '../lib/prisma.js';
import { requireRoles, type AuthRequest } from '../middleware/auth.js';
import { randomPassword, toPlatformUser } from '../lib/platformSerializers.js';
import { sendWelcomeInvite } from '../lib/mailer.js';
import {
  initialCurriculumFromDob,
  parseDobInput,
} from '../lib/ageCurriculum.js';

const router = Router();

router.use(requireRoles('org_admin', 'center_admin'));

const rowSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  classGrade: z.string().optional(),
  role: z.enum(['student', 'teacher']),
});

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

    const schema = z.object({
      rows: z.array(rowSchema).min(1).max(500),
      sendInvites: z.boolean().optional().default(true),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const org = await prisma.organization.findUnique({ where: { id: req.organizationId } });
    if (!org) {
      res.status(404).json({ error: 'Organization not found' });
      return;
    }

    const memberCount = await prisma.platformUser.count({ where: { organizationId: org.id } });
    if (memberCount + parsed.data.rows.length > org.maxLicenses) {
      res.status(400).json({
        error: `Import would exceed license seats (${org.maxLicenses}). Current members: ${memberCount}.`,
      });
      return;
    }

    const created: {
      email: string;
      role: string;
      tempPassword: string;
      inviteSent: boolean;
    }[] = [];
    const skipped: { email: string; reason: string }[] = [];

    for (const row of parsed.data.rows) {
      const email = row.email.trim().toLowerCase();
      const existing = await prisma.platformUser.findUnique({ where: { email } });
      if (existing) {
        skipped.push({ email, reason: 'Email already registered' });
        continue;
      }

      const tempPassword = randomPassword(12);
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      const role = row.role as AppRole;

      if (role === 'teacher') {
        const planType: PlanType =
          org.planType === 'school_enterprise' || org.planType === 'tutor_center_pro'
            ? 'teacher_pro'
            : 'teacher_free';
        const teacher = await prisma.teacher.create({
          data: {
            email,
            passwordHash,
            name: row.name,
            schoolName: org.name,
            subjectFocus: 'Science',
            organizationId: org.id,
            planType,
          },
        });
        await prisma.platformUser.create({
          data: {
            email,
            passwordHash,
            name: row.name,
            role: 'teacher',
            planType,
            organizationId: org.id,
            teacherId: teacher.id,
            subscriptionStatus: org.subscriptionStatus,
          },
        });
      } else {
        const dob = parseDobInput('2012-06-15');
        const curriculum = initialCurriculumFromDob(dob);
        const parentProfile = await prisma.parent.create({
          data: {
            email,
            passwordHash,
            name: row.name,
            locale: 'en-IN',
            dateOfBirth: dob,
            calculatedAgeGroup: curriculum.calculatedAgeGroup,
            unlockedSubjects: curriculum.unlockedSubjects,
          },
        });
        await prisma.platformUser.create({
          data: {
            email,
            passwordHash,
            name: row.name,
            role: 'student',
            planType: 'student_pro',
            organizationId: org.id,
            parentProfileId: parentProfile.id,
            subscriptionStatus: org.subscriptionStatus,
          },
        });

        if (row.classGrade) {
          const existingBatch = await prisma.classBatch.findFirst({
            where: { organizationId: org.id, name: row.classGrade },
          });
          let batchId = existingBatch?.id;
          if (!batchId) {
            const teacher =
              (await prisma.teacher.findFirst({ where: { organizationId: org.id } })) ??
              (req.teacherId
                ? await prisma.teacher.findUnique({ where: { id: req.teacherId } })
                : null);
            if (teacher) {
              const inviteCode = `C${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
              const batch = await prisma.classBatch.create({
                data: {
                  name: row.classGrade,
                  organizationId: org.id,
                  teacherId: teacher.id,
                  inviteCode,
                },
              });
              batchId = batch.id;
            }
          }
          if (batchId) {
            const student = await prisma.platformUser.findUnique({ where: { email } });
            if (student) {
              await prisma.classEnrollment.create({
                data: { studentUserId: student.id, classBatchId: batchId },
              });
            }
          }
        }
      }

      let inviteSent = false;
      if (parsed.data.sendInvites) {
        const mail = await sendWelcomeInvite({
          to: email,
          name: row.name,
          role: row.role,
          tempPassword,
          orgName: org.name,
        });
        inviteSent = mail.sent;
      }

      created.push({ email, role: row.role, tempPassword, inviteSent });
    }

    res.status(201).json({
      createdCount: created.length,
      skippedCount: skipped.length,
      created,
      skipped,
      organization: { id: org.id, name: org.name },
    });
  } catch (err) {
    console.error('Bulk import failed:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Import failed' });
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
