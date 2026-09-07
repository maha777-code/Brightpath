import {
  getGenerationTemplate,
  TEMPLATE_CONFIGS,
  templatePromptBlock,
  type PedagogicalArchetype,
  type SceneVisualConfig,
  type VideoSceneParameters,
  type VideoScriptManifest,
  type VisualArchetype,
  type VisualContentDomain,
  type VisualStageElement,
} from '@brightpath/shared';
import { getActiveProvider } from '../llm/provider.js';
import {
  defaultArchetypesForDomain,
  detectContentDomain,
  extractFormulasFromContext,
  isLabVisualDomain,
} from './contentDomain.js';
import type { TopicContextPacket } from './types.js';

const MIN_SCENES = 4;
const MAX_SCENES = 6;
const MIN_TOTAL_SEC = 60;
const MAX_TOTAL_SEC = 90;
const DEFAULT_SCENE_SEC = 15;
const MIN_SCENE_SEC = 12;
const MAX_SCENE_SEC = 18;

function cinematicSystemPrompt(domain: VisualContentDomain, formulas: string[]): string {
  const formulaBlock = formulas.length
    ? formulas.map((f) => `- ${f}`).join('\n')
    : '- (quote every equation, definition, and named study that appears in the RAG excerpts)';

  const visualGuide =
    domain === 'dsml'
      ? `DSML / STATISTICS VISUALS (required):
- 'scatter_plot' — 2D/3D scatter of (x, y) observations
- 'regression_fit' — scatter plus the fit line y = β₀ + β₁ x
- 'matrix_board' — design matrix X, response Y, parameter vector β
- 'math_overlay' — animated LaTeX/text of g*(x) = E[Y | X = x], squared-error loss, σ²
Do NOT emit chemistry lab apparatus, beakers, stirrers, water, salt, or NCERT science clips.`
      : domain === 'math'
        ? `MATHEMATICS VISUALS:
- 'math_overlay' — glowing axes, vector spaces, LaTeX formula plaques
- 'matrix_board' — matrices / vectors
- 'concept_card' — theorem or definition
Do NOT emit chemistry lab media.`
        : domain === 'chemistry'
          ? `LAB VISUALS are allowed only because this topic is chemistry:
- 'interactive_stage' / 'micro_zoom' / 'split_comparison' / 'concept_card'`
          : `GENERIC / MATHEMATICAL FALLBACK (this is NOT a chemistry lab):
- Prefer 'math_overlay', 'concept_card', 'matrix_board', 'split_comparison'
- Render animated equations, glowing coordinate axes, or vector spaces
- NEVER default to a water beaker, stirrer, salt, or NCERT chemistry clip.`;

  return `
You are a Lead Animation Director for high-end educational movies (SweetRush style).
Transform the provided textbook RAG context into a ${MIN_SCENES}–${MAX_SCENES} scene cinematic script with a cartoon teacher narrator.

TARGET RUNTIME: ${MIN_TOTAL_SEC}–${MAX_TOTAL_SEC} seconds (NOT a 20-second bumper).
Each scene durationSec MUST be ${MIN_SCENE_SEC}–${MAX_SCENE_SEC}. Use ${MIN_SCENES} to ${MAX_SCENES} detailed steps. Typical: 5 scenes × 15s = 75s.

CONTEXT ENFORCEMENT:
Extract EXACT formulas, equations, definitions, and real-world examples from the RAG excerpts.
Quote them in voiceover and visualConfig.formulaText / equationLatex.
Examples of the fidelity we need when they appear in the PDF:
${formulaBlock}

${visualGuide}

Visual archetypes:
1. 'split_comparison' — two contrasting concepts
2. 'interactive_stage' — process / diagram (NOT a beaker unless the PDF is chemistry)
3. 'micro_zoom' — structure close-up
4. 'concept_card' — definition or law
5. 'scatter_plot' — observation cloud
6. 'regression_fit' — fitted line through points
7. 'math_overlay' — LaTeX / formula on glowing axes
8. 'matrix_board' — matrix / vector layout

DYNAMIC THEME CONTEXT:
Character dialogue MUST discuss the actual mathematics from the PDF (parameter vector β, design matrix X, error variance σ², loss functions, estimators) in the selected template's voice.
Do not replace math with lab metaphors.

Output a JSON payload matching this schema:
{
  "topicTitle": "Textbook Chapter Title",
  "teacherName": "Host character name",
  "pedagogicalPattern": "conceptual_comparison | process_flow | concept_card | lab_experiment",
  "totalDurationSeconds": 75,
  "scenes": [
    {
      "sceneId": 1,
      "phaseTitle": "THE HOOK",
      "durationSec": 15,
      "voiceover": "40–70 words grounded in the PDF, naming the study or formula",
      "teacherGesture": "explaining | questioning | excited | pointing | demonstrating | eureka | celebrating",
      "cameraMotion": "cinematic_pan_right | push_in_close | wide_angle_reveal | orbit_around_object | top_down_macro",
      "visualArchetype": "math_overlay | scatter_plot | regression_fit | matrix_board | split_comparison | concept_card | interactive_stage | micro_zoom",
      "visualConfig": {
        "visualDomain": "${domain}",
        "formulaText": "Exact formula from RAG",
        "equationLatex": "g^*(x) = E[Y | X = x]",
        "leftLabel": "From the text",
        "rightLabel": "From the text",
        "xAxisLabel": "X",
        "yAxisLabel": "Y",
        "primaryShape": "grid | cube | sphere | cylinder",
        "primaryColor": "#00A8FF",
        "secondaryColor": "#FACC15",
        "lighting": "warm_cinematic | dramatic_spotlight | cool_discovery",
        "calloutBadges": ["Hook", "Definition"],
        "headline": "Core claim from the PDF",
        "takeawayBadge": "Takeaway quoted from the text"
      }
    }
  ]
}

STRICT RULES:
- Ground EVERY voiceover line in the RAG textbook excerpts. Quote named studies (e.g. Galton 1889) when present.
- ${MIN_SCENES}–${MAX_SCENES} scenes. totalDurationSeconds between ${MIN_TOTAL_SEC} and ${MAX_TOTAL_SEC}.
- visualConfig.visualDomain must be "${domain}".
- visualConfig labels and formulaText must come from this PDF / topic.
- Return ONLY valid JSON (no markdown).
`;
}

