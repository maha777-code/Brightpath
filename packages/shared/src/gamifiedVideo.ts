export const GAMIFIED_VIDEO_STORAGE_KEY = 'mv-gamified-video-spec';

export type GamifiedVideoMode = 'quiz' | 'branch' | 'escape' | 'skill';

export interface GamifiedVideoChoice {
  id: string;
  text: string;
  correct: boolean;
  jumpTo?: number;
}

export interface GamifiedVideoNode {
  id: string;
  at: number;
  mode: GamifiedVideoMode;
  xp: number;
  prompt: string;
  hint?: string;
  options?: GamifiedVideoChoice[];
  code?: string;
  timerSec?: number;
  feedbackCorrect?: string;
  feedbackWrong?: string;
}

export interface GamifiedVideoSpec {
  id: string;
  title: string;
  subject: string;
  textbookTitle?: string;
  chapterTitle?: string;
  topicTitle?: string;
  sourceNote?: string;
  video: { type: 'html5' | 'youtube'; src: string };
  nodes: GamifiedVideoNode[];
}

export interface GamifiedVideoGeneratePayload {
  chapterId?: string;
  subtopicId?: string;
}

export interface GamifiedVideoGenerateResponse {
  spec: GamifiedVideoSpec;
  insights: { keyTerms: string[]; learningObjectives: string[]; misconceptions: string[] };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function asChoices(value: unknown, fallback: GamifiedVideoChoice[]): GamifiedVideoChoice[] {
  if (!Array.isArray(value)) return fallback;
  const next = value
    .map((item, index): GamifiedVideoChoice | null => {
      const rec = asRecord(item);
      if (!rec) return null;
      const text = asString(rec.text);
      if (!text) return null;
      return {
        id: asString(rec.id, String.fromCharCode(65 + index)),
        text,
        correct: Boolean(rec.correct),
        jumpTo: typeof rec.jumpTo === 'number' ? rec.jumpTo : undefined,
      };
    })
    .filter((item): item is GamifiedVideoChoice => Boolean(item));
  return next.length ? next : fallback;
}

export function fallbackGamifiedVideoSpec(ctx: {
  topic: string;
  chapterTitle: string;
  subject: string;
  textbookTitle?: string;
  gradeLabel?: string;
  excerpts?: string[];
  videoSrc?: string;
  videoType?: 'html5' | 'youtube';
}): GamifiedVideoSpec {
  const topic = ctx.topic || ctx.chapterTitle || 'this unit';
  const excerpt = (ctx.excerpts?.[0] || '').replace(/\s+/g, ' ').slice(0, 180);
  const code = topic.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase().padEnd(3, 'X').slice(0, 4);
  return {
    id: `textbook-${topic.replace(/[^\w]+/g, '-').toLowerCase()}`,
    title: `${topic} Interactive Video`,
    subject: [ctx.subject, ctx.gradeLabel].filter(Boolean).join(' · '),
    textbookTitle: ctx.textbookTitle,
    chapterTitle: ctx.chapterTitle,
    topicTitle: topic,
    sourceNote: excerpt
      ? `Grounded in the uploaded textbook: ${excerpt}`
      : `Grounded in ${ctx.textbookTitle || 'the uploaded textbook'} · ${ctx.chapterTitle}`,
    video: {
      type: ctx.videoType || 'html5',
      src: ctx.videoSrc || '',
    },
    nodes: [
      {
        id: 'n1',
        at: 6,
        mode: 'quiz',
        xp: 100,
        prompt: `From the textbook section on ${topic}, which statement matches the core idea?`,
        hint: excerpt || `Use the definition given in ${ctx.chapterTitle}.`,
        options: [
          { id: 'A', text: `The defining property of ${topic} as stated in the chapter`, correct: true },
          { id: 'B', text: `A property that belongs to a different chapter`, correct: false },
          { id: 'C', text: `${topic} is only a lab trick, not a real model`, correct: false },
          { id: 'D', text: 'The textbook says this idea can be ignored', correct: false },
        ],
        feedbackCorrect: `Yes — that is how ${ctx.chapterTitle} defines ${topic}.`,
        feedbackWrong: `Re-read the textbook explanation of ${topic}.`,
      },
      {
        id: 'n2',
        at: 16,
        mode: 'skill',
        xp: 50,
        prompt: `True or false: ${topic} can be understood without the conditions given in the textbook.`,
        hint: 'The chapter states required conditions before the result holds.',
        options: [
          { id: 'T', text: 'True', correct: false },
          { id: 'F', text: 'False', correct: true },
        ],
        feedbackCorrect: `False. ${topic} only holds under the conditions in the textbook.`,
        feedbackWrong: `The textbook lists required conditions for ${topic}.`,
      },
      {
        id: 'n3',
        at: 28,
        mode: 'escape',
        xp: 150,
        timerSec: 25,
        code,
        prompt: `Enter the ${code.length}-letter lock made from the key term for ${topic}.`,
        hint: `Use the first letters of the unit name: ${topic}.`,
        feedbackCorrect: `Unlocked with the unit key ${code}.`,
        feedbackWrong: `The code is taken from the textbook heading for ${topic}.`,
      },
      {
        id: 'n4',
        at: 42,
        mode: 'branch',
        xp: 120,
        prompt: `A classmate applies ${topic} in a way that contradicts ${ctx.chapterTitle}. What do you do?`,
        hint: excerpt || 'Stay with the textbook model.',
        options: [
          { id: 'A', text: 'Ignore the textbook and guess', correct: false, jumpTo: 16 },
          { id: 'B', text: `Apply the textbook rule for ${topic}`, correct: true },
          { id: 'C', text: 'Skip the conditions and jump to the conclusion', correct: false, jumpTo: 6 },
        ],
        feedbackCorrect: `That choice follows ${ctx.chapterTitle}.`,
        feedbackWrong: `The textbook does not support that shortcut. Review the earlier checkpoint.`,
      },
    ],
  };
}

export function parseGamifiedVideoSpec(
  raw: unknown,
  fallback: GamifiedVideoSpec,
): GamifiedVideoSpec {
  const rec = asRecord(raw) ?? {};
  const videoRec = asRecord(rec.video) ?? {};
  const nodesRaw = Array.isArray(rec.nodes) ? rec.nodes : [];
  const nodes = fallback.nodes.map((base, index) => {
    const item = asRecord(nodesRaw[index]) ?? {};
    const mode = asString(item.mode, base.mode) as GamifiedVideoMode;
    return {
      ...base,
      id: asString(item.id, base.id),
      at: asNumber(item.at, base.at),
      mode: mode === 'quiz' || mode === 'branch' || mode === 'escape' || mode === 'skill' ? mode : base.mode,
      xp: asNumber(item.xp, base.xp),
      prompt: asString(item.prompt, base.prompt),
      hint: asString(item.hint, base.hint),
      options: asChoices(item.options, base.options || []),
      code: asString(item.code, base.code || ''),
      timerSec: asNumber(item.timerSec, base.timerSec || 20),
      feedbackCorrect: asString(item.feedbackCorrect, base.feedbackCorrect || ''),
      feedbackWrong: asString(item.feedbackWrong, base.feedbackWrong || ''),
    };
  });
  return {
    ...fallback,
    id: asString(rec.id, fallback.id),
    title: asString(rec.title, fallback.title),
    subject: asString(rec.subject, fallback.subject),
    textbookTitle: asString(rec.textbookTitle, fallback.textbookTitle || ''),
    chapterTitle: asString(rec.chapterTitle, fallback.chapterTitle || ''),
    topicTitle: asString(rec.topicTitle, fallback.topicTitle || ''),
    sourceNote: asString(rec.sourceNote, fallback.sourceNote || ''),
    video: {
      type: asString(videoRec.type, fallback.video.type) === 'youtube' ? 'youtube' : 'html5',
      src: asString(videoRec.src, fallback.video.src),
    },
    nodes,
  };
}
