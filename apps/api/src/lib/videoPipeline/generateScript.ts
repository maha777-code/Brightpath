import type {
  LessonSlide,
  LessonSlideColumn,
  LessonSlideExample,
  LessonSlideLayout,
  LessonSlideMotion,
  LessonSlideStep,
  SceneVisualConfig,
  VideoSceneParameters,
  VideoSceneSpec,
  VideoScriptManifest,
} from '@brightpath/shared';
import { getLessonVideoScriptProvider } from '../llm/provider.js';
import { detectContentDomain, extractFormulasFromContext } from './contentDomain.js';
import type { TopicContextPacket } from './types.js';

const MIN_SCENES = 5;
const MAX_SCENES = 5;
const MIN_TOTAL_SEC = 40;
const MAX_TOTAL_SEC = 52;
const DEFAULT_SCENE_SEC = [8, 10, 10, 9, 8] as const;

const MOTION_BY_INDEX: LessonSlideMotion[] = ['smash_zoom', 'drift_up', 'parallax', 'whip', 'bloom'];

const LESSON_BEATS = [
  { layout: 'hook' as const, phase: 'Hook' },
  { layout: 'insight' as const, phase: 'Insight' },
  { layout: 'build' as const, phase: 'Build' },
  { layout: 'turn' as const, phase: 'Turn' },
  { layout: 'payoff' as const, phase: 'Payoff' },
] as const;

const LESSON_SCRIPT_PROMPT = `
You are a motion designer writing a 45-second cinematic explainer for school students.

Do this in order:
1. Read the uploaded textbook excerpts for THIS subtopic only. Learn the idea from the text.
2. Write the video yourself from that reading. Invent the words, the on-screen lines, and the camera moves.
3. Teach so a student understands the subtopic. Use plain language. Quote formulas or definitions from the excerpts when they exist.

There is NO template, NO theme pack, NO game skin, NO pixel quest, NO lesson-board, NO Tom & Jerry, NO space shooter.
The look is original kinetic motion graphics: smash titles, drifting type, light, depth, and camera motion.
Every video is different because every subtopic is different.

RUNTIME: 40 to 50 seconds. Output exactly 5 beats. Total spoken words across all beats: 95 to 120.

1. layout "hook" — phase "Hook" — 8s — motion "smash_zoom"
   Open on why this idea exists in the chapter. One hard title.
2. layout "insight" — phase "Insight" — 10s — motion "drift_up"
   The textbook idea in student language. Include keyTerms. Include formula if the chapter has one.
3. layout "build" — phase "Build" — 10s — motion "parallax"
   How it works: 3 short steps from the excerpts.
4. layout "turn" — phase "Turn" — 9s — motion "whip"
   The mix-up students make, or one concrete example from the text.
5. layout "payoff" — phase "Payoff" — 8s — motion "bloom"
   One sentence a student can say back, plus 2 short points.

VOICE:
voiceover_narration is 18–26 words per beat, spoken to the student.
Do not describe the animation, the software, or a template.

ON SCREEN:
heading ≤ 6 words. body ≤ 16 words. each step label ≤ 8 words. each point ≤ 10 words.

FACTS:
Use only the supplied excerpts, summary, and title. If it is not in the text, leave it out.
A science topic stays science. A language topic stays language.

Return ONLY JSON:
{
  "topicTitle": "the subtopic title",
  "teacherName": "MindVault",
  "architecture": "cinematic_motion",
  "totalDurationSeconds": 45,
  "scenes": [
    {
      "sceneId": 1,
      "phase": "Hook",
      "durationSec": 8,
      "timestamp_range": [0, 8],
      "voiceover_narration": "18–26 words for this beat",
      "lesson": {
        "layout": "hook",
        "motion": "smash_zoom",
        "heading": "short title",
        "subheading": "chapter name",
        "body": "why this matters",
        "highlight": "one punch word",
        "keyTerms": ["term"]
      }
    }
  ]
}

STRICT:
- Exactly 5 scenes. Sum of durationSec between 40 and 50.
- layouts in order: hook, insight, build, turn, payoff.
- Return JSON only.
`;