type LlmSceneRaw = {
  sceneId?: number;
  duration?: number;
  durationSec?: number;
  phase?: string;
  phaseTitle?: string;
  voiceover?: string;
  voiceoverText?: string;
  visualType?: string;
  visualArchetype?: string;
  visualConfig?: Record<string, unknown>;
  visualProps?: Record<string, unknown>;
  props?: Record<string, unknown>;
  animationType?: string;
  parameters?: Record<string, unknown>;
  teacherGesture?: string;
  cameraMotion?: string;
};

type LlmManifestRaw = {
  topicTitle?: string;
  teacherName?: string;
  archetype?: string;
  pedagogicalPattern?: string;
  totalDurationSeconds?: number;
  scenes?: LlmSceneRaw[];
};

const PHASE_BY_INDEX = [
  'HOOK',
  'DEFINITION',
  'WORKED_EXAMPLE',
  'SIMULATION',
  'INSIGHT',
  'TAKEAWAY',
] as const;

const GESTURE_BY_INDEX = [
  'questioning',
  'explaining',
  'demonstrating',
  'pointing',
  'eureka',
  'celebrating',
] as const;

const CAMERA_BY_INDEX = [
  'cinematic_pan_right',
  'push_in_close',
  'orbit_around_object',
  'wide_angle_reveal',
  'top_down_macro',
  'hyper_zoom_into_particles',
] as const;

const LIGHTING_BY_INDEX = [
  'warm_cinematic',
  'dramatic_spotlight',
  'cool_discovery',
  'warm_cinematic',
  'cool_discovery',
  'dramatic_spotlight',
] as const;

function normalizeTeacherGesture(raw: string | undefined, index: number): string {
  const g = String(raw ?? '')
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_');
  if (
    [
      'explaining',
      'questioning',
      'excited',
      'pointing',
      'demonstrating',
      'pointing_to_apparatus',
      'eureka',
      'celebrating',
    ].includes(g)
  ) {
    return g;
  }
  return GESTURE_BY_INDEX[index] ?? 'explaining';
}

function normalizeCameraMotion(raw: string | undefined, index: number): string {
  const m = String(raw ?? '')
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_');
  if (
    [
      'cinematic_pan_right',
      'push_in_close',
      'wide_angle_reveal',
      'orbit_around_object',
      'top_down_macro',
      'hyper_zoom_into_particles',
    ].includes(m)
  ) {
    return m;
  }
  return CAMERA_BY_INDEX[index] ?? 'push_in_close';
}

const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'of',
  'and',
  'or',
  'in',
  'on',
  'to',
  'for',
  'is',
  'are',
  'as',
  'by',
  'with',
  'from',
  'into',
  'that',
  'this',
  'its',
  'their',
  'chapter',
  'unit',
  'lesson',
  'introduction',
]);

