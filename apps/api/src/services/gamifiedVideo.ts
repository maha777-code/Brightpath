import {
  fallbackGamifiedVideoSpec,
  parseGamifiedVideoSpec,
  type GamifiedVideoGeneratePayload,
  type GamifiedVideoGenerateResponse,
  type GamifiedVideoSpec,
} from '@brightpath/shared';
import { prisma } from '../lib/prisma.js';
import { retrieveTextbookContext } from '../lib/videoPipeline/retrieveContext.js';
import { getActiveProvider } from '../lib/llm/provider.js';

const TIMEOUT_MS = 70_000;
const IMPRINT_RE =
  /textbook society|published by|all rights reserved|isbn|malleshwaram|price\s*:|government press|copyright|first edition|reprint 20/i;

function isGarbageChunk(chunk: string): boolean {
  const letters = chunk.match(/[A-Za-z]/g)?.length ?? 0;
  const weird = chunk.match(/[^\t\n\r\x20-\x7E\u00A0-\u024F]/g)?.length ?? 0;
  return letters < 40 || weird > letters;
}

function lessonExcerpts(excerpts: string[], topic: string, chapterTitle: string): string[] {
  const keys = `${topic} ${chapterTitle}`
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 3);
  return [...excerpts]
    .filter((chunk) => !IMPRINT_RE.test(chunk) && !isGarbageChunk(chunk))
    .sort((a, b) => {
      const score = (chunk: string) => keys.filter((key) => chunk.toLowerCase().includes(key)).length;
      return score(b) - score(a);
    });
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(label)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

function resolveVideoSrc(raw: string | null | undefined): { type: 'html5' | 'youtube'; src: string } {
  const value = (raw || '').trim();
  if (!value) return { type: 'html5', src: '' };
  if (/youtu\.be|youtube\.com/i.test(value)) return { type: 'youtube', src: value };
  if (/commondatastorage\.googleapis\.com|gtv-videos-bucket|ForBigger/i.test(value)) {
    return { type: 'html5', src: '' };
  }
  return { type: 'html5', src: value };
}

async function contextPacket(input: GamifiedVideoGeneratePayload) {
  if (input.subtopicId) {
    return retrieveTextbookContext(input.subtopicId);
  }
  if (input.chapterId) {
    const chapter = await prisma.teacherChapter.findUnique({
      where: { id: input.chapterId },
      include: { subtopics: { orderBy: { sequenceOrder: 'asc' }, take: 1 } },
    });
    if (chapter?.subtopics[0]) {
      return retrieveTextbookContext(chapter.subtopics[0].id);
    }
  }
  throw new Error('Select a chapter or subtopic from the uploaded textbook.');
}

