import type { NextFunction, Response } from 'express';
import { isPlatformOwner, isSubscriptionActive } from '@brightpath/shared';
import { verifyToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';
import type { AuthRequest } from './auth.js';

async function organizationIdFor(sub: string, platform: boolean, role: string): Promise<string | null> {
  if (platform) {
    const user = await prisma.platformUser.findUnique({ where: { id: sub }, select: { organizationId: true } });
    return user?.organizationId ?? null;
  }
  if (role === 'teacher') {
    const teacher = await prisma.teacher.findUnique({ where: { id: sub }, select: { organizationId: true } });
    return teacher?.organizationId ?? null;
  }
  return null;
}

/**
 * Blocks every member of a school or tutor center (admins, teachers, students) until the organization's
 * subscription is paid. Requests without a valid token pass through so each route's own auth answers them.
 */
export async function requirePaidOrganization(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next();
    return;
  }
  let payload;
  try {
    payload = verifyToken(header.slice(7));
  } catch {
    next();
    return;
  }
  if (isPlatformOwner(payload.role, payload.email)) {
    next();
    return;
  }

  try {
    const organizationId = await organizationIdFor(payload.sub, payload.platform ?? false, payload.role);
    if (!organizationId) {
      next();
      return;
    }
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { type: true, subscriptionStatus: true },
    });
    if (!org || isSubscriptionActive(org.subscriptionStatus)) {
      next();
      return;
    }
    const isAdmin = payload.role === 'org_admin' || payload.role === 'center_admin';
    const kind = org.type === 'tutor_center' ? 'academy' : 'school';
    res.status(402).json({
      error: isAdmin
        ? `Your ${kind} plan is not active yet. Purchase a subscription on the Pricing page to unlock MindVault tools.`
        : `Your ${kind}'s MindVault subscription is not active. Ask your ${kind} administrator to complete the payment.`,
      code: 'ORG_SUBSCRIPTION_REQUIRED',
      subscriptionStatus: org.subscriptionStatus,
    });
  } catch (err) {
    console.error('Organization subscription check failed:', err);
    res.status(500).json({ error: 'Could not check your plan. Please try again.' });
  }
}