function patternToPedagogy(pattern: string | undefined): PedagogicalArchetype {
  const p = String(pattern ?? '').toLowerCase();
  if (p.includes('lab') || p.includes('experiment')) return 'experiment';
  if (p.includes('comparison') || p.includes('split')) return 'comparison';
  if (p.includes('process') || p.includes('flow') || p.includes('stage')) return 'process';
  return 'concept';
}

function classifyPatternFromText(text: string): PedagogicalArchetype {
  const t = text.toLowerCase();
  if (/\b(activity|experiment|apparatus|observe|procedure|materials|lab)\b/.test(t)) {
    return 'experiment';
  }
  if (/\b(vs\.?|versus|compare|difference|contrast|classification|two types)\b/.test(t)) {
    return 'comparison';
  }
  if (/\b(cycle|process|steps?|sequence|then|next|stage|timeline|flow|phase)\b/.test(t)) {
    return 'process';
  }
  return 'concept';
}

const STEM_ARCHETYPES = new Set<string>([
  'split_comparison',
  'interactive_stage',
  'micro_zoom',
  'concept_card',
  'scatter_plot',
  'regression_fit',
  'math_overlay',
  'matrix_board',
]);

/** Map any legacy visualType or new visualArchetype onto the visual families. */
export function normalizeVisualArchetype(
  raw: string | undefined,
  index: number,
  domain: VisualContentDomain = 'generic',
): VisualArchetype {
  const v = String(raw ?? '')
    .toLowerCase()
    .trim()
    .replace(/-/g, '_');
  if (v === 'scatter_plot' || v === 'scatter' || v === 'scatterplot') return 'scatter_plot';
  if (v === 'regression_fit' || v === 'regression' || v === 'least_squares' || v === 'fit_line') {
    return 'regression_fit';
  }
  if (v === 'math_overlay' || v === 'latex' || v === 'equation' || v === 'formula') return 'math_overlay';
  if (v === 'matrix_board' || v === 'matrix' || v === 'design_matrix') return 'matrix_board';
  if (v === 'split_comparison' || v === 'comparison_split' || v === 'question_card') {
    return 'split_comparison';
  }
  if (v === 'interactive_stage' || v === 'lab_simulation' || v === 'flow_step' || v === 'dynamic_diagram') {
    return isLabVisualDomain(domain) ? 'interactive_stage' : 'math_overlay';
  }
  if (v === '3d_beaker_experiment') {
    return isLabVisualDomain(domain) ? 'interactive_stage' : 'math_overlay';
  }
  if (v === 'micro_zoom' || v === '3d_particle_zoom' || v === 'particle_zoom' || v === 'macro_reveal') {
    return isLabVisualDomain(domain) ? 'micro_zoom' : 'scatter_plot';
  }
  if (v === 'concept_card' || v === 'callout_summary' || v === 'concept_hero') {
    return 'concept_card';
  }
  if (STEM_ARCHETYPES.has(v)) return v as VisualArchetype;
  const fallbacks = defaultArchetypesForDomain(domain);
  return fallbacks[index] ?? 'math_overlay';
}

function archetypeToLegacyVisualType(arch: VisualArchetype): string {
  if (arch === 'split_comparison') return 'comparison_split';
  if (arch === 'interactive_stage') return 'interactive_stage';
  if (arch === 'micro_zoom') return '3d_particle_zoom';
  if (arch === 'scatter_plot') return 'scatter_plot';
  if (arch === 'regression_fit') return 'regression_fit';
  if (arch === 'math_overlay') return 'math_overlay';
  if (arch === 'matrix_board') return 'matrix_board';
  return 'callout_summary';
}

function archetypeToAnimation(arch: VisualArchetype): string {
  if (arch === 'interactive_stage') return 'TemperatureEffect';
  if (arch === 'split_comparison') return 'StateComparison';
  if (arch === 'micro_zoom') return 'ParticleMotion3D';
  if (arch === 'scatter_plot' || arch === 'regression_fit') return 'ScatterRegression';
  if (arch === 'matrix_board') return 'MatrixBoard';
  if (arch === 'math_overlay') return 'MathOverlay';
  return 'ConceptCallout';
}

function clipText(raw: string, max: number): string {
  const t = raw.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function significantTokens(text: string): string[] {
  return text
    .split(/[^A-Za-z0-9%°µβσ]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w.toLowerCase()))
    .slice(0, 12);
}

