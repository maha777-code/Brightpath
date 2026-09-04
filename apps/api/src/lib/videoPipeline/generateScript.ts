import {
  getGenerationTemplate,
  TEMPLATE_CONFIGS,
  templatePromptBlock,
  type PedagogicalArchetype,
  type SceneVisualConfig,
  type VideoSceneParameters,
  type VideoScriptManifest,
  type VisualArchetype,
  type VisualStageElement,
} from '@brightpath/shared';
import { getActiveProvider } from '../llm/provider.js';
import type { TopicContextPacket } from './types.js';

const CINEMATIC_SWEETRUSH_PROMPT = `
You are a Lead Animation Director for high-end educational movies (SweetRush style).
Transform the provided textbook context into a 3-scene cinematic movie script with a cartoon teacher narrator.

Analyze the PDF and choose a Visual Archetype per scene:
1. 'split_comparison' — two contrasting concepts, states, or theories
2. 'interactive_stage' — sequence, lab step, apparatus, or diagram
3. 'micro_zoom' — microscopic, structural, or sub-component view
4. 'concept_card' — formula, definition, or core law

Do NOT assume chemistry, a beaker, salt, wood, sand, or any other fixed apparatus.
Derive labels, colors, shapes, and element names ONLY from the PDF excerpts, topic title, and chapter context.

Output a JSON payload matching this strict schema:
{
  "topicTitle": "Textbook Chapter Title",
  "teacherName": "Professor Maya",
  "pedagogicalPattern": "lab_experiment | conceptual_comparison | process_flow | concept_card",
  "totalDurationSeconds": 28,
  "scenes": [
    {
      "sceneId": 1,
      "phaseTitle": "THE DILEMMA",
      "durationSec": 8,
      "voiceover": "Curriculum grounded hook delivered by cartoon narrator",
      "teacherGesture": "explaining | questioning | excited | pointing",
      "cameraMotion": "cinematic_pan_right | push_in_close | wide_angle_reveal",
      "visualArchetype": "split_comparison | interactive_stage | micro_zoom | concept_card",
      "visualConfig": {
        "leftLabel": "Concept A from the text",
        "rightLabel": "Concept B from the text",
        "primaryShape": "sphere | cube | cylinder | grid",
        "primaryColor": "#00A8FF",
        "secondaryColor": "#FF5722",
        "lighting": "warm_cinematic | dramatic_spotlight | cool_discovery",
        "calloutBadges": ["Hook", "Contrast"]
      }
    },
    {
      "sceneId": 2,
      "phaseTitle": "THE SIMULATION",
      "durationSec": 12,
      "voiceover": "Step-by-step activity text explaining the process from the PDF",
      "teacherGesture": "demonstrating | pointing_to_apparatus | explaining",
      "cameraMotion": "orbit_around_object | top_down_macro | push_in_close",
      "visualArchetype": "interactive_stage | split_comparison | micro_zoom",
      "visualConfig": {
        "stageLabel": "Main process from the text",
        "elements": [
          {"name": "Item 1 from the text", "type": "container", "color": "#ffffff"},
          {"name": "Item 2 from the text", "type": "particles", "color": "#00a8ff"}
        ],
        "actionText": "The change described in the PDF",
        "lighting": "dramatic_spotlight",
        "calloutBadges": ["Action", "Observe"]
      }
    },
    {
      "sceneId": 3,
      "phaseTitle": "THE REVEAL",
      "durationSec": 8,
      "voiceover": "Why this happens, grounded in the text conclusion",
      "teacherGesture": "eureka | celebrating | explaining",
      "cameraMotion": "hyper_zoom_into_particles | push_in_close",
      "visualArchetype": "micro_zoom | concept_card",
      "visualConfig": {
        "headline": "Core insight from the text",
        "particleMatrix": { "typeA": "type_from_text", "typeB": "type_from_text" },
        "takeawayBadge": "Summary rule extracted from PDF",
        "lighting": "cool_discovery",
        "calloutBadges": ["Why"]
      }
    }
  ]
}

STRICT RULES:
- Ground EVERY voiceover line in the provided RAG textbook excerpts.
- visualConfig labels must come from this PDF / topic.
- Return ONLY valid JSON (no markdown).
- Scene durations must be durationSec 8, 12, 8 (sum 28).
`;

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

