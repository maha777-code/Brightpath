import type {
  GameplayHudStats,
  GameplayVisual,
  PixelSfxTrigger,
  SceneVisualConfig,
  VideoSceneParameters,
  VideoSceneSpec,
  VideoScriptManifest,
} from '@brightpath/shared';
import { getPixelQuestScriptProvider, pixelQuestGeminiModel } from '../llm/provider.js';
import { detectContentDomain, extractFormulasFromContext } from './contentDomain.js';
import type { TopicContextPacket } from './types.js';

const MIN_SCENES = 5;
const MAX_SCENES = 6;
const MIN_TOTAL_SEC = 180;
const MAX_TOTAL_SEC = 300;
const DEFAULT_LEVEL_SEC = [45, 48, 50, 52, 45] as const;

export const PIXEL_LEVELS = [
  {
    index: 0,
    level: 'Level 1: Notice the puzzle',
    action: 'running_into_wall',
    sfx: 'glitch_error_sound' as PixelSfxTrigger,
    terminal: 'First guess hits a wall — the chapter has a clearer rule',
    hud: { cpu_usage: '12%', exp: 80, mana: '80/100' } satisfies GameplayHudStats,
  },
  {
    index: 1,
    level: 'Level 2: The definition',
    action: 'looping',
    sfx: 'eight_bit_click' as PixelSfxTrigger,
    terminal: 'Say the textbook definition, then say it again',
    hud: { cpu_usage: '28%', exp: 220, mana: '70/100' } satisfies GameplayHudStats,
  },
  {
    index: 2,
    level: 'Level 3: The tricky part',
    action: 'dodge_fail',
    sfx: 'glitch_error_sound' as PixelSfxTrigger,
    terminal: 'A common mix-up from this topic',
    hud: { cpu_usage: '61%', exp: 340, mana: '40/100' } satisfies GameplayHudStats,
  },
  {
    index: 3,
    level: 'Level 4: The textbook rule',
    action: 'feeding_data',
    sfx: 'neural_net_powerup' as PixelSfxTrigger,
    terminal: 'The exact rule, example, or formula from the chapter',
    hud: { cpu_usage: '74%', exp: 620, mana: '90/100' } satisfies GameplayHudStats,
  },
  {
    index: 4,
    level: 'Level 5: Say it back',
    action: 'co_op_clear',
    sfx: 'boss_fanfare' as PixelSfxTrigger,
    terminal: 'One sentence a student can repeat after class',
    hud: { cpu_usage: '44%', exp: 999, mana: '100/100' } satisfies GameplayHudStats,
  },
] as const;

const PIXEL_QUEST_PROMPT = `
You write a 2D pixel-art lesson video that teaches ONE textbook topic to a school student.
The pixel game is only the visual skin. The narration and the on-screen terminal are the lesson.
Architecture is always pixel_game_hud. Do not switch to another template.

RUNTIME: 3 to 5 minutes (180–300 seconds). Output exactly 5 levels, in this order, with these character_action and sfx_trigger values:

1. level "Level 1: Notice the puzzle" — character_action "running_into_wall" — sfx_trigger "glitch_error_sound"
   Open with the concrete situation from the chapter. Name what is confusing before the definition.
2. level "Level 2: The definition" — character_action "looping" — sfx_trigger "eight_bit_click"
   State the textbook definition in plain words, then repeat the key phrase so it sticks.
3. level "Level 3: The tricky part" — character_action "dodge_fail" — sfx_trigger "glitch_error_sound"
   Show the mix-up, exception, or example from the chapter that a first guess gets wrong.
4. level "Level 4: The textbook rule" — character_action "feeding_data" — sfx_trigger "neural_net_powerup"
   Give the exact rule, process, example, or formula from the excerpts. Quote it.
5. level "Level 5: Say it back" — character_action "co_op_clear" — sfx_trigger "boss_fanfare"
   Close with one sentence a student can repeat, plus the topic title.

FACTS:
Use only the supplied chapter excerpts, summary, and title. If a detail is not there, leave it out.
Teach THIS topic. A science, language, or history chapter stays that subject.
Mention code, loops, or machine learning only when the excerpts themselves are about code or machine learning.
code_terminal_overlay is one short line a student can read on screen: a definition, example, or formula from the chapter. Maximum 90 characters. No programming syntax unless the chapter is about programming.

VOICE:
voiceover_narration is 80–120 words of spoken classroom language for that level.
Address the student. Explain the idea. Do not describe the pixel character, the HUD, or the game.

Return ONLY JSON:
{
  "topicTitle": "the topic title",
  "teacherName": "Pixel Sage",
  "architecture": "pixel_game_hud",
  "totalDurationSeconds": 240,
  "scenes": [
    {
      "sceneId": 1,
      "level": "Level 1: Notice the puzzle",
      "timestamp_range": [0, 45],
      "durationSec": 45,
      "gameplay_visual": {
        "character_action": "running_into_wall",
        "code_terminal_overlay": "short fact from the chapter",
        "hud_stats": { "cpu_usage": "12%", "exp": 80, "mana": "80/100" }
      },
      "voiceover_narration": "80–120 words explaining this beat of the topic",
      "sfx_trigger": "glitch_error_sound"
    }
  ]
}

STRICT:
- Exactly 5 scenes. Sum of durationSec between 180 and 300.
- character_action for the five scenes, in order: running_into_wall, looping, dodge_fail, feeding_data, co_op_clear.
- Return JSON only.
`;