function contrastLabels(ctx: TopicContextPacket): [string, string] {
  const vs = ctx.title.split(/\bvs\.?\b|versus|compared to|against/i);
  if (vs.length >= 2) {
    return [clipText(vs[0], 28), clipText(vs[1], 28)];
  }
  const parts = ctx.title.split(/[:–—\-|/]/).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return [clipText(parts[0], 28), clipText(parts[1], 28)];
  const tokens = significantTokens(`${ctx.title} ${ctx.chapterTitle}`);
  if (tokens.length >= 2) return [tokens[0], tokens[1]];
  if (tokens.length === 1) return [tokens[0], ctx.chapterTitle || 'Hidden structure'];
  return [clipText(ctx.title, 28) || 'Idea A', clipText(ctx.chapterTitle || 'Idea B', 28)];
}

function excerptAt(ctx: TopicContextPacket, index: number, fallback: string): string {
  const raw = ctx.ragExcerpts[index] || ctx.ragExcerpts[0] || ctx.chapterSummary || fallback;
  return clipText(raw, 280);
}

function asElements(raw: unknown): VisualStageElement[] {
  if (!Array.isArray(raw)) return [];
  const out: VisualStageElement[] = [];
  for (const el of raw) {
    if (!el || typeof el !== 'object') continue;
    const o = el as Record<string, unknown>;
    out.push({
      name: o.name != null ? String(o.name) : undefined,
      type: o.type != null ? String(o.type) : undefined,
      color: o.color != null ? String(o.color) : undefined,
    });
  }
  return out;
}

function flattenVisualConfig(
  config: SceneVisualConfig,
  domain: VisualContentDomain,
): VideoSceneParameters {
  const badges = Array.isArray(config.calloutBadges)
    ? config.calloutBadges.map((b) => String(b)).filter(Boolean)
    : [];
  const left = String(config.leftLabel || config.title || '').trim();
  const right = String(config.rightLabel || '').trim();
  const takeaway = String(config.takeawayBadge || config.headline || '').trim();
  const typeA = config.particleMatrix?.typeA;
  const typeB = config.particleMatrix?.typeB;
  const lab = isLabVisualDomain(domain);
  return {
    ...config,
    visualDomain: config.visualDomain || domain,
    formulaText: config.formulaText,
    equationLatex: config.equationLatex,
    xAxisLabel: config.xAxisLabel,
    yAxisLabel: config.yAxisLabel,
    leftLabel: left || undefined,
    rightLabel: right || undefined,
    leftConcept: left || undefined,
    rightConcept: right || undefined,
    accentColor: config.primaryColor,
    primaryColor: config.primaryColor,
    secondaryColor: config.secondaryColor,
    takeawayBadge: takeaway || undefined,
    keyTakeaway: takeaway || undefined,
    headline: config.headline,
    title: config.title,
    stageLabel: config.stageLabel || config.title,
    container: lab ? config.stageLabel || config.title : undefined,
    action: config.actionText,
    actionText: config.actionText,
    stepLabels: badges.length ? badges : undefined,
    calloutBadges: badges.length ? badges : undefined,
    primaryParticles: typeA,
    secondaryParticles: typeB,
    particleTypeA: typeA,
    particleTypeB: typeB,
    particleMatrix: config.particleMatrix,
    elements: config.elements,
    showLabels: [left, right, takeaway, config.stageLabel, config.formulaText]
      .filter(Boolean)
      .slice(0, 4) as string[],
    particleDensity: 'medium',
    temperature: lab ? 32 : undefined,
    speedMultiplier: 1.35,
  };
}

function mergeVisualConfig(
  ...bags: Array<Record<string, unknown> | SceneVisualConfig | undefined>
): SceneVisualConfig {
  const merged = Object.assign({}, ...bags.filter(Boolean)) as SceneVisualConfig;
  if (Array.isArray(merged.elements)) merged.elements = asElements(merged.elements);
  if (merged.particleMatrix && typeof merged.particleMatrix === 'object') {
    const pm = merged.particleMatrix as { typeA?: unknown; typeB?: unknown };
    merged.particleMatrix = {
      typeA: pm.typeA != null ? String(pm.typeA) : undefined,
      typeB: pm.typeB != null ? String(pm.typeB) : undefined,
    };
  }
  if (merged.leftLabel && !merged.leftConcept) merged.leftConcept = merged.leftLabel;
  if (merged.rightLabel && !merged.rightConcept) merged.rightConcept = merged.rightLabel;
  return merged;
}