const PHASE_BY_INDEX = ['CHALLENGE', 'SIMULATION', 'DISCOVERY'] as const;
const DURATION_BY_INDEX = [8, 12, 8] as const;
const ARCHETYPE_BY_INDEX: VisualArchetype[] = [
  'split_comparison',
  'interactive_stage',
  'micro_zoom',
];
const GESTURE_BY_INDEX = ['questioning', 'demonstrating', 'eureka'] as const;
const CAMERA_BY_INDEX = [
  'cinematic_pan_right',
  'orbit_around_object',
  'hyper_zoom_into_particles',
] as const;
const LIGHTING_BY_INDEX = ['warm_cinematic', 'dramatic_spotlight', 'cool_discovery'] as const;

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

/** Map any legacy visualType or new visualArchetype onto the 4 universal families. */
export function normalizeVisualArchetype(
  raw: string | undefined,
  index: number,
): VisualArchetype {
  const v = String(raw ?? '')
    .toLowerCase()
    .trim()
    .replace(/-/g, '_');
  if (v === 'split_comparison' || v === 'comparison_split' || v === 'question_card') {
    return 'split_comparison';
  }
  if (
    v === 'interactive_stage' ||
    v === '3d_beaker_experiment' ||
    v === 'lab_simulation' ||
    v === 'flow_step' ||
    v === 'dynamic_diagram'
  ) {
    return 'interactive_stage';
  }
  if (
    v === 'micro_zoom' ||
    v === '3d_particle_zoom' ||
    v === 'particle_zoom' ||
    v === 'macro_reveal'
  ) {
    return 'micro_zoom';
  }
  if (v === 'concept_card' || v === 'callout_summary' || v === 'concept_hero') {
    return 'concept_card';
  }
  return ARCHETYPE_BY_INDEX[index] ?? 'concept_card';
}

function archetypeToLegacyVisualType(arch: VisualArchetype): string {
  if (arch === 'split_comparison') return 'comparison_split';
  if (arch === 'interactive_stage') return 'interactive_stage';
  if (arch === 'micro_zoom') return '3d_particle_zoom';
  return 'callout_summary';
}

function archetypeToAnimation(arch: VisualArchetype): string {
  if (arch === 'interactive_stage') return 'TemperatureEffect';
  if (arch === 'split_comparison') return 'StateComparison';
  if (arch === 'micro_zoom') return 'ParticleMotion3D';
  return 'ConceptCallout';
}

