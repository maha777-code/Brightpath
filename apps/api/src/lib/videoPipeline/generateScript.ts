import type {
  GameplayHudStats,
  GameplayVisual,
  PixelSfxTrigger,
  SceneVisualConfig,
  VideoSceneParameters,
  VideoSceneSpec,
  VideoScriptManifest,
} from '@brightpath/shared';
import { getActiveProvider } from '../llm/provider.js';
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
    level: 'Level 1: The Manual Era',
    action: 'running_into_wall',
    sfx: 'glitch_error_sound' as PixelSfxTrigger,
    terminal: 'move_right(); jump(); // hardcoded — fails on the next tile',
    hud: { cpu_usage: '12%', exp: 80, mana: '80/100' } satisfies GameplayHudStats,
  },
  {
    index: 1,
    level: 'Level 2: The Loop & Logic Era',
    action: 'looping',
    sfx: 'eight_bit_click' as PixelSfxTrigger,
    terminal: 'while (hazard) { if (gap) jump(); else move_right(); }',
    hud: { cpu_usage: '28%', exp: 220, mana: '70/100' } satisfies GameplayHudStats,
  },
  {
    index: 2,
    level: 'Level 3: The Unpredictable World',
    action: 'dodge_fail',
    sfx: 'glitch_error_sound' as PixelSfxTrigger,
    terminal: '// static rules miss the noise\nif (pattern === last) jump(); // boom',
    hud: { cpu_usage: '61%', exp: 340, mana: '40/100', variance: 'σ² rising' } satisfies GameplayHudStats,
  },
  {
    index: 3,
    level: 'Level 4: The AI Companion',
    action: 'feeding_data',
    sfx: 'neural_net_powerup' as PixelSfxTrigger,
    terminal: 'loss = (y - ŷ)²; companion.fit(X, y); // train on the path',
    hud: { cpu_usage: '74%', exp: 620, mana: '90/100' } satisfies GameplayHudStats,
  },
  {
    index: 4,
    level: 'Boss Battle / Level Complete',
    action: 'co_op_clear',
    sfx: 'boss_fanfare' as PixelSfxTrigger,
    terminal: 'human.plan(); companion.predict(); // co-op maze clear',
    hud: { cpu_usage: '44%', exp: 999, mana: '100/100' } satisfies GameplayHudStats,
  },
] as const;

const PIXEL_QUEST_PROMPT = `
You are the lead designer of a 2D PIXEL-ART educational game video (streamer commentary + retro HUD).
Do NOT pick Tom & Jerry, space-shooter skins, SweetRush quest maps, or any other static template.
Every video uses ONE architecture: pixel_game_hud.

RUNTIME: 3 to 5 minutes (180–300 seconds). Output exactly 5 level blocks (4 eras + boss).

CORE METAPHORS (pick from the textbook domain and stay there):
- Coding / formulas → spellcasting or writing physical LEVEL RULES in a live terminal.
- AI / ML / statistics → an evolving PET / COMPANION NPC that watches gameplay, learns patterns, and clears obstacles.

ENFORCED PROGRESSION:
1. Level 1: The Manual Era / Hardcoded Rules
   Character uses hardcoded inputs (move_right(), jump(), a single fixed equation). They walk into a wall.
2. Level 2: The Loop & Logic Era
   if/else and loops automate repetitive obstacles.
3. Level 3: The Unpredictable World / Why We Need AI/Math
   Dynamic hazards / non-linear noise. Hardcoded logic fails.
4. Level 4: The AI Companion / Training & Model Fitting
   Hero feeds training data + a loss function to the companion. The pet learns and solves noisy paths.
5. Boss Battle / Level Complete
   Human logic + trained companion co-op the final maze.

CONTEXT ENFORCEMENT:
Quote exact formulas, definitions, and studies from RAG (e.g. Galton 1889, g*(x)=E[Y|X=x], squared-error loss, Y=Xβ+ε).
Voiceover is energetic gaming-streamer narration grounded in that math — not generic hype.

Return ONLY JSON:
{
  "topicTitle": "from the textbook",
  "teacherName": "Pixel Sage",
  "architecture": "pixel_game_hud",
  "totalDurationSeconds": 240,
  "scenes": [
    {
      "sceneId": 1,
      "level": "Level 1: The Manual Era",
      "timestamp_range": [0, 45],
      "durationSec": 45,
      "gameplay_visual": {
        "character_action": "running_into_wall",
        "code_terminal_overlay": "move_right(); // Hardcoded fail — quote a formula from RAG",
        "hud_stats": { "cpu_usage": "12%", "exp": 100, "mana": "80/100" }
      },
      "voiceover_narration": "80–120 words, streamer style, quoting the PDF",
      "sfx_trigger": "glitch_error_sound"
    }
  ]
}

character_action MUST be one of:
running_into_wall | looping | dodge_fail | feeding_data | co_op_clear | jumping | compiling | celebrating | training

sfx_trigger MUST be one of:
glitch_error_sound | eight_bit_click | neural_net_powerup | success_chime | compile_success | boss_fanfare | button_click

STRICT:
- Exactly 5 scenes / levels. Sum of durationSec between 180 and 300.
- No chemistry beakers, no 3-scene 28s bumper, no template skins.
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
  const visual: GameplayVisual = asGameplayVisual(block?.gameplay_visual ?? block?.gameplayVisual, {
    character_action: preset.action,
    code_terminal_overlay: formula
      ? `${preset.terminal}\n// ${formula}`
      : preset.terminal,
    hud_stats: { ...preset.hud },
  });
  const duration = durationFromBlock(block ?? {}, DEFAULT_LEVEL_SEC[index] ?? 45);
  const voiceover = String(
    block?.voiceover_narration ||
      block?.voiceoverNarration ||
      block?.voiceover ||
      block?.voiceoverText ||
      '',
  ).trim();
  const level = String(block?.level || preset.level);
  const sfx = String(block?.sfx_trigger || block?.sfxTrigger || preset.sfx) as PixelSfxTrigger;
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
  const study = excerptAt(ctx, 0, ctx.title);
  const f0 = formulas[0] || 'the core equation in the text';
  const f1 = formulas[1] || 'Y = Xβ + ε';
  const domain = ctx.contentDomain || detectContentDomain(ctx);
  const companion =
    domain === 'dsml' || domain === 'math'
      ? 'an evolving math-pet that watches every jump'
      : 'a code-familiar that learns the level rules';
  return [
    `Chat, welcome to the manual era of ${ctx.title}. Our hero only knows hardcoded spells — move_right(), jump(), one frozen formula. ${study} Watch them slam into the wall. That's what a single static rule looks like when the world has more than one tile.`,
    `Level 2 drop: we unlock loops and if/else. Same obstacle, ten times, now automated. ${excerptAt(ctx, 1, f0)} The terminal is spellcasting — each condition is a physical law of this stage. EXP is ticking because the code actually compiles.`,
    `Now the world goes noisy. Hazards don't repeat. Hardcoded jump timing face-plants. This is why we need the math from the textbook: ${f0}. Static rules cannot track non-linear noise. CPU spikes, mana dumps, glitch city.`,
    `Pet time. We feed the companion training pairs and a loss — squared error, ${f1}. ${companion} fits the pattern the way the PDF describes. ${excerptAt(ctx, 2, ctx.chapterSummary || ctx.title)} The path that broke Level 3 starts to light up.`,
    `Boss maze. Human writes the plan; the trained companion predicts the noisy tiles. Co-op clear! Remember ${ctx.code}: ${ctx.title}. ${clipText(ctx.chapterSummary || excerptAt(ctx, 3, ctx.title), 180)} Level complete — EXP maxed.`,
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
  if (!blocks.length) return fallback;

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
  try {
    let parsed: unknown = llmOutput;
    if (typeof llmOutput === 'string') parsed = JSON.parse(llmOutput);
    if (!parsed || typeof parsed !== 'object') throw new Error('LLM output is not a JSON object');
    return applyAttachmentOverlays(normalizeManifest(parsed as LlmManifestRaw, ctx), ctx);
  } catch (err) {
    console.error('[pixelQuest] Failed to parse LLM JSON — using 5-level fallback', err);
    return applyAttachmentOverlays(heuristicManifest(ctx), ctx);
  }
}