function heuristicVisualConfig(
  ctx: TopicContextPacket,
  index: number,
  arch: VisualArchetype,
  domain: VisualContentDomain,
  formulas: string[],
): SceneVisualConfig {
  const [left, right] = contrastLabels(ctx);
  const tokens = significantTokens(`${ctx.title} ${excerptAt(ctx, 0, ctx.title)}`);
  const primary = tokens[0] || left;
  const secondary = tokens[1] || right;
  const formula = formulas[index] || formulas[0] || '';
  const base = {
    visualDomain: domain,
    formulaText: formula || undefined,
    equationLatex: formula || undefined,
    lighting: LIGHTING_BY_INDEX[index],
    primaryColor: domain === 'dsml' ? '#38bdf8' : '#818cf8',
    secondaryColor: '#FACC15',
  };

  if (arch === 'scatter_plot' || arch === 'regression_fit') {
    return {
      ...base,
      title: clipText(ctx.title, 40),
      headline: formula || clipText(ctx.title, 42),
      xAxisLabel: 'X',
      yAxisLabel: 'Y',
      formulaText: formula || 'y = β₀ + β₁ x',
      equationLatex: formula || 'y = β₀ + β₁ x',
      calloutBadges: ['Scatter', arch === 'regression_fit' ? 'Fit line' : 'Observations'],
    };
  }
  if (arch === 'math_overlay') {
    return {
      ...base,
      headline: formula || clipText(ctx.title, 42),
      formulaText: formula || clipText(excerptAt(ctx, 0, ctx.title), 80),
      equationLatex: formula || undefined,
      xAxisLabel: 'x',
      yAxisLabel: 'y',
      primaryShape: 'grid',
      calloutBadges: tokens.slice(0, 3).length ? tokens.slice(0, 3) : ['Definition', 'Formula'],
    };
  }
  if (arch === 'matrix_board') {
    return {
      ...base,
      headline: formula || 'Y = Xβ + ε',
      formulaText: formula || 'Y = Xβ + ε',
      stageLabel: 'Design matrix',
      leftLabel: 'X',
      rightLabel: 'β',
      calloutBadges: ['X', 'β', 'σ²'],
    };
  }
  if (arch === 'split_comparison') {
    return {
      ...base,
      title: clipText(ctx.title, 40),
      leftLabel: left,
      rightLabel: right,
      primaryShape: index === 0 ? 'cube' : 'sphere',
      calloutBadges: [left, right].filter(Boolean),
    };
  }
  if (arch === 'interactive_stage') {
    const lab = isLabVisualDomain(domain);
    return {
      ...base,
      title: clipText(ctx.title, 40),
      stageLabel: clipText(ctx.title, 36),
      actionText: clipText(excerptAt(ctx, 1, 'Follow the process in the text'), 48),
      elements: lab
        ? [
            { name: primary, type: 'container', color: '#e2e8f0' },
            { name: secondary, type: 'particles', color: '#00a8ff' },
          ]
        : [
            { name: primary, type: 'cube', color: '#38bdf8' },
            { name: secondary, type: 'grid', color: '#FACC15' },
          ],
      calloutBadges: tokens.slice(0, 3).length ? tokens.slice(0, 3) : ['Observe', 'Change'],
    };
  }
  if (arch === 'micro_zoom') {
    return {
      ...base,
      headline: clipText(ctx.title, 42),
      particleMatrix: { typeA: primary || 'type_a', typeB: secondary || 'type_b' },
      takeawayBadge: clipText(excerptAt(ctx, 2, ctx.chapterSummary || ctx.title), 90),
      calloutBadges: ['Zoom in'],
    };
  }
  return {
    ...base,
    headline: clipText(ctx.title, 42),
    takeawayBadge: clipText(ctx.chapterSummary || excerptAt(ctx, 0, ctx.title), 90),
    calloutBadges: tokens.slice(0, 2),
    primaryShape: 'grid',
  };
}

function heuristicVoiceovers(
  ctx: TopicContextPacket,
  formulas: string[],
  host: string,
  runner: string,
  domain: VisualContentDomain,
): string[] {
  const tip = ctx.teacherPrompt?.trim() ? ` ${ctx.teacherPrompt.trim()}` : '';
  const f0 = formulas[0] || 'the core equation in the text';
  const f1 = formulas[1] || formulas[0] || 'the estimator';
  const study = excerptAt(ctx, 0, ctx.title);
  if (domain === 'dsml' || domain === 'math') {
    return [
      `${host} stops ${runner}: "${study}" We are going to stay inside this textbook — no lab demo, just the math.${tip}`,
      `${host}: Write this down — ${f0}. That is the population regression function: the best predictor is the conditional expectation.`,
      `${host}: Galton's 1889 height study is the classic picture — parents on X, offspring on Y. ${runner} asks why a line. Because we minimize squared-error loss.`,
      `${host}: In matrix form, ${f1.includes('Y') ? f1 : 'Y = Xβ + ε'}. β is the parameter vector, X is the design matrix, and the noise has variance σ².`,
      `${host}: Fit ŷ = β₀ + β₁ x through the cloud. Residuals are Y minus the projection onto the column space of X.`,
      `${host}: Takeaway from the text: ${clipText(ctx.chapterSummary || excerptAt(ctx, 2, ctx.title), 160)}`,
    ];
  }
  return [
    `Quick challenge from the text: ${study}${tip}`,
    `Here is the definition the textbook actually uses: ${excerptAt(ctx, 1, f0)}`,
    `Worked example from the PDF: ${excerptAt(ctx, 2, ctx.title)}`,
    `Let's follow what the textbook describes: ${excerptAt(ctx, 3, ctx.chapterSummary || ctx.title)}`,
    `Here's why, according to the text: ${excerptAt(ctx, 4, ctx.chapterSummary || ctx.title)}`,
    `Remember ${ctx.code}: ${ctx.title}. ${clipText(ctx.chapterSummary || '', 120)}`,
  ];
}

