import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { Prisma, PlanType } from '@prisma/client';
import { passwordMeetsPolicy } from '@brightpath/shared';
import { prisma } from '../lib/prisma.js';
import { signPlatformToken } from '../lib/jwt.js';
import { hashInviteToken, inviteContext, type InviteProfile } from '../lib/accountInvites.js';
import { createStudentAccount, createTeacherAccount } from '../lib/studentAccounts.js';
import { toOrganization, toPlatformUser } from '../lib/platformSerializers.js';
import { toTeacherUser } from '../lib/teacherSerializers.js';
import { toParentUser } from '../lib/ageCurriculum.js';

const router = Router();

const param = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? '';

async function findInvite(token: string) {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  return prisma.accountInvite.findUnique({ where: { tokenHash: hashInviteToken(token) } });
}

async function emailHasAccount(email: string) {
  const match = { email: { equals: email, mode: 'insensitive' as const } };
  return Boolean(
    (await prisma.platformUser.findFirst({ where: match })) ??
      (await prisma.teacher.findFirst({ where: match })) ??
      (await prisma.parent.findFirst({ where: match })),
  );
}

/** Public: what the invite page shows before the person sets a password. */
router.get('/:token', async (req, res) => {
  const invite = await findInvite(param(req.params.token));
  if (!invite || invite.status === 'revoked') {
    res.status(404).json({ error: 'This invite link is not valid. Ask your teacher or school to send a new one.' });
    return;
  }
  if (invite.status === 'accepted') {
    res.status(410).json({ error: 'This invite has already been used. Sign in with your email and password.', reason: 'accepted' });
    return;
  }
  if (invite.expiresAt.getTime() < Date.now()) {
    res.status(410).json({ error: 'This invite has expired. Ask your teacher or school to resend it.', reason: 'expired' });
    return;
  }
  const ctx = await inviteContext(invite);
  res.json({
    invite: {
      email: invite.email,
      name: invite.name,
      role: invite.role,
      organizationName: ctx.orgName,
      className: ctx.className,
      inviterName: ctx.inviterName,
      accountExists: await emailHasAccount(invite.email),
    },
  });
});

const acceptBody = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  password: z.string().refine(passwordMeetsPolicy, {
    message: 'Password must include a letter, a capital letter, a number, a special character, and be at least 8 characters.',
  }),
});

/** Opening the emailed link proves the address, so the account is created here. */
router.post('/:token/accept', async (req, res) => {
  const parsed = acceptBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const invite = await findInvite(param(req.params.token));
    if (!invite || invite.status !== 'pending') {
      res.status(404).json({ error: 'This invite link is not valid any more. Ask your teacher or school to send a new one.' });
      return;
    }
    if (invite.expiresAt.getTime() < Date.now()) {
      res.status(410).json({ error: 'This invite has expired. Ask your teacher or school to resend it.' });
      return;
    }
    if (await emailHasAccount(invite.email)) {
      res.status(409).json({ error: 'An account with this email already exists. Sign in instead.' });
      return;
    }

    const org = invite.organizationId
      ? await prisma.organization.findUnique({ where: { id: invite.organizationId } })
      : null;
    const name = parsed.data.name ?? invite.name;
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    let user;
    let teacher = null;
    if (invite.role === 'teacher') {
      if (!org) {
        res.status(400).json({ error: 'This invite is missing its school. Ask for a new one.' });
        return;
      }
      const planType: PlanType =
        org.planType === 'school_enterprise' || org.planType === 'tutor_center_pro' ? 'teacher_pro' : 'teacher_free';
      ({ user, teacher } = await createTeacherAccount({
        name,
        email: invite.email,
        passwordHash,
        organizationId: org.id,
        organizationName: org.name,
        planType,
        subscriptionStatus: org.subscriptionStatus,
      }));
    } else {
      ({ user } = await createStudentAccount({
        name,
        email: invite.email,
        passwordHash,
        organizationId: org?.id ?? null,
        planType: org ? 'student_pro' : 'student_free',
        subscriptionStatus: org?.subscriptionStatus,
      }));
    }

    // Other pending invites for the same address (e.g. a second class) are fulfilled by this account too.
    const invites = await prisma.accountInvite.findMany({
      where: { email: invite.email, status: 'pending', role: invite.role, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'asc' },
    });
    if (invite.role === 'student') {
      const profile: InviteProfile = {};
      for (const row of invites) {
        if (row.classBatchId) {
          await prisma.classEnrollment.upsert({
            where: { studentUserId_classBatchId: { studentUserId: user.id, classBatchId: row.classBatchId } },
            create: { studentUserId: user.id, classBatchId: row.classBatchId },
            update: {},
          });
        }
        if (row.id !== invite.id) Object.assign(profile, (row.profile ?? {}) as InviteProfile);
      }
      Object.assign(profile, (invite.profile ?? {}) as InviteProfile);
      if (Object.keys(profile).length) {
        await prisma.studentProfile.create({ data: { studentUserId: user.id, ...profile } });
      }
    }
    await prisma.accountInvite.updateMany({
      where: { id: { in: invites.map((row) => row.id) } },
      data: { status: 'accepted', acceptedUserId: user.id, acceptedAt: new Date() },
    });
    await prisma.auditLog.create({
      data: {
        organizationId: invite.organizationId,
        actorUserId: user.id,
        actorRole: user.role,
        action: 'invite.accept',
        targetType: 'AccountInvite',
        targetId: invite.id,
        metadata: { invitedByUserId: invite.invitedByUserId, invites: invites.length } as Prisma.InputJsonValue,
      },
    });

    const parent = user.parentProfileId
      ? await prisma.parent.findUnique({ where: { id: user.parentProfileId } })
      : null;
    res.status(201).json({
      token: signPlatformToken({
        id: user.id,
        email: user.email,
        role: user.role,
        planType: user.planType,
        organizationId: user.organizationId,
        teacherId: user.teacherId,
        parentProfileId: user.parentProfileId,
      }),
      role: user.role,
      planType: user.planType,
      organizationId: user.organizationId,
      user: toPlatformUser(user),
      organization: org ? toOrganization(org) : null,
      teacher: teacher ? toTeacherUser(teacher) : undefined,
      parent: parent ? toParentUser(parent) : undefined,
      subscriptionStatus: user.subscriptionStatus,
    });
  } catch (err) {
    console.error('Invite accept failed:', err);
    res.status(500).json({ error: 'Could not create your account. Please try again.' });
  }
});

export default router;
