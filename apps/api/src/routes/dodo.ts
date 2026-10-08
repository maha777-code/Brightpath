import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import type DodoPayments from 'dodopayments';
import type { Prisma } from '@prisma/client';
import {
  CHECKOUT_PLANS,
  CHECKOUT_PLAN_IDS,
  DEFAULT_PLAN_FOR_ROLE,
  dodoProductEnvKey,
  type AppRole,
  type CheckoutPlan,
} from '@brightpath/shared';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { dodoProductId, dodoProductProblem, dodoWebhookKey, getDodo, planForDodoProduct } from '../lib/dodo.js';

type WebhookEvent = ReturnType<DodoPayments['webhooks']['unwrap']>;
type SubscriptionEvent = Extract<WebhookEvent, { type: `subscription.${string}` }>;
type DodoSubscriptionData = SubscriptionEvent['data'];
type Tx = Prisma.TransactionClient;

/** Statuses where the customer is still being billed; a second checkout would double-charge them. */
const LIVE_STATUSES = ['active', 'past_due', 'on_hold', 'paused'];

const ROLE_LABEL: Record<AppRole, string> = {
  student: 'student',
  teacher: 'teacher',
  parent: 'parent',
  center_admin: 'tutor center admin',
  org_admin: 'school admin',
};

const router = Router();

const appUrl = () => (process.env.APP_URL ?? 'http://localhost:5173').replace(/\/+$/, '');

const checkoutSchema = z.object({
  planId: z.enum(CHECKOUT_PLAN_IDS),
  currency: z.enum(['INR', 'USD']),
  interval: z.enum(['monthly', 'annual']),
});

function ownerWhere(plan: CheckoutPlan, req: AuthRequest) {
  return plan.scope === 'organization'
    ? { organizationId: req.organizationId ?? '__none__' }
    : { platformUserId: req.platformUserId ?? '__none__' };
}

router.post('/checkout', requireAuth, async (req: AuthRequest, res) => {
  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Choose a plan, currency, and billing cycle.' });
    return;
  }
  const { planId, currency, interval } = parsed.data;
  const plan = CHECKOUT_PLANS[planId];

  if (!req.platformUserId) {
    res.status(403).json({ error: 'Sign in with your MindVault account to subscribe.' });
    return;
  }
  const role = req.auth?.role as AppRole | undefined;
  if (!role || !plan.roles.includes(role)) {
    const allowed = plan.roles.map((r) => ROLE_LABEL[r]).join(' or ');
    res.status(403).json({ error: `${plan.title} is for ${allowed} accounts.` });
    return;
  }
  if (plan.scope === 'organization' && !req.organizationId) {
    res.status(400).json({ error: `${plan.title} needs a school or center linked to your account.` });
    return;
  }

  const dodo = getDodo();
  if (!dodo) {
    console.error('Dodo checkout unavailable: DODO_PAYMENTS_API_KEY is not set');
    res.status(503).json({ error: 'Online payments are temporarily unavailable. Please try again later.' });
    return;
  }
  const productId = dodoProductId(planId, currency, interval);
  if (!productId) {
    console.error(`Dodo checkout unavailable: ${dodoProductEnvKey(planId, currency, interval)} is not set`);
    res.status(503).json({ error: `${plan.title} (${currency}, ${interval}) is not available for purchase yet.` });
    return;
  }

  try {
    const problem = await dodoProductProblem(dodo, productId, currency, interval);
    if (problem) {
      console.error(`Dodo checkout blocked for ${dodoProductEnvKey(planId, currency, interval)}: ${problem}`);
      res.status(503).json({ error: `${plan.title} (${currency}, ${interval}) is not available for purchase yet.` });
      return;
    }

    const live = await prisma.dodoSubscription.findFirst({
      where: { ...ownerWhere(plan, req), status: { in: LIVE_STATUSES } },
    });
    if (live) {
      res.status(409).json({
        error: 'You already have an active MindVault subscription. Use Manage billing to change or cancel it.',
      });
      return;
    }

    const user = await prisma.platformUser.findUniqueOrThrow({ where: { id: req.platformUserId } });
    const previous = await prisma.dodoSubscription.findFirst({
      where: { platformUserId: user.id },
      orderBy: { updatedAt: 'desc' },
    });

    const session = await dodo.checkoutSessions.create({
      product_cart: [{ product_id: productId, quantity: 1 }],
      billing_currency: currency,
      ...(currency === 'INR' ? { billing_address: { country: 'IN' as const } } : {}),
      customer: previous
        ? { customer_id: previous.customerId }
        : { email: user.email, name: user.name?.trim() || user.email },
      metadata: {
        platformUserId: user.id,
        ...(plan.scope === 'organization' && req.organizationId ? { organizationId: req.organizationId } : {}),
        planId,
        currency,
        interval,
      },
      return_url: `${appUrl()}/billing/success?plan=${planId}`,
      cancel_url: `${appUrl()}/pricing`,
      customization: { theme: 'dark' },
    });

    if (!session.checkout_url) {
      res.status(502).json({ error: 'Checkout could not be started. Please try again.' });
      return;
    }
    res.json({ checkoutUrl: session.checkout_url, sessionId: session.session_id });
  } catch (err) {
    console.error('Dodo checkout error:', err);
    res.status(500).json({ error: 'Checkout could not be started. Please try again.' });
  }
});