type LlmBlockRaw = {
  sceneId?: number;
  timestamp_range?: [number, number] | number[];
  timestampRange?: [number, number] | number[];
  duration?: number;
  durationSec?: number;
  voiceover?: string;
  voiceoverText?: string;
  voiceover_narration?: string;
  voiceoverNarration?: string;
  lesson?: unknown;
  visualConfig?: Record<string, unknown>;
  visualArchetype?: string;
  teacherGesture?: string;
  cameraMotion?: string;
  phase?: string;
  phaseTitle?: string;
};

type LlmManifestRaw = {
  topicTitle?: string;
  teacherName?: string;
  architecture?: string;
  totalDurationSeconds?: number;
  scenes?: LlmBlockRaw[];
  levels?: LlmBlockRaw[];
  frames?: LlmBlockRaw[];
  blocks?: LlmBlockRaw[];
};

function clipText(raw: string, max: number): string {
  const t = raw.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function excerptAt(ctx: TopicContextPacket, index: number, fallback: string): string {
  const raw = ctx.ragExcerpts[index] || ctx.ragExcerpts[0] || ctx.chapterSummary || fallback;
  return clipText(raw, 180);
}

function asStringList(raw: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => clipText(String(item ?? ''), maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

function asSteps(raw: unknown): LessonSlideStep[] {
  if (!Array.isArray(raw)) return [];
  const steps: LessonSlideStep[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const label = clipText(String(o.label ?? o.title ?? o.step ?? ''), 40);
    if (!label) continue;
    const step: LessonSlideStep = { label };
    if (o.detail != null) step.detail = clipText(String(o.detail), 70);
    steps.push(step);
    if (steps.length >= 4) break;
  }
  return steps;
}

function asColumn(raw: unknown, fallback: LessonSlideColumn): LessonSlideColumn {
  if (!raw || typeof raw !== 'object') return fallback;
  const o = raw as Record<string, unknown>;
  const points = asStringList(o.points, 3, 56);
  return {
    label: clipText(String(o.label ?? fallback.label), 24) || fallback.label,
    points: points.length ? points : fallback.points,
  };
}

function asExample(raw: unknown, fallback: LessonSlideExample): LessonSlideExample {
  if (!raw || typeof raw !== 'object') return fallback;
  const o = raw as Record<string, unknown>;
  const working = asStringList(o.working, 3, 60);
  return {
    prompt: clipText(String(o.prompt ?? fallback.prompt), 90) || fallback.prompt,
    working: working.length ? working : fallback.working,
    answer: clipText(String(o.answer ?? fallback.answer), 70) || fallback.answer,
  };
}

function asLesson(raw: unknown, fallback: LessonSlide): LessonSlide {
  if (!raw || typeof raw !== 'object') return fallback;
  const o = raw as Record<string, unknown>;
  const layout = (
    LESSON_BEATS.some((beat) => beat.layout === o.layout) ? o.layout : fallback.layout
  ) as LessonSlideLayout;
  const motion = (
    MOTION_BY_INDEX.includes(String(o.motion) as LessonSlideMotion)
      ? o.motion
      : fallback.motion
  ) as LessonSlideMotion;
  return {
    layout,
    motion,
    heading: clipText(String(o.heading ?? fallback.heading), 48) || fallback.heading,
    subheading: o.subheading != null ? clipText(String(o.subheading), 60) : fallback.subheading,
    body: o.body != null ? clipText(String(o.body), 110) : fallback.body,
    highlight: o.highlight != null ? clipText(String(o.highlight), 28) : fallback.highlight,
    keyTerms: asStringList(o.keyTerms ?? o.key_terms, 4, 22).length
      ? asStringList(o.keyTerms ?? o.key_terms, 4, 22)
      : fallback.keyTerms,
    formula: o.formula != null ? clipText(String(o.formula), 70) : fallback.formula,
    steps: asSteps(o.steps).length ? asSteps(o.steps) : fallback.steps,
    left: o.left ? asColumn(o.left, fallback.left ?? { label: 'Mix-up', points: [] }) : fallback.left,
    right: o.right ? asColumn(o.right, fallback.right ?? { label: 'From the text', points: [] }) : fallback.right,
    example: o.example
      ? asExample(o.example, fallback.example ?? { prompt: '', working: [], answer: '' })
      : fallback.example,
    points: asStringList(o.points, 3, 60).length ? asStringList(o.points, 3, 60) : fallback.points,
  };
}

function collectRawBlocks(raw: LlmManifestRaw): LlmBlockRaw[] {
  const bags = [raw.scenes, raw.levels, raw.frames, raw.blocks];
  for (const bag of bags) {
    if (Array.isArray(bag) && bag.length) return bag.slice(0, MAX_SCENES);
  }
  return [];
}

function expandVoiceover(text: string, ctx: TopicContextPacket, index: number, minWords = 16): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length >= minWords) return text;
  const extra = excerptAt(ctx, index, ctx.title);
  return `${text} ${extra}`.trim();
}

function durationFromBlock(block: LlmBlockRaw, fallback: number): number {
  const range = block.timestamp_range ?? block.timestampRange;
  if (Array.isArray(range) && range.length >= 2) {
    const a = Number(range[0]);
    const b = Number(range[1]);
    if (Number.isFinite(a) && Number.isFinite(b) && b > a) return Math.round(b - a);
  }
  const n = Number(block.durationSec ?? block.duration);
  if (Number.isFinite(n) && n > 0) return Math.round(n);
  return fallback;
}

function rescaleToWindow(scenes: VideoSceneSpec[]): void {
  let total = scenes.reduce((a, s) => a + s.duration, 0);
  if (total < MIN_TOTAL_SEC || total > MAX_TOTAL_SEC) {
    const target = Math.min(MAX_TOTAL_SEC, Math.max(MIN_TOTAL_SEC, total || 45));
    const scale = target / (total || 1);
    for (const s of scenes) {
      const next = Math.max(6, Math.min(14, Math.round(s.duration * scale)));
      s.duration = next;
      s.durationSec = next;
    }
    total = scenes.reduce((a, s) => a + s.duration, 0);
  }
  if (total < MIN_TOTAL_SEC) {
    const bump = Math.ceil((MIN_TOTAL_SEC - total) / scenes.length);
    for (const s of scenes) {
      const next = Math.min(14, s.duration + bump);
      s.duration = next;
      s.durationSec = next;
    }
  }
  let t = 0;
  for (const s of scenes) {
    const end = t + s.duration;
    s.timestampRange = [t, end];
    s.timestamp_range = [t, end];
    t = end;
  }
}

function fallbackLessons(ctx: TopicContextPacket, formulas: string[]): LessonSlide[] {
  const definition = excerptAt(ctx, 1, excerptAt(ctx, 0, ctx.title));
  const hook = excerptAt(ctx, 0, ctx.chapterSummary || ctx.title);
  const mixup = excerptAt(ctx, 2, ctx.chapterSummary || definition);
  const rule = formulas[0] || excerptAt(ctx, 3, definition);
  return [
    {
      layout: 'hook',
      motion: 'smash_zoom',
      heading: ctx.title,
      subheading: ctx.chapterTitle,
      body: clipText(hook, 90),
      highlight: ctx.title.split(/\s+/).slice(0, 2).join(' '),
    },
    {
      layout: 'insight',
      motion: 'drift_up',
      heading: 'The idea',
      body: clipText(definition, 100),
      keyTerms: [ctx.title],
      formula: formulas[0],
    },
    {
      layout: 'build',
      motion: 'parallax',
      heading: 'How it works',
      steps: [
        { label: 'From the chapter', detail: clipText(hook, 50) },
        { label: 'Name it', detail: clipText(definition, 50) },
        { label: 'Use it', detail: clipText(rule, 50) },
      ],
    },
    {
      layout: 'turn',
      motion: 'whip',
      heading: 'Watch this',
      left: { label: 'Easy miss', points: [clipText(mixup, 50)] },
      right: { label: 'The text', points: [clipText(definition, 50)] },
      example: {
        prompt: ctx.title,
        working: [clipText(definition, 50)],
        answer: clipText(rule, 50),
      },
    },
    {
      layout: 'payoff',
      motion: 'bloom',
      heading: 'Take this',
      points: [clipText(definition, 50), clipText(rule, 50)],
      body: clipText(ctx.chapterSummary || definition, 90),
    },
  ];
}

function heuristicVoiceovers(ctx: TopicContextPacket, formulas: string[]): string[] {
  const definition = excerptAt(ctx, 1, excerptAt(ctx, 0, ctx.title));
  const hook = excerptAt(ctx, 0, ctx.chapterSummary || ctx.title);
  const mixup = excerptAt(ctx, 2, ctx.chapterSummary || definition);
  const rule = formulas[0] || excerptAt(ctx, 3, definition);
  return [
    `${ctx.title}. ${clipText(hook, 90)} This is the idea the chapter wants you to see.`,
    `Here is what it means. ${clipText(definition, 100)}`,
    `Watch how it works, in order, from the textbook — not from a guess.`,
    `Students mix this up: ${clipText(mixup, 70)} Hold it next to ${clipText(rule, 50)}.`,
    `Say it back: ${ctx.title}. ${clipText(ctx.chapterSummary || definition, 70)}`,
  ];
}

function toSceneSpec(
  ctx: TopicContextPacket,
  block: LlmBlockRaw | undefined,
  index: number,
  fallbackLesson: LessonSlide,
): VideoSceneSpec {
  const beat = LESSON_BEATS[Math.min(index, LESSON_BEATS.length - 1)];
  const lesson = asLesson(block?.lesson ?? (block?.visualConfig as { lesson?: unknown } | undefined)?.lesson, {
    ...fallbackLesson,
    layout: beat.layout,
    motion: MOTION_BY_INDEX[index],
  });
  lesson.layout = beat.layout;
  lesson.motion = MOTION_BY_INDEX[index];
  const duration = durationFromBlock(block ?? {}, DEFAULT_SCENE_SEC[index] ?? 9);
  const voiceover = String(
    block?.voiceover_narration ||
      block?.voiceoverNarration ||
      block?.voiceover ||
      block?.voiceoverText ||
      '',
  ).trim();
  const phase = beat.phase;
  const visualConfig: SceneVisualConfig = {
    ...(block?.visualConfig ?? {}),
    visualDomain: ctx.contentDomain || detectContentDomain(ctx),
    formulaText: lesson.formula,
    equationLatex: lesson.formula,
    headline: lesson.heading,
    stageLabel: phase,
    takeawayBadge: lesson.body,
    lesson,
  };
  const parameters: VideoSceneParameters = { ...visualConfig, lesson };
  return {
    sceneId: block?.sceneId ?? index + 1,
    duration,
    durationSec: duration,
    voiceoverText: voiceover,
    voiceover,
    voiceoverNarration: voiceover,
    animationType: 'CinematicMotion',
    parameters,
    phase,
    phaseTitle: phase,
    visualType: 'cinematic_motion',
    visualArchetype: 'concept_card',
    visualConfig,
    visualProps: parameters,
    props: parameters,
    teacherGesture: index === 0 ? 'questioning' : 'demonstrating',
    cameraMotion: lesson.motion,
    timestampRange: [0, duration],
    timestamp_range: [0, duration],
    lesson,
  };
}

function heuristicManifest(ctx: TopicContextPacket): VideoScriptManifest {
  const formulas = extractFormulasFromContext(ctx);
  const lines = heuristicVoiceovers(ctx, formulas);
  const slides = fallbackLessons(ctx, formulas);
  const scenes = LESSON_BEATS.map((beat, i) => {
    const spec = toSceneSpec(ctx, { phase: beat.phase, voiceover_narration: lines[i], lesson: slides[i] }, i, slides[i]);
    spec.voiceoverText = lines[i];
    spec.voiceover = lines[i];
    spec.voiceoverNarration = lines[i];
    spec.duration = DEFAULT_SCENE_SEC[i];
    spec.durationSec = DEFAULT_SCENE_SEC[i];
    return spec;
  });
  rescaleToWindow(scenes);
  return {
    topicTitle: ctx.title,
    teacherName: 'MindVault',
    architecture: 'cinematic_motion',
    archetype: 'concept',
    pedagogicalPattern: 'cinematic_motion',
    totalDurationSeconds: scenes.reduce((a, s) => a + s.duration, 0),
    scenes,
  };
}

function normalizeManifest(raw: LlmManifestRaw, ctx: TopicContextPacket): VideoScriptManifest {
  const fallback = heuristicManifest(ctx);
  const blocks = collectRawBlocks(raw);
  if (!blocks.length) {
    throw new Error('Claude Opus 5.5 returned no cinematic scenes');
  }

  const scenes = blocks.map((b, i) => {
    const spec = toSceneSpec(ctx, b, i, fallback.scenes[Math.min(i, fallback.scenes.length - 1)].lesson!);
    spec.voiceoverText = expandVoiceover(
      spec.voiceoverText || fallback.scenes[Math.min(i, fallback.scenes.length - 1)].voiceoverText,
      ctx,
      i,
    );
    spec.voiceover = spec.voiceoverText;
    spec.voiceoverNarration = spec.voiceoverText;
    return spec;
  });

  while (scenes.length < MIN_SCENES) {
    const extra = fallback.scenes[scenes.length];
    scenes.push({ ...extra, sceneId: scenes.length + 1 });
  }

  rescaleToWindow(scenes);
  return {
    topicTitle: raw.topicTitle || ctx.title,
    teacherName: String(raw.teacherName || 'MindVault').trim() || 'MindVault',
    architecture: 'cinematic_motion',
    archetype: 'concept',
    pedagogicalPattern: 'cinematic_motion',
    totalDurationSeconds: scenes.reduce((a, s) => a + s.duration, 0),
    scenes,
  };
}

function parseLlmManifestSafely(llmOutput: unknown, ctx: TopicContextPacket): VideoScriptManifest {
  let parsed: unknown = llmOutput;
  if (typeof llmOutput === 'string') parsed = JSON.parse(llmOutput);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Claude Opus 5.5 did not return a lesson script');
  }
  const manifest = normalizeManifest(parsed as LlmManifestRaw, ctx);
  if (!manifest.scenes.length) {
    throw new Error('Claude Opus 5.5 returned no cinematic scenes');
  }
  return manifest;
}

