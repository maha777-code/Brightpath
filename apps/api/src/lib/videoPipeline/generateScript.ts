import type {
  ConceptMotion,
  ConceptSolid,
  ConceptView,
  ConceptVisual,
  ConceptVisualKind,
  LessonSlide,
  LessonSlideColumn,
  LessonSlideLayout,
  OverviewStat,
  SceneVisualConfig,
  VideoSceneParameters,
  VideoSceneSpec,
  VideoScriptManifest,
  VisualContentDomain,
} from '@brightpath/shared';
import { inferConceptVisual } from '@brightpath/shared';
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
You write Brightpath / MindVault concept explainer films for ANY school subject.

The uploaded PDF may be maths, physics, chemistry, biology, or another subject. Build the film for THIS subtopic only. The spoken narration stays textbook-grounded. The PICTURE must demonstrate the idea named in the excerpts — not a leftover geometry kit (cubes, nets, views) unless this chapter is actually about solid shapes.

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
      "visual": {
        "kind": "board" | "system" | "cycle" | "sequence" | "equation" | "field" | "example" | "compare" | "count" | "timeline",
        "subject": string,
        "domain": "math" | "physics" | "chemistry" | "biology" | "generic",
        "objects": [string],
        "labels": [string],
        "motion": "build" | "reveal" | "split" | "pulse" | "orbit"
      },
      "narration": string,
      "source_refs": [string]
    }
  ]
}

PICTURE RULES (mandatory on EVERY slide)
- visual.subject and visual.labels MUST be terms from THIS PDF (chloroplast, F=ma, acid + base, quadratic…). Never invent objects.
- Pick kind from the idea, not from a template:
  - maths: equation (the real formula), board (the idea + its parts), example (worked question), compare (two cases)
  - physics: field (object + labeled arrows: force, current, rays), equation, sequence (a motion story)
  - chemistry: system (atom/molecule/reaction parts), sequence (reaction steps), compare (acid vs base)
  - biology: cycle (photosynthesis, mitosis), system (cell/organ parts), sequence (a life process)
- Do NOT use cubes, nets, front/side/top views, or rotating solids unless the excerpt is about those 3D shapes.
- Mix kinds. A student on mute should still see THIS chapter's idea assembling on screen.

SLIDE RULES
- Slide count and length follow the user message (short / standard / long). 8–15 slides.
- Slide 1 heading = the real subtopic name. Its visual already shows the main idea from the book.
- Last slide recaps with the same vocabulary as the chapter.
- On-screen text stays SHORT. bullets: max 4, max 8 words. heading: max 8 words. Narration teaches.
- narration: 40–90 words, conversational. Explain the picture. Do not read the bullets. No "watch this cube turn" unless the book is about cubes.
- source_refs: § or a 6–12 word excerpt fragment.
- No invented facts, formulas, dates, or objects.

FOCUS
- Honor a focus prompt. Stay inside the sources.
- Grade and subject set the spoken register.

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
  visual?: unknown;
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
  const cycle: LessonSlideLayout[] = ['diagram', 'image_caption', 'two_column', 'stat', 'diagram', 'bullets'];
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
    slide.visual = inferConceptVisual(slide, ctx.title, ctx.contentDomain || detectContentDomain(ctx));
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

const VISUAL_KINDS: ConceptVisualKind[] = [
  'board',
  'system',
  'cycle',
  'sequence',
  'equation',
  'field',
  'example',
  'compare',
  'count',
  'timeline',
  'solid',
  'views',
  'net',
  'process',
  'parts',
  'formula',
  'scene',
];
const VISUAL_DOMAINS: VisualContentDomain[] = ['dsml', 'math', 'physics', 'chemistry', 'biology', 'generic'];
const VISUAL_SOLIDS: ConceptSolid[] = [
  'cube',
  'cuboid',
  'cylinder',
  'cone',
  'sphere',
  'pyramid',
  'prism',
  'hemisphere',
];
const VISUAL_MOTIONS: ConceptMotion[] = ['rotate', 'unfold', 'build', 'orbit', 'split', 'pulse', 'reveal'];
const VISUAL_VIEWS: ConceptView[] = ['front', 'side', 'top'];

