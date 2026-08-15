import { Router } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import {
  isSubscriptionActive,
  RAZORPAY_PLAN_AMOUNTS_INR,
  type PlanType,
} from '@brightpath/shared';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { getRazorpay, getStripe, stripePriceId } from '../lib/payments.js';

const router = Router();

const checkoutSchema = z.object({
  planType: z.enum(['teacher_pro', 'tutor_center_pro', 'family_plan', 'school_enterprise']),
  interval: z.enum(['monthly', 'yearly']),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

router.post('/stripe/create-checkout-session', requireAuth, async (req: AuthRequest, res) => {
  try {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const stripe = getStripe();
    if (!stripe) {
      res.status(503).json({ error: 'Stripe is not configured. Set STRIPE_SECRET_KEY.' });
      return;
    }

    const priceId = stripePriceId(parsed.data.planType, parsed.data.interval);
    if (!priceId) {
      res.status(400).json({
        error: `Missing Stripe price env for ${parsed.data.planType}/${parsed.data.interval}`,
      });
      return;
    }

    const appUrl = process.env.APP_URL ?? 'http://localhost:5173';
    const email = req.auth?.email;
    if (!email) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    let customerId: string | undefined;
    if (req.platformUserId) {
      const user = await prisma.platformUser.findUnique({ where: { id: req.platformUserId } });
      customerId = user?.stripeCustomerId ?? undefined;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email,
          metadata: { platformUserId: req.platformUserId },
        });
        customerId = customer.id;
        await prisma.platformUser.update({
          where: { id: req.platformUserId },
          data: { stripeCustomerId: customerId },
        });
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url:
        parsed.data.successUrl ??
        `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: parsed.data.cancelUrl ?? `${appUrl}/billing/cancel`,
      metadata: {
        platformUserId: req.platformUserId ?? '',
        organizationId: req.organizationId ?? '',
        planType: parsed.data.planType,
        interval: parsed.data.interval,
      },
      subscription_data: {
        metadata: {
          platformUserId: req.platformUserId ?? '',
          organizationId: req.organizationId ?? '',
          planType: parsed.data.planType,
          interval: parsed.data.interval,
        },
      },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Checkout failed' });
  }
});

/** Stripe webhook — mount with express.raw in index.ts for this path only via separate router use */
export async function handleStripeWebhook(req: AuthRequest, res: import('express').Response) {
  const stripe = getStripe();
  if (!stripe) {
    res.status(503).json({ error: 'Stripe not configured' });
    return;
  }
  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    res.status(400).json({ error: 'Missing stripe signature or STRIPE_WEBHOOK_SECRET' });
    return;
  }

  let event: import('stripe').Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, secret);
  } catch (err) {
    console.error('Stripe webhook signature failed:', err);
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as import('stripe').Stripe.Checkout.Session;
      const planType = (session.metadata?.planType ?? 'teacher_pro') as PlanType;
      const interval = session.metadata?.interval === 'yearly' ? 'yearly' : 'monthly';
      const platformUserId = session.metadata?.platformUserId;
      const organizationId = session.metadata?.organizationId;
      const subId =
        typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

      if (organizationId) {
        await prisma.organization.update({
          where: { id: organizationId },
          data: {
            planType,
            subscriptionStatus: 'active',
            billingInterval: interval,
            stripeSubscriptionId: subId ?? undefined,
            stripeCustomerId:
              typeof session.customer === 'string' ? session.customer : session.customer?.id,
          },
        });
      }
      if (platformUserId) {
        await prisma.platformUser.update({
          where: { id: platformUserId },
          data: {
            planType,
            subscriptionStatus: 'active',
            billingInterval: interval,
            stripeSubscriptionId: subId ?? undefined,
            stripeCustomerId:
              typeof session.customer === 'string' ? session.customer : session.customer?.id,
          },
        });
      }
    }

    if (
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      const sub = event.data.object as import('stripe').Stripe.Subscription;
      const statusMap: Record<string, 'active' | 'past_due' | 'canceled' | 'trialing' | 'inactive'> = {
        active: 'active',
        past_due: 'past_due',
        canceled: 'canceled',
        unpaid: 'past_due',
        incomplete: 'inactive',
        incomplete_expired: 'canceled',
        trialing: 'trialing',
        paused: 'inactive',
      };
      const status = statusMap[sub.status] ?? 'inactive';
      const platformUserId = sub.metadata?.platformUserId;
      const organizationId = sub.metadata?.organizationId;

      if (organizationId) {
        await prisma.organization.update({
          where: { id: organizationId },
          data: { subscriptionStatus: status, stripeSubscriptionId: sub.id },
        });
      }
      if (platformUserId) {
        await prisma.platformUser.update({
          where: { id: platformUserId },
          data: { subscriptionStatus: status, stripeSubscriptionId: sub.id },
        });
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Stripe webhook handler error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

router.post('/razorpay/create-order', requireAuth, async (req: AuthRequest, res) => {
  try {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const razorpay = getRazorpay();
    if (!razorpay) {
      res.status(503).json({
        error: 'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.',
      });
      return;
    }

    const amounts = RAZORPAY_PLAN_AMOUNTS_INR[parsed.data.planType];
    if (!amounts) {
      res.status(400).json({ error: 'Unsupported plan for Razorpay' });
      return;
    }
    const amount = parsed.data.interval === 'yearly' ? amounts.yearly : amounts.monthly;
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `bp_${Date.now()}`,
      notes: {
        platformUserId: req.platformUserId ?? '',
        organizationId: req.organizationId ?? '',
        planType: parsed.data.planType,
        interval: parsed.data.interval,
      },
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      planType: parsed.data.planType,
      interval: parsed.data.interval,
      name: req.auth?.email,
    });
  } catch (err) {
    console.error('Razorpay create-order error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Order failed' });
  }
});

router.post('/razorpay/verify-signature', requireAuth, async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      razorpay_order_id: z.string(),
      razorpay_payment_id: z.string(),
      razorpay_signature: z.string(),
      planType: z.enum(['teacher_pro', 'tutor_center_pro', 'family_plan', 'school_enterprise']),
      interval: z.enum(['monthly', 'yearly']),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      res.status(503).json({ error: 'Razorpay not configured' });
      return;
    }

    const body = `${parsed.data.razorpay_order_id}|${parsed.data.razorpay_payment_id}`;
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    if (expected !== parsed.data.razorpay_signature) {
      res.status(400).json({ error: 'Invalid payment signature' });
      return;
    }

    const planType = parsed.data.planType as PlanType;
    const interval = parsed.data.interval;

    if (req.organizationId) {
      await prisma.organization.update({
        where: { id: req.organizationId },
        data: {
          planType,
          subscriptionStatus: 'active',
          billingInterval: interval,
          razorpaySubscriptionId: parsed.data.razorpay_payment_id,
        },
      });
    }
    if (req.platformUserId) {
      await prisma.platformUser.update({
        where: { id: req.platformUserId },
        data: {
          planType,
          subscriptionStatus: 'active',
          billingInterval: interval,
          razorpaySubscriptionId: parsed.data.razorpay_payment_id,
        },
      });
    }

    res.json({
      ok: true,
      planType,
      subscriptionStatus: 'active',
      active: isSubscriptionActive('active'),
    });
  } catch (err) {
    console.error('Razorpay verify error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Verify failed' });
  }
});

router.get('/status', requireAuth, async (req: AuthRequest, res) => {
  if (req.organizationId) {
    const org = await prisma.organization.findUnique({ where: { id: req.organizationId } });
    res.json({
      scope: 'organization',
      planType: org?.planType,
      subscriptionStatus: org?.subscriptionStatus ?? 'active',
      active: isSubscriptionActive(org?.subscriptionStatus),
      billingInterval: org?.billingInterval,
    });
    return;
  }
  if (req.platformUserId) {
    const user = await prisma.platformUser.findUnique({ where: { id: req.platformUserId } });
    res.json({
      scope: 'user',
      planType: user?.planType,
      subscriptionStatus: user?.subscriptionStatus ?? 'active',
      active: isSubscriptionActive(user?.subscriptionStatus),
      billingInterval: user?.billingInterval,
    });
    return;
  }
  res.json({ scope: 'none', subscriptionStatus: 'active', active: true });
});

export default router;
