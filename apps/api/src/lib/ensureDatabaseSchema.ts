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

async function hasPublicTable(table: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ${table}
    ) AS exists
  `;
  return Boolean(rows[0]?.exists);
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
    const [platformPlan, teacherPlan, videoStatus, cuesJson, activityTable, activityContent, attachmentTable, videoTemplateCol, activityTemplateCol, toolFavoriteTable, productFeedbackTable] =
      await Promise.all([
        hasPublicColumn('PlatformUser', 'planType'),
        hasPublicColumn('Teacher', 'planType'),
        hasPublicColumn('TeacherSubtopic', 'videoStatus'),
        hasPublicColumn('TeacherSubtopic', 'animationCuesJson'),
        hasPublicTable('Activity'),
        hasPublicColumn('Activity', 'content'),
        hasPublicTable('SubtopicAttachment'),
        hasPublicColumn('TeacherSubtopic', 'videoTemplateId'),
        hasPublicColumn('TeacherSubtopic', 'activityTemplateId'),
        hasPublicTable('TeacherToolFavorite'),
        hasPublicTable('ProductFeedback'),
      ]);
    return (
      platformPlan &&
      teacherPlan &&
      videoStatus &&
      cuesJson &&
      activityTable &&
      activityContent &&
      attachmentTable &&
      videoTemplateCol &&
      activityTemplateCol &&
      toolFavoriteTable &&
      productFeedbackTable
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/P1001|ECONNREFUSED|Can't reach database/i.test(message)) {
      throw err;
    }
    return false;
  }
}

function runPrismaGenerate(): void {
  console.warn('Refreshing Prisma Client — running `npx prisma generate`…');
  execSync('npx prisma generate', {
    cwd: apiRoot,
    stdio: 'inherit',
    env: process.env,
    timeout: 60_000,
  });
}

function runPrismaDbPush(): void {
  console.warn('Database schema is behind Prisma — running `npx prisma db push`…');
  execSync('npx prisma db push', {
    cwd: apiRoot,
    stdio: 'inherit',
    env: process.env,
    timeout: 120_000,
  });
  runPrismaGenerate();
}

/**
 * Local/dev: apply pending Prisma schema so teacher login does not 503 after pulls.
 * Disable with AUTO_DB_PUSH=false. Production is off unless AUTO_DB_PUSH=true.
 */
async function ensureProductFeedbackTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ProductFeedback" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "userEmail" TEXT NOT NULL,
      "userRole" TEXT NOT NULL,
      "rating" INTEGER NOT NULL,
      "category" TEXT NOT NULL,
      "comments" TEXT NOT NULL DEFAULT '',
      "pageUrl" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ProductFeedback_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "ProductFeedback_userRole_createdAt_idx" ON "ProductFeedback"("userRole", "createdAt")`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "ProductFeedback_userId_idx" ON "ProductFeedback"("userId")`,
  );
}

/** Billing tables are created directly so production (no auto db push) can take Dodo webhooks. */
async function ensureDodoTables(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "DodoSubscription" (
      "subscriptionId" TEXT NOT NULL,
      "customerId" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "planId" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "platformUserId" TEXT,
      "organizationId" TEXT,
      "cancelAtNextBillingDate" BOOLEAN NOT NULL DEFAULT false,
      "nextBillingDate" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "DodoSubscription_pkey" PRIMARY KEY ("subscriptionId")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "DodoSubscription_platformUserId_idx" ON "DodoSubscription"("platformUserId")`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "DodoSubscription_organizationId_idx" ON "DodoSubscription"("organizationId")`,
  );
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "DodoWebhookEvent" (
      "webhookId" TEXT NOT NULL,
      "eventType" TEXT NOT NULL,
      "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "DodoWebhookEvent_pkey" PRIMARY KEY ("webhookId")
    )
  `);
}

async function addForeignKey(table: string, constraint: string, column: string, refTable: string, onDelete: string): Promise<void> {
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TABLE "${table}" ADD CONSTRAINT "${constraint}"
        FOREIGN KEY ("${column}") REFERENCES "${refTable}"("id") ON DELETE ${onDelete} ON UPDATE CASCADE;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
}

