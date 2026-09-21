import { Router } from 'express';
import { z } from 'zod';
import { MailerUnconfiguredError, sendNewsletterSubscription } from '../lib/mailer.js';

const router = Router();

const subscribeSchema = z.object({
  email: z.string().trim().email().max(320),
});

const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT = 5;
const recentByIp = new Map<string, number[]>();
const subscribers = new Set<string>();

function isRateLimited(ip: string) {
  const now = Date.now();
  const recent = (recentByIp.get(ip) ?? []).filter((stamp) => now - stamp < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    recentByIp.set(ip, recent);
    return true;
  }
  recent.push(now);
  recentByIp.set(ip, recent);
  return false;
}

router.post('/', async (req, res) => {
  const parsed = subscribeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Please enter a valid email address.' });
    return;
  }

  const email = parsed.data.email.toLowerCase();
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    res.status(429).json({ error: 'Too many attempts. Please try again later.' });
    return;
  }

  if (subscribers.has(email)) {
    res.json({ success: true, message: 'You are already subscribed.' });
    return;
  }

  try {
    await sendNewsletterSubscription(email);
    subscribers.add(email);
    console.log('[newsletter] subscribed', email);
    res.json({ success: true, message: 'Subscribed successfully!' });
  } catch (error) {
    console.error('Subscription API Error:', error);
    if (error instanceof MailerUnconfiguredError) {
      res.status(503).json({
        error:
          'Email delivery is not configured yet. Please email qxicybertech.helpcenter@gmail.com directly.',
      });
      return;
    }
    res.status(500).json({ error: 'Failed to process subscription. Please try again.' });
  }
});

export default router;
