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
import adminRoutes from './routes/admin.js';
import orgBrandingRoutes from './routes/orgBranding.js';
import aiRoutes from './routes/ai.js';
import chaptersRoutes from './routes/chapters.js';
import topicsRoutes from './routes/topics.js';
import { ensureDatabaseSchema } from './lib/ensureDatabaseSchema.js';
import { ensureDemoTeacher } from './lib/ensureDemoTeacher.js';
import { prisma } from './lib/prisma.js';
import { migrateLegacyUsers } from './scripts/migrateLegacyUsers.js';
import type { AuthRequest } from './middleware/auth.js';

const PORT = Number(process.env.API_PORT ?? 3001);
const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
      : (origin, callback) => {
          if (!origin || /^http:\/\/localhost:\d+$/.test(origin)) {
            callback(null, true);
          } else {
            callback(new Error('Not allowed by CORS'));
          }
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

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use(
  '/uploads',
  (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
  },
  express.static(path.resolve(__dirname, '../uploads'), { maxAge: '7d' }),
);
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
    },
  }),
);

app.get('/health', (_req, res) => {
  const llm = Boolean(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
  res.json({
    status: 'ok',
    service: 'brightpath-api',
    phase: llm ? 1 : 0,
    llm,
  });
});

app.use('/auth', authRoutes);
app.use('/children', childrenRoutes);
app.use('/tutor', tutorRoutes);
app.use('/user', userRoutes);
app.use('/curriculum', curriculumRoutes);
app.use('/teacher', teacherRoutes);
app.use('/payments', paymentsRoutes);
app.use('/admin', adminRoutes);
app.use('/org', orgBrandingRoutes);
app.use('/ai', aiRoutes);
app.use('/chapters', chaptersRoutes);
app.use('/topics', topicsRoutes);

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
    next(err);
  },
);

async function start() {
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

  app.listen(PORT, () => {
    console.log(`BrightPath API listening on http://localhost:${PORT}`);
  });
}

start();