type LlmBlockRaw = {
  sceneId?: number;
  level?: string;
  timestamp_range?: [number, number] | number[];
  timestampRange?: [number, number] | number[];
  duration?: number;
  durationSec?: number;
  voiceover?: string;
  voiceoverText?: string;
  voiceover_narration?: string;
  voiceoverNarration?: string;
  gameplay_visual?: GameplayVisual;
  gameplayVisual?: GameplayVisual;
  sfx_trigger?: string;
  sfxTrigger?: string;
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

function asHud(raw: unknown, fallback: GameplayHudStats): GameplayHudStats {
  if (!raw || typeof raw !== 'object') return fallback;
  const o = raw as Record<string, unknown>;
  return {
    cpu_usage: o.cpu_usage != null ? String(o.cpu_usage) : fallback.cpu_usage,
    exp: typeof o.exp === 'number' ? o.exp : Number(o.exp) || fallback.exp,
    mana: o.mana != null ? String(o.mana) : fallback.mana,
    memory: o.memory != null ? String(o.memory) : fallback.memory,
    variance: o.variance != null ? String(o.variance) : fallback.variance,
  };
}

function asGameplayVisual(raw: unknown, fallback: GameplayVisual): GameplayVisual {
  if (!raw || typeof raw !== 'object') return fallback;
  const o = raw as Record<string, unknown>;
  return {
    character_action: o.character_action != null ? String(o.character_action) : fallback.character_action,
    code_terminal_overlay:
      o.code_terminal_overlay != null ? String(o.code_terminal_overlay) : fallback.code_terminal_overlay,
    hud_stats: asHud(o.hud_stats, fallback.hud_stats ?? {}),
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
  return `${text} ${extra} Stay with the level — the textbook is the rulebook for this stage.`.trim();
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
      const next = Math.max(30, Math.min(75, Math.round(s.duration * scale)));
      s.duration = next;
      s.durationSec = next;
    }
    total = scenes.reduce((a, s) => a + s.duration, 0);
  }
  if (total < MIN_TOTAL_SEC) {
    const bump = Math.ceil((MIN_TOTAL_SEC - total) / scenes.length);
    for (const s of scenes) {
      const next = Math.min(75, s.duration + bump);
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

function toSceneSpec(
  ctx: TopicContextPacket,
  block: LlmBlockRaw | undefined,
  index: number,
  formulas: string[],
): VideoSceneSpec {
  const preset = PIXEL_LEVELS[Math.min(index, PIXEL_LEVELS.length - 1)];
  const formula = formulas[index] || formulas[0] || '';
  const factLine = clipText(formula || excerptAt(ctx, index, ctx.title), 90);
  const visual: GameplayVisual = asGameplayVisual(block?.gameplay_visual ?? block?.gameplayVisual, {
    character_action: preset.action,
    code_terminal_overlay: factLine || preset.terminal,
    hud_stats: { ...preset.hud },
  });
  visual.character_action = preset.action;
  visual.code_terminal_overlay = clipText(visual.code_terminal_overlay || factLine || preset.terminal, 90);
  const duration = durationFromBlock(block ?? {}, DEFAULT_LEVEL_SEC[index] ?? 45);
  const voiceover = String(
    block?.voiceover_narration ||
      block?.voiceoverNarration ||
      block?.voiceover ||
      block?.voiceoverText ||
      '',
  ).trim();
  const level = preset.level;
  const sfx = preset.sfx;
  const visualConfig: SceneVisualConfig = {
    ...(block?.visualConfig ?? {}),
    visualDomain: ctx.contentDomain || detectContentDomain(ctx),
    formulaText: formula || visual.code_terminal_overlay,
    equationLatex: formula || undefined,
    headline: level,
    stageLabel: visual.code_terminal_overlay,
    takeawayBadge: visual.hud_stats?.variance,
    gameplay_visual: visual,
    gameplayVisual: visual,
    sfx_trigger: sfx,
    level,
  };
  const parameters: VideoSceneParameters = {
    ...visualConfig,
    gameplay_visual: visual,
    sfx_trigger: sfx,
    level,
  };
  return {
    sceneId: block?.sceneId ?? index + 1,
    duration,
    durationSec: duration,
    voiceoverText: voiceover,
    voiceover: voiceover,
    voiceoverNarration: voiceover,
    animationType: 'PixelQuest',
    parameters,
    phase: level,
    phaseTitle: level,
    visualType: 'pixel_game_hud',
    visualArchetype: 'pixel_game_hud',
    visualConfig,
    visualProps: parameters,
    props: parameters,
    teacherGesture: index === 0 ? 'questioning' : index >= 4 ? 'celebrating' : 'demonstrating',
    cameraMotion: 'push_in_close',
    level,
    timestampRange: [0, duration],
    timestamp_range: [0, duration],
    gameplayVisual: visual,
    gameplay_visual: visual,
    sfxTrigger: sfx,
    sfx_trigger: sfx,
  };
}

function heuristicVoiceovers(ctx: TopicContextPacket, formulas: string[]): string[] {
  const definition = excerptAt(ctx, 1, excerptAt(ctx, 0, ctx.title));
  const puzzle = excerptAt(ctx, 0, ctx.chapterSummary || ctx.title);
  const tricky = excerptAt(ctx, 2, ctx.chapterSummary || definition);
  const rule = formulas[0] || excerptAt(ctx, 3, definition);
  const recap = clipText(ctx.chapterSummary || definition, 180);
  return [
    `Start with what you can already notice about ${ctx.title}. ${puzzle} A first guess runs into a wall here, because the chapter is pointing at something more exact than the everyday picture. Hold that puzzle. The next level names it.`,
    `Here is the definition to keep for ${ctx.title}, in ${ctx.chapterTitle}. ${definition} Say that key idea once, then say it again. The textbook uses those words on purpose, so the second pass is how the meaning sticks.`,
    `This is the part students mix up. ${tricky} If the first guess still feels right, check it against the chapter example. The example is there to show where that guess stops working.`,
    `Now the rule itself. ${rule} That line is the one to trust when a question about ${ctx.title} shows up. It comes from ${ctx.textbookTitle}, not from a guess. Read it with the example you just saw.`,
    `Say this back: ${ctx.title}. ${recap} If you can explain that in one sentence, this level is clear.`,
  ];
}

function heuristicManifest(ctx: TopicContextPacket): VideoScriptManifest {
  const formulas = extractFormulasFromContext(ctx);
  const lines = heuristicVoiceovers(ctx, formulas);
  const scenes = PIXEL_LEVELS.map((preset, i) => {
    const spec = toSceneSpec(ctx, { level: preset.level, voiceover_narration: lines[i] }, i, formulas);
    spec.voiceoverText = lines[i];
    spec.voiceover = lines[i];
    spec.voiceoverNarration = lines[i];
    spec.duration = DEFAULT_LEVEL_SEC[i];
    spec.durationSec = DEFAULT_LEVEL_SEC[i];
    return spec;
  });
  rescaleToWindow(scenes);
  return {
    topicTitle: ctx.title,
    teacherName: 'Pixel Sage',
    architecture: 'pixel_game_hud',
    archetype: 'process',
    pedagogicalPattern: 'process_flow',
    totalDurationSeconds: scenes.reduce((a, s) => a + s.duration, 0),
    scenes,
  };
}

function normalizeManifest(raw: LlmManifestRaw, ctx: TopicContextPacket): VideoScriptManifest {
  const fallback = heuristicManifest(ctx);
  const formulas = extractFormulasFromContext(ctx);
  const blocks = collectRawBlocks(raw);
  if (!blocks.length) {
    throw new Error('Gemini returned no lesson levels');
  }

  const scenes = blocks.map((b, i) => {
    const spec = toSceneSpec(ctx, b, i, formulas);
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
    teacherName: String(raw.teacherName || 'Pixel Sage').trim() || 'Pixel Sage',
    architecture: 'pixel_game_hud',
    archetype: 'process',
    pedagogicalPattern: raw.architecture || 'process_flow',
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
    throw new Error('Gemini did not return a lesson script');
  }
  const manifest = applyAttachmentOverlays(normalizeManifest(parsed as LlmManifestRaw, ctx), ctx);
  if (!manifest.scenes.length) {
    throw new Error('Gemini returned no lesson levels');
  }
  return manifest;
}

/** @deprecated template skins removed — pixel quest is the only video architecture. */
export function normalizeVisualArchetype(_raw?: string, _index = 0): string {
  return 'pixel_game_hud';
}

export async function generateStructuredVideoScript(
  ctx: TopicContextPacket,
): Promise<VideoScriptManifest> {
  const provider = getPixelQuestScriptProvider();
  const domain = ctx.contentDomain || detectContentDomain(ctx);
  const formulas = extractFormulasFromContext(ctx);
  const excerpts = ctx.ragExcerpts.slice(0, 16).join('\n---\n');
  const packet: TopicContextPacket = { ...ctx, contentDomain: domain };

  console.log(
    `[videoPipeline/script] Gemini ${pixelQuestGeminiModel()} domain=${domain} RAG=${ctx.ragExcerpts.length} formulas=${formulas.length} topic="${ctx.code} ${ctx.title}"`,
  );

  if (!provider) {
    throw new Error('GEMINI_API_KEY is required. Pixel Quest lesson scripts are generated by Gemini.');
  }

  const user = [
    `Topic code: ${ctx.code}`,
    `Topic title: ${ctx.title}`,
    `Chapter: ${ctx.chapterTitle}`,
    `Textbook: ${ctx.textbookTitle} (${ctx.subject}) file=${ctx.fileName ?? 'uploaded.pdf'}`,
    `Grade: ${ctx.gradeLabel}`,
    `Detected domain: ${domain}`,
    `Chapter summary: ${ctx.chapterSummary}`,
    'Teach this topic from the excerpts. The pixel game is only the picture. Narration explains the idea to a student.',
    ctx.teacherPrompt ? `Teacher note: ${ctx.teacherPrompt}` : '',
    formulas.length ? `FORMULAS FOUND IN THE CHAPTER:\n${formulas.join('\n')}` : '',
    `CHAPTER EXCERPTS (use these facts only):\n${excerpts || ctx.chapterSummary || ctx.title}`,
    'Output exactly 5 levels, 180–300 seconds total, architecture pixel_game_hud.',
  ]
    .filter(Boolean)
    .join('\n\n');

  const raw = await Promise.race([
    provider.completeJson<LlmManifestRaw | string>({
      system: PIXEL_QUEST_PROMPT,
      user,
      temperature: 0.4,
    }),
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Gemini script timed out')), 170_000);
    }),
  ]);
  const manifest = parseLlmManifestSafely(raw, packet);
  console.log(
    `[videoPipeline/script] pixelQuest gemini scenes=${manifest.scenes.length} duration=${manifest.totalDurationSeconds}s levels=${manifest.scenes.map((s) => s.level).join(' | ')}`,
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
      label: String(s.level || s.phase || s.sfxTrigger || s.voiceoverText.slice(0, 40)),
    };
    t += s.duration;
    return cue;
  });
}
