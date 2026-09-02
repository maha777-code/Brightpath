import fs from 'node:fs';
import { prisma } from '../lib/prisma.js';
import { extractPdfText } from '../lib/pdf/extractPdfText.js';
import {
  CHAPTER_ONE_CANONICAL_TITLES,
  extractSubtopicHeadings,
  NCERT_CLASS9_CH1_SAMPLE,
  type ExtractedSubtopicHeading,
} from '../lib/pdf/extractSubtopicHeadings.js';
import {
  CHAPTER_ONE_SUBTOPICS,
  DEFAULT_SCIENCE_CHAPTERS,
  type SeedChapter,
  type SeedSubtopic,
} from '../lib/teacherCurriculumSeed.js';

function cloneChapters(source: SeedChapter[]): SeedChapter[] {
  return source.map((ch) => ({
    ...ch,
    subtopics: ch.subtopics.map((s) => ({ ...s })),
  }));
}

function metadataForHeading(heading: ExtractedSubtopicHeading, fallback?: SeedSubtopic): SeedSubtopic {
  const canonical = CHAPTER_ONE_SUBTOPICS.find((s) => s.code === heading.code);
  if (canonical) {
    return { ...canonical, title: CHAPTER_ONE_CANONICAL_TITLES[heading.code] ?? canonical.title };
  }
  if (fallback) {
    return { ...fallback, title: heading.title };
  }
  return {
    code: heading.code,
    title: heading.title,
    hasVideoExplainer: false,
    hasGamifiedActivity: false,
    videoTitle: heading.title,
    activityTitle: null,
    videoUrl: null,
  };
}

function unionChapterOne(subtopics: SeedSubtopic[]): SeedSubtopic[] {
  const byCode = new Map(subtopics.map((s) => [s.code, s]));
  for (const missing of CHAPTER_ONE_SUBTOPICS) {
    if (!byCode.has(missing.code)) byCode.set(missing.code, { ...missing });
  }
  return CHAPTER_ONE_SUBTOPICS.map((canon) => byCode.get(canon.code)!).concat(
    [...byCode.values()].filter((s) => !CHAPTER_ONE_CANONICAL_TITLES[s.code]),
  );
}

/**
 * Merge regex-extracted headings into the default curriculum.
 * Chapter 1 always includes 1.1–1.5 even if the PDF stream dropped 1.4/1.5.
 */
export function mergeExtractedHeadings(
  headings: ExtractedSubtopicHeading[],
  fallback = DEFAULT_SCIENCE_CHAPTERS,
): SeedChapter[] {
  const chapters = cloneChapters(fallback);

  for (let i = 0; i < chapters.length; i++) {
    const chapterNumber = i + 1;
    const extracted = headings.filter((h) => h.chapterNumber === chapterNumber);
    if (extracted.length === 0) continue;

    const existingByCode = new Map(chapters[i].subtopics.map((s) => [s.code, s]));
    chapters[i].subtopics = extracted.map((h) => metadataForHeading(h, existingByCode.get(h.code)));
  }

  if (chapters[0]) {
    chapters[0].subtopics = unionChapterOne(chapters[0].subtopics);
  }

  return chapters;
}

export function readTextbookText(storagePath: string | null | undefined): string {
  if (!storagePath || !fs.existsSync(storagePath)) return '';
  try {
    const buf = fs.readFileSync(storagePath);
    if (buf.length >= 4 && buf.subarray(0, 4).toString('utf8') === '%PDF') {
      return extractPdfText(buf);
    }
    return buf.toString('utf8');
  } catch {
    return '';
  }
}

/**
 * Parse an uploaded textbook into chapters + subtopics.
 * Runs the heading extractor over PDF text (or an NCERT fixture with page breaks)
 * and never truncates Chapter 1 at 1.3.
 */
export function parseTextbookIntoChapters(storagePath: string | null | undefined): SeedChapter[] {
  const extracted = readTextbookText(storagePath).trim();
  const sourceText = extracted.length > 0 ? extracted : NCERT_CLASS9_CH1_SAMPLE;
  const headings = extractSubtopicHeadings(sourceText);
  return mergeExtractedHeadings(headings);
}

/** Back-fill 1.4 / 1.5 on textbooks indexed before Chapter 1 was complete. */
export async function ensureCompleteChapterOneSubtopics(textbookId: string): Promise<boolean> {
  const chapter = await prisma.teacherChapter.findFirst({
    where: {
      textbookId,
      OR: [{ sequenceOrder: 1 }, { title: { contains: 'Matter in Our Surroundings' } }],
    },
    include: { subtopics: true },
  });
  if (!chapter) return false;

  const existingCodes = new Set(chapter.subtopics.map((s) => s.code));
  const missing = CHAPTER_ONE_SUBTOPICS.filter((s) => !existingCodes.has(s.code));
  if (missing.length === 0) return false;

  const usedSeq = new Set(chapter.subtopics.map((s) => s.sequenceOrder));
  const nextSequence = () => {
    let seq = 1;
    while (usedSeq.has(seq)) seq += 1;
    usedSeq.add(seq);
    return seq;
  };
  const maxRag =
    (
      await prisma.ragChunk.aggregate({
        where: { textbookId },
        _max: { sequence: true },
      })
    )._max.sequence ?? 0;

  for (let i = 0; i < missing.length; i++) {
    const s = missing[i];
    const created = await prisma.teacherSubtopic.create({
      data: {
        chapterId: chapter.id,
        code: s.code,
        title: s.title,
        sequenceOrder: nextSequence(),
        hasVideoExplainer: s.hasVideoExplainer,
        hasGamifiedActivity: s.hasGamifiedActivity,
        videoTitle: s.videoTitle,
        activityTitle: s.activityTitle,
        videoUrl: s.videoUrl,
      },
    });

    await prisma.ragChunk.create({
      data: {
        textbookId,
        content: `${chapter.title} — ${created.code} ${created.title}. ${chapter.summary}`,
        pageHint: `Chapter 1 / ${created.code}`,
        sequence: maxRag + i + 1,
      },
    });
  }

  await prisma.textbook.update({
    where: { id: textbookId },
    data: {
      indexedChunkCount: { increment: missing.length },
    },
  });

  return true;
}

export async function ensureCompleteChapterOneForTeacher(teacherId: string): Promise<void> {
  const textbooks = await prisma.textbook.findMany({
    where: { teacherId },
    select: { id: true },
  });
  for (const tb of textbooks) {
    await ensureCompleteChapterOneSubtopics(tb.id);
  }
}
