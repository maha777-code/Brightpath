import type { LessonPlanPayload, LessonPlanResponse } from './teacherTools.js';

/** Chapter body sent to the model after front matter is removed. */
const CHAPTER_BODY_CAP = 15_000;
const SCAN_CAP = 120_000;
const MIN_READABLE_LETTERS = 100;

const FILE_MARKER =
  /===\s*ATTACHED FILE CONTENT(?:\s*\([^)]*\))?\s*===|---\s*Page\s+\d+\s+---/gi;

export interface LessonSourceBrief {
  chapterTitle: string;
  concepts: string[];
  terms: string[];
  standards: string[];
  /** Chapter body, capped for the model prompt. */
  cleanedText: string;
  /** False when the attachment is only publisher or copyright text. */
  readable: boolean;
}

function unique(items: string[], limit: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (!item || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

function stripBoilerplate(line: string): string {
  return line
    .replace(/government of karnataka/gi, '')
    .replace(/@?ktbs/gi, '')
    .replace(/not to be republished/gi, '')
    .replace(/\bcopyright\b[^.\n]{0,80}/gi, '')
    .replace(/\ball rights reserved\b[^.\n]{0,40}/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const FRONT_MATTER =
  /karnataka textbook society|malleshwaram|not to be republished|government of karnataka|textbook committee|national curriculum framework|all rights reserved|\bisbn\b|^\s*preface\b|^\s*foreword\b|^\s*contents\b|price\s*:/i;

function isFrontMatter(line: string): boolean {
  if (line.length > 280 && (line.match(/[.!?]/g) ?? []).length >= 2) return false;
  return FRONT_MATTER.test(line) || /\.{4,}/.test(line);
}

function tidyTopic(topic: string): string {
  return topic
    .replace(/view files?/gi, ' ')
    .replace(/\b\d+\s*files?\b/gi, ' ')
    .replace(/\bgrade\s*\d+\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** First substantial "Chapter N" block, skipping table-of-contents lines. */
function isolateChapter(text: string): string {
  const re = /\bchapter\s+\d+\b/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const firstLine = text.slice(match.index, match.index + 220).split('\n')[0] ?? '';
    const toc = firstLine.length < 180 && (/\.{3,}|…/.test(firstLine) || /\b\d{1,3}\s*$/.test(firstLine));
    const window = text.slice(match.index, match.index + 900);
    const letters = window.replace(/[^\p{L}]/gu, '').length;
    if (!toc && letters >= 80) return text.slice(match.index);
  }
  return text;
}

function letterCount(value: string): number {
  return value.replace(/[^\p{L}]/gu, '').length;
}

/** Remove symbol-font garbage, publisher front matter, and everything before the chapter body. */
export function cleanLessonSource(raw: string | undefined, topicHint?: string): LessonSourceBrief {
  const source = (raw ?? '').slice(0, SCAN_CAP);
  const stripped = source
    .replace(FILE_MARKER, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    .replace(/[\uE000-\uF8FF\uFFF0-\uFFFF\uFFFD]/g, '')
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F]/g, '');

  const kept: string[] = [];
  for (const rawLine of stripped.split(/\r?\n/)) {
    const line = stripBoilerplate(rawLine.replace(/[ \t]+/g, ' ').trim());
    if (!line || isFrontMatter(line)) {
      if (kept.length && kept[kept.length - 1] !== '') kept.push('');
      continue;
    }
    const letters = line.replace(/[^\p{L}\p{N}]/gu, '');
    if (letters.length < 3) continue;
    if (line.length > 12 && letters.length / line.length < 0.45) continue;
    kept.push(line);
  }

  const chapter = isolateChapter(kept.join('\n').replace(/\n{3,}/g, '\n\n').trim());
  const brief = extractLessonBrief(chapter || tidyTopic(topicHint ?? ''));
  const cleanedText = chapter.slice(0, CHAPTER_BODY_CAP);
  return {
    ...brief,
    cleanedText,
    readable: letterCount(cleanedText) >= MIN_READABLE_LETTERS,
  };
}

function extractLessonBrief(text: string): Omit<LessonSourceBrief, 'cleanedText' | 'readable'> {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean);
  const chapterLine = lines.find((line) => /^(chapter|unit|lesson)\b/i.test(line));
  const titleSource =
    chapterLine?.replace(/^(chapter|unit|lesson)\s+\d+\s*[:.\-–—]?\s*/i, '').trim() ||
    lines.find((line) => line.length >= 8 && line.length <= 90) ||
    '';

  const standards = unique(
    [...text.matchAll(/\b(?:NGSS\s+)?(?:HS|MS|K)-[A-Z]{1,5}\d-\d+\b|\bCCSS(?:\.[A-Z0-9-]+)+|\bTEKS\s+[A-Z0-9.]+/gi)].map(
      (match) => match[0],
    ),
    6,
  );

  const termBlock = text.match(/key\s+(?:words|terms|vocabulary|concepts)\s*[:\n]+([\s\S]{0,600})/i);
  const terms = unique(
    (termBlock?.[1] ?? '')
      .split(/[,;\n•·]/)
      .map((item) => item.replace(/^[\d.)\s-]+/, '').trim())
      .filter((item) => item.length > 2 && item.length < 42 && !/[.!?]$/.test(item) && !/\b(?:NGSS|CCSS|TEKS|HS-|MS-)\b/i.test(item)),
    8,
  );

  const concepts = unique(
    lines.filter((line) => line.length >= 40 && line.length <= 220 && line !== chapterLine),
    4,
  );

  return {
    chapterTitle: titleSource.slice(0, 140),
    concepts,
    terms,
    standards,
  };
}

export function lessonSubjectLabel(topic: string, brief: LessonSourceBrief): string {
  const typed = tidyTopic(topic.split('\n')[0] ?? '');
  const generic = !typed || /generate lesson plan|explain the idea|^chapter\s+\d+\b/i.test(typed);
  if (brief.chapterTitle && (generic || brief.chapterTitle.length > typed.length)) return brief.chapterTitle;
  return (typed || brief.chapterTitle || 'the assigned concept').slice(0, 160);
}

/** Classroom-ready plan used when the model is unavailable. Does not quote raw file text. */
export function classroomLessonPlanFallback(input: LessonPlanPayload): LessonPlanResponse {
  const brief = cleanLessonSource(input.attachedDocumentContext, input.topic);
  const subject = lessonSubjectLabel(input.topic, brief);
  const concept = brief.concepts[0] || subject;
  const termList = brief.terms.slice(0, 4);
  const terms = termList.length ? termList.join(', ') : 'the core terms from this lesson';
  const namedStandards = [
    ...(input.standards ? input.standards.split(/[;,\n]/).map((item) => item.trim()).filter(Boolean) : []),
    ...brief.standards,
  ];
  return {
    title: `${subject} — ${input.gradeLevel}`,
    gradeLevel: input.gradeLevel,
    objective: `Students will be able to explain ${subject} and apply ${terms} to a new example, using evidence from the lesson.`,
    standards: namedStandards.length
      ? [...new Set(namedStandards)].slice(0, 6)
      : [`${input.gradeLevel} science or subject objective for ${subject}`],
    durationMinutes: 50,
    materials: ['Student notebooks', 'Station task cards', 'Whiteboard or slide deck', 'Exit ticket slips'],
    sections: [
      {
        heading: 'Key Points',
        activities: [
          `${subject} is the focus of this lesson, not a generic chapter label.`,
          concept,
          `Students must be able to use these terms accurately: ${terms}.`,
        ],
      },
      {
        heading: 'Opening',
        minutes: 8,
        activities: [
          `Ask what students already know that connects to ${subject}.`,
          'Pose one real-world comparison and have pairs answer before sharing.',
          `Frame why ${subject} matters in this unit and what they will be able to do by the end.`,
        ],
      },
      {
        heading: 'Introduction to New Material',
        minutes: 12,
        activities: [
          `Walk through ${subject} in a short sequence, pausing to check the meaning of each term.`,
          `Explain the model students should use: ${concept}`,
          'Contrast two related ideas so students can say what each one is and what it is not.',
          `Common Misconception: students treat the topic label as the explanation instead of describing ${subject}.`,
          'Correction: require a because-statement that names the concept and one piece of evidence.',
        ],
      },
      {
        heading: 'Guided Practice',
        minutes: 15,
        activities: [
          `Station 1 (Define): students match ${terms} to a short classroom example and justify the match.`,
          'Station 2 (Model): students sketch or sequence the process and label each step.',
          'Station 3 (Apply): students answer two probing questions about a new case of the same concept.',
          'Teacher Role: circulate, listen for the misconception above, and prompt students to revise with evidence.',
        ],
      },
      {
        heading: 'Independent Practice',
        minutes: 8,
        activities: [
          `Students apply ${subject} to a new real-world scenario in 5–7 sentences or a labeled sketch.`,
        ],
      },
      {
        heading: 'Closing',
        minutes: 5,
        activities: [
          `Sentence frame: "Today I can explain ${subject} because ___."`,
          'Preview the next lesson as a consequence of today’s concept, not a new unrelated topic.',
        ],
      },
      {
        heading: 'Extension / Above-Grade Challenge',
        activities: [
          `Students design a case where ${subject} would fail or change, and explain the condition that causes it.`,
        ],
      },
      {
        heading: 'Homework',
        activities: [
          `Find one example of ${subject} outside class and explain it with the lesson’s key terms.`,
        ],
      },
    ],
    assessment: `Formative check during stations plus an exit ticket: explain ${subject} and give one correct example using the key terms. Success means the explanation names the concept and the example fits it.`,
    differentiation: [
      'Below grade level: provide a word bank, a labeled diagram, and sentence frames for the explanation.',
      'On grade level: students complete every station and the independent scenario with the key terms.',
      `Above grade level: connect ${subject} to a pattern or second concept and defend the connection.`,
    ].join('\n'),
  };
}
