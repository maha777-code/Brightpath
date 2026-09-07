import fs from 'node:fs';
import { z } from 'zod';
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
import { getActiveProvider } from '../lib/llm/provider.js';

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
    videoTitle: null,
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

/** Build chapters purely from extracted headings (no NCERT seed). */
export function chaptersFromHeadingsOnly(headings: ExtractedSubtopicHeading[]): SeedChapter[] {
  if (headings.length === 0) return [];
  const byChapter = new Map<number, ExtractedSubtopicHeading[]>();
  for (const h of headings) {
    const list = byChapter.get(h.chapterNumber) ?? [];
    list.push(h);
    byChapter.set(h.chapterNumber, list);
  }
  return [...byChapter.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([chapterNumber, subs]) => ({
      title: `Chapter ${chapterNumber}`,
      summary: `Topics covering ${subs.map((s) => s.title).slice(0, 4).join(', ')}.`,
      classProgressPct: 0,
      studentCount: 0,
      completedCount: 0,
      subtopics: subs
        .sort((a, b) => a.index - b.index)
        .map((h) => ({
          code: h.code,
          title: h.title,
          hasVideoExplainer: false,
          hasGamifiedActivity: false,
          videoTitle: null,
          activityTitle: null,
          videoUrl: null,
        })),
    }));
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

/** Humanize "DSML.pdf" / "data_science_ml.pdf" → readable title. */
export function titleFromFileName(fileName: string | null | undefined): string {
  const base = String(fileName ?? '')
    .replace(/^.*[\\/]/, '')
    .replace(/\.pdf$/i, '')
    .replace(/^\d+-/, '')
    .trim();
  if (!base) return 'Uploaded Textbook';
  const spaced = base
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
  // Expand common acronyms lightly
  if (/^dsml$/i.test(spaced)) return 'DSML - Data Science & Machine Learning';
  if (/^ncert/i.test(spaced)) return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Read PDF `/Title` metadata when present. */
export function titleFromPdfMetadata(storagePath: string | null | undefined): string | null {
  if (!storagePath || !fs.existsSync(storagePath)) return null;
  try {
    const buf = fs.readFileSync(storagePath);
    const latin = buf.toString('latin1');
    const m = /\/Title\s*\(((?:\\.|[^\\)])*)\)/i.exec(latin);
    if (!m?.[1]) return null;
    const decoded = m[1]
      .replace(/\\n/g, ' ')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\')
      .replace(/\\(\d{1,3})/g, (_, oct: string) => String.fromCharCode(parseInt(oct, 8)))
      .trim();
    if (decoded.length < 2 || decoded.length > 200) return null;
    if (/^untitled$/i.test(decoded)) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function deriveTextbookTitle(opts: {
  explicitTitle?: string | null;
  fileName?: string | null;
  storagePath?: string | null;
}): string {
  const explicit = opts.explicitTitle?.trim();
  if (
    explicit &&
    !/^ncert science class 9$/i.test(explicit) &&
    !/^untitled$/i.test(explicit)
  ) {
    return explicit;
  }
  return titleFromPdfMetadata(opts.storagePath) ?? titleFromFileName(opts.fileName);
}

export function looksLikeNcertScience(text: string, title?: string | null): boolean {
  const blob = `${title ?? ''}\n${text.slice(0, 4000)}`.toLowerCase();
  return (
    /ncert/.test(blob) ||
    /matter in our surroundings/.test(blob) ||
    /physical nature of matter/.test(blob)
  );
}

const llmCurriculumSchema = z.object({
  documentTitle: z.string().min(2).max(200).optional(),
  chapters: z
    .array(
      z.object({
        title: z.string().min(2).max(200),
        summary: z.string().min(8).max(600),
        subtopics: z
          .array(
            z.object({
              code: z.string().min(1).max(20),
              title: z.string().min(2).max(200),
            }),
          )
          .min(1)
          .max(40),
      }),
    )
    .min(1)
    .max(40),
});

function seedFromLlm(raw: z.infer<typeof llmCurriculumSchema>): SeedChapter[] {
  return raw.chapters.map((ch, i) => ({
    title: ch.title,
    summary: ch.summary,
    classProgressPct: 0,
    studentCount: 0,
    completedCount: 0,
    subtopics: ch.subtopics.map((s, si) => ({
      code: s.code || `${i + 1}.${si + 1}`,
      title: s.title,
      hasVideoExplainer: false,
      hasGamifiedActivity: false,
      videoTitle: null,
      activityTitle: null,
      videoUrl: null,
    })),
  }));
}

export async function parseCurriculumWithLlm(
  text: string,
  fileName?: string | null,
): Promise<{ chapters: SeedChapter[]; documentTitle?: string } | null> {
  const provider = getActiveProvider();
  if (!provider || text.trim().length < 80) return null;

  try {
    const raw = await Promise.race([
      provider.completeJson<unknown>({
        system: `You extract curriculum structure from textbook PDF text.
Return JSON only with documentTitle and chapters[]. Each chapter has title, summary, and subtopics[{code,title}].
Use numbered codes like 1.1, 1.2 when present; otherwise invent sequential codes.
Do NOT invent NCERT Class 9 Science content unless the text is clearly that book.
Fresh curricula must start with hasVideoExplainer/hasGamifiedActivity implied false (omit media fields).`,
        user: [
          `Source file: ${fileName ?? 'textbook.pdf'}`,
          'Extract the real chapters and subtopics from this PDF text:',
          text.slice(0, 14000),
        ].join('\n\n'),
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Curriculum LLM timed out')), 45_000);
      }),
    ]);
    const parsed = llmCurriculumSchema.safeParse(raw);
    if (!parsed.success || parsed.data.chapters.length === 0) return null;
    return {
      chapters: seedFromLlm(parsed.data),
      documentTitle: parsed.data.documentTitle,
    };
  } catch (err) {
    console.warn('[textbook] LLM curriculum parse failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Parse an uploaded textbook into chapters + subtopics.
 * Prefer LLM structure; fall back to heading regex; only use NCERT seed when
 * the PDF is empty or clearly NCERT Class 9 Science.
 */
export async function parseTextbookIntoChaptersAsync(
  storagePath: string | null | undefined,
  opts?: { fileName?: string | null; titleHint?: string | null },
): Promise<{ chapters: SeedChapter[]; documentTitle?: string }> {
  const extracted = readTextbookText(storagePath).trim();
  const fileName = opts?.fileName ?? null;

  if (extracted.length > 80) {
    const llm = await parseCurriculumWithLlm(extracted, fileName);
    if (llm?.chapters.length) {
      return { chapters: llm.chapters, documentTitle: llm.documentTitle };
    }

    const headings = extractSubtopicHeadings(extracted);
    if (headings.length > 0) {
      if (looksLikeNcertScience(extracted, opts?.titleHint)) {
        return { chapters: mergeExtractedHeadings(headings) };
      }
      const only = chaptersFromHeadingsOnly(headings);
      if (only.length > 0) return { chapters: only };
    }
  }

  // Empty / unreadable PDF — NCERT fixture only when title/file suggests science class 9
  if (looksLikeNcertScience(extracted, opts?.titleHint ?? fileName)) {
    const headings = extractSubtopicHeadings(
      extracted.length > 0 ? extracted : NCERT_CLASS9_CH1_SAMPLE,
    );
    return { chapters: mergeExtractedHeadings(headings) };
  }

  // Generic fallback: single chapter from filename so UI is never stuck on NCERT
  const title = deriveTextbookTitle({
    explicitTitle: opts?.titleHint,
    fileName,
    storagePath,
  });
  return {
    chapters: [
      {
        title: `Chapter 1: ${title}`,
        summary: `Curriculum extracted from ${fileName ?? 'uploaded PDF'}. Re-verify after indexing more pages if structure looks incomplete.`,
        classProgressPct: 0,
        studentCount: 0,
        completedCount: 0,
        subtopics: [
          {
            code: '1.1',
            title: 'Introduction',
            hasVideoExplainer: false,
            hasGamifiedActivity: false,
            videoTitle: null,
            activityTitle: null,
            videoUrl: null,
          },
        ],
      },
    ],
    documentTitle: title,
  };
}

/** @deprecated sync helper — prefer parseTextbookIntoChaptersAsync */
export function parseTextbookIntoChapters(storagePath: string | null | undefined): SeedChapter[] {
  const extracted = readTextbookText(storagePath).trim();
  const sourceText = extracted.length > 0 ? extracted : NCERT_CLASS9_CH1_SAMPLE;
  const headings = extractSubtopicHeadings(sourceText);
  if (extracted.length > 0 && !looksLikeNcertScience(extracted)) {
    const only = chaptersFromHeadingsOnly(headings);
    if (only.length > 0) return only;
  }
  return mergeExtractedHeadings(headings);
}

export function isNcertScienceTextbook(opts: {
  title?: string | null;
  subject?: string | null;
  fileName?: string | null;
}): boolean {
  return looksLikeNcertScience('', `${opts.title ?? ''} ${opts.subject ?? ''} ${opts.fileName ?? ''}`);
}

/** Back-fill 1.4 / 1.5 on textbooks indexed before Chapter 1 was complete. */
export async function ensureCompleteChapterOneSubtopics(textbookId: string): Promise<boolean> {
  const textbook = await prisma.textbook.findUnique({
    where: { id: textbookId },
    select: { title: true, subject: true, fileName: true },
  });
  if (textbook && !isNcertScienceTextbook(textbook)) {
    return false;
  }

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
        hasVideoExplainer: false,
        hasGamifiedActivity: false,
        videoTitle: null,
        activityTitle: null,
        videoUrl: null,
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

/** Wipe curriculum + media linked to a textbook before re-index / replace. */
export async function clearTextbookCurriculum(
  textbookId: string,
  teacherId: string,
): Promise<void> {
  await prisma.studentDoubt.deleteMany({
    where: { teacherId, chapter: { textbookId } },
  });
  await prisma.ragChunk.deleteMany({ where: { textbookId } });
  // TeacherChapter cascade removes subtopics → activities, attachments
  await prisma.teacherChapter.deleteMany({ where: { textbookId } });
}
