import { prisma } from '../prisma.js';
import type { TopicContextPacket } from './types.js';
import {
  attachmentImageUrlsForSubtopic,
  prioritizedRagExcerpts,
} from '../../services/attachMedia.js';
import { ensureTextbookPdfBodyChunks } from '../../services/textbook.js';
import { embedTexts, toPgVectorLiteral } from '../embeddings.js';
import { detectContentDomain } from './contentDomain.js';

function scoreExcerpt(chunk: string, query: string): number {
  const q = query
    .toLowerCase()
    .split(/[^a-z0-9βσ]+/)
    .filter((w) => w.length > 2);
  const c = chunk.toLowerCase();
  let score = 0;
  for (const w of q) {
    if (c.includes(w)) score += 1;
  }
  if (/=/.test(chunk) || /\$/.test(chunk) || /E\s*\[/.test(chunk)) score += 3;
  if (/galton|regression|β|beta|matrix|squared.?error|σ|sigma/i.test(chunk)) score += 4;
  return score;
}

async function vectorRankedExcerpts(textbookId: string, query: string, take: number): Promise<string[]> {
  try {
    const [qvec] = await embedTexts([query.slice(0, 4000)]);
    if (!qvec?.length) return [];
    const literal = toPgVectorLiteral(qvec);
    const id = textbookId.replace(/'/g, "''");
    const rows = await prisma.$queryRawUnsafe<Array<{ content: string }>>(
      `SELECT content FROM "RagChunk"
       WHERE "textbookId" = '${id}' AND embedding_vec IS NOT NULL
       ORDER BY embedding_vec <=> '${literal}'::vector
       LIMIT ${Math.max(1, Math.min(take, 24))}`,
    );
    return rows.map((r) => r.content).filter(Boolean);
  } catch {
    return [];
  }
}

/** Step 1 — retrieve textbook / RAG context for a teacher topic (subtopic). */
export async function retrieveTextbookContext(
  topicId: string,
  teacherPrompt?: string,
  templateId?: string,
): Promise<TopicContextPacket> {
  const sub = await prisma.teacherSubtopic.findUnique({
    where: { id: topicId },
    include: {
      chapter: { include: { textbook: true } },
    },
  });
  if (!sub) throw new Error('Topic not found');

  const textbookId = sub.chapter.textbookId;
  const storagePath = sub.chapter.textbook.storagePath;
  await ensureTextbookPdfBodyChunks(textbookId, storagePath);

  const { attachment, textbook } = await prioritizedRagExcerpts({
    textbookId,
    subtopicId: sub.id,
    code: sub.code,
    title: sub.title,
    chapterTitle: sub.chapter.title,
    take: 24,
  });

  const query = [sub.code, sub.title, sub.chapter.title, sub.chapter.summary, teacherPrompt ?? '']
    .filter(Boolean)
    .join(' ');

  const pdfBody = await prisma.ragChunk.findMany({
    where: { textbookId, sourceType: 'textbook_pdf' },
    orderBy: { sequence: 'asc' },
    take: 80,
  });

  const rankedPdf = [...pdfBody]
    .sort((a, b) => scoreExcerpt(b.content, query) - scoreExcerpt(a.content, query))
    .slice(0, 12)
    .map((c) => c.content);

  const vectorHits = await vectorRankedExcerpts(textbookId, query, 12);

  let ragExcerpts = [
    ...attachment.map((c) => `[Teacher attachment] ${c}`),
    ...vectorHits,
    ...rankedPdf,
    ...textbook,
  ];

  const seen = new Set<string>();
  ragExcerpts = ragExcerpts.filter((c) => {
    const key = c.slice(0, 160);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (ragExcerpts.length === 0) {
    const fallback = await prisma.ragChunk.findMany({
      where: { textbookId },
      orderBy: { sequence: 'asc' },
      take: 16,
    });
    ragExcerpts = fallback.map((c) => c.content);
  }

  if (ragExcerpts.length === 0) {
    ragExcerpts = [
      `${sub.chapter.title}. ${sub.chapter.summary}`,
      `${sub.code} ${sub.title}: key concepts from the uploaded textbook “${sub.chapter.textbook.title}”.`,
    ];
  }

  const attachmentImageUrls = await attachmentImageUrlsForSubtopic(sub.id);
  const packet: TopicContextPacket = {
    topicId: sub.id,
    code: sub.code,
    title: sub.title,
    chapterTitle: sub.chapter.title,
    chapterSummary: sub.chapter.summary,
    textbookTitle: sub.chapter.textbook.title,
    subject: sub.chapter.textbook.subject,
    gradeLabel: sub.chapter.textbook.gradeLabel,
    fileName: sub.chapter.textbook.fileName,
    ragExcerpts: ragExcerpts.slice(0, 20),
    attachmentImageUrls,
    teacherPrompt,
    templateId,
  };
  packet.contentDomain = detectContentDomain(packet);

  console.log(
    `[videoPipeline/retrieve] topic=${sub.code} textbook="${sub.chapter.textbook.title}" domain=${packet.contentDomain} excerpts=${packet.ragExcerpts.length} pdfBody=${pdfBody.length}`,
  );

  return packet;
}
