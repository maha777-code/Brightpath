import { Router } from 'express';
import { z } from 'zod';
import { MailerUnconfiguredError, sendContactInquiry } from '../lib/mailer.js';

const router = Router();

const contactSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  message: z.string().trim().min(1).max(5000),
});

const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT = 5;
const recentByIp = new Map<string, number[]>();

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
  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'All fields are required.' });
    return;
  }

  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  if (isRateLimited(ip)) {
    res.status(429).json({ error: 'Too many messages. Please try again later.' });
    return;
  }

  try {
    await sendContactInquiry(parsed.data);
    res.json({ success: true, message: 'Email sent successfully!' });
  } catch (error) {
    console.error('Contact form submission error:', error);
    if (error instanceof MailerUnconfiguredError) {
      res.status(503).json({
        error:
          'Email delivery is not configured yet. Please email qxicybertech.helpcenter@gmail.com directly.',
      });
      return;
    }
    res.status(500).json({ error: 'Failed to send message. Please try again later.' });
  }
});

export default router;
