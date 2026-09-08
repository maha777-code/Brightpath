import fs from 'node:fs';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import {
  BODY_EXTRACT_OPTS,
  extractPdfTextFromFile,
  extractPdfTextFromPathSync,
  iteratePdfStreamText,
  readPdfHeaderLatin1,
  TOC_EXTRACT_OPTS,
} from '../lib/pdf/extractPdfText.js';
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

/** Strip NUL / C0 controls PostgreSQL UTF8 rejects (`invalid byte sequence ... 0x00`). */
export function sanitizeUtf8(text: string): string {
  return text.replace(/\0/g, '').replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

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

function isPdfMagic(storagePath: string): boolean {
  try {
    const fd = fs.openSync(storagePath, 'r');
    try {
      const head = Buffer.alloc(5);
      const n = fs.readSync(fd, head, 0, 5, 0);
      return n >= 4 && head.subarray(0, 4).toString('utf8') === '%PDF';
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return storagePath.toLowerCase().endsWith('.pdf');
  }
}

function readPlainTextHead(storagePath: string, maxChars = 80_000): string {
  const size = fs.statSync(storagePath).size;
  const n = Math.min(size, maxChars);
  const buf = Buffer.alloc(n);
  const fd = fs.openSync(storagePath, 'r');
  try {
    fs.readSync(fd, buf, 0, n, 0);
    return buf.toString('utf8');
  } finally {
    fs.closeSync(fd);
  }
}

/** Bounded TOC/curriculum extract — never latin1-copies a 35MB+ PDF. */
export function readTextbookText(storagePath: string | null | undefined): string {
  if (!storagePath || !fs.existsSync(storagePath)) return '';
  try {
    if (isPdfMagic(storagePath)) {
      return extractPdfTextFromPathSync(storagePath, TOC_EXTRACT_OPTS);
    }
    return readPlainTextHead(storagePath);
  } catch {
    return '';
  }
}

export async function readTextbookTextAsync(storagePath: string | null | undefined): Promise<string> {
  if (!storagePath || !fs.existsSync(storagePath)) return '';
  try {
    if (isPdfMagic(storagePath)) {
      return extractPdfTextFromFile(storagePath, TOC_EXTRACT_OPTS);
    }
    return readPlainTextHead(storagePath);
  } catch {
    return '';
  }
}

/** Humanize "DSML.pdf" / "data_science_ml.pdf" → readable title. */
export function titleFromFileName(fileName: string | null | undefined): string {
  const base = String(fileName ?? '')
    .replace(/^.*[\\/]/, '')
    .replace(/\.pdf$/i, '')
    .replace(/^\d{10,}-/, '')
    .trim();
  if (!base) return 'Uploaded Textbook';
  const spaced = base
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
  if (/^dsml$/i.test(spaced)) return 'DSML - Data Science & Machine Learning';
  if (/^ncert/i.test(spaced)) return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
}

function isJunkPdfTitle(value: string | null | undefined): boolean {
  const t = String(value ?? '').trim();
  if (t.length < 2 || t.length > 200) return true;
  return /^(untitled|unknown|document|microsoft word( document)?|pdf)$/i.test(t);
}

function normalizeTitleKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function titleLooksLikeDsml(value: string): boolean {
  return /data\s*science|machine\s*learning|\bdsml\b/i.test(value);
}

function fileLooksLikeDsml(fileName: string | null | undefined): boolean {
  return titleLooksLikeDsml(String(fileName ?? ''));
}

export function titleAgreesWithFile(title: string | null | undefined, fileName: string | null | undefined): boolean {
  const t = String(title ?? '').trim();
  const f = String(fileName ?? '').trim();
  if (!t) return false;
  if (titleLooksLikeDsml(t) && !fileLooksLikeDsml(f)) return false;
  if (!f) return true;
  const tk = normalizeTitleKey(t);
  const fk = normalizeTitleKey(titleFromFileName(f));
  if (!tk || !fk) return false;
  return tk.includes(fk.slice(0, 10)) || fk.includes(tk.slice(0, 10));
}

/** First meaningful cover-page line (NCERT / state textbook mastheads). */
export function titleFromPdfCover(storagePath: string | null | undefined): string | null {
  if (!storagePath || !fs.existsSync(storagePath)) return null;
  try {
    const text = extractPdfTextFromPathSync(storagePath, {
      maxStreams: 8,
      maxChars: 6_000,
      maxStreamBytes: 800_000,
      maxFileBytes: 2 * 1024 * 1024,
    });
    const lines = text
      .split(/\n+/)
      .map((l) => l.replace(/\s+/g, ' ').trim())
      .filter((l) => l.length >= 6 && l.length <= 140 && /[a-zA-Z]{3,}/.test(l))
      .filter((l) => !/^contents$|^table of contents$|^index$/i.test(l));
    const preferred = lines.find((l) =>
      /ncert|science textbook|textbook for class|class\s*(ix|9|viii|8)|9th\s+.*science/i.test(l),
    );
    const chosen = preferred ?? lines[0];
    if (!chosen || isJunkPdfTitle(chosen)) return null;
    return sanitizeUtf8(chosen);
  } catch {
    return null;
  }
}

/** Read PDF `/Title` metadata when present. */
export function titleFromPdfMetadata(storagePath: string | null | undefined): string | null {
  if (!storagePath || !fs.existsSync(storagePath)) return null;
  try {
    const latin = readPdfHeaderLatin1(storagePath);
    const m = /\/Title\s*\(((?:\\.|[^\\)])*)\)/i.exec(latin);
    if (!m?.[1]) return null;
    const decoded = m[1]
      .replace(/\\n/g, ' ')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')')
      .replace(/\\\\/g, '\\')
      .replace(/\\(\d{1,3})/g, (_, oct: string) => String.fromCharCode(parseInt(oct, 8)))
      .trim();
    if (isJunkPdfTitle(decoded)) return null;
    return sanitizeUtf8(decoded);
  } catch {
    return null;
  }
}