/** @deprecated template skins removed — pixel quest is the only video architecture. */
export function normalizeVisualArchetype(_raw?: string, _index = 0): string {
  return 'pixel_game_hud';
}

export async function generateStructuredVideoScript(
  ctx: TopicContextPacket,
): Promise<VideoScriptManifest> {
  const provider = getActiveProvider();
  const domain = ctx.contentDomain || detectContentDomain(ctx);
  const formulas = extractFormulasFromContext(ctx);
  const excerpts = ctx.ragExcerpts.slice(0, 16).join('\n---\n');
  const packet: TopicContextPacket = { ...ctx, contentDomain: domain };

  console.log(
    `[videoPipeline/script] pixel quest domain=${domain} RAG=${ctx.ragExcerpts.length} formulas=${formulas.length} topic="${ctx.code} ${ctx.title}"`,
  );

  const user = [
    `Topic code: ${ctx.code}`,
    `Topic title: ${ctx.title}`,
    `Chapter: ${ctx.chapterTitle}`,
    `Textbook: ${ctx.textbookTitle} (${ctx.subject}) file=${ctx.fileName ?? 'uploaded.pdf'}`,
    `Detected domain: ${domain}`,
    `Chapter summary: ${ctx.chapterSummary}`,
    domain === 'dsml' || domain === 'math'
      ? 'METAPHOR: AI companion / evolving pet that learns from gameplay + textbook math (β, X, σ², loss).'
      : 'METAPHOR: coding-as-spellcasting. Formulas are physical level rules typed into the terminal.',
    ctx.teacherPrompt ? `Teacher refinement: ${ctx.teacherPrompt}` : '',
    formulas.length ? `EXTRACTED FORMULAS / STUDIES:\n${formulas.join('\n')}` : '',
    `RAW RAG EXCERPTS (GROUND TRUTH):\n${excerpts || '(use title + summary)'}`,
    'Output exactly 5 level blocks, 180–300 seconds total, architecture pixel_game_hud. No template skins.',
  ]
    .filter(Boolean)
    .join('\n\n');

  if (!provider) return applyAttachmentOverlays(heuristicManifest(packet), packet);

  try {
    const raw = await Promise.race([
      provider.completeJson<LlmManifestRaw | string>({
        system: PIXEL_QUEST_PROMPT,
        user,
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('LLM script timed out')), 90_000);
      }),
    ]);
    const manifest = parseLlmManifestSafely(raw, packet);
    console.log(
      `[videoPipeline/script] pixelQuest scenes=${manifest.scenes.length} duration=${manifest.totalDurationSeconds}s levels=${manifest.scenes.map((s) => s.level).join(' | ')}`,
    );
    return manifest;
  } catch (err) {
    console.error('[pixelQuest] LLM failed/timed out — fallback 5-level script', err);
    return applyAttachmentOverlays(heuristicManifest(packet), packet);
  }
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
