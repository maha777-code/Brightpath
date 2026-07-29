import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Load root .env, then apps/api/.env (Prisma uses the latter)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express from 'express';
import cors from 'cors';
import { createClient } from 'redis';
import authRoutes from './routes/auth.js';
import childrenRoutes from './routes/children.js';

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
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'brightpath-api', phase: 0 });
});

app.use('/auth', authRoutes);
app.use('/children', childrenRoutes);

async function start() {
  if (process.env.REDIS_URL) {
    try {
      const redis = createClient({ url: process.env.REDIS_URL });
      await redis.connect();
      await redis.ping();
      console.log('Redis connected');
      await redis.disconnect();
    } catch (err) {
      console.warn('Redis unavailable (optional in Phase 0):', err);
    }
  }

  app.listen(PORT, () => {
    console.log(`BrightPath API listening on http://localhost:${PORT}`);
  });
}

start();