function asVisual(
  raw: unknown,
  draft: LessonSlide,
  topicTitle: string,
  domain?: VisualContentDomain,
): ConceptVisual {
  const parsed =
    raw && typeof raw === 'object'
      ? (raw as {
          kind?: unknown;
          subject?: unknown;
          domain?: unknown;
          solid?: unknown;
          objects?: unknown;
          labels?: unknown;
          motion?: unknown;
          views?: unknown;
        })
      : undefined;
  const kind = VISUAL_KINDS.includes(String(parsed?.kind) as ConceptVisualKind)
    ? (parsed!.kind as ConceptVisualKind)
    : undefined;
  const solid = VISUAL_SOLIDS.includes(String(parsed?.solid) as ConceptSolid)
    ? (parsed!.solid as ConceptSolid)
    : undefined;
  const motion = VISUAL_MOTIONS.includes(String(parsed?.motion) as ConceptMotion)
    ? (parsed!.motion as ConceptMotion)
    : undefined;
  const parsedDomain = VISUAL_DOMAINS.includes(String(parsed?.domain) as VisualContentDomain)
    ? (parsed!.domain as VisualContentDomain)
    : domain;
  const subject = typeof parsed?.subject === 'string' ? parsed.subject.trim() : '';
  const objects = asStringArray(parsed?.objects, 6, 6);
  const labels = asStringArray(parsed?.labels, 6, 6);
  const views = Array.isArray(parsed?.views)
    ? parsed.views.filter((v): v is ConceptView => VISUAL_VIEWS.includes(String(v) as ConceptView))
    : undefined;
  return inferConceptVisual(
    {
      ...draft,
      visual:
        kind || subject
          ? {
              kind: kind || 'board',
              subject: subject || draft.heading,
              domain: parsedDomain,
              solid,
              objects,
              labels,
              motion: motion || 'reveal',
              views: views?.length ? views : undefined,
            }
          : undefined,
    },
    topicTitle,
    parsedDomain,
  );
}

function asLesson(
  raw: unknown,
  fallback: LessonSlide,
  topicTitle = '',
  domain?: VisualContentDomain,
): LessonSlide {
  const o = (raw && typeof raw === 'object' ? raw : {}) as LlmSlideRaw;
  const bullets = asStringArray(o.bullets ?? o.points, 4, 8);
  const sourceRefs = asStringArray(o.source_refs ?? o.sourceRefs, 4, 16);
  const draft: LessonSlide = {
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
    formula: fallback.formula,
  };
  draft.visual = asVisual(o.visual, draft, topicTitle, domain);
  return draft;
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
    const slide = asLesson(block.lesson ?? block, fb, ctx.title, ctx.contentDomain || detectContentDomain(ctx));
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
    `SUBJECT DOMAIN: ${domain}. Draw THIS subject's idea. Do not default to cubes, nets, or views unless the excerpts are about solid shapes.`,
    `LENGTH: ${length} → write ${rules.minSlides}–${rules.maxSlides} slides. Target spoken runtime ${Math.round(rules.minSec / 60)}–${Math.round(rules.maxSec / 60)} minutes.`,
    ctx.teacherPrompt
      ? `FOCUS (customize this overview the way NotebookLM's box works):\n${ctx.teacherPrompt}`
      : 'FOCUS: explain for a first-time student of this chapter. Keep it grounded.',
    formulas.length ? `NUMBERS / FORMULAS FOUND IN THE CHAPTER (use only if a slide needs them):\n${formulas.join('\n')}` : '',
    `SOURCES — these excerpts ARE the documents. Cite them. Do not invent beyond them.\n${excerpts || ctx.chapterSummary || ctx.title}`,
    `Return STRICT JSON: title, audience, architecture "video_overview", slides[] each with visual {kind, subject, domain, objects, labels, motion} using terms from the sources. Model: ${LESSON_VIDEO_MODEL}.`,
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
    `[videoPipeline/script] overview model=${LESSON_VIDEO_MODEL} slides=${manifest.scenes.length} duration=${manifest.totalDurationSeconds}s visuals=${manifest.scenes.map((s) => `${s.lesson?.visual?.kind}:${s.lesson?.visual?.subject}`).join(' | ')}`,
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
