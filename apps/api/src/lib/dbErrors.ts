import { Prisma } from '@prisma/client';

export const DB_UNREACHABLE_MESSAGE =
  "Database server unreachable. Please run 'docker compose up -d' from project root.";

export const SCHEMA_OUTDATED_MESSAGE =
  'Database schema is out of date. From apps/api run: npm run db:setup — then restart the API.';

export function isDatabaseUnreachable(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientInitializationError) return true;
  if (typeof err === 'object' && err !== null) {
    const e = err as { name?: string; code?: string; errorCode?: string };
    if (e.name === 'PrismaClientInitializationError') return true;
    if (e.errorCode === 'P1001' || e.code === 'P1001' || e.code === 'P1000' || e.code === 'P1017') {
      return true;
    }
  }
  const message = err instanceof Error ? err.message : String(err);
  return /P1001|ECONNREFUSED|Can't reach database|connect ECONNREFUSED/i.test(message);
}

export function isSchemaOutOfDate(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return err.code === 'P2021' || err.code === 'P2022';
  }
  if (typeof err === 'object' && err !== null) {
    const code = (err as { code?: string }).code;
    if (code === 'P2021' || code === 'P2022') return true;
  }
  const message = err instanceof Error ? err.message : String(err);
  return /P2021|P2022|does not exist in the current database|Unknown column|Unknown (?:arg|argument)/i.test(
    message,
  );
}