router.get('/subscription', requireAuth, async (req: AuthRequest, res) => {
  const planId = checkoutSchema.shape.planId.safeParse(req.query.planId);
  if (!planId.success) {
    res.status(400).json({ error: 'Unknown plan.' });
    return;
  }
  const row = await prisma.dodoSubscription.findFirst({
    where: { ...ownerWhere(CHECKOUT_PLANS[planId.data], req), planId: planId.data },
    orderBy: { updatedAt: 'desc' },
  });
  res.json({
    planId: planId.data,
    status: row?.status ?? 'pending',
    nextBillingDate: row?.nextBillingDate ?? null,
  });
});

router.post('/portal', requireAuth, async (req: AuthRequest, res) => {
  const dodo = getDodo();
  if (!dodo) {
    console.error('Dodo portal unavailable: DODO_PAYMENTS_API_KEY is not set');
    res.status(503).json({ error: 'Billing management is temporarily unavailable. Please try again later.' });
    return;
  }
  const owners = [
    ...(req.platformUserId ? [{ platformUserId: req.platformUserId }] : []),
    ...(req.organizationId ? [{ organizationId: req.organizationId }] : []),
  ];
  const latest = owners.length
    ? await prisma.dodoSubscription.findFirst({ where: { OR: owners }, orderBy: { updatedAt: 'desc' } })
    : null;
  if (!latest) {
    res.status(404).json({ error: 'No MindVault subscription found for this account.' });
    return;
  }
  try {
    const portal = await dodo.customers.customerPortal.create(latest.customerId, {
      return_url: `${appUrl()}/pricing`,
    });
    res.json({ url: portal.link });
  } catch (err) {
    console.error('Dodo portal error:', err);
    res.status(500).json({ error: 'Billing portal could not be opened. Please try again.' });
  }
});

type Access = { grant: boolean; status: 'active' | 'past_due' | 'inactive' | 'canceled' };

/** Webhook payloads carry the subscription's latest state, so access follows status rather than event order. */
function accessFor(status: string): Access | null {
  switch (status) {
    case 'active':
      return { grant: true, status: 'active' };
    case 'past_due':
      return { grant: true, status: 'past_due' };
    case 'on_hold':
    case 'paused':
      return { grant: false, status: 'inactive' };
    case 'cancelled':
    case 'expired':
    case 'failed':
      return { grant: false, status: 'canceled' };
    default:
      return null;
  }
}

async function resolveUser(tx: Tx, sub: DodoSubscriptionData, knownUserId: string | null) {
  const metaUserId = typeof sub.metadata?.platformUserId === 'string' ? sub.metadata.platformUserId : null;
  for (const id of [knownUserId, metaUserId]) {
    if (!id) continue;
    const user = await tx.platformUser.findUnique({ where: { id } });
    if (user) return user;
  }
  const email = sub.customer?.email?.trim();
  if (!email) return null;
  return tx.platformUser.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
}

