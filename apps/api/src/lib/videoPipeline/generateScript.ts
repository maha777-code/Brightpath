import type {
  LessonSlide,
  LessonSlideColumn,
  LessonSlideLayout,
  OverviewStat,
  SceneVisualConfig,
  VideoSceneParameters,
  VideoSceneSpec,
  VideoScriptManifest,
} from '@brightpath/shared';
import { getLessonVideoScriptProvider, LESSON_VIDEO_MODEL } from '../llm/provider.js';
import { detectContentDomain, extractFormulasFromContext } from './contentDomain.js';
import type { TopicContextPacket } from './types.js';

export type OverviewLength = 'short' | 'standard' | 'long';

const OVERVIEW_LAYOUTS: LessonSlideLayout[] = [
  'title',
  'bullets',
  'quote',
  'stat',
  'two_column',
  'diagram',
  'image_caption',
];

const LENGTH_RULES: Record<
  OverviewLength,
  { minSlides: number; maxSlides: number; minSec: number; maxSec: number }
> = {
  short: { minSlides: 8, maxSlides: 10, minSec: 150, maxSec: 210 },
  standard: { minSlides: 10, maxSlides: 13, minSec: 180, maxSec: 360 },
  long: { minSlides: 13, maxSlides: 15, minSec: 300, maxSec: 480 },
};

const WORDS_PER_SEC = 2.4;
const SLIDE_PADDING_SEC = 0.4;

const LESSON_SCRIPT_PROMPT = `
You write NotebookLM-style Video Overviews for Brightpath / MindVault.

You are given ONE uploaded textbook subtopic. Your job is to turn those sources into a narrated slide explainer — clean slides, spoken narration that teaches, no invented facts.

OUTPUT (STRICT JSON only — no markdown fences):
{
  "title": string,
  "audience": string,
  "architecture": "video_overview",
  "slides": [
    {
      "id": number,
      "layout": "title" | "bullets" | "quote" | "stat" | "two_column" | "diagram" | "image_caption",
      "heading": string,
      "bullets": [string],
      "stat": { "value": string, "label": string } | null,
      "quote": string | null,
      "left": { "label": string, "points": [string] } | null,
      "right": { "label": string, "points": [string] } | null,
      "visual_prompt": string | null,
      "narration": string,
      "source_refs": [string]
    }
  ]
}

SLIDE RULES
- Slide count and length follow the user message (short / standard / long). Never fewer than 8 or more than 15 slides.
- Slide 1 MUST be layout "title": hook the chapter, heading = the real subtopic name from the sources.
- Last slide MUST recap (layout "bullets" or "stat") — what to remember, grounded in the text.
- Mix layouts. Use "quote" only for a line that actually appears in the excerpts. Use "stat" only for a number/measure that appears in the excerpts. Use "two_column" for contrasts the chapter itself draws. Use "diagram" for a process or labelled parts the chapter describes. Use "image_caption" when a figure/object in the text should be named on screen.
- On-screen text stays SHORT. bullets: max 4 items, max 8 words each. heading: max 8 words. narration carries the teaching.
- narration: 40–90 words, conversational spoken English. Explain; do not read the bullets aloud. Natural tone ("Here's the interesting part…", "Look at this…"). Open with a hook. Close with a recap.
- source_refs: short pointers like "§13.2" or a 6–12 word excerpt fragment so a teacher can see the grounding.
- quote / stat / bullets / headings must come from the sources. If the excerpt is silent, omit that claim — never invent a formula, date, or definition.

FOCUS
- If the user supplies a focus prompt, write the overview for that audience / angle. Still stay inside the sources.
- Grade and subject in the packet set the spoken register (Class 8 maths ≠ undergraduate lecture).

IDENTITY
- This overview is ONLY for the named textbook + chapter + subtopic. Do not reuse a generic science-lab or abstract-shape story.
- The title field is the film title. Prefer the textbook's own heading.

Do not wrap the JSON in commentary.
`.trim();

