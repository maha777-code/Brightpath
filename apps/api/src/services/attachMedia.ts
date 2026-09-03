import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TeacherAttachment } from '@brightpath/shared';
import { Prisma } from '@prisma/client';
import { getPrismaModel, prisma } from '../lib/prisma.js';
import { apiPublicOrigin } from '../lib/videoPipeline/mediaPaths.js';
import { embedTexts, toPgVectorLiteral } from '../lib/embeddings.js';
import {
  chunkExtractedText,
  detectAttachmentKind,
  extractAttachmentText,
  type AttachmentKind,
} from '../lib/media/extractAttachmentText.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ATTACHMENT_UPLOAD_DIR = path.resolve(__dirname, '../../uploads/attachments');

type AttachmentRow = {
  id: string;
  subtopicId: string;
  teacherId: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  storagePath: string;
  publicUrl: string;
  kind: string;
  extractedText: string;
  indexedChunkCount: number;
  createdAt: Date;
};

type ChunkRow = {
  id: string;
  content: string;
  sourceType?: string | null;
  subtopicId?: string | null;
  pageHint?: string | null;
  sequence?: number;
};

function newAttachmentId(): string {
  return `att_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function attachmentDelegate() {
  return getPrismaModel('subtopicAttachment') ?? getPrismaModel('mediaAttachment');
}

async function createAttachmentRow(data: Record<string, unknown>): Promise<AttachmentRow> {
  const delegate = attachmentDelegate();
  if (!delegate) {
    console.warn('subtopicAttachment model is not initialized in Prisma Client — using SQL fallback.');
  } else {
    try {
      return (await delegate.create({ data })) as AttachmentRow;
    } catch (err) {
      console.warn(
        'subtopicAttachment.create failed, falling back to SQL:',
        err instanceof Error ? err.message : err,
      );
    }
  }

  const id = newAttachmentId();
  const now = new Date();
  await prisma.$executeRaw`
    INSERT INTO "SubtopicAttachment"
      (id, "subtopicId", "teacherId", "fileName", "mimeType", "fileSizeBytes",
       "storagePath", "publicUrl", kind, "extractedText", "indexedChunkCount", "createdAt")
    VALUES
      (${id}, ${String(data.subtopicId)}, ${String(data.teacherId)}, ${String(data.fileName)},
       ${String(data.mimeType)}, ${Number(data.fileSizeBytes ?? 0)}, ${String(data.storagePath)},
       ${String(data.publicUrl)}, ${String(data.kind)}, ${String(data.extractedText ?? '')},
       ${Number(data.indexedChunkCount ?? 0)}, ${now})
  `;
  return {
    id,
    subtopicId: String(data.subtopicId),
    teacherId: String(data.teacherId),
    fileName: String(data.fileName),
    mimeType: String(data.mimeType),
    fileSizeBytes: Number(data.fileSizeBytes ?? 0),
    storagePath: String(data.storagePath),
    publicUrl: String(data.publicUrl),
    kind: String(data.kind),
    extractedText: String(data.extractedText ?? ''),
    indexedChunkCount: Number(data.indexedChunkCount ?? 0),
    createdAt: now,
  };
}

async function findAttachments(where: { subtopicId: string } | { subtopicId: { in: string[] } }): Promise<AttachmentRow[]> {
  const delegate = attachmentDelegate();
  if (delegate) {
    try {
      return (await delegate.findMany({
        where,
        orderBy: { createdAt: 'asc' },
      })) as AttachmentRow[];
    } catch {
      /* fall through to SQL */
    }
  } else {
    console.warn('subtopicAttachment model is not initialized in Prisma Client — using SQL fallback.');
  }

  const ids = typeof where.subtopicId === 'string' ? [where.subtopicId] : where.subtopicId.in;
  if (!ids.length) return [];
  return prisma.$queryRaw<AttachmentRow[]>`
    SELECT id, "subtopicId", "teacherId", "fileName", "mimeType", "fileSizeBytes",
           "storagePath", "publicUrl", kind, "extractedText", "indexedChunkCount", "createdAt"
    FROM "SubtopicAttachment"
    WHERE "subtopicId" IN (${Prisma.join(ids)})
    ORDER BY "createdAt" ASC
  `;
}

function ragChunkDelegate() {
  const delegate = getPrismaModel('ragChunk');
  if (delegate) return delegate;
  return prisma.ragChunk as unknown as NonNullable<ReturnType<typeof getPrismaModel>>;
}

export function toTeacherAttachment(row: AttachmentRow): TeacherAttachment {
  const origin = apiPublicOrigin();
  const publicUrl = row.publicUrl.startsWith('http')
    ? row.publicUrl
    : `${origin}${row.publicUrl.startsWith('/') ? '' : '/'}${row.publicUrl}`;
  return {
    id: row.id,
    subtopicId: row.subtopicId,
    fileName: row.fileName,
    mimeType: row.mimeType,
    fileSizeBytes: row.fileSizeBytes,
    publicUrl,
    kind: row.kind as TeacherAttachment['kind'],
    indexedChunkCount: row.indexedChunkCount,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function attachmentsBySubtopic(
  subtopicIds: string[],
): Promise<Map<string, TeacherAttachment[]>> {
  const map = new Map<string, TeacherAttachment[]>();
  if (!subtopicIds.length) return map;
  try {
    const rows = await findAttachments({ subtopicId: { in: subtopicIds } });
    for (const row of rows) {
      const list = map.get(row.subtopicId) ?? [];
      list.push(toTeacherAttachment(row));
      map.set(row.subtopicId, list);
    }
  } catch {
    /* table may not exist until db push */
  }
  return map;
}

export async function ensurePgVectorColumn(): Promise<void> {
  try {
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector');
    await prisma.$executeRawUnsafe(
      'ALTER TABLE "RagChunk" ADD COLUMN IF NOT EXISTS embedding_vec vector(256)',
    );
  } catch (err) {
    console.warn(
      '[pgvector] Could not enable vector column:',
      err instanceof Error ? err.message : err,
    );
  }
}

async function writeVector(chunkId: string, embedding: number[]): Promise<void> {
  const literal = toPgVectorLiteral(embedding);
  const id = chunkId.replace(/[^a-zA-Z0-9_-]/g, '');
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE "RagChunk" SET embedding_vec = '${literal}'::vector WHERE id = '${id}'`,
    );
  } catch {
    /* Json embedding still stored */
  }
}

