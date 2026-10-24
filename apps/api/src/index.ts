import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { createClient } from 'redis';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import authRoutes from './routes/auth.js';
import childrenRoutes from './routes/children.js';
import tutorRoutes from './routes/tutor.js';
import userRoutes from './routes/user.js';
import curriculumRoutes from './routes/curriculum.js';
import teacherRoutes from './routes/teacher.js';
import paymentsRoutes, { handleStripeWebhook } from './routes/payments.js';
import dodoRoutes, { handleDodoWebhook } from './routes/dodo.js';
import adminRoutes from './routes/admin.js';
import orgBrandingRoutes from './routes/orgBranding.js';
import aiRoutes from './routes/ai.js';
import chaptersRoutes from './routes/chapters.js';
import topicsRoutes from './routes/topics.js';
import contactRoutes from './routes/contact.js';
import feedbackRoutes from './routes/feedback.js';
import subscribeRoutes from './routes/subscribe.js';
import rosterRoutes from './routes/roster.js';
import sharadaTutorRoutes from './routes/sharadaTutor.js';
import inviteRoutes from './routes/invites.js';
import { ensureDatabaseSchema } from './lib/ensureDatabaseSchema.js';
import { anthropicWorkspaceId, LESSON_VIDEO_MODEL } from './lib/llm/provider.js';
import { ensureDemoTeacher } from './lib/ensureDemoTeacher.js';
import { ensureDemoStudent } from './lib/ensureDemoStudent.js';
import { prisma } from './lib/prisma.js';
import { migrateLegacyUsers } from './scripts/migrateLegacyUsers.js';
import type { AuthRequest } from './middleware/auth.js';
import { requirePaidOrganization } from './middleware/orgSubscription.js';
import { rateLimit, securityHeaders } from './middleware/security.js';

const PORT = Number(process.env.API_PORT ?? 3001);
const app = express();
const isProduction = process.env.NODE_ENV === 'production';

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(securityHeaders);

const DEFAULT_ORIGINS = [
  'https://mindvault.academy',
  'https://www.mindvault.academy',
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000',
];

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (DEFAULT_ORIGINS.includes(origin)) return true;
  if (!isProduction && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return true;
  const extra = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return extra.includes(origin);
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      console.warn('CORS rejected origin:', origin);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);

/** Stripe requires raw body for signature verification */
app.post(
  '/payments/stripe/webhook',
  express.raw({ type: 'application/json' }),
  (req, res) => void handleStripeWebhook(req as AuthRequest, res),
);
app.post('/payments/dodo/webhook', express.raw({ type: '*/*' }), (req, res) => void handleDodoWebhook(req, res));

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(
  '/uploads/branding',
  (_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
  },
  express.static(path.resolve(__dirname, '../uploads/branding'), {
    maxAge: '7d',
    dotfiles: 'deny',
    index: false,
  }),
);
app.use('/uploads', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});
app.use(
  '/public',
  (req, res, next) => {
    // Allow Vite (:5173) <video crossOrigin="anonymous"> to load MP4s from :3001
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Range',
    );
    res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  },
  express.static(path.resolve(__dirname, '../public'), {
    maxAge: '1h',
    setHeaders(res, filePath) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      if (filePath.endsWith('.mp4')) {
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Accept-Ranges', 'bytes');
      }
      if (filePath.endsWith('.mp3')) {
        res.setHeader('Content-Type', 'audio/mpeg');
      }
      if (filePath.endsWith('.wav')) {
        res.setHeader('Content-Type', 'audio/wav');
      }
    },
  }),
);

app.get('/health', (_req, res) => {
  if (isProduction) {
    res.json({ status: 'ok' });
    return;
  }
  const llm = Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
  const lessonVideo = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  res.json({
    status: 'ok',
    service: 'brightpath-api',
    phase: llm ? 1 : 0,
    llm,
    lessonVideo,
    lessonVideoModel: lessonVideo ? LESSON_VIDEO_MODEL : null,
    lessonVideoWorkspace: lessonVideo ? Boolean(anthropicWorkspaceId()) : false,
  });
});

