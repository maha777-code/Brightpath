import type { NextFunction, Request, Response } from 'express';

const hits = new Map<string, number[]>();

function clientIp(req: Request) {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/** Drops the Express fingerprint and sets headers that block sniffing, framing, and leaked referrers. */
export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.removeHeader('X-Powered-By');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  }
  next();
}

/**
 * Fixed-window limit per IP and route. Enough to stop password guessing and form spam
 * on a single API instance. Contact and newsletter routes keep their own limits.
 */
export function rateLimit(options: { windowMs: number; max: number; key?: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const bucket = `${options.key ?? req.path}:${clientIp(req)}`;
    const recent = (hits.get(bucket) ?? []).filter((stamp) => now - stamp < options.windowMs);
    if (recent.length >= options.max) {
      hits.set(bucket, recent);
      res.setHeader('Retry-After', String(Math.ceil(options.windowMs / 1000)));
      res.status(429).json({ error: 'Too many attempts. Please wait and try again.' });
      return;
    }
    recent.push(now);
    hits.set(bucket, recent);
    if (hits.size > 20_000) {
      for (const [key, stamps] of hits) {
        if (stamps.every((stamp) => now - stamp >= options.windowMs)) hits.delete(key);
      }
    }
    next();
  };
}