function publicPathFor(storedName: string): string {
  return `/uploads/attachments/${storedName}`;
}

export async function ingestSubtopicAttachments(input: {
  teacherId: string;
  subtopicId: string;
  files: Array<{ originalname: string; mimetype: string; size: number; path: string }>;
}): Promise<{ attachments: TeacherAttachment[]; indexedChunkCount: number }> {
  const sub = await prisma.teacherSubtopic.findFirst({
    where: {
      id: input.subtopicId,
      chapter: { textbook: { teacherId: input.teacherId } },
    },
    include: { chapter: true },
  });
  if (!sub) {
    throw Object.assign(new Error('Subtopic not found'), { status: 404 });
  }

  fs.mkdirSync(ATTACHMENT_UPLOAD_DIR, { recursive: true });
  await ensurePgVectorColumn();

  const created: TeacherAttachment[] = [];
  let indexedChunkCount = 0;
  const topicHint = `${sub.code} ${sub.title}`;

  for (const file of input.files) {
    const kind = detectAttachmentKind(file.originalname, file.mimetype);
    if (!kind) continue;

    const buffer = fs.readFileSync(file.path);
    const storedName = path.basename(file.path);
    const extracted =
      (await extractAttachmentText({
        buffer,
        fileName: file.originalname,
        mimeType: file.mimetype,
        kind,
        topicHint,
      })) ||
      `Teacher attachment (${kind}) for ${topicHint}: ${file.originalname}`;

    const row = await createAttachmentRow({
      subtopicId: sub.id,
      teacherId: input.teacherId,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSizeBytes: file.size,
      storagePath: file.path,
      publicUrl: publicPathFor(storedName),
      kind,
      extractedText: extracted.slice(0, 20_000),
      indexedChunkCount: 0,
    });

    const pieces = chunkExtractedText(extracted);
    const chunks = pieces.length
      ? pieces
      : [`Teacher ${kind} attachment ${file.originalname} for ${topicHint}.`];
    const embeddings = await embedTexts(chunks);

    for (let i = 0; i < chunks.length; i++) {
      let createdChunk: { id: string };
      try {
        createdChunk = await ragChunkDelegate().create({
          data: {
            textbookId: sub.chapter.textbookId,
            content: chunks[i],
            pageHint: `teacher_attachment / ${sub.code} / ${file.originalname}`,
            sequence: i + 1,
            sourceType: 'teacher_attachment',
            subtopicId: sub.id,
            attachmentId: row.id,
            embedding: embeddings[i] ?? [],
          },
        });
      } catch {
        createdChunk = await prisma.ragChunk.create({
          data: {
            textbookId: sub.chapter.textbookId,
            content: chunks[i],
            pageHint: `teacher_attachment / ${sub.code} / ${file.originalname}`,
            sequence: i + 1,
          },
        });
      }
      if (embeddings[i]) await writeVector(createdChunk.id, embeddings[i]);
      indexedChunkCount += 1;
    }

    try {
      const attachments = attachmentDelegate();
      if (attachments?.update) {
        await attachments.update({
          where: { id: row.id },
          data: { indexedChunkCount: chunks.length },
        });
      } else {
        await prisma.$executeRaw`
          UPDATE "SubtopicAttachment"
          SET "indexedChunkCount" = ${chunks.length}
          WHERE id = ${row.id}
        `;
      }
    } catch {
      /* ignore */
    }

    created.push(toTeacherAttachment({ ...row, indexedChunkCount: chunks.length }));
  }

  return { attachments: created, indexedChunkCount };
}