/**
 * Title for a newly uploaded/verified PDF.
 * Never keeps a previously saved textbook title that does not match this file.
 */
export function deriveTextbookTitle(opts: {
  explicitTitle?: string | null;
  fileName?: string | null;
  storagePath?: string | null;
}): string {
  const fromFile = titleFromFileName(opts.fileName);
  const fromPdf = titleFromPdfMetadata(opts.storagePath);
  const fromCover = titleFromPdfCover(opts.storagePath);

  const usable = (value: string | null | undefined): string | null => {
    if (!value || isJunkPdfTitle(value)) return null;
    if (!titleAgreesWithFile(value, opts.fileName)) return null;
    return value;
  };

  const rich = (value: string | null): string | null =>
    value && value.trim().split(/\s+/).length >= 3 ? value : null;

  const pdf = usable(fromPdf);
  const cover = usable(fromCover);
  const explicit = usable(opts.explicitTitle?.trim());

  return (
    rich(pdf) ??
    rich(cover) ??
    (fromFile && fromFile !== 'Uploaded Textbook' ? fromFile : null) ??
    explicit ??
    pdf ??
    cover ??
    fromFile
  );
}

export function looksLikeNcertScience(text: string, title?: string | null): boolean {
  const blob = `${title ?? ''}\n${text.slice(0, 4000)}`.toLowerCase();
  return (
    /ncert/.test(blob) ||
    /matter in our surroundings/.test(blob) ||
    /physical nature of matter/.test(blob) ||
    (/(?:class\s*(?:ix|9)|9th)/.test(blob) && /science/.test(blob))
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
          sanitizeUtf8(text).slice(0, 14000),
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
  const extracted = (await readTextbookTextAsync(storagePath)).trim();
  const fileName = opts?.fileName ?? null;

  if (extracted.length > 80) {
    const llm = await parseCurriculumWithLlm(extracted, fileName);
    const llmStale =
      llm &&
      titleLooksLikeDsml(
        `${llm.documentTitle ?? ''} ${llm.chapters.map((c) => c.title).join(' ')}`,
      ) &&
      !fileLooksLikeDsml(fileName);
    if (llm?.chapters.length && !llmStale) {
      const freshTitle = deriveTextbookTitle({ fileName, storagePath });
      const documentTitle =
        llm.documentTitle && titleAgreesWithFile(llm.documentTitle, fileName)
          ? llm.documentTitle
          : freshTitle;
      return { chapters: llm.chapters, documentTitle };
    }

    const headings = extractSubtopicHeadings(extracted);
    if (headings.length > 0) {
      const hint = `${opts?.titleHint ?? ''} ${fileName ?? ''}`;
      if (looksLikeNcertScience(extracted, hint)) {
        return {
          chapters: mergeExtractedHeadings(headings),
          documentTitle: deriveTextbookTitle({ fileName, storagePath }),
        };
      }
      const only = chaptersFromHeadingsOnly(headings);
      if (only.length > 0) {
        return {
          chapters: only,
          documentTitle: deriveTextbookTitle({ fileName, storagePath }),
        };
      }
    }
  }

  // Empty / unreadable PDF — NCERT fixture only when title/file suggests science class 9
  if (looksLikeNcertScience(extracted, opts?.titleHint ?? fileName)) {
    const headings = extractSubtopicHeadings(
      extracted.length > 0 ? extracted : NCERT_CLASS9_CH1_SAMPLE,
    );
    return {
      chapters: mergeExtractedHeadings(headings),
      documentTitle: deriveTextbookTitle({ fileName, storagePath }),
    };
  }

  // Generic fallback: single chapter from filename so UI is never stuck on NCERT
  const title = deriveTextbookTitle({
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

function isPrismaUniqueConflict(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}

async function nextSubtopicSequenceOrder(chapterId: string): Promise<number> {
  const maxSubtopic = await prisma.teacherSubtopic.findFirst({
    where: { chapterId },
    orderBy: { sequenceOrder: 'desc' },
    select: { sequenceOrder: true },
  });
  return (maxSubtopic?.sequenceOrder ?? 0) + 1;
}

/** Back-fill 1.4 / 1.5 on textbooks indexed before Chapter 1 was complete. */
export async function ensureCompleteChapterOneSubtopics(textbookId: string): Promise<boolean> {
  try {
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

    const missing = CHAPTER_ONE_SUBTOPICS.filter(
      (s) => !chapter.subtopics.some((existing) => existing.code === s.code),
    );
    if (missing.length === 0) return false;

    let inserted = 0;
    for (const s of missing) {
      const already = await prisma.teacherSubtopic.findFirst({
        where: { chapterId: chapter.id, code: s.code },
        select: { id: true },
      });
      if (already) continue;

      let created: { id: string; code: string; title: string } | null = null;
      for (let attempt = 0; attempt < 8 && !created; attempt++) {
        const sequenceOrder = await nextSubtopicSequenceOrder(chapter.id);
        try {
          created = await prisma.teacherSubtopic.create({
            data: {
              chapterId: chapter.id,
              code: s.code,
              title: s.title,
              sequenceOrder,
              hasVideoExplainer: false,
              hasGamifiedActivity: false,
              videoTitle: null,
              activityTitle: null,
              videoUrl: null,
            },
            select: { id: true, code: true, title: true },
          });
        } catch (err) {
          if (isPrismaUniqueConflict(err)) {
            console.warn(
              `[textbook] P2002 on chapter ${chapter.id} sequenceOrder=${sequenceOrder} for ${s.code}; retrying`,
            );
            continue;
          }
          throw err;
        }
      }
      if (!created) {
        console.warn(`[textbook] skipped subtopic ${s.code} after unique-constraint retries`);
        continue;
      }

      try {
        const maxRag =
          (
            await prisma.ragChunk.aggregate({
              where: { textbookId },
              _max: { sequence: true },
            })
          )._max.sequence ?? 0;
        await prisma.ragChunk.create({
          data: {
            textbookId,
            content: sanitizeUtf8(`${chapter.title} — ${created.code} ${created.title}. ${chapter.summary}`),
            pageHint: sanitizeUtf8(`Chapter 1 / ${created.code}`),
            sequence: maxRag + 1,
          },
        });
      } catch (err) {
        console.warn(
          '[textbook] RAG chunk for chapter-one backfill failed:',
          err instanceof Error ? err.message : err,
        );
      }
      inserted += 1;
    }

    if (inserted > 0) {
      await prisma.textbook.update({
        where: { id: textbookId },
        data: {
          indexedChunkCount: { increment: inserted },
        },
      });
      return true;
    }
    return false;
  } catch (err) {
    console.error(
      '[textbook] ensureCompleteChapterOneSubtopics failed:',
      err instanceof Error ? err.message : err,
    );
    return false;
  }
}

export async function ensureCompleteChapterOneForTeacher(teacherId: string): Promise<void> {
  const textbooks = await prisma.textbook.findMany({
    where: { teacherId },
    select: { id: true },
  });
  for (const tb of textbooks) {
    try {
      await ensureCompleteChapterOneSubtopics(tb.id);
    } catch (err) {
      console.error(
        `[textbook] chapter-one backfill failed for ${tb.id}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}

/** Wipe curriculum + media linked to a textbook before re-index / replace. */
export async function clearTextbookCurriculum(
  textbookId: string,
  teacherId: string,
): Promise<void> {
  const chapters = await prisma.teacherChapter.findMany({
    where: { textbookId },
    select: { subtopics: { select: { id: true } } },
  });
  const subtopicIds = chapters.flatMap((ch) => ch.subtopics.map((s) => s.id));
  if (subtopicIds.length) {
    try {
      const { topicAudioPath, topicVideoPath } = await import('../lib/videoPipeline/mediaPaths.js');
      await Promise.all(
        subtopicIds.flatMap((id) => [
          fs.promises.unlink(topicVideoPath(id)).catch(() => undefined),
          fs.promises.unlink(topicAudioPath(id)).catch(() => undefined),
        ]),
      );
    } catch {
      /* media cleanup is best-effort */
    }
  }

  await prisma.studentDoubt.deleteMany({
    where: { teacherId, chapter: { textbookId } },
  });
  await prisma.ragChunk.deleteMany({ where: { textbookId } });
  await prisma.teacherChapter.deleteMany({ where: { textbookId } });
}

const PDF_BODY_CHUNK_SIZE = 900;
const PDF_BODY_MAX_CHUNKS = 80;
const PDF_EMBED_BATCH = 8;

async function persistPdfBodyChunkBatch(
  textbookId: string,
  pieces: string[],
  startSequence: number,
  startIndex: number,
): Promise<number> {
  if (!pieces.length) return 0;
  const { embedTexts, toPgVectorLiteral } = await import('../lib/embeddings.js');
  let embeddings: number[][] = [];
  try {
    embeddings = await Promise.race([
      embedTexts(pieces),
      new Promise<number[][]>((resolve) => {
        setTimeout(() => resolve([]), 12_000);
      }),
    ]);
  } catch {
    embeddings = [];
  }

  let wrote = 0;
  for (let i = 0; i < pieces.length; i++) {
    const content = sanitizeUtf8(pieces[i] ?? '').trim();
    if (!content) continue;
    const pageHint = sanitizeUtf8(`pdf_body / chunk ${startIndex + wrote + 1}`);
    try {
      const created = await prisma.ragChunk.create({
        data: {
          textbookId,
          content,
          pageHint,
          sequence: startSequence + wrote,
          sourceType: 'textbook_pdf',
          embedding: embeddings[i] ?? [],
        },
      });
      const vec = embeddings[i];
      if (vec?.length) {
        const literal = toPgVectorLiteral(vec);
        const id = created.id.replace(/'/g, "''");
        try {
          await prisma.$executeRawUnsafe(
            `UPDATE "RagChunk" SET embedding_vec = '${literal}'::vector WHERE id = '${id}'`,
          );
        } catch {
          /* Json embedding still stored */
        }
      }
      wrote += 1;
    } catch (err) {
      console.warn(
        '[textbook] skipped RAG chunk (UTF8/persist):',
        err instanceof Error ? err.message : err,
      );
    }
  }
  return wrote;
}

/** Index PDF body in streamed 900-char chunks — never hold the full document string. */
export async function ensureTextbookPdfBodyChunks(
  textbookId: string,
  storagePath: string | null | undefined,
): Promise<number> {
  const existing = await prisma.ragChunk.count({
    where: { textbookId, sourceType: 'textbook_pdf' },
  });
  if (existing > 0) return existing;
  if (!storagePath || !fs.existsSync(storagePath)) return existing;

  let leftover = '';
  const pending: string[] = [];
  let createdCount = 0;
  let maxSeq =
    (
      await prisma.ragChunk.aggregate({
        where: { textbookId },
        _max: { sequence: true },
      })
    )._max.sequence ?? 0;

  const flushPending = async () => {
    if (!pending.length || createdCount >= PDF_BODY_MAX_CHUNKS) {
      pending.length = 0;
      return;
    }
    const take = Math.min(PDF_EMBED_BATCH, PDF_BODY_MAX_CHUNKS - createdCount, pending.length);
    const batch = pending.splice(0, take);
    const wrote = await persistPdfBodyChunkBatch(textbookId, batch, maxSeq + 1, createdCount);
    maxSeq += wrote;
    createdCount += wrote;
  };

  const absorb = async (raw: string) => {
    leftover = `${leftover} ${sanitizeUtf8(raw).replace(/\s+/g, ' ').trim()}`.trim();
    while (leftover.length >= PDF_BODY_CHUNK_SIZE && createdCount + pending.length < PDF_BODY_MAX_CHUNKS) {
      pending.push(leftover.slice(0, PDF_BODY_CHUNK_SIZE));
      leftover = leftover.slice(PDF_BODY_CHUNK_SIZE);
      if (pending.length >= PDF_EMBED_BATCH) await flushPending();
    }
    if (leftover.length > PDF_BODY_CHUNK_SIZE * 2) {
      leftover = leftover.slice(0, PDF_BODY_CHUNK_SIZE);
    }
  };

  if (isPdfMagic(storagePath)) {
    for await (const piece of iteratePdfStreamText(storagePath, BODY_EXTRACT_OPTS)) {
      await absorb(piece);
      if (createdCount >= PDF_BODY_MAX_CHUNKS) break;
    }
  } else {
    await absorb(readPlainTextHead(storagePath, 80_000));
  }

  if (leftover.trim().length >= 80 && createdCount + pending.length < PDF_BODY_MAX_CHUNKS) {
    pending.push(leftover.slice(0, PDF_BODY_CHUNK_SIZE));
  }
  leftover = '';
  while (pending.length && createdCount < PDF_BODY_MAX_CHUNKS) {
    await flushPending();
  }

  if (createdCount > 0) {
    await prisma.textbook.update({
      where: { id: textbookId },
      data: { indexedChunkCount: { increment: createdCount } },
    });
  }
  console.log(
    `[textbook] Indexed ${createdCount} PDF body chunks for ${textbookId} (was ${existing} textbook_pdf rows)`,
  );
  return createdCount;
}
