import { createHash, randomBytes } from 'node:crypto';
import type { AccountInvite, Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import { sendAccountInviteEmail } from './mailer.js';

export const INVITE_TTL_MS = 14 * 24 * 60 * 60_000;
export const INVITE_RESEND_COOLDOWN_MS = 60_000;

export type InviteProfile = { gradeLevel?: string; board?: string; preferredLanguage?: string };

export const hashInviteToken = (token: string) => createHash('sha256').update(token).digest('hex');

function appUrl() {
  return (process.env.APP_URL ?? 'https://mindvault.academy').replace(/\/+$/, '');
}

export const inviteLink = (token: string) => `${appUrl()}/invite/${token}`;

/** Creates an invite, or refreshes the pending one for the same email and class with a new link. */
export async function upsertInvite(input: {
  email: string;
  name: string;
  role: 'student' | 'teacher';
  organizationId: string | null;
  classBatchId: string | null;
  invitedByUserId: string;
  profile?: InviteProfile;
}): Promise<{ invite: AccountInvite; token: string }> {
  const token = randomBytes(32).toString('base64url');
  const fields = {
    tokenHash: hashInviteToken(token),
    name: input.name,
    role: input.role,
    invitedByUserId: input.invitedByUserId,
    profile: (input.profile && Object.keys(input.profile).length ? input.profile : undefined) as Prisma.InputJsonValue | undefined,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
    lastSentAt: new Date(),
  };
  const existing = await prisma.accountInvite.findFirst({
    where: {
      email: input.email,
      status: 'pending',
      classBatchId: input.classBatchId,
      organizationId: input.organizationId,
    },
  });
  const invite = existing
    ? await prisma.accountInvite.update({ where: { id: existing.id }, data: fields })
    : await prisma.accountInvite.create({
        data: {
          ...fields,
          email: input.email,
          organizationId: input.organizationId,
          classBatchId: input.classBatchId,
        },
      });
  return { invite, token };
}

/** Gives a pending invite a fresh link and expiry, for resending. */
export async function refreshInviteToken(inviteId: string): Promise<{ invite: AccountInvite; token: string }> {
  const token = randomBytes(32).toString('base64url');
  const invite = await prisma.accountInvite.update({
    where: { id: inviteId },
    data: { tokenHash: hashInviteToken(token), expiresAt: new Date(Date.now() + INVITE_TTL_MS), lastSentAt: new Date() },
  });
  return { invite, token };
}

export async function inviteContext(invite: AccountInvite) {
  const [org, batch, inviter] = await Promise.all([
    invite.organizationId
      ? prisma.organization.findUnique({ where: { id: invite.organizationId }, select: { name: true } })
      : null,
    invite.classBatchId
      ? prisma.classBatch.findUnique({ where: { id: invite.classBatchId }, select: { name: true } })
      : null,
    prisma.platformUser.findUnique({ where: { id: invite.invitedByUserId }, select: { name: true } }),
  ]);
  return { orgName: org?.name ?? null, className: batch?.name ?? null, inviterName: inviter?.name ?? null };
}

/** Returns false when the email could not be sent; the invite stays pending so it can be resent. */
export async function emailInvite(invite: AccountInvite, token: string): Promise<boolean> {
  try {
    const ctx = await inviteContext(invite);
    await sendAccountInviteEmail({
      to: invite.email,
      name: invite.name,
      role: invite.role === 'teacher' ? 'teacher' : 'student',
      link: inviteLink(token),
      ...ctx,
    });
    return true;
  } catch (err) {
    console.error('[invite] email failed', invite.email, err instanceof Error ? err.message : err);
    return false;
  }
}

/** Pending invites hold a seat until they are accepted, revoked or expire. */
export async function pendingInviteEmails(organizationId: string): Promise<Set<string>> {
  const rows = await prisma.accountInvite.findMany({
    where: { organizationId, status: 'pending', expiresAt: { gt: new Date() } },
    select: { email: true },
  });
  return new Set(rows.map((r) => r.email));
}

export function serializeInvite(invite: AccountInvite) {
  return {
    id: invite.id,
    name: invite.name,
    email: invite.email,
    role: invite.role,
    status: invite.expiresAt.getTime() < Date.now() && invite.status === 'pending' ? 'expired' : invite.status,
    invitedAt: invite.createdAt.toISOString(),
    lastSentAt: invite.lastSentAt.toISOString(),
    expiresAt: invite.expiresAt.toISOString(),
  };
}