export function normalizeVisualArchetype(_raw?: string, _index = 0): string {
  return 'cinematic_motion';
}

export async function generateStructuredVideoScript(
  ctx: TopicContextPacket,
): Promise<VideoScriptManifest> {
  const provider = getLessonVideoScriptProvider();
  const domain = ctx.contentDomain || detectContentDomain(ctx);
  const formulas = extractFormulasFromContext(ctx);
  const excerpts = ctx.ragExcerpts.slice(0, 16).join('\n---\n');
  const packet: TopicContextPacket = { ...ctx, contentDomain: domain };

  console.log(
    `[videoPipeline/script] Claude Opus 5.5 cinematic domain=${domain} RAG=${ctx.ragExcerpts.length} topic="${ctx.code} ${ctx.title}"`,
  );

  if (!provider) {
    throw new Error(
      'ANTHROPIC_API_KEY is required. Animated lesson videos are generated by Claude Opus 5.5 (claude-opus-5-5).',
    );
  }

  const user = [
    `Subtopic code: ${ctx.code}`,
    `Subtopic title: ${ctx.title}`,
    `Chapter: ${ctx.chapterTitle}`,
    `Textbook: ${ctx.textbookTitle} (${ctx.subject}) file=${ctx.fileName ?? 'uploaded.pdf'}`,
    `Grade: ${ctx.gradeLabel}`,
    `Chapter summary: ${ctx.chapterSummary}`,
    'Read these excerpts first. Then write a 45-second cinematic motion-graphics lesson for this subtopic. No template. No theme.',
    ctx.teacherPrompt ? `Teacher note: ${ctx.teacherPrompt}` : '',
    formulas.length ? `FORMULAS FOUND IN THE CHAPTER:\n${formulas.join('\n')}` : '',
    `TEXTBOOK EXCERPTS FOR THIS SUBTOPIC:\n${excerpts || ctx.chapterSummary || ctx.title}`,
    'Output exactly 5 beats, 40–50 seconds, architecture cinematic_motion.',
  ]
    .filter(Boolean)
    .join('\n\n');

  const raw = await Promise.race([
    provider.completeJson<LlmManifestRaw | string>({
      system: LESSON_SCRIPT_PROMPT,
      user,
    }),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Claude Opus 5.5 script timed out')), 170_000);
    }),
  ]);
  const manifest = parseLlmManifestSafely(raw, packet);
  console.log(
    `[videoPipeline/script] cinematic model=claude-opus-5-5 scenes=${manifest.scenes.length} duration=${manifest.totalDurationSeconds}s phases=${manifest.scenes.map((s) => s.phase).join(' | ')}`,
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
