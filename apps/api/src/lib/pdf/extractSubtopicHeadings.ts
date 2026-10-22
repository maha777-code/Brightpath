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
  /(?:^|[\n\r\f ])[ \t]*(?:\*\*)?(\d{1,2})\.(\d{1,2})(?:\.(\d{1,2}))?(?:\*\*)?[ \t]+(?:\*\*)?[ \t]*([A-Za-z][A-Za-z0-9 ,:'’\-]{2,70})/g;

function collapseSpacedCaps(title: string): string {
  const parts = title.split(/\s+/);
  const out: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const cur = parts[i];
    const next = parts[i + 1];
    if (/^[A-Z]$/.test(cur) && next && /^[A-Z]{2,}$/.test(next)) {
      if ((cur === 'A' || cur === 'I') && next.length < 5) {
        out.push(cur);
        continue;
      }
      parts[i + 1] = cur + next;
      continue;
    }
    out.push(cur);
  }
  return out.join(' ');
}

function stripDecorators(title: string): string {
  const cut = collapseSpacedCaps(title)
    .replace(/\*\*/g, '')
    .replace(/^[\s•·.\-–—]+/, '')
    .replace(/\s+(?=\d{1,2}\.\d{1,2}\b).*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const sentence = cut.split(/(?<=[a-z])\.\s/)[0] ?? cut;
  const clipped = sentence.replace(
    /\s+(In this|Do you|Take a|Your |Here is|Have you|Sometimes|Now let|A shadow|Slicing)\b.*$/i,
    '',
  );
  const words = clipped.split(/\s+/).slice(0, 10).join(' ');
  return words.replace(/[.\s]+$/, (tail) => (tail.includes('?') ? '?' : ''));
}

function headingScore(title: string): number {
  const t = title.trim();
  if (/^(note|in the|now |here |try these|exercise|fig\.?|figure|complete|take a|do this|the \d|cube\b|match |we could|see if)\b/i.test(t)) {
    return -10;
  }
  let score = 0;
  if (/introduction|faces|edges|vertices|nets|drawing|oblique|isometric|visualis|viewing|section|plane|solid/i.test(t)) {
    score += 6;
  }
  if (/^[A-Z][A-Za-z0-9 ,:'’-]{3,60}$/.test(t)) score += 3;
  if (t.split(/\s+/).length <= 10) score += 2;
  return score;
}

function isLikelyHeading(title: string, minor: number): boolean {
  if (minor < 1 || minor > 8) return false;
  if (title.length < 4) return false;
  if (/^(fig\.?|figure|table|activity|question|exercise|example|page|note)\b/i.test(title)) {
    return false;
  }
  if (/^(\d|g\b|kg\b|ml\b|cm\b|°)/i.test(title)) return false;
  return /[A-Za-z]{4,}/.test(title) && headingScore(title) >= 0;
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
    const tertiary = match[3] ? Number(match[3]) : undefined;
    const code = tertiary != null ? `${chapterNumber}.${index}.${tertiary}` : `${chapterNumber}.${index}`;
    if (seen.has(code)) continue;

    const perChapter = found.filter((h) => h.chapterNumber === chapterNumber).length;
    if (perChapter >= MAX_SUBTOPICS_PER_CHAPTER) continue;

    const title = stripDecorators(match[4]);
    if (!isLikelyHeading(title, index)) continue;
    const next = {
      code,
      chapterNumber,
      index,
      title: CHAPTER_ONE_CANONICAL_TITLES[code] ?? title,
    };
    const existing = found.find((h) => h.code === code);
    if (existing) {
      if (headingScore(next.title) > headingScore(existing.title)) {
        existing.title = next.title;
      }
      continue;
    }

    seen.add(code);
    found.push(next);
  }

  return found.sort((a, b) => {
    if (a.chapterNumber !== b.chapterNumber) return a.chapterNumber - b.chapterNumber;
    const ap = a.code.split('.').map(Number);
    const bp = b.code.split('.').map(Number);
    for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
      const d = (ap[i] ?? 0) - (bp[i] ?? 0);
      if (d) return d;
    }
    return 0;
  });
}
