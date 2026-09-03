import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

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
