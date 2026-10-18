import type {
  LessonSlide,
  LessonSlideColumn,
  LessonSlideExample,
  LessonSlideLayout,
  LessonSlideStep,
  SceneVisualConfig,
  VideoSceneParameters,
  VideoSceneSpec,
  VideoScriptManifest,
} from '@brightpath/shared';
import { getLessonVideoScriptProvider } from '../llm/provider.js';
import { detectContentDomain, extractFormulasFromContext } from './contentDomain.js';
import type { TopicContextPacket } from './types.js';

const MIN_SCENES = 6;
const MAX_SCENES = 6;
const MIN_TOTAL_SEC = 180;
const MAX_TOTAL_SEC = 300;
const DEFAULT_SCENE_SEC = [36, 48, 50, 48, 52, 40] as const;

const LESSON_BEATS = [
  { layout: 'title' as const, phase: 'Meet the topic' },
  { layout: 'definition' as const, phase: 'The definition' },
  { layout: 'steps' as const, phase: 'How it works' },
  { layout: 'compare' as const, phase: 'Common mix-up' },
  { layout: 'example' as const, phase: 'Worked example' },
  { layout: 'recap' as const, phase: 'Remember this' },
] as const;

const LESSON_SCRIPT_PROMPT = `
You write a classroom explainer video for ONE textbook topic.
The student sees a clean animated lesson board: title, definition, steps, a comparison, a worked example, and a recap.
There is no game, no pixel art, no HUD, no levels, no quest, no code terminal, and no streamer voice.

RUNTIME: 3 to 5 minutes (180–300 seconds). Output exactly 6 scenes, in this order, with these layouts:

1. layout "title" — phase "Meet the topic"
   Name the topic and why it matters in this chapter.
2. layout "definition" — phase "The definition"
   State the textbook definition in plain words. Include keyTerms and a formula if the chapter has one.
3. layout "steps" — phase "How it works"
   3 to 5 short steps that show the process or idea unfolding.
4. layout "compare" — phase "Common mix-up"
   Two columns: the mix-up students make vs the correct idea from the chapter.
5. layout "example" — phase "Worked example"
   One concrete example from the excerpts: prompt, working steps, answer.
6. layout "recap" — phase "Remember this"
   Three or four points plus one sentence a student can say back.

FACTS:
Use only the supplied chapter excerpts, summary, and title. If a detail is not there, leave it out.
Teach THIS topic. A science, language, or history chapter stays that subject.
On-screen text is short: headings ≤ 8 words, body ≤ 28 words, each step label ≤ 10 words, each point ≤ 14 words.

VOICE:
voiceover_narration is 80–120 words of spoken classroom language for that scene.
Address the student. Explain the idea. Do not describe the animation, the board, or the software.

Return ONLY JSON:
{
  "topicTitle": "the topic title",
  "teacherName": "MindVault",
  "architecture": "lesson_board",
  "totalDurationSeconds": 240,
  "scenes": [
    {
      "sceneId": 1,
      "phase": "Meet the topic",
      "durationSec": 36,
      "timestamp_range": [0, 36],
      "voiceover_narration": "80–120 words explaining this beat of the topic",
      "lesson": {
        "layout": "title",
        "heading": "short topic title",
        "subheading": "chapter name",
        "body": "one sentence why this matters",
        "keyTerms": ["term one", "term two"]
      }
    }
  ]
}

lesson fields by layout:
- title: heading, subheading, body, keyTerms
- definition: heading, body, keyTerms, formula (optional)
- steps: heading, steps[{label, detail}]
- compare: heading, left{label, points[]}, right{label, points[]}
- example: heading, example{prompt, working[], answer}
- recap: heading, points[], body (the sentence to say back)

STRICT:
- Exactly 6 scenes. Sum of durationSec between 180 and 300.
- layouts in order: title, definition, steps, compare, example, recap.
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
  return clipText(raw, 220);
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
    const label = clipText(String(o.label ?? o.title ?? o.step ?? ''), 48);
    if (!label) continue;
    const step: LessonSlideStep = { label };
    if (o.detail != null) step.detail = clipText(String(o.detail), 90);
    steps.push(step);
    if (steps.length >= 5) break;
  }
  return steps;
}

function asColumn(raw: unknown, fallback: LessonSlideColumn): LessonSlideColumn {
  if (!raw || typeof raw !== 'object') return fallback;
  const o = raw as Record<string, unknown>;
  return {
    label: clipText(String(o.label ?? fallback.label), 28) || fallback.label,
    points: asStringList(o.points, 4, 70) || fallback.points,
  };
}

function asExample(raw: unknown, fallback: LessonSlideExample): LessonSlideExample {
  if (!raw || typeof raw !== 'object') return fallback;
  const o = raw as Record<string, unknown>;
  return {
    prompt: clipText(String(o.prompt ?? fallback.prompt), 120) || fallback.prompt,
    working: asStringList(o.working, 4, 80) || fallback.working,
    answer: clipText(String(o.answer ?? fallback.answer), 80) || fallback.answer,
  };
}

function asLesson(raw: unknown, fallback: LessonSlide): LessonSlide {
  if (!raw || typeof raw !== 'object') return fallback;
  const o = raw as Record<string, unknown>;
  const layout = (LESSON_BEATS.some((beat) => beat.layout === o.layout) ? o.layout : fallback.layout) as LessonSlideLayout;
  return {
    layout,
    heading: clipText(String(o.heading ?? fallback.heading), 60) || fallback.heading,
    subheading: o.subheading != null ? clipText(String(o.subheading), 80) : fallback.subheading,
    body: o.body != null ? clipText(String(o.body), 160) : fallback.body,
    keyTerms: asStringList(o.keyTerms ?? o.key_terms, 5, 28).length
      ? asStringList(o.keyTerms ?? o.key_terms, 5, 28)
      : fallback.keyTerms,
    formula: o.formula != null ? clipText(String(o.formula), 80) : fallback.formula,
    steps: asSteps(o.steps).length ? asSteps(o.steps) : fallback.steps,
    left: o.left ? asColumn(o.left, fallback.left ?? { label: 'Mix-up', points: [] }) : fallback.left,
    right: o.right ? asColumn(o.right, fallback.right ?? { label: 'Correct', points: [] }) : fallback.right,
    example: o.example ? asExample(o.example, fallback.example ?? { prompt: '', working: [], answer: '' }) : fallback.example,
    points: asStringList(o.points, 4, 80).length ? asStringList(o.points, 4, 80) : fallback.points,
  };
}

function collectRawBlocks(raw: LlmManifestRaw): LlmBlockRaw[] {
  const bags = [raw.scenes, raw.levels, raw.frames, raw.blocks];
  for (const bag of bags) {
    if (Array.isArray(bag) && bag.length) return bag.slice(0, MAX_SCENES);
  }
  return [];
}

function expandVoiceover(text: string, ctx: TopicContextPacket, index: number, minWords = 75): string {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length >= minWords) return text;
  const extra = excerptAt(ctx, index, ctx.chapterSummary || ctx.title);
  return `${text} ${extra} Keep this idea from the chapter in your own words.`.trim();
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
    const target = Math.min(MAX_TOTAL_SEC, Math.max(MIN_TOTAL_SEC, total || 240));
    const scale = target / (total || 1);
    for (const s of scenes) {
      const next = Math.max(28, Math.min(70, Math.round(s.duration * scale)));
      s.duration = next;
      s.durationSec = next;
    }
    total = scenes.reduce((a, s) => a + s.duration, 0);
  }
  if (total < MIN_TOTAL_SEC) {
    const bump = Math.ceil((MIN_TOTAL_SEC - total) / scenes.length);
    for (const s of scenes) {
      const next = Math.min(70, s.duration + bump);
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
  const puzzle = excerptAt(ctx, 0, ctx.chapterSummary || ctx.title);
  const mixup = excerptAt(ctx, 2, ctx.chapterSummary || definition);
  const rule = formulas[0] || excerptAt(ctx, 3, definition);
  const recap = clipText(ctx.chapterSummary || definition, 140);
  return [
    {
      layout: 'title',
      heading: ctx.title,
      subheading: ctx.chapterTitle,
      body: clipText(puzzle, 140),
      keyTerms: [ctx.subject, ctx.gradeLabel].filter(Boolean),
    },
    {
      layout: 'definition',
      heading: `What ${ctx.title} means`,
      body: clipText(definition, 160),
      keyTerms: [ctx.title],
      formula: formulas[0],
    },
    {
      layout: 'steps',
      heading: 'How it works',
      steps: [
        { label: 'Start from the chapter', detail: clipText(puzzle, 80) },
        { label: 'Name the idea', detail: clipText(definition, 80) },
        { label: 'Use the rule', detail: clipText(rule, 80) },
      ],
    },
    {
      layout: 'compare',
      heading: 'A common mix-up',
      left: { label: 'Easy to mix up', points: [clipText(mixup, 70), 'A first guess often stops here'] },
      right: { label: 'From the textbook', points: [clipText(definition, 70), clipText(rule, 70)] },
    },
    {
      layout: 'example',
      heading: 'Worked example',
      example: {
        prompt: `Apply ${ctx.title} from ${ctx.chapterTitle}.`,
        working: [clipText(definition, 80), clipText(rule, 80)],
        answer: clipText(rule, 80),
      },
    },
    {
      layout: 'recap',
      heading: 'Remember this',
      points: [clipText(definition, 70), clipText(rule, 70), `Topic: ${ctx.title}`],
      body: recap,
    },
  ];
}

function heuristicVoiceovers(ctx: TopicContextPacket, formulas: string[]): string[] {
  const definition = excerptAt(ctx, 1, excerptAt(ctx, 0, ctx.title));
  const puzzle = excerptAt(ctx, 0, ctx.chapterSummary || ctx.title);
  const mixup = excerptAt(ctx, 2, ctx.chapterSummary || definition);
  const rule = formulas[0] || excerptAt(ctx, 3, definition);
  const recap = clipText(ctx.chapterSummary || definition, 180);
  return [
    `Today we are looking at ${ctx.title}, from ${ctx.chapterTitle} in ${ctx.textbookTitle}. ${puzzle} By the end of this lesson you should be able to say what this idea means and use it on a simple example.`,
    `Here is the definition to keep for ${ctx.title}. ${definition} Say that idea once, then say it again. The textbook chose those words on purpose, so the second pass is how the meaning sticks.`,
    `Now watch how the idea works, step by step. ${clipText(definition, 160)} Each step comes from the chapter, not from a guess. If you can follow the order, you can explain the topic to someone else.`,
    `This is the part students mix up. ${mixup} Hold that first guess next to the textbook idea: ${clipText(definition, 120)} The example in the chapter is there to show where the guess stops working.`,
    `Let us use one example. ${rule} Read the prompt, follow the working, and check the answer against the chapter. That is the same move you will make on a question about ${ctx.title}.`,
    `Say this back: ${ctx.title}. ${recap} If you can explain that in one sentence, this lesson is clear.`,
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
  });
  lesson.layout = beat.layout;
  const duration = durationFromBlock(block ?? {}, DEFAULT_SCENE_SEC[index] ?? 45);
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
  const parameters: VideoSceneParameters = {
    ...visualConfig,
    lesson,
  };
  return {
    sceneId: block?.sceneId ?? index + 1,
    duration,
    durationSec: duration,
    voiceoverText: voiceover,
    voiceover,
    voiceoverNarration: voiceover,
    animationType: 'LessonBoard',
    parameters,
    phase,
    phaseTitle: phase,
    visualType: 'lesson_board',
    visualArchetype: 'concept_card',
    visualConfig,
    visualProps: parameters,
    props: parameters,
    teacherGesture: index === 0 ? 'questioning' : index >= 5 ? 'celebrating' : 'demonstrating',
    cameraMotion: 'push_in_close',
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
    architecture: 'lesson_board',
    archetype: 'concept',
    pedagogicalPattern: 'lesson_board',
    totalDurationSeconds: scenes.reduce((a, s) => a + s.duration, 0),
    scenes,
  };
}

function normalizeManifest(raw: LlmManifestRaw, ctx: TopicContextPacket): VideoScriptManifest {
  const fallback = heuristicManifest(ctx);
  const blocks = collectRawBlocks(raw);
  if (!blocks.length) {
    throw new Error('Claude Opus 5.5 returned no lesson scenes');
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
    architecture: 'lesson_board',
    archetype: 'concept',
    pedagogicalPattern: 'lesson_board',
    totalDurationSeconds: scenes.reduce((a, s) => a + s.duration, 0),
    scenes,
  };
}

function applyAttachmentOverlays(
  manifest: VideoScriptManifest,
  ctx: TopicContextPacket,
): VideoScriptManifest {
  const urls = (ctx.attachmentImageUrls ?? []).filter((u) => typeof u === 'string' && u.length > 4);
  if (!urls.length) return manifest;
  return {
    ...manifest,
    scenes: manifest.scenes.map((s, i) => {
      const overlayImageUrl = urls[Math.min(i, urls.length - 1)];
      const overlayImageUrls = urls.slice(0, 4);
      const visualConfig = { ...(s.visualConfig ?? {}), overlayImageUrls, overlayImageUrl };
      const parameters = { ...(s.parameters ?? {}), overlayImageUrls, overlayImageUrl };
      return { ...s, visualConfig, parameters, visualProps: parameters, props: parameters };
    }),
  };
}

function parseLlmManifestSafely(llmOutput: unknown, ctx: TopicContextPacket): VideoScriptManifest {
  let parsed: unknown = llmOutput;
  if (typeof llmOutput === 'string') parsed = JSON.parse(llmOutput);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Claude Opus 5.5 did not return a lesson script');
  }
  const manifest = applyAttachmentOverlays(normalizeManifest(parsed as LlmManifestRaw, ctx), ctx);
  if (!manifest.scenes.length) {
    throw new Error('Claude Opus 5.5 returned no lesson scenes');
  }
  return manifest;
}

export function normalizeVisualArchetype(_raw?: string, _index = 0): string {
  return 'lesson_board';
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
    `[videoPipeline/script] Claude Opus 5.5 domain=${domain} RAG=${ctx.ragExcerpts.length} formulas=${formulas.length} topic="${ctx.code} ${ctx.title}"`,
  );

  if (!provider) {
    throw new Error(
      'ANTHROPIC_API_KEY is required. Animated lesson videos are generated by Claude Opus 5.5 (claude-opus-5-5).',
    );
  }

  const user = [
    `Topic code: ${ctx.code}`,
    `Topic title: ${ctx.title}`,
    `Chapter: ${ctx.chapterTitle}`,
    `Textbook: ${ctx.textbookTitle} (${ctx.subject}) file=${ctx.fileName ?? 'uploaded.pdf'}`,
    `Grade: ${ctx.gradeLabel}`,
    `Detected domain: ${domain}`,
    `Chapter summary: ${ctx.chapterSummary}`,
    'Teach this topic from the excerpts on a clean lesson board. No game theme.',
    ctx.teacherPrompt ? `Teacher note: ${ctx.teacherPrompt}` : '',
    formulas.length ? `FORMULAS FOUND IN THE CHAPTER:\n${formulas.join('\n')}` : '',
    `CHAPTER EXCERPTS (use these facts only):\n${excerpts || ctx.chapterSummary || ctx.title}`,
    'Output exactly 6 scenes, 180–300 seconds total, architecture lesson_board.',
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
    `[videoPipeline/script] lessonBoard model=claude-opus-5-5 scenes=${manifest.scenes.length} duration=${manifest.totalDurationSeconds}s phases=${manifest.scenes.map((s) => s.phase).join(' | ')}`,
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
      timeSec: t + Math.min(2, s.duration / 3),
      label: String(s.phase || s.lesson?.heading || s.voiceoverText.slice(0, 40)),
    };
    t += s.duration;
    return cue;
  });
}
