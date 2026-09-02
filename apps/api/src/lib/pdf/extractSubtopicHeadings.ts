/**
 * NCERT-style numbered subtopic heading extractor.
 *
 * Does not stop at page breaks, form feeds, bold markers, or the first handful
 * of matches — Class 9 Chapter 1 has five headings (1.1–1.5), including titles
 * that end with '?' such as "1.4 Can Matter Change Its State?".
 */

export const MAX_SUBTOPICS_PER_CHAPTER = 40;
export const MAX_SUBTOPIC_HEADINGS = 200;

export type ExtractedSubtopicHeading = {
  code: string;
  chapterNumber: number;
  index: number;
  title: string;
};

/** Canonical Class 9 Chapter 1 titles used to normalise extracted headings. */
export const CHAPTER_ONE_CANONICAL_TITLES: Record<string, string> = {
  '1.1': 'Physical Nature of Matter',
  '1.2': 'Characteristics of Particles of Matter',
  '1.3': 'States of Matter',
  '1.4': 'Can Matter Change Its State?',
  '1.5': 'Evaporation',
};

/**
 * Sample NCERT Chapter 1 body with page breaks — used when PDF text extraction
 * is empty so the heading regex is still exercised across form feeds / bold.
 */
export const NCERT_CLASS9_CH1_SAMPLE = `
Chapter 1
Matter in Our Surroundings

1.1 Physical Nature of Matter
Matter is anything that occupies space and has mass.

\f
12
MATTER IN OUR SURROUNDINGS

1.2 Characteristics of Particles of Matter
Particles of matter have space between them and are continuously moving.

\f
13

1.3 States of Matter
The three states of matter are solid, liquid and gas.

\f
14
**1.4 Can Matter Change Its State?**
Matter can change from one state to another by changing temperature or pressure.

\f
15
1.5 Evaporation
Evaporation is a surface phenomenon. The rate of evaporation increases with
an increase of surface area and temperature.
`;

/**
 * Numbered heading at line start. Allows:
 * - form-feed / page-number lines before the heading
 * - extra spaces from PDF bold runs
 * - title wrapping onto the next line after the code
 * - question-mark titles (1.4)
 */
const SUBTOPIC_HEADING_RE =
  /(?:^|[\n\r\f])[ \t]*(?:\*\*)?(\d{1,2})\.(\d{1,2})(?:\*\*)?[ \t]*(?:\*\*)?[ \t]*\n?[ \t]*([A-Za-z][^\n\r\f]{2,160})/g;

function stripDecorators(title: string): string {
  return title
    .replace(/\*\*/g, '')
    .replace(/^[\s•·.\-–—]+/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.\s]+$/, (tail) => (tail.includes('?') ? '?' : ''));
}

function isLikelyHeading(title: string, minor: number): boolean {
  if (minor < 1 || minor > 20) return false;
  if (title.length < 6) return false;
  if (/^(fig\.?|figure|table|activity|question|exercise|example|page)\b/i.test(title)) {
    return false;
  }
  // Skip quantities like "1.2 g of salt" / "1.5 °C"
  if (/^(\d|g\b|kg\b|ml\b|cm\b|°)/i.test(title)) return false;
  return /[A-Za-z]{4,}/.test(title);
}

/** Normalise PDF/page-break artefacts so headings remain line-anchored. */
export function normalizeExtractedText(raw: string): string {
  return raw
    .replace(/\u0000/g, '')
    .replace(/\f/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u00A0\u2000-\u200B]/g, ' ')
    .replace(/-\n\s*/g, '')
    .replace(/\n[ \t]*\d{1,3}[ \t]*\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n');
}

export function extractSubtopicHeadings(rawText: string): ExtractedSubtopicHeading[] {
  const text = normalizeExtractedText(rawText);
  const found: ExtractedSubtopicHeading[] = [];
  const seen = new Set<string>();

  const headingRe = new RegExp(SUBTOPIC_HEADING_RE.source, SUBTOPIC_HEADING_RE.flags);
  let match: RegExpExecArray | null;
  while ((match = headingRe.exec(text))) {
    if (found.length >= MAX_SUBTOPIC_HEADINGS) break;

    const chapterNumber = Number(match[1]);
    const index = Number(match[2]);
    const code = `${chapterNumber}.${index}`;
    if (seen.has(code)) continue;

    const perChapter = found.filter((h) => h.chapterNumber === chapterNumber).length;
    if (perChapter >= MAX_SUBTOPICS_PER_CHAPTER) continue;

    const title = stripDecorators(match[3]);
    if (!isLikelyHeading(title, index)) continue;

    seen.add(code);
    found.push({
      code,
      chapterNumber,
      index,
      title: CHAPTER_ONE_CANONICAL_TITLES[code] ?? title,
    });
  }

  return found.sort((a, b) => a.chapterNumber - b.chapterNumber || a.index - b.index);
}