function clipText(raw: string, max: number): string {
  const t = raw.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function significantTokens(text: string): string[] {
  return text
    .split(/[^A-Za-z0-9%°µ]+/)
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
  return clipText(raw, 180);
}

function asElements(raw: unknown): VisualStageElement[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((el) => {
      if (!el || typeof el !== 'object') return null;
      const o = el as Record<string, unknown>;
      return {
        name: o.name != null ? String(o.name) : undefined,
        type: o.type != null ? String(o.type) : undefined,
        color: o.color != null ? String(o.color) : undefined,
      };
    })
    .filter((x): x is VisualStageElement => Boolean(x));
}

function flattenVisualConfig(config: SceneVisualConfig): VideoSceneParameters {
  const badges = Array.isArray(config.calloutBadges)
    ? config.calloutBadges.map((b) => String(b)).filter(Boolean)
    : [];
  const left = String(config.leftLabel || config.title || '').trim();
  const right = String(config.rightLabel || '').trim();
  const takeaway = String(config.takeawayBadge || config.headline || '').trim();
  const typeA = config.particleMatrix?.typeA;
  const typeB = config.particleMatrix?.typeB;
  return {
    ...config,
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
    container: config.stageLabel || config.title,
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
    showLabels: [left, right, takeaway, config.stageLabel].filter(Boolean).slice(0, 3) as string[],
    particleDensity: 'medium',
    temperature: 32,
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
): SceneVisualConfig {
  const [left, right] = contrastLabels(ctx);
  const tokens = significantTokens(`${ctx.title} ${excerptAt(ctx, 0, ctx.title)}`);
  const primary = tokens[0] || left;
  const secondary = tokens[1] || right;
  if (arch === 'split_comparison') {
    return {
      title: clipText(ctx.title, 40),
      leftLabel: left,
      rightLabel: right,
      primaryShape: index === 0 ? 'cube' : 'sphere',
      primaryColor: '#00A8FF',
      secondaryColor: '#FF5722',
      lighting: LIGHTING_BY_INDEX[index],
      calloutBadges: [left, right].filter(Boolean),
    };
  }
  if (arch === 'interactive_stage') {
    return {
      title: clipText(ctx.title, 40),
      stageLabel: clipText(ctx.title, 36),
      primaryColor: '#00A8FF',
      secondaryColor: '#FACC15',
      lighting: LIGHTING_BY_INDEX[index],
      actionText: clipText(excerptAt(ctx, 1, 'Follow the process in the text'), 48),
      elements: [
        { name: primary, type: 'container', color: '#e2e8f0' },
        { name: secondary, type: 'particles', color: '#00a8ff' },
      ],
      calloutBadges: tokens.slice(0, 3).length ? tokens.slice(0, 3) : ['Observe', 'Change'],
    };
  }
  if (arch === 'micro_zoom') {
    return {
      headline: clipText(ctx.title, 42),
      particleMatrix: { typeA: primary || 'type_a', typeB: secondary || 'type_b' },
      takeawayBadge: clipText(excerptAt(ctx, 2, ctx.chapterSummary || ctx.title), 90),
      primaryColor: '#38bdf8',
      secondaryColor: '#facc15',
      lighting: LIGHTING_BY_INDEX[index],
      calloutBadges: ['Zoom in'],
    };
  }
  return {
    headline: clipText(ctx.title, 42),
    takeawayBadge: clipText(ctx.chapterSummary || excerptAt(ctx, 0, ctx.title), 90),
    primaryColor: '#818cf8',
    secondaryColor: '#34d399',
    lighting: LIGHTING_BY_INDEX[index],
    calloutBadges: tokens.slice(0, 2),
    primaryShape: 'grid',
  };
}

function heuristicManifest(ctx: TopicContextPacket): VideoScriptManifest {
  const text = [ctx.title, ctx.chapterSummary, ...ctx.ragExcerpts.slice(0, 4)].join(' ');
  const pedagogy = classifyPatternFromText(text);
  const tip = ctx.teacherPrompt?.trim() ? ` ${ctx.teacherPrompt.trim()}` : '';

  const hook = `Quick challenge from the text: ${excerptAt(ctx, 0, ctx.title)}${tip}`;
  const sim = `Let's follow what the textbook describes: ${excerptAt(ctx, 1, ctx.chapterSummary || ctx.title)}`;
  const reveal = `Here's why, according to the text: ${excerptAt(ctx, 2, ctx.chapterSummary || ctx.title)} ${ctx.code}: ${ctx.title}.`;

  const scenes = PHASE_BY_INDEX.map((phase, i) => {
    let arch: VisualArchetype = ARCHETYPE_BY_INDEX[i];
    if (i === 1 && pedagogy === 'comparison') arch = 'split_comparison';
    if (i === 1 && pedagogy === 'concept') arch = 'interactive_stage';
    if (i === 2 && pedagogy === 'concept') arch = 'concept_card';
    const visualConfig = heuristicVisualConfig(ctx, i, arch);
    const parameters = flattenVisualConfig(visualConfig);
    const duration = DURATION_BY_INDEX[i];
    const voiceover = i === 0 ? hook : i === 1 ? sim : reveal;
    return {
      sceneId: i + 1,
      duration,
      durationSec: duration,
      phase,
      phaseTitle: phase,
      voiceoverText: voiceover,
      voiceover,
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
    teacherName: 'Professor Maya',
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

function normalizeManifest(raw: LlmManifestRaw, ctx: TopicContextPacket): VideoScriptManifest {
  const fallback = heuristicManifest(ctx);
  const pedagogy =
    patternToPedagogy(raw.pedagogicalPattern || raw.archetype) || fallback.archetype || 'concept';
  const rawScenes = Array.isArray(raw.scenes) ? raw.scenes.slice(0, 3) : [];
  if (!rawScenes.length) return fallback;

  const scenes = rawScenes.map((s, i) => {
    const visualArchetype = normalizeVisualArchetype(s.visualArchetype || s.visualType, i);
    const visualConfig = mergeVisualConfig(
      heuristicVisualConfig(ctx, i, visualArchetype),
      s.parameters,
      s.visualProps,
      s.props,
      s.visualConfig,
    );
    if (!visualConfig.lighting) visualConfig.lighting = LIGHTING_BY_INDEX[i];
    const parameters = flattenVisualConfig(visualConfig);
    const duration = DURATION_BY_INDEX[i] ?? Math.max(5, Number(s.durationSec ?? s.duration) || 8);
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

  while (scenes.length < 3) {
    scenes.push(fallback.scenes[scenes.length]);
  }

  return {
    topicTitle: raw.topicTitle || ctx.title,
    teacherName: String(raw.teacherName || 'Professor Maya').trim() || 'Professor Maya',
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
      const overlayImageUrls = urls.slice(0, 3);
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
  const excerpts = ctx.ragExcerpts.slice(0, 10).join('\n---\n');
  console.log(
    `[videoPipeline/script] Cinematic SweetRush director — RAG excerpts=${ctx.ragExcerpts.length} topic="${ctx.code} ${ctx.title}"`,
  );

  const template = getGenerationTemplate(ctx.templateId);
  const activeConfig = TEMPLATE_CONFIGS[template.id] || TEMPLATE_CONFIGS.tom_and_jerry;
  const user = [
    `Topic code: ${ctx.code}`,
    `Topic title: ${ctx.title}`,
    `Chapter: ${ctx.chapterTitle}`,
    `Textbook: ${ctx.textbookTitle} (${ctx.subject}, ${ctx.gradeLabel})`,
    `Chapter summary: ${ctx.chapterSummary}`,
    `Selected templateId: ${template.id}`,
    `Theme: ${activeConfig.themeName}`,
    `Host narrator: ${activeConfig.characters.host}`,
    `Visual / dialogue template:\n${templatePromptBlock(template.id)}`,
    `CRITICAL: Match characters, tone, and visuals to templateId "${template.id}". Do not default to Tom & Jerry unless templateId is tom_and_jerry.`,
    ctx.teacherPrompt ? `Teacher refinement: ${ctx.teacherPrompt}` : '',
    `RAW RAG EXCERPTS (GROUND TRUTH — teacher attachments are prefixed and must be prioritized over textbook text):\n${excerpts || '(no excerpts — use topic title and chapter summary only)'}`,
    ctx.attachmentImageUrls?.length
      ? `Teacher image URLs for on-screen overlay: ${ctx.attachmentImageUrls.join(', ')}`
      : '',
    'Output exactly 3 scenes: CHALLENGE (8s), SIMULATION (12s), DISCOVERY (8s). Total 28 seconds.',
    'Choose visualArchetype, teacherGesture, and cameraMotion for each scene.',
    'All visualConfig labels must be taken from this PDF context — do not invent a default lab kit.',
    `Also set pedagogicalPattern / teacherName consistent with ${template.title} (${activeConfig.characters.host}).`,
  ]
    .filter(Boolean)
    .join('\n\n');

  if (!provider) return getFallbackScriptForTemplate(template.id, ctx);

  try {
    const raw = await Promise.race([
      provider.completeJson<LlmManifestRaw | string>({
        system: CINEMATIC_SWEETRUSH_PROMPT,
        user,
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('LLM script timed out')), 45_000);
      }),
    ]);
    const manifest = parseLlmManifestSafely(raw, template.id, ctx);
    console.log(
      `[videoPipeline/script] templateId=${template.id} archetypes=${manifest.scenes
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
    return getFallbackScriptForTemplate(template.id, ctx);
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