async function syncSubscription(tx: Tx, sub: DodoSubscriptionData) {
  const existing = await tx.dodoSubscription.findUnique({ where: { subscriptionId: sub.subscription_id } });
  const planId = planForDodoProduct(sub.product_id)?.planId ?? existing?.planId;
  if (!planId || !(planId in CHECKOUT_PLANS)) {
    console.warn(`Dodo subscription ${sub.subscription_id}: product ${sub.product_id} is not mapped to a MindVault plan`);
    return;
  }
  const plan = CHECKOUT_PLANS[planId as keyof typeof CHECKOUT_PLANS];

  const user = await resolveUser(tx, sub, existing?.platformUserId ?? null);
  if (!user) {
    console.warn(`Dodo subscription ${sub.subscription_id}: no MindVault account for ${sub.customer?.email}`);
    return;
  }
  const organizationId = plan.scope === 'organization' ? (existing?.organizationId ?? user.organizationId) : null;

  const row = {
    customerId: sub.customer.customer_id,
    productId: sub.product_id,
    planId,
    status: sub.status,
    platformUserId: user.id,
    organizationId,
    cancelAtNextBillingDate: Boolean(sub.cancel_at_next_billing_date),
    nextBillingDate: sub.next_billing_date ? new Date(sub.next_billing_date) : null,
    updatedAt: new Date(),
  };
  await tx.dodoSubscription.upsert({
    where: { subscriptionId: sub.subscription_id },
    create: { subscriptionId: sub.subscription_id, ...row },
    update: row,
  });

  const access = accessFor(sub.status);
  if (!access) return;

  if (!access.grant) {
    const otherLive = await tx.dodoSubscription.findFirst({
      where: {
        subscriptionId: { not: sub.subscription_id },
        status: 'active',
        ...(organizationId ? { organizationId } : { platformUserId: user.id }),
      },
    });
    if (otherLive) return;
  }

  const billingInterval = sub.payment_frequency_interval === 'Year' ? 'yearly' : 'monthly';
  const role = user.role as AppRole;
  const planType = access.grant ? plan.planType : DEFAULT_PLAN_FOR_ROLE[role];

  if (organizationId) {
    const org = await tx.organization.findUnique({ where: { id: organizationId } });
    if (org) {
      await tx.organization.update({
        where: { id: org.id },
        data: {
          subscriptionStatus: access.status,
          ...(access.grant
            ? {
                planType: plan.planType,
                billingInterval,
                maxLicenses: plan.seats === null ? 100_000 : Math.max(org.maxLicenses, plan.seats ?? 0),
              }
            : {}),
        },
      });
    }
  }

  await tx.platformUser.update({
    where: { id: user.id },
    data: {
      planType,
      subscriptionStatus: access.status,
      ...(access.grant ? { billingInterval } : {}),
    },
  });
  if (user.teacherId) {
    await tx.teacher.update({
      where: { id: user.teacherId },
      data: { planType: access.grant ? plan.planType : 'teacher_free' },
    });
  }
}

/** Mounted with express.raw so the signature is checked against the exact bytes Dodo sent. */
export async function handleDodoWebhook(req: Request, res: Response) {
  const dodo = getDodo();
  const key = dodoWebhookKey();
  if (!dodo || !key) {
    res.status(503).json({ error: 'Dodo webhooks are not configured' });
    return;
  }

  const headers = {
    'webhook-id': String(req.headers['webhook-id'] ?? ''),
    'webhook-signature': String(req.headers['webhook-signature'] ?? ''),
    'webhook-timestamp': String(req.headers['webhook-timestamp'] ?? ''),
  };
  const raw = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';

  let event: WebhookEvent;
  try {
    event = dodo.webhooks.unwrap(raw, { headers, key });
  } catch {
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  try {
    const duplicate = await prisma.$transaction(async (tx) => {
      const claim = await tx.dodoWebhookEvent.createMany({
        data: [{ webhookId: headers['webhook-id'], eventType: event.type }],
        skipDuplicates: true,
      });
      if (claim.count === 0) return true;
      if (event.type.startsWith('subscription.')) {
        await syncSubscription(tx, (event as SubscriptionEvent).data);
      }
      return false;
    });
    res.json({ received: true, duplicate });
  } catch (err) {
    console.error(`Dodo webhook ${event.type} failed:`, err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

export default router;
