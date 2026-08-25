import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from './prisma.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.resolve(__dirname, '../..');

function autoPushEnabled(): boolean {
  const flag = process.env.AUTO_DB_PUSH?.trim().toLowerCase();
  if (flag === '0' || flag === 'false' || flag === 'off') return false;
  if (flag === '1' || flag === 'true' || flag === 'on') return true;
  return process.env.NODE_ENV !== 'production';
}

async function hasPublicColumn(table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${table}
        AND column_name = ${column}
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
}

/** True when login + teacher video pipeline columns are present. */
export async function isDatabaseSchemaCurrent(): Promise<boolean> {
  try {
    const [platformPlan, teacherPlan, videoStatus, cuesJson] = await Promise.all([
      hasPublicColumn('PlatformUser', 'planType'),
      hasPublicColumn('Teacher', 'planType'),
      hasPublicColumn('TeacherSubtopic', 'videoStatus'),
      hasPublicColumn('TeacherSubtopic', 'animationCuesJson'),
    ]);
    return platformPlan && teacherPlan && videoStatus && cuesJson;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/P1001|ECONNREFUSED|Can't reach database/i.test(message)) {
      throw err;
    }
    return false;
  }
}

function runPrismaDbPush(): void {
  console.warn('Database schema is behind Prisma — running `npx prisma db push`…');
  execSync('npx prisma db push', {
    cwd: apiRoot,
    stdio: 'inherit',
    env: process.env,
    timeout: 120_000,
  });
}

/**
 * Local/dev: apply pending Prisma schema so teacher login does not 503 after pulls.
 * Disable with AUTO_DB_PUSH=false. Production is off unless AUTO_DB_PUSH=true.
 */
export async function ensureDatabaseSchema(): Promise<void> {
  if (!autoPushEnabled()) {
    const current = await isDatabaseSchemaCurrent().catch(() => false);
    if (!current) {
      console.warn(
        'Database schema is out of date. From apps/api run: npm run db:setup — then restart the API.',
      );
    }
    return;
  }

  try {
    if (await isDatabaseSchemaCurrent()) {
      console.log('Database schema is current');
      return;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Cannot reach Postgres. Start it (npm run docker:up from repo root) and set DATABASE_URL.');
    console.error(message);
    return;
  }

  try {
    runPrismaDbPush();
  } catch (err) {
    console.error('prisma db push failed:', err instanceof Error ? err.message : err);
    console.error('From apps/api run: npm run db:setup — then restart the API.');
  }
}