function heuristicManifest(ctx: TopicContextPacket): VideoScriptManifest {
  const domain = ctx.contentDomain || detectContentDomain(ctx);
  const formulas = extractFormulasFromContext(ctx);
  const text = [ctx.title, ctx.chapterSummary, ...ctx.ragExcerpts.slice(0, 4)].join(' ');
  const pedagogy = classifyPatternFromText(text);
  const template = getGenerationTemplate(ctx.templateId);
  const activeConfig = TEMPLATE_CONFIGS[template.id] || TEMPLATE_CONFIGS.tom_and_jerry;
  const host = activeConfig.characters.host;
  const runner = activeConfig.characters.runner;
  const arches = defaultArchetypesForDomain(domain);
  const sceneCount = 5;
  const lines = heuristicVoiceovers(ctx, formulas, host, runner, domain);

  const scenes = Array.from({ length: sceneCount }, (_, i) => {
    const arch = arches[i] ?? 'math_overlay';
    const visualConfig = heuristicVisualConfig(ctx, i, arch, domain, formulas);
    const parameters = flattenVisualConfig(visualConfig, domain);
    const duration = DEFAULT_SCENE_SEC;
    const phase = PHASE_BY_INDEX[i] ?? `SCENE ${i + 1}`;
    return {
      sceneId: i + 1,
      duration,
      durationSec: duration,
      phase,
      phaseTitle: phase,
      voiceoverText: lines[i] ?? lines[0],
      voiceover: lines[i] ?? lines[0],
      visualArchetype: arch,
      visualType: archetypeToLegacyVisualType(arch),
      animationType: archetypeToAnimation(arch),
      visualConfig,
      visualProps: parameters,
      props: parameters,
      parameters,
      teacherGesture: GESTURE_BY_INDEX[i],
      cameraMotion: CAMERA_BY_INDEX[i],
    };
  });

  return {
    topicTitle: ctx.title,
    teacherName: host,
    archetype: pedagogy,
    pedagogicalPattern:
      pedagogy === 'experiment'
        ? 'lab_experiment'
        : pedagogy === 'comparison'
          ? 'conceptual_comparison'
          : pedagogy === 'process'
            ? 'process_flow'
            : 'concept_card',
    totalDurationSeconds: scenes.reduce((a, s) => a + s.duration, 0),
    scenes,
  };
}

function clampSceneDuration(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_SCENE_SEC;
  return Math.min(MAX_SCENE_SEC, Math.max(MIN_SCENE_SEC, Math.round(raw)));
}

function rescaleDurations(scenes: Array<{ duration: number; durationSec?: number }>): void {
  let total = scenes.reduce((a, s) => a + s.duration, 0);
  if (total < MIN_TOTAL_SEC || total > MAX_TOTAL_SEC) {
    const target = Math.min(MAX_TOTAL_SEC, Math.max(MIN_TOTAL_SEC, total || MIN_TOTAL_SEC));
    const scale = target / (total || 1);
    for (const s of scenes) {
      const next = clampSceneDuration(s.duration * scale);
      s.duration = next;
      s.durationSec = next;
    }
    total = scenes.reduce((a, s) => a + s.duration, 0);
  }
  if (total < MIN_TOTAL_SEC && scenes.length > 0) {
    const bump = Math.ceil((MIN_TOTAL_SEC - total) / scenes.length);
    for (const s of scenes) {
      const next = Math.min(MAX_SCENE_SEC, s.duration + bump);
      s.duration = next;
      s.durationSec = next;
    }
  }
}