export async function attachmentImageUrlsForSubtopic(subtopicId: string): Promise<string[]> {
  try {
    const rows = await findAttachments({ subtopicId });
    return rows
      .filter((r) => r.kind === 'image')
      .map((r) => toTeacherAttachment(r).publicUrl);
  } catch {
    return [];
  }
}

export async function prioritizedRagExcerpts(input: {
  textbookId: string;
  subtopicId: string;
  code: string;
  title: string;
  chapterTitle: string;
  take?: number;
}): Promise<{ attachment: string[]; textbook: string[] }> {
  const take = input.take ?? 16;
  try {
    const attachment = await ragChunkDelegate().findMany({
      where: {
        textbookId: input.textbookId,
        sourceType: 'teacher_attachment',
        subtopicId: input.subtopicId,
      },
      orderBy: { sequence: 'asc' },
      take,
    });
    const textbook = await ragChunkDelegate().findMany({
      where: {
        textbookId: input.textbookId,
        NOT: { sourceType: 'teacher_attachment' },
        OR: [
          { content: { contains: input.title, mode: 'insensitive' } },
          { content: { contains: input.code, mode: 'insensitive' } },
          {
            content: {
              contains: input.chapterTitle.replace(/^Chapter\s+\d+:\s*/i, ''),
              mode: 'insensitive',
            },
          },
          { pageHint: { contains: input.code, mode: 'insensitive' } },
        ],
      },
      orderBy: { sequence: 'asc' },
      take,
    });
    return {
      attachment: attachment.map((c) => c.content),
      textbook: textbook.map((c) => c.content),
    };
  } catch {
    const fallback = await prisma.ragChunk.findMany({
      where: { textbookId: input.textbookId },
      orderBy: { sequence: 'asc' },
      take,
    });
    const attachment = fallback
      .filter((c) => (c.pageHint ?? '').includes('teacher_attachment'))
      .map((c) => c.content);
    const textbook = fallback
      .filter((c) => !(c.pageHint ?? '').includes('teacher_attachment'))
      .map((c) => c.content);
    return { attachment, textbook };
  }
}

export type { AttachmentKind };