/** Roster, student profile, Sharada transcript, safety alert and audit tables (production has no auto db push). */
async function ensureRosterAndTutorTables(): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS "OrgUnit" (
      "id" TEXT NOT NULL,
      "organizationId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "kind" TEXT NOT NULL DEFAULT 'grade',
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "OrgUnit_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "OrgUnit_organizationId_idx" ON "OrgUnit"("organizationId")`,
    `ALTER TABLE "ClassBatch" ADD COLUMN IF NOT EXISTS "orgUnitId" TEXT`,
    `ALTER TABLE "ClassBatch" ADD COLUMN IF NOT EXISTS "subject" TEXT`,
    `ALTER TABLE "ClassBatch" ADD COLUMN IF NOT EXISTS "gradeLevel" TEXT`,
    `CREATE INDEX IF NOT EXISTS "ClassBatch_orgUnitId_idx" ON "ClassBatch"("orgUnitId")`,
    `CREATE TABLE IF NOT EXISTS "StudentProfile" (
      "id" TEXT NOT NULL,
      "studentUserId" TEXT NOT NULL,
      "gradeLevel" TEXT,
      "board" TEXT,
      "preferredLanguage" TEXT,
      "readingLevel" TEXT,
      "accommodations" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "learningPreferences" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "notes" TEXT NOT NULL DEFAULT '',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "StudentProfile_studentUserId_key" ON "StudentProfile"("studentUserId")`,
    `CREATE TABLE IF NOT EXISTS "TutorSession" (
      "id" TEXT NOT NULL,
      "studentUserId" TEXT NOT NULL,
      "organizationId" TEXT,
      "classBatchId" TEXT,
      "title" TEXT NOT NULL DEFAULT 'New conversation',
      "subject" TEXT,
      "chapter" TEXT,
      "topic" TEXT,
      "summary" TEXT NOT NULL DEFAULT '',
      "messageCount" INTEGER NOT NULL DEFAULT 0,
      "flagCount" INTEGER NOT NULL DEFAULT 0,
      "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TutorSession_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "TutorSession_studentUserId_lastMessageAt_idx" ON "TutorSession"("studentUserId", "lastMessageAt")`,
    `CREATE INDEX IF NOT EXISTS "TutorSession_organizationId_lastMessageAt_idx" ON "TutorSession"("organizationId", "lastMessageAt")`,
    `CREATE INDEX IF NOT EXISTS "TutorSession_classBatchId_lastMessageAt_idx" ON "TutorSession"("classBatchId", "lastMessageAt")`,
    `CREATE TABLE IF NOT EXISTS "TutorMessage" (
      "id" TEXT NOT NULL,
      "sessionId" TEXT NOT NULL,
      "sender" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "flags" TEXT[] DEFAULT ARRAY[]::TEXT[],
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "TutorMessage_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "TutorMessage_sessionId_createdAt_idx" ON "TutorMessage"("sessionId", "createdAt")`,
    `CREATE TABLE IF NOT EXISTS "SafetyAlert" (
      "id" TEXT NOT NULL,
      "sessionId" TEXT NOT NULL,
      "messageId" TEXT,
      "studentUserId" TEXT NOT NULL,
      "organizationId" TEXT,
      "classBatchId" TEXT,
      "category" TEXT NOT NULL,
      "severity" TEXT NOT NULL,
      "excerpt" TEXT NOT NULL,
      "reason" TEXT NOT NULL DEFAULT '',
      "status" TEXT NOT NULL DEFAULT 'open',
      "notifiedAt" TIMESTAMP(3),
      "reviewedByUserId" TEXT,
      "reviewedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SafetyAlert_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "SafetyAlert_organizationId_status_createdAt_idx" ON "SafetyAlert"("organizationId", "status", "createdAt")`,
    `CREATE INDEX IF NOT EXISTS "SafetyAlert_classBatchId_status_idx" ON "SafetyAlert"("classBatchId", "status")`,
    `CREATE INDEX IF NOT EXISTS "SafetyAlert_studentUserId_idx" ON "SafetyAlert"("studentUserId")`,
    `CREATE TABLE IF NOT EXISTS "AuditLog" (
      "id" TEXT NOT NULL,
      "organizationId" TEXT,
      "actorUserId" TEXT NOT NULL,
      "actorRole" TEXT NOT NULL,
      "action" TEXT NOT NULL,
      "targetType" TEXT NOT NULL,
      "targetId" TEXT,
      "metadata" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt")`,
    `CREATE INDEX IF NOT EXISTS "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt")`,
  ];
  for (const sql of statements) {
    await prisma.$executeRawUnsafe(sql);
  }
  await addForeignKey('OrgUnit', 'OrgUnit_organizationId_fkey', 'organizationId', 'Organization', 'CASCADE');
  await addForeignKey('ClassBatch', 'ClassBatch_orgUnitId_fkey', 'orgUnitId', 'OrgUnit', 'SET NULL');
  await addForeignKey('StudentProfile', 'StudentProfile_studentUserId_fkey', 'studentUserId', 'PlatformUser', 'CASCADE');
  await addForeignKey('TutorSession', 'TutorSession_studentUserId_fkey', 'studentUserId', 'PlatformUser', 'CASCADE');
  await addForeignKey('TutorSession', 'TutorSession_classBatchId_fkey', 'classBatchId', 'ClassBatch', 'SET NULL');
  await addForeignKey('TutorMessage', 'TutorMessage_sessionId_fkey', 'sessionId', 'TutorSession', 'CASCADE');
  await addForeignKey('SafetyAlert', 'SafetyAlert_sessionId_fkey', 'sessionId', 'TutorSession', 'CASCADE');
}

export async function ensureDatabaseSchema(): Promise<void> {
  await ensureProductFeedbackTable().catch((err) => {
    console.warn('ProductFeedback table was not created:', err instanceof Error ? err.message : err);
  });
  await ensureRosterAndTutorTables().catch((err) => {
    console.warn('Roster and tutor tables were not created:', err instanceof Error ? err.message : err);
  });
  await ensureDodoTables().catch((err) => {
    console.warn('Dodo billing tables were not created:', err instanceof Error ? err.message : err);
  });

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
      const { ensurePgVectorColumn } = await import('../services/attachMedia.js');
      await ensurePgVectorColumn();
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

  try {
    const { ensurePgVectorColumn } = await import('../services/attachMedia.js');
    await ensurePgVectorColumn();
  } catch (err) {
    console.warn('[pgvector] setup skipped:', err instanceof Error ? err.message : err);
  }
}