function normalizeManifest(raw: LlmManifestRaw, ctx: TopicContextPacket): VideoScriptManifest {
  const domain = ctx.contentDomain || detectContentDomain(ctx);
  const formulas = extractFormulasFromContext(ctx);
  const fallback = heuristicManifest(ctx);
  const pedagogy =
    patternToPedagogy(raw.pedagogicalPattern || raw.archetype) || fallback.archetype || 'concept';
  const rawScenes = Array.isArray(raw.scenes) ? raw.scenes.slice(0, MAX_SCENES) : [];
  if (!rawScenes.length) return fallback;

  const scenes: VideoScriptManifest['scenes'] = rawScenes.map((s, i) => {
    const visualArchetype = normalizeVisualArchetype(s.visualArchetype || s.visualType, i, domain);
    const visualConfig = mergeVisualConfig(
      heuristicVisualConfig(ctx, i, visualArchetype, domain, formulas),
      s.parameters,
      s.visualProps,
      s.props,
      s.visualConfig,
      { visualDomain: domain },
    );
    if (!visualConfig.lighting) visualConfig.lighting = LIGHTING_BY_INDEX[i];
    if (!visualConfig.formulaText && formulas[0]) visualConfig.formulaText = formulas[0];
    const parameters = flattenVisualConfig(visualConfig, domain);
    const duration = clampSceneDuration(Number(s.durationSec ?? s.duration) || DEFAULT_SCENE_SEC);
    const phase = String(s.phaseTitle || s.phase || PHASE_BY_INDEX[i] || `Scene ${i + 1}`).toUpperCase();
    const voiceover =
      String(s.voiceover || s.voiceoverText || '').trim() ||
      fallback.scenes[Math.min(i, fallback.scenes.length - 1)].voiceoverText;
    const teacherGesture = normalizeTeacherGesture(s.teacherGesture, i);
    const cameraMotion = normalizeCameraMotion(s.cameraMotion, i);
    return {
      sceneId: s.sceneId ?? i + 1,
      duration,
      durationSec: duration,
      phase,
      phaseTitle: phase,
      voiceoverText: voiceover,
      voiceover,
      visualArchetype,
      visualType: archetypeToLegacyVisualType(visualArchetype),
      visualConfig,
      visualProps: parameters,
      props: parameters,
      animationType: String(s.animationType || archetypeToAnimation(visualArchetype)),
      parameters,
      teacherGesture,
      cameraMotion,
    };
  });

  while (scenes.length < MIN_SCENES) {
    const extra = fallback.scenes[scenes.length] ?? fallback.scenes[fallback.scenes.length - 1];
    scenes.push({ ...extra, sceneId: scenes.length + 1 });
  }

  rescaleDurations(scenes);

  return {
    topicTitle: raw.topicTitle || ctx.title,
    teacherName: String(raw.teacherName || fallback.teacherName || 'Professor Maya').trim() || 'Professor Maya',
    archetype: pedagogy,
    pedagogicalPattern: raw.pedagogicalPattern || fallback.pedagogicalPattern,
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
      return {
        ...s,
        visualConfig,
        parameters,
        visualProps: parameters,
        props: parameters,
      };
    }),
  };
}

/** Structured default video script when LLM JSON is missing or unparsable. */
function getFallbackScriptForTemplate(
  templateId: string | undefined,
  ctx: TopicContextPacket,
): VideoScriptManifest {
  const template = getGenerationTemplate(templateId);
  const activeConfig = TEMPLATE_CONFIGS[template.id] || TEMPLATE_CONFIGS.tom_and_jerry;
  const base = applyAttachmentOverlays(heuristicManifest(ctx), ctx);
  const host = activeConfig.characters.host;
  return {
    ...base,
    teacherName: host || base.teacherName,
    topicTitle: base.topicTitle || ctx.title,
  };
}

function parseLlmManifestSafely(
  llmOutput: unknown,
  templateId: string,
  ctx: TopicContextPacket,
): VideoScriptManifest {
  try {
    let parsed: unknown = llmOutput;
    if (typeof llmOutput === 'string') {
      parsed = JSON.parse(llmOutput);
    }
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('LLM output is not a JSON object');
    }
    return applyAttachmentOverlays(normalizeManifest(parsed as LlmManifestRaw, ctx), ctx);
  } catch (err) {
    console.error(
      '[Template Generation Error] Failed to parse LLM JSON output for template:',
      templateId,
      err,
    );
    return getFallbackScriptForTemplate(templateId, ctx);
  }
}

