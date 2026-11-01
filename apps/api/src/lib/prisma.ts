import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const libDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(libDir, '../../../../.env') });
dotenv.config({ path: path.resolve(libDir, '../../.env') });

/** pg 8 treats sslmode=require as full certificate verification. Prisma's previous engine followed libpq, which encrypts without verifying unless sslmode is verify-full. */
function databaseUrl(): string {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error('DATABASE_URL is not set');
  }
  if (/[?&]uselibpqcompat=/.test(raw)) return raw;
  const sslmode = /[?&]sslmode=([^&]+)/.exec(raw)?.[1];
  if (!sslmode || sslmode === 'disable') return raw;
  return `${raw}${raw.includes('?') ? '&' : '?'}uselibpqcompat=true`;
}

const adapter = new PrismaPg(databaseUrl());
export const prisma = new PrismaClient({ adapter });

type DelegateWithCreate = {
  create: (args: { data: Record<string, unknown> }) => Promise<unknown>;
  findMany: (args: unknown) => Promise<unknown[]>;
  update?: (args: unknown) => Promise<unknown>;
};

/**
 * Prisma Client only exposes a model after `prisma generate`.
 * Older generated clients silently omit SubtopicAttachment → `.create` crashes.
 */
export function getPrismaModel(name: 'subtopicAttachment' | 'mediaAttachment' | 'ragChunk' | 'activity'): DelegateWithCreate | null {
  const client = prisma as unknown as Record<string, DelegateWithCreate | undefined>;
  const delegate = client[name];
  if (delegate && typeof delegate.create === 'function') return delegate;
  return null;
}

export function requireSubtopicAttachmentModel(): DelegateWithCreate {
  const delegate =
    getPrismaModel('subtopicAttachment') ?? getPrismaModel('mediaAttachment');
  if (!delegate) {
    throw new Error('subtopicAttachment model is not initialized in Prisma Client.');
  }
  return delegate;
}