const authBurst = rateLimit({ windowMs: 15 * 60_000, max: 10 });
const signupBurst = rateLimit({ windowMs: 60 * 60_000, max: 8 });
const LIMITED_AUTH = new Set([
  '/login',
  '/teacher/login',
  '/password/forgot',
  '/password/reset',
  '/password/reset/check',
]);
const LIMITED_SIGNUP = new Set(['/register', '/signup', '/register/resend', '/register/verify', '/teacher/register']);
app.use('/auth', (req, res, next) => {
  if (req.method !== 'POST') {
    next();
    return;
  }
  if (LIMITED_AUTH.has(req.path)) {
    authBurst(req, res, next);
    return;
  }
  if (LIMITED_SIGNUP.has(req.path)) {
    signupBurst(req, res, next);
    return;
  }
  next();
});
app.use('/ai', rateLimit({ windowMs: 5 * 60_000, max: 120, key: 'ai' }));

app.use(
  ['/teacher', '/ai', '/tutor', '/topics', '/chapters', '/curriculum', '/roster', '/admin', '/org', '/sharada'],
  (req, res, next) => void requirePaidOrganization(req as AuthRequest, res, next),
);

app.use('/auth', authRoutes);
app.use('/children', childrenRoutes);
app.use('/tutor', tutorRoutes);
app.use('/user', userRoutes);
app.use('/curriculum', curriculumRoutes);
app.use('/teacher', teacherRoutes);
app.use('/payments/dodo', dodoRoutes);
app.use('/payments', paymentsRoutes);
app.use('/admin', adminRoutes);
app.use('/org', orgBrandingRoutes);
app.use('/ai', aiRoutes);
app.use('/chapters', chaptersRoutes);
app.use('/topics', topicsRoutes);
app.use('/contact', contactRoutes);
app.use('/feedback', feedbackRoutes);
app.use('/subscribe', subscribeRoutes);
app.use('/roster', rosterRoutes);
app.use('/sharada', sharadaTutorRoutes);
app.use('/invites', inviteRoutes);

app.use(
  (
    err: { type?: string; status?: number; statusCode?: number; message?: string },
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    const status = err.status ?? err.statusCode;
    if (err.type === 'entity.too.large' || status === 413) {
      res.status(413).json({
        error: 'File size exceeds the 80 MB limit. Please select a smaller PDF.',
      });
      return;
    }
    console.error(err);
    if (res.headersSent) {
      next(err);
      return;
    }
    const code = status && status >= 400 && status < 500 ? status : 500;
    res.status(code).json({ error: code === 500 ? 'Something went wrong.' : err.message || 'Request failed' });
  },
);

async function start() {
  if (isProduction) {
    const secret = process.env.JWT_SECRET ?? '';
    if (secret.length < 32 || secret === 'brightpath-dev-secret-change-me') {
      console.error('JWT_SECRET is missing or still the development default. Refusing to start.');
      process.exit(1);
    }
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('Postgres connected');
  } catch {
    console.warn(
      "[Postgres Offline] Could not connect to localhost:5433. Start Docker using 'docker compose up -d'",
    );
  }

  if (process.env.REDIS_URL) {
    try {
      const redis = createClient({ url: process.env.REDIS_URL });
      await redis.connect();
      await redis.ping();
      console.log('Redis connected');
      await redis.disconnect();
    } catch (err) {
      console.warn('Redis unavailable (optional):', err);
    }
  }

  await ensureDatabaseSchema();

  try {
    const migrated = await migrateLegacyUsers();
    console.log('Legacy → PlatformUser migration:', migrated);
  } catch (err) {
    console.warn('Legacy migration skipped/failed (run prisma db push first):', err);
  }

  await ensureDemoTeacher();
  await ensureDemoStudent();

  app.listen(PORT, () => {
    const lessonVideo = Boolean(process.env.ANTHROPIC_API_KEY?.trim());
    console.log(`BrightPath API listening on http://localhost:${PORT}`);
    console.log(
      `Lesson video: ${lessonVideo ? `Claude ${LESSON_VIDEO_MODEL}` : 'ANTHROPIC_API_KEY missing — Generate Animated Video will fail'}`,
    );
    console.log(
      `Lesson footage: ${process.env.GEMINI_API_KEY?.trim() ? 'Gemini Omni cinematic clips' : 'GEMINI_API_KEY missing — cinema clips will fail'}`,
    );
  });
}

start();