export async function generateStructuredVideoScript(
  ctx: TopicContextPacket,
): Promise<VideoScriptManifest> {
  const provider = getActiveProvider();
  const domain = ctx.contentDomain || detectContentDomain(ctx);
  const formulas = extractFormulasFromContext(ctx);
  const excerpts = ctx.ragExcerpts.slice(0, 16).join('\n---\n');
  console.log(
    `[videoPipeline/script] STEM director domain=${domain} RAG excerpts=${ctx.ragExcerpts.length} formulas=${formulas.length} topic="${ctx.code} ${ctx.title}"`,
  );

  const template = getGenerationTemplate(ctx.templateId);
  const activeConfig = TEMPLATE_CONFIGS[template.id] || TEMPLATE_CONFIGS.tom_and_jerry;
  const host = activeConfig.characters.host;
  const runner = activeConfig.characters.runner;
  const packet: TopicContextPacket = { ...ctx, contentDomain: domain };

  const user = [
    `Topic code: ${ctx.code}`,
    `Topic title: ${ctx.title}`,
    `Chapter: ${ctx.chapterTitle}`,
    `Textbook: ${ctx.textbookTitle} (${ctx.subject}, ${ctx.gradeLabel}) file=${ctx.fileName ?? 'uploaded.pdf'}`,
    `Detected content domain: ${domain}`,
    `Chapter summary: ${ctx.chapterSummary}`,
    `Selected templateId: ${template.id}`,
    `Theme: ${activeConfig.themeName}`,
    `Host narrator: ${host}`,
    `Second character: ${runner}`,
    `Visual / dialogue template:\n${templatePromptBlock(template.id)}`,
    `CRITICAL: Match characters, tone, and visuals to templateId "${template.id}". Do not default to Tom & Jerry unless templateId is tom_and_jerry.`,
    domain === 'dsml' || domain === 'math'
      ? `DYNAMIC THEME DIALOGUE: ${host} and ${runner} must speak the mathematics. Example: "${host}: the parameter vector β sits with design matrix X; the error variance is σ²." Quote Galton 1889, g*(x) = E[Y | X = x], squared-error loss, and Y = Xβ + ε when those appear in RAG.`
      : '',
    ctx.teacherPrompt ? `Teacher refinement: ${ctx.teacherPrompt}` : '',
    formulas.length ? `EXTRACTED FORMULAS / STUDIES (must appear in voiceover + formulaText):\n${formulas.join('\n')}` : '',
    `RAW RAG EXCERPTS (GROUND TRUTH — teacher attachments are prefixed and must be prioritized over textbook text):\n${excerpts || '(no excerpts — use topic title and chapter summary only)'}`,
    ctx.attachmentImageUrls?.length
      ? `Teacher image URLs for on-screen overlay: ${ctx.attachmentImageUrls.join(', ')}`
      : '',
    `Output ${MIN_SCENES} to ${MAX_SCENES} detailed scenes. Each durationSec ${MIN_SCENE_SEC}–${MAX_SCENE_SEC}. Total ${MIN_TOTAL_SEC}–${MAX_TOTAL_SEC} seconds. Do NOT output a 3-scene 28-second bumper.`,
    `Set visualConfig.visualDomain="${domain}". Choose visualArchetype from the domain guide — never a chemistry beaker unless domain is chemistry.`,
    `Also set pedagogicalPattern / teacherName consistent with ${template.title} (${host}).`,
  ]
    .filter(Boolean)
    .join('\n\n');

  if (!provider) return getFallbackScriptForTemplate(template.id, packet);

  try {
    const raw = await Promise.race([
      provider.completeJson<LlmManifestRaw | string>({
        system: cinematicSystemPrompt(domain, formulas),
        user,
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('LLM script timed out')), 70_000);
      }),
    ]);
    const manifest = parseLlmManifestSafely(raw, template.id, packet);
    console.log(
      `[videoPipeline/script] templateId=${template.id} domain=${domain} scenes=${manifest.scenes.length} duration=${manifest.totalDurationSeconds}s archetypes=${manifest.scenes
        .map((s) => s.visualArchetype || s.visualType)
        .join(',')} cameras=${manifest.scenes.map((s) => s.cameraMotion).join(',')} overlays=${(ctx.attachmentImageUrls ?? []).length}`,
    );
    return manifest;
  } catch (err) {
    console.error(
      '[Template Generation Error] LLM failed/timed out for template:',
      template.id,
      err,
    );
    return getFallbackScriptForTemplate(template.id, packet);
  }
}

export function flattenVoiceover(manifest: VideoScriptManifest): string {
  return manifest.scenes.map((s) => s.voiceoverText).join(' ');
}

export function cuesFromManifest(manifest: VideoScriptManifest) {
  let t = 0;
  return manifest.scenes.map((s) => {
    const cue = {
      timeSec: t + Math.min(2, s.duration / 3),
      label: String(s.phase || s.visualArchetype || s.visualType || s.voiceoverText.slice(0, 40)),
    };
    t += s.duration;
    return cue;
  });
}
