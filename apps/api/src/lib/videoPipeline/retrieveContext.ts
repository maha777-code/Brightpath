import { prisma } from '../prisma.js';
import type { TopicContextPacket } from './types.js';
import {
  attachmentImageUrlsForSubtopic,
  prioritizedRagExcerpts,
} from '../../services/attachMedia.js';

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
  const { attachment, textbook } = await prioritizedRagExcerpts({
    textbookId,
    subtopicId: sub.id,
    code: sub.code,
    title: sub.title,
    chapterTitle: sub.chapter.title,
  });

  let ragExcerpts = [
    ...attachment.map((c) => `[Teacher attachment] ${c}`),
    ...textbook,
  ];

  if (ragExcerpts.length === 0) {
    const fallback = await prisma.ragChunk.findMany({
      where: { textbookId },
      orderBy: { sequence: 'asc' },
      take: 8,
    });
    ragExcerpts = fallback.map((c) => c.content);
  }

  if (ragExcerpts.length === 0) {
    ragExcerpts = [
      `${sub.chapter.title}. ${sub.chapter.summary}`,
      `${sub.code} ${sub.title}: key concepts for Class 9 Science.`,
    ];
  }

  const attachmentImageUrls = await attachmentImageUrlsForSubtopic(sub.id);

  return {
    topicId: sub.id,
    code: sub.code,
    title: sub.title,
    chapterTitle: sub.chapter.title,
    chapterSummary: sub.chapter.summary,
    textbookTitle: sub.chapter.textbook.title,
    subject: sub.chapter.textbook.subject,
    gradeLabel: sub.chapter.textbook.gradeLabel,
    ragExcerpts,
    attachmentImageUrls,
    teacherPrompt,
    templateId,
  };
}
