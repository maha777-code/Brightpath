import { prisma } from '../prisma.js';
import { DEFAULT_SAMPLE_DOUBTS } from '../teacherCurriculumSeed.js';
import {
  clearTextbookCurriculum,
  deriveTextbookTitle,
  ensureTextbookPdfBodyChunks,
  isNcertScienceTextbook,
  parseTextbookIntoChaptersAsync,
  sanitizeUtf8,
} from '../../services/textbook.js';

type VerifyJob = { textbookId: string; teacherId: string; epoch: number };

const jobEpoch = new Map<string, number>();
const running = new Set<string>();
const queue: VerifyJob[] = [];
let draining = false;

export function isTextbookVerifyJobActive(textbookId: string): boolean {
  return running.has(textbookId) || queue.some((q) => q.textbookId === textbookId);
}

async function drainQueue() {
  if (draining) return;
  draining = true;
  try {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      if (jobEpoch.get(item.textbookId) !== item.epoch) continue;
      running.add(item.textbookId);
      try {
        await runTextbookVerifyJob(item.textbookId, item.teacherId, item.epoch);
      } finally {
        running.delete(item.textbookId);
      }
    }
  } finally {
    draining = false;
  }
}

/** Enqueue parse + RAG indexing so POST /verify can return immediately. */
export function enqueueTextbookVerifyJob(textbookId: string, teacherId: string): void {
  const epoch = (jobEpoch.get(textbookId) ?? 0) + 1;
  jobEpoch.set(textbookId, epoch);
  running.delete(textbookId);
  for (let i = queue.length - 1; i >= 0; i--) {
    if (queue[i].textbookId === textbookId) queue.splice(i, 1);
  }
  queue.push({ textbookId, teacherId, epoch });
  setImmediate(() => {
    void drainQueue();
  });
}

export async function runTextbookVerifyJob(
  textbookId: string,
  teacherId: string,
  epoch?: number,
): Promise<void> {
  if (epoch !== undefined && jobEpoch.get(textbookId) !== epoch) return;

  try {
    const textbook = await prisma.textbook.findFirst({
      where: { id: textbookId, teacherId },
    });
    if (!textbook) {
      console.warn(`[textbookVerify] Textbook ${textbookId} not found`);
      return;
    }

    await clearTextbookCurriculum(textbook.id, teacherId);

    const teacherRow = await prisma.teacher.findUnique({ where: { id: teacherId } });
    const organizationId = textbook.organizationId ?? teacherRow?.organizationId ?? null;

    const derivedTitle = deriveTextbookTitle({
      explicitTitle: textbook.title,
      fileName: textbook.fileName,
      storagePath: textbook.storagePath,
    });

    const { chapters: parsedChapters, documentTitle } = await parseTextbookIntoChaptersAsync(
      textbook.storagePath,
      { fileName: textbook.fileName, titleHint: derivedTitle },
    );

    const finalTitle = documentTitle?.trim() || derivedTitle;

    let chaptersCreated = 0;
    const ragChunkCreates: { content: string; pageHint: string; sequence: number }[] = [];
    for (let i = 0; i < parsedChapters.length; i++) {
      if (epoch !== undefined && jobEpoch.get(textbookId) !== epoch) return;

      const ch = parsedChapters[i];
      const created = await prisma.teacherChapter.create({
        data: {
          textbookId: textbook.id,
          title: sanitizeUtf8(ch.title),
          sequenceOrder: i + 1,
          summary: sanitizeUtf8(ch.summary),
          classProgressPct: 0,
          studentCount: 0,
          completedCount: 0,
          subtopics: {
            create: ch.subtopics.map((s, si) => ({
              code: sanitizeUtf8(s.code),
              title: sanitizeUtf8(s.title),
              sequenceOrder: si + 1,
              hasVideoExplainer: false,
              hasGamifiedActivity: false,
              videoTitle: null,
              activityTitle: null,
              videoUrl: null,
              videoStatus: 'none',
              videoProgress: 0,
              generatedVideoUrl: null,
              videoError: null,
              videoScript: null,
              videoAudioUrl: null,
              videoJobStage: null,
            })),
          },
        },
        include: { subtopics: true },
      });
      chaptersCreated += 1;

      ragChunkCreates.push({
        content: sanitizeUtf8(
          `${ch.title}. ${ch.summary}. Subtopics: ${ch.subtopics.map((s) => s.title).join(', ')}.`,
        ),
        pageHint: sanitizeUtf8(`Chapter ${i + 1}`),
        sequence: i + 1,
      });
      for (const s of created.subtopics) {
        ragChunkCreates.push({
          content: sanitizeUtf8(`${ch.title} — ${s.code} ${s.title}. ${ch.summary}`),
          pageHint: sanitizeUtf8(`Chapter ${i + 1} / ${s.code}`),
          sequence: ragChunkCreates.length + 1,
        });
      }

      if (isNcertScienceTextbook({ title: finalTitle, subject: textbook.subject, fileName: textbook.fileName })) {
        for (const sample of DEFAULT_SAMPLE_DOUBTS.filter((d) => d.chapterIndex === i)) {
          const sub = created.subtopics.find((s) => s.code === sample.subtopicCode);
          await prisma.studentDoubt.create({
            data: {
              teacherId,
              chapterId: created.id,
              subtopicId: sub?.id,
              studentName: sample.studentName,
              question: sample.question,
              status: sample.status,
              aiAnswerText: sample.aiAnswerText,
              aiGroundedSources: [...sample.aiGroundedSources],
              aiConfidence: sample.aiConfidence,
            },
          });
        }
      }

      await new Promise<void>((resolve) => setImmediate(resolve));
    }

    if (ragChunkCreates.length) {
      const outlineChunks = ragChunkCreates
        .map((c) => ({
          textbookId: textbook.id,
          content: sanitizeUtf8(c.content),
          pageHint: sanitizeUtf8(c.pageHint),
          sequence: c.sequence,
        }))
        .filter((c) => c.content.trim().length > 0);
      if (outlineChunks.length) {
        try {
          await prisma.ragChunk.createMany({ data: outlineChunks });
        } catch (err) {
          console.warn(
            '[textbookVerify] outline createMany failed, inserting one-by-one:',
            err instanceof Error ? err.message : err,
          );
          for (const row of outlineChunks) {
            try {
              await prisma.ragChunk.create({ data: row });
            } catch (rowErr) {
              console.warn(
                '[textbookVerify] skipped outline RAG chunk:',
                rowErr instanceof Error ? rowErr.message : rowErr,
              );
            }
          }
        }
      }
    }

    const pdfBodyCount = await ensureTextbookPdfBodyChunks(textbook.id, textbook.storagePath);

    if (epoch !== undefined && jobEpoch.get(textbookId) !== epoch) return;

    await prisma.textbook.update({
      where: { id: textbook.id },
      data: {
        title: finalTitle,
        status: 'INDEXED',
        organizationId,
        indexedChunkCount: ragChunkCreates.length + pdfBodyCount,
        pageCount: Math.max(parsedChapters.length * 8, 1),
      },
    });

    console.log(
      `[textbookVerify] Indexed ${chaptersCreated} chapters (${ragChunkCreates.length} outline + ${pdfBodyCount} PDF body) for ${textbookId}`,
    );
  } catch (err) {
    console.error('[textbookVerify] Job failed:', err instanceof Error ? err.message : err);
    try {
      await prisma.textbook.update({
        where: { id: textbookId },
        data: { status: 'FAILED' },
      });
    } catch (updateErr) {
      console.error('[textbookVerify] Failed to mark FAILED:', updateErr);
    }
  }
}