export async function generateGamifiedVideo(
  input: GamifiedVideoGeneratePayload,
): Promise<GamifiedVideoGenerateResponse> {
  const packet = await contextPacket(input);
  const sub = input.subtopicId
    ? await prisma.teacherSubtopic.findUnique({ where: { id: input.subtopicId } })
    : packet.topicId
      ? await prisma.teacherSubtopic.findUnique({ where: { id: packet.topicId } })
      : null;
  const media = resolveVideoSrc(sub?.generatedVideoUrl || sub?.videoUrl);
  const excerpts = lessonExcerpts(
    [
      packet.chapterSummary,
      `${packet.code} ${packet.title}`,
      ...packet.ragExcerpts,
    ].filter(Boolean),
    packet.title,
    packet.chapterTitle,
  );
  const fallbackSpec = fallbackGamifiedVideoSpec({
    topic: packet.title || packet.chapterTitle,
    chapterTitle: packet.chapterTitle,
    subject: packet.subject || 'Science',
    textbookTitle: packet.textbookTitle,
    gradeLabel: packet.gradeLabel || undefined,
    excerpts,
    videoSrc: media.src,
    videoType: media.type,
  });
  const fallbackInsights = {
    keyTerms: [packet.title, packet.chapterTitle].filter(Boolean),
    learningObjectives: [`Explain ${packet.title} using the uploaded textbook.`],
    misconceptions: [`${packet.title} can be treated as optional flavor instead of the textbook model.`],
  };

  const provider = getActiveProvider();
  if (!provider) {
    return { spec: fallbackSpec, insights: fallbackInsights };
  }

  const source = (excerpts.length ? excerpts : packet.ragExcerpts).join('\n---\n').slice(0, 16_000);
  try {
    const raw = await withTimeout(
      provider.completeJson<unknown>({
        temperature: 0.3,
        system: `Role: Educational Game Designer.
Task: Turn THIS uploaded textbook LESSON into a 4-checkpoint gamified video about the named topic.
Use only scientific facts from the source. Never invent a different unit (no photosynthesis, Cold War, or generic science unless those words appear in the source).
Never ask about the publisher, copyright, ISBN, address, price, or printing details.
Every prompt must test a concept from the chapter/topic (definitions, properties, examples, experiments).
Return JSON only.`,
        user: `Textbook: ${packet.textbookTitle}
Subject/Grade: ${packet.subject || ''} ${packet.gradeLabel || ''}
Chapter: ${packet.chapterTitle}
${packet.chapterSummary ? `Chapter summary: ${packet.chapterSummary}` : ''}
Topic to teach: ${packet.code} ${packet.title}

Source excerpts (lesson body only):
${source}

Return JSON:
{
  "insights": { "keyTerms": [], "learningObjectives": [], "misconceptions": [] },
  "title": "",
  "subject": "",
  "sourceNote": "one sentence naming the textbook section used",
  "nodes": [
    { "id": "n1", "at": 6, "mode": "quiz", "xp": 100, "prompt": "", "hint": "", "options": [{"id":"A","text":"","correct":false}], "feedbackCorrect": "", "feedbackWrong": "" },
    { "id": "n2", "at": 16, "mode": "skill", "xp": 50, "prompt": "True or false: ...", "options": [{"id":"T","text":"True","correct":false},{"id":"F","text":"False","correct":true}], "feedbackCorrect": "", "feedbackWrong": "" },
    { "id": "n3", "at": 28, "mode": "escape", "xp": 150, "timerSec": 25, "code": "ABCD", "prompt": "", "hint": "", "feedbackCorrect": "", "feedbackWrong": "" },
    { "id": "n4", "at": 42, "mode": "branch", "xp": 120, "prompt": "", "options": [{"id":"A","text":"","correct":false,"jumpTo":16},{"id":"B","text":"","correct":true},{"id":"C","text":"","correct":false,"jumpTo":6}], "feedbackCorrect": "", "feedbackWrong": "" }
  ]
}

Rules: exactly 4 nodes in order quiz, skill, escape, branch. Every prompt, option, hint, and lock code must be answerable from the excerpts. Escape code is 3-4 letters/digits from a key term in the source.`,
      }),
      TIMEOUT_MS,
      'Gamified video generation timed out',
    );
    const rec = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    const spec = parseGamifiedVideoSpec(
      {
        ...rec,
        subject: [packet.subject, packet.gradeLabel].filter(Boolean).join(' · ') || fallbackSpec.subject,
        textbookTitle: packet.textbookTitle,
        chapterTitle: packet.chapterTitle,
        topicTitle: packet.title,
        video: media,
      },
      fallbackSpec,
    );
    const insightsRec =
      rec.insights && typeof rec.insights === 'object' ? (rec.insights as Record<string, unknown>) : {};
    const list = (value: unknown, fallback: string[]) =>
      Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : fallback;
    return {
      spec,
      insights: {
        keyTerms: list(insightsRec.keyTerms, fallbackInsights.keyTerms),
        learningObjectives: list(insightsRec.learningObjectives, fallbackInsights.learningObjectives),
        misconceptions: list(insightsRec.misconceptions, fallbackInsights.misconceptions),
      },
    };
  } catch (err) {
    console.error('[gamifiedVideo] generation failed', err);
    return { spec: fallbackSpec, insights: fallbackInsights };
  }
}

export type { GamifiedVideoSpec };