type LlmSlideRaw = {
  id?: number;
  layout?: string;
  heading?: string;
  bullets?: unknown;
  points?: unknown;
  stat?: unknown;
  quote?: string | null;
  left?: unknown;
  right?: unknown;
  visual_prompt?: string | null;
  visualPrompt?: string | null;
  narration?: string;
  voiceover?: string;
  voiceover_narration?: string;
  voiceoverNarration?: string;
  voiceoverText?: string;
  source_refs?: unknown;
  sourceRefs?: unknown;
  lesson?: unknown;
};

type LlmManifestRaw = {
  title?: string;
  topicTitle?: string;
  audience?: string;
  teacherName?: string;
  architecture?: string;
  slides?: LlmSlideRaw[];
  scenes?: LlmSlideRaw[];
};

function clipText(value: string, max: number): string {
  const t = value.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1)).trim()}…`;
}

function clipWords(value: string, maxWords: number): string {
  const words = value.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (words.length <= maxWords) return words.join(' ');
  return words.slice(0, maxWords).join(' ');
}

function asStringArray(raw: unknown, maxItems: number, maxWords: number): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === 'string' ? clipWords(item, maxWords) : ''))
    .filter(Boolean)
    .slice(0, maxItems);
}

function asStat(raw: unknown): OverviewStat | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as { value?: unknown; label?: unknown };
  const value = typeof o.value === 'string' ? o.value.trim() : '';
  const label = typeof o.label === 'string' ? o.label.trim() : '';
  if (!value || !label) return undefined;
  return { value: clipText(value, 24), label: clipWords(label, 8) };
}

function asColumn(raw: unknown, fallback: string): LessonSlideColumn {
  if (!raw || typeof raw !== 'object') return { label: fallback, points: [] };
  const o = raw as { label?: unknown; points?: unknown };
  return {
    label: typeof o.label === 'string' && o.label.trim() ? clipWords(o.label, 6) : fallback,
    points: asStringArray(o.points, 3, 8),
  };
}

function asLayout(raw: unknown, fallback: LessonSlideLayout): LessonSlideLayout {
  const v = String(raw || '').trim();
  if ((OVERVIEW_LAYOUTS as string[]).includes(v)) return v as LessonSlideLayout;
  if (v === 'compare') return 'two_column';
  if (v === 'definition' || v === 'recap' || v === 'steps') return 'bullets';
  if (v === 'hook' || v === 'insight') return 'title';
  return fallback;
}

function excerptAt(ctx: TopicContextPacket, index: number, fallback: string): string {
  const hit = ctx.ragExcerpts[index] || ctx.ragExcerpts[0] || fallback;
  return clipText(hit.replace(/\s+/g, ' '), 220);
}

function parseOverviewLength(ctx: TopicContextPacket): OverviewLength {
  const blob = `${ctx.teacherPrompt || ''}`;
  const explicit = /\blength\s*[:=]\s*(short|standard|long)\b/i.exec(blob);
  if (explicit) return explicit[1].toLowerCase() as OverviewLength;
  return 'standard';
}

function durationFromNarration(text: string, fallbackSec: number): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  if (!words) return fallbackSec;
  return Math.max(8, Math.round(words / WORDS_PER_SEC + SLIDE_PADDING_SEC));
}

function layoutForIndex(index: number, total: number): LessonSlideLayout {
  if (index === 0) return 'title';
  if (index === total - 1) return 'bullets';
  const cycle: LessonSlideLayout[] = ['bullets', 'stat', 'two_column', 'quote', 'diagram', 'image_caption'];
  return cycle[(index - 1) % cycle.length];
}

function fallbackSlides(ctx: TopicContextPacket, length: OverviewLength): LessonSlide[] {
  const rules = LENGTH_RULES[length];
  const n = rules.minSlides;
  const formulas = extractFormulasFromContext(ctx);
  return Array.from({ length: n }, (_, i) => {
    const excerpt = excerptAt(ctx, i, ctx.chapterSummary || ctx.title);
    const layout = layoutForIndex(i, n);
    const slide: LessonSlide = {
      layout,
      heading:
        i === 0
          ? clipWords(ctx.title, 8)
          : i === n - 1
            ? clipWords(`Remember ${ctx.title}`, 8)
            : clipWords(excerpt, 8),
      subheading: ctx.chapterTitle,
      bullets: asStringArray(
        excerpt
          .split(/[.!?]/)
          .map((s) => s.trim())
          .filter((s) => s.length > 12)
          .slice(0, 4),
        4,
        8,
      ),
      quote: layout === 'quote' ? excerptAt(ctx, i, ctx.title) : undefined,
      stat:
        layout === 'stat'
          ? { value: formulas[0] || String(i + 1), label: clipWords(ctx.title, 6) }
          : undefined,
      left: { label: 'From the text', points: [clipWords(excerpt, 8)] },
      right: { label: 'In practice', points: [clipWords(ctx.chapterSummary || ctx.title, 8)] },
      sourceRefs: [clipText(excerpt, 80)],
      visualPrompt: `${ctx.subject}: ${ctx.title} — ${excerpt.slice(0, 80)}`,
    };
    return slide;
  });
}

function fallbackNarration(ctx: TopicContextPacket, index: number, total: number): string {
  const excerpt = excerptAt(ctx, index, ctx.chapterSummary || ctx.title);
  if (index === 0) {
    return `Let's open ${ctx.textbookTitle} at ${ctx.chapterTitle}. Today we stay with ${ctx.title}. ${clipText(excerpt, 180)} I'll walk the chapter the way the book does — no extra stories.`;
  }
  if (index === total - 1) {
    return `So when you close the page, keep ${ctx.title} in one sentence: ${clipText(ctx.chapterSummary || excerpt, 160)} That is what this section of ${ctx.textbookTitle} asked you to see.`;
  }
  return `Here's the interesting part from the book. ${clipText(excerpt, 220)} Notice the wording — that's the claim we can actually defend from this chapter.`;
}

function asLesson(raw: unknown, fallback: LessonSlide): LessonSlide {
  const o = (raw && typeof raw === 'object' ? raw : {}) as LlmSlideRaw;
  const bullets = asStringArray(o.bullets ?? o.points, 4, 8);
  const sourceRefs = asStringArray(o.source_refs ?? o.sourceRefs, 4, 16);
  return {
    layout: asLayout(o.layout, fallback.layout),
    heading: typeof o.heading === 'string' && o.heading.trim() ? clipWords(o.heading, 8) : fallback.heading,
    subheading: fallback.subheading,
    bullets: bullets.length ? bullets : fallback.bullets,
    points: bullets.length ? bullets : fallback.points,
    quote: typeof o.quote === 'string' && o.quote.trim() ? clipText(o.quote, 180) : fallback.quote,
    stat: asStat(o.stat) ?? fallback.stat,
    left: o.left ? asColumn(o.left, 'From the text') : fallback.left,
    right: o.right ? asColumn(o.right, 'In practice') : fallback.right,
    sourceRefs: sourceRefs.length ? sourceRefs : fallback.sourceRefs,
    visualPrompt:
      typeof (o.visual_prompt || o.visualPrompt) === 'string'
        ? String(o.visual_prompt || o.visualPrompt).trim()
        : fallback.visualPrompt,
  };
}

function toSceneSpec(
  ctx: TopicContextPacket,
  slide: LessonSlide,
  narration: string,
  index: number,
  total: number,
): VideoSceneSpec {
  const duration = durationFromNarration(narration, 16);
  const visualConfig: SceneVisualConfig = {
    visualDomain: ctx.contentDomain || detectContentDomain(ctx),
    headline: slide.heading,
    stageLabel: `Slide ${index + 1}`,
    takeawayBadge: slide.bullets?.[0],
    quote: slide.quote,
    textbookTitle: ctx.textbookTitle,
    chapterTitle: ctx.chapterTitle,
    lesson: slide,
  };
  const parameters: VideoSceneParameters = { ...visualConfig, lesson: slide };
  return {
    sceneId: index + 1,
    duration,
    durationSec: duration,
    voiceoverText: narration,
    voiceover: narration,
    voiceoverNarration: narration,
    animationType: 'VideoOverview',
    parameters,
    phase: index === 0 ? 'Cover' : index === total - 1 ? 'Recap' : `Slide ${index + 1}`,
    phaseTitle: slide.heading,
    visualType: 'video_overview',
    visualArchetype: 'video_overview',
    visualConfig,
    visualProps: parameters,
    props: parameters,
    teacherGesture: index === 0 ? 'questioning' : 'demonstrating',
    cameraMotion: 'ken_burns',
    timestampRange: [0, duration],
    timestamp_range: [0, duration],
    lesson: slide,
  };
}

function collectSlides(raw: LlmManifestRaw): LlmSlideRaw[] {
  if (Array.isArray(raw.slides) && raw.slides.length) return raw.slides;
  if (Array.isArray(raw.scenes) && raw.scenes.length) return raw.scenes;
  return [];
}

function narrationOf(block: LlmSlideRaw, fallback: string): string {
  const text = String(
    block.narration ||
      block.voiceover_narration ||
      block.voiceoverNarration ||
      block.voiceover ||
      block.voiceoverText ||
      '',
  ).trim();
  return text || fallback;
}

function rescaleToWindow(scenes: VideoSceneSpec[], minSec: number, maxSec: number): void {
  const total = scenes.reduce((a, s) => a + s.duration, 0);
  if (total >= minSec && total <= maxSec) {
    stampRanges(scenes);
    return;
  }
  const target = Math.min(maxSec, Math.max(minSec, total));
  const scale = target / Math.max(1, total);
  for (const s of scenes) {
    s.duration = Math.max(8, Math.round(s.duration * scale));
    s.durationSec = s.duration;
  }
  stampRanges(scenes);
}

function stampRanges(scenes: VideoSceneSpec[]): void {
  let t = 0;
  for (const s of scenes) {
    s.timestampRange = [t, t + s.duration];
    s.timestamp_range = s.timestampRange;
    t += s.duration;
  }
}

function heuristicManifest(ctx: TopicContextPacket, length: OverviewLength): VideoScriptManifest {
  const slides = fallbackSlides(ctx, length);
  const scenes = slides.map((slide, i) =>
    toSceneSpec(ctx, slide, fallbackNarration(ctx, i, slides.length), i, slides.length),
  );
  const rules = LENGTH_RULES[length];
  rescaleToWindow(scenes, rules.minSec, rules.maxSec);
  return {
    topicTitle: ctx.title,
    teacherName: 'MindVault',
    audience: `${ctx.gradeLabel} · ${ctx.subject}`,
    architecture: 'video_overview',
    archetype: 'concept',
    pedagogicalPattern: 'video_overview',
    totalDurationSeconds: scenes.reduce((a, s) => a + s.duration, 0),
    scenes,
  };
}

function normalizeManifest(
  raw: LlmManifestRaw,
  ctx: TopicContextPacket,
  length: OverviewLength,
): VideoScriptManifest {
  const fallback = heuristicManifest(ctx, length);
  const blocks = collectSlides(raw);
  if (!blocks.length) {
    throw new Error('Claude returned no video-overview slides');
  }

  const rules = LENGTH_RULES[length];
  const scenes = blocks.slice(0, rules.maxSlides).map((block, i) => {
    const fb = fallback.scenes[Math.min(i, fallback.scenes.length - 1)].lesson!;
    const slide = asLesson(block.lesson ?? block, fb);
    if (i === 0) slide.layout = 'title';
    const narration = narrationOf(block, fallbackNarration(ctx, i, blocks.length));
    return toSceneSpec(ctx, slide, narration, i, Math.min(blocks.length, rules.maxSlides));
  });

  while (scenes.length < rules.minSlides) {
    const extra = fallback.scenes[Math.min(scenes.length, fallback.scenes.length - 1)];
    scenes.push({
      ...extra,
      sceneId: scenes.length + 1,
      lesson: extra.lesson,
    });
  }

  rescaleToWindow(scenes, rules.minSec, rules.maxSec);
  return {
    topicTitle: raw.title || raw.topicTitle || ctx.title,
    teacherName: String(raw.teacherName || 'MindVault').trim() || 'MindVault',
    audience: raw.audience || `${ctx.gradeLabel} · ${ctx.subject}`,
    architecture: 'video_overview',
    archetype: 'concept',
    pedagogicalPattern: 'video_overview',
    totalDurationSeconds: scenes.reduce((a, s) => a + s.duration, 0),
    scenes,
  };
}

function parseLlmManifestSafely(
  llmOutput: unknown,
  ctx: TopicContextPacket,
  length: OverviewLength,
): VideoScriptManifest {
  let parsed: unknown = llmOutput;
  if (typeof llmOutput === 'string') parsed = JSON.parse(llmOutput);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Claude did not return a video-overview script');
  }
  const manifest = normalizeManifest(parsed as LlmManifestRaw, ctx, length);
  if (!manifest.scenes.length) {
    throw new Error('Claude returned no video-overview slides');
  }
  return manifest;
}

export function normalizeVisualArchetype(_raw?: string, _index = 0): string {
  return 'video_overview';
}

export function parseOverviewLengthFromPrompt(teacherPrompt?: string): OverviewLength {
  return parseOverviewLength({ teacherPrompt } as TopicContextPacket);
}

export async function generateStructuredVideoScript(
  ctx: TopicContextPacket,
): Promise<VideoScriptManifest> {
  const provider = getLessonVideoScriptProvider();
  const domain = ctx.contentDomain || detectContentDomain(ctx);
  const formulas = extractFormulasFromContext(ctx);
  const excerpts = ctx.ragExcerpts.slice(0, 20).join('\n---\n');
  const packet: TopicContextPacket = { ...ctx, contentDomain: domain };
  const length = parseOverviewLength(packet);
  const rules = LENGTH_RULES[length];

  console.log(
    `[videoPipeline/script] Claude ${LESSON_VIDEO_MODEL} video_overview length=${length} domain=${domain} RAG=${ctx.ragExcerpts.length} topic="${ctx.code} ${ctx.title}"`,
  );

  if (!provider) {
    throw new Error(
      'ANTHROPIC_API_KEY is required. Video Overviews are written by Claude (claude-opus-5-5).',
    );
  }

  const user = [
    `Subtopic code: ${ctx.code}`,
    `Subtopic title: ${ctx.title}`,
    `Chapter: ${ctx.chapterTitle}`,
    `Textbook: ${ctx.textbookTitle} (${ctx.subject}) file=${ctx.fileName ?? 'uploaded.pdf'}`,
    `Grade: ${ctx.gradeLabel}`,
    `Chapter summary: ${ctx.chapterSummary}`,
    `LENGTH: ${length} → write ${rules.minSlides}–${rules.maxSlides} slides. Target spoken runtime ${Math.round(rules.minSec / 60)}–${Math.round(rules.maxSec / 60)} minutes.`,
    ctx.teacherPrompt
      ? `FOCUS (customize this overview the way NotebookLM's box works):\n${ctx.teacherPrompt}`
      : 'FOCUS: explain for a first-time student of this chapter. Keep it grounded.',
    formulas.length ? `NUMBERS / FORMULAS FOUND IN THE CHAPTER (use only if a slide needs them):\n${formulas.join('\n')}` : '',
    `SOURCES — these excerpts ARE the documents. Cite them. Do not invent beyond them.\n${excerpts || ctx.chapterSummary || ctx.title}`,
    `Return STRICT JSON: title, audience, architecture "video_overview", slides[]. Model in use: ${LESSON_VIDEO_MODEL}.`,
  ]
    .filter(Boolean)
    .join('\n\n');

  const raw = await Promise.race([
    provider.completeJson<LlmManifestRaw | string>({
      system: LESSON_SCRIPT_PROMPT,
      user,
    }),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Claude video-overview script timed out')), 200_000);
    }),
  ]);
  const manifest = parseLlmManifestSafely(raw, packet, length);
  console.log(
    `[videoPipeline/script] overview model=${LESSON_VIDEO_MODEL} slides=${manifest.scenes.length} duration=${manifest.totalDurationSeconds}s layouts=${manifest.scenes.map((s) => s.lesson?.layout).join(' | ')}`,
  );
  return manifest;
}

export function flattenVoiceover(manifest: VideoScriptManifest): string {
  return manifest.scenes.map((s) => s.voiceoverText || s.voiceoverNarration || s.voiceover || '').join(' ');
}

export function cuesFromManifest(manifest: VideoScriptManifest) {
  let t = 0;
  return manifest.scenes.map((s) => {
    const cue = {
      timeSec: t + Math.min(1, s.duration / 3),
      label: String(s.phase || s.lesson?.heading || s.voiceoverText.slice(0, 40)),
    };
    t += s.duration;
    return cue;
  });
}
