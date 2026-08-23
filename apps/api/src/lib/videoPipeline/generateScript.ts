import type {
  PedagogicalArchetype,
  SceneVisualType,
  VideoSceneParameters,
  VideoScriptManifest,
} from '@brightpath/shared';
import { getActiveProvider } from '../llm/provider.js';
import type { TopicContextPacket } from './types.js';

const SWEETRUSH_INSTRUCTIONAL_PROMPT = `
You are a Lead Instructional Designer at SweetRush specializing in gamified STEM micro-learning.
Transform the provided textbook context into a high-octane, visually rich 25-second educational video script.

A playful expert narrator (Sarah) sets an intriguing hook, then runs a gamified simulation, then reveals why it works.

STRICT PEDAGOGICAL STRUCTURE:
Scene 1 (0-6s): THE HOOK & DILEMMA
- Poses an engaging, relatable real-world question using the textbook's core problem.
- Visual: High-impact 3D split view or high-contrast teaser graphic.

Scene 2 (6-18s): THE GAMIFIED EXPERIMENT / SIMULATION
- Directly simulates the textbook activity step-by-step (e.g., adding salt to a 100mL beaker, stirring with a glass rod, watching particles interact).
- Visual: Interactive 3D lab apparatus or process stage with UI progress indicators, floating vector arrows, and highlighted labels.

Scene 3 (18-25s): THE MICROSCOPIC / CONCEPT REVEAL
- Answers "Why this happens" by zooming into the molecular or core conceptual scale.
- Visual: Particle lattice reveal showing secondary particles fitting into inter-particle spaces, accompanied by a dynamic Key Takeaway badge.

JSON OUTPUT SCHEMA:
{
  "topicTitle": "Exact Chapter/Subtopic Title",
  "pedagogicalPattern": "lab_experiment | conceptual_comparison | process_flow",
  "totalDurationSeconds": 25,
  "scenes": [
    {
      "sceneId": 1,
      "durationSec": 6,
      "phaseTitle": "CHALLENGE",
      "voiceover": "Curriculum-grounded hook text",
      "visualType": "comparison_split | question_card",
      "props": {
        "leftConcept": "Wood (Continuous)",
        "rightConcept": "Sand (Particulate)",
        "accentColor": "#FF5722"
      }
    },
    {
      "sceneId": 2,
      "durationSec": 12,
      "phaseTitle": "SIMULATION",
      "voiceover": "Step-by-step activity text featuring the beaker, salt, water level, and stirring.",
      "visualType": "3d_beaker_experiment | flow_step | dynamic_diagram",
      "props": {
        "container": "100mL Beaker",
        "liquidLevel": 50,
        "solute": "Salt Crystals",
        "action": "dissolve_and_stir",
        "waterLevelChanged": false
      }
    },
    {
      "sceneId": 3,
      "durationSec": 7,
      "phaseTitle": "DISCOVERY",
      "voiceover": "Microscopic explanation of particles fitting into empty spaces.",
      "visualType": "3d_particle_zoom | callout_summary",
      "props": {
        "primaryParticles": "Water (Blue Spheres)",
        "secondaryParticles": "Salt (Yellow Spheres)",
        "interstitialFitting": true,
        "takeawayBadge": "Matter is made of tiny particles with spaces between them!"
      }
    }
  ]
}

STRICT RULES:
- Ground EVERY voiceover line in the provided RAG textbook excerpts. Do not invent generic filler.
- Use the textbook's real activity, apparatus, measurements, and examples when present.
- Return ONLY valid JSON (no markdown).
- Scene durations must be durationSec 6, 12, 7 (sum 25).
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
  visualProps?: Record<string, unknown>;
  props?: Record<string, unknown>;
  animationType?: string;
  parameters?: Record<string, unknown>;
};

type LlmManifestRaw = {
  topicTitle?: string;
  archetype?: string;
  pedagogicalPattern?: string;
  totalDurationSeconds?: number;
  scenes?: LlmSceneRaw[];
};

const PHASE_BY_INDEX = ['CHALLENGE', 'SIMULATION', 'DISCOVERY'] as const;
const DURATION_BY_INDEX = [6, 12, 7] as const;

function patternToArchetype(pattern: string | undefined): PedagogicalArchetype {
  const p = String(pattern ?? '').toLowerCase();
  if (p.includes('lab') || p.includes('experiment')) return 'experiment';
  if (p.includes('comparison')) return 'comparison';
  if (p.includes('process') || p.includes('flow')) return 'process';
  return 'concept';
}

function normalizeVisualType(raw: string | undefined, index: number, archetype: PedagogicalArchetype): SceneVisualType {
  const v = String(raw ?? '').toLowerCase().trim();
  if (v === '3d_beaker_experiment' || v === 'lab_simulation') return '3d_beaker_experiment';
  if (v === '3d_particle_zoom' || v === 'particle_zoom' || v === 'macro_reveal') return '3d_particle_zoom';
  if (
    v === 'comparison_split' ||
    v === 'question_card' ||
    v === 'flow_step' ||
    v === 'dynamic_diagram' ||
    v === 'callout_summary' ||
    v === 'concept_hero'
  ) {
    return v;
  }
  if (index === 0) return archetype === 'comparison' ? 'comparison_split' : 'question_card';
  if (index === 1) {
    if (archetype === 'process') return 'flow_step';
    if (archetype === 'experiment') return '3d_beaker_experiment';
    return 'dynamic_diagram';
  }
  return '3d_particle_zoom';
}

function visualTypeToAnimation(visualType: string): string {
  if (visualType === '3d_beaker_experiment' || visualType === 'lab_simulation') return 'TemperatureEffect';
  if (visualType === 'comparison_split' || visualType === 'question_card') return 'StateComparison';
  if (visualType === '3d_particle_zoom' || visualType === 'particle_zoom') return 'ParticleMotion3D';
  return 'ConceptCallout';
}

function classifyPatternFromText(text: string): PedagogicalArchetype {
  const t = text.toLowerCase();
  if (/\b(activity|experiment|apparatus|observe|beaker|flask|lab|procedure|materials|dissolve|salt)\b/.test(t)) {
    return 'experiment';
  }
  if (/\b(vs\.?|versus|compare|difference|contrast|continuous|particulate|classification)\b/.test(t)) {
    return 'comparison';
  }
  if (/\b(cycle|process|steps?|sequence|then|next|stage|timeline|flow|phase)\b/.test(t)) {
    return 'process';
  }
  return 'concept';
}

function mergeSweetRushProps(
  ...bags: Array<Record<string, unknown> | undefined>
): VideoSceneParameters {
  const merged = Object.assign({}, ...bags.filter(Boolean)) as VideoSceneParameters;
  if (merged.leftConcept && !merged.leftLabel) merged.leftLabel = String(merged.leftConcept);
  if (merged.rightConcept && !merged.rightLabel) merged.rightLabel = String(merged.rightConcept);
  if (merged.leftLabel && !merged.leftConcept) merged.leftConcept = String(merged.leftLabel);
  if (merged.rightLabel && !merged.rightConcept) merged.rightConcept = String(merged.rightLabel);
  if (merged.takeawayBadge && !merged.keyTakeaway) merged.keyTakeaway = String(merged.takeawayBadge);
  if (merged.keyTakeaway && !merged.takeawayBadge) merged.takeawayBadge = String(merged.keyTakeaway);
  if (merged.primaryParticles && !merged.particleTypeA) merged.particleTypeA = String(merged.primaryParticles);
  if (merged.secondaryParticles && !merged.particleTypeB) merged.particleTypeB = String(merged.secondaryParticles);
  if (merged.solute && !merged.secondarySubstance) merged.secondarySubstance = String(merged.solute);
  if (!merged.particleDensity) merged.particleDensity = 'medium';
  if (merged.temperature == null) merged.temperature = 32;
  if (merged.speedMultiplier == null) merged.speedMultiplier = 1.35;
  if (merged.liquidLevel == null) merged.liquidLevel = 50;
  if (!Array.isArray(merged.showLabels)) {
    const labels = [
      merged.leftConcept,
      merged.rightConcept,
      merged.solute,
      merged.container,
      merged.takeawayBadge,
    ]
      .map((x) => (typeof x === 'string' ? x : null))
      .filter((x): x is string => Boolean(x));
    merged.showLabels = labels.length ? labels.slice(0, 3) : ['SweetRush'];
  }
  return merged;
}

function heuristicManifest(ctx: TopicContextPacket): VideoScriptManifest {
  const text = [ctx.title, ctx.chapterSummary, ...ctx.ragExcerpts.slice(0, 4)].join(' ');
  const archetype = classifyPatternFromText(text);
  const excerpt = ctx.ragExcerpts[0]?.replace(/\s+/g, ' ').trim().slice(0, 160);
  const tip = ctx.teacherPrompt?.trim() ? ` ${ctx.teacherPrompt.trim()}` : '';

  const hook =
    excerpt && excerpt.length > 40
      ? `Quick challenge: ${excerpt}${excerpt.endsWith('?') ? '' : '?'}${tip}`
      : `Is ${ctx.title} something we can see in everyday life — or is there a hidden particle story?${tip}`;

  const sim =
    archetype === 'experiment'
      ? `Let's run the textbook activity: take a 100 millilitre beaker of water, add a spoonful of salt, and stir. Watch the crystals disappear — but the water level barely changes.`
      : archetype === 'process'
        ? `Follow the sequence in the text, one stage at a time, and notice what changes at each step.`
        : `Compare the two views side by side, then test the idea with a simple simulation.`;

  const reveal = `Here's why: tiny particles have spaces between them. Secondary particles slide into those gaps. ${ctx.code}: ${ctx.title}.`;

  const scenes = [
    {
      sceneId: 1,
      duration: 6,
      phase: 'CHALLENGE',
      voiceoverText: hook,
      visualType: 'comparison_split' as SceneVisualType,
      animationType: 'StateComparison',
      parameters: mergeSweetRushProps({
        leftConcept: 'Continuous (like wood)',
        rightConcept: 'Particulate (like sand)',
        accentColor: '#FF5722',
      }),
      visualProps: mergeSweetRushProps({
        leftConcept: 'Continuous (like wood)',
        rightConcept: 'Particulate (like sand)',
        accentColor: '#FF5722',
      }),
    },
    {
      sceneId: 2,
      duration: 12,
      phase: 'SIMULATION',
      voiceoverText: sim,
      visualType: (archetype === 'process' ? 'flow_step' : '3d_beaker_experiment') as SceneVisualType,
      animationType: visualTypeToAnimation(archetype === 'process' ? 'flow_step' : '3d_beaker_experiment'),
      parameters: mergeSweetRushProps({
        container: '100mL Beaker',
        liquidLevel: 50,
        solute: 'Salt Crystals',
        action: 'dissolve_and_stir',
        waterLevelChanged: false,
        stepLabels: ['Add water', 'Add solute', 'Stir'],
      }),
      visualProps: mergeSweetRushProps({
        container: '100mL Beaker',
        liquidLevel: 50,
        solute: 'Salt Crystals',
        action: 'dissolve_and_stir',
        waterLevelChanged: false,
        stepLabels: ['Add water', 'Add solute', 'Stir'],
      }),
    },
    {
      sceneId: 3,
      duration: 7,
      phase: 'DISCOVERY',
      voiceoverText: reveal,
      visualType: '3d_particle_zoom' as SceneVisualType,
      animationType: 'ParticleMotion3D',
      parameters: mergeSweetRushProps({
        primaryParticles: 'Water (Blue Spheres)',
        secondaryParticles: 'Salt (Yellow Spheres)',
        interstitialFitting: true,
        takeawayBadge: 'Matter is made of tiny particles with spaces between them!',
      }),
      visualProps: mergeSweetRushProps({
        primaryParticles: 'Water (Blue Spheres)',
        secondaryParticles: 'Salt (Yellow Spheres)',
        interstitialFitting: true,
        takeawayBadge: 'Matter is made of tiny particles with spaces between them!',
      }),
    },
  ];

  return {
    topicTitle: ctx.title,
    archetype,
    pedagogicalPattern:
      archetype === 'experiment'
        ? 'lab_experiment'
        : archetype === 'comparison'
          ? 'conceptual_comparison'
          : 'process_flow',
    totalDurationSeconds: 25,
    scenes,
  };
}

function normalizeManifest(raw: LlmManifestRaw, ctx: TopicContextPacket): VideoScriptManifest {
  const fallback = heuristicManifest(ctx);
  const archetype = patternToArchetype(raw.pedagogicalPattern || raw.archetype) || fallback.archetype || 'concept';
  const rawScenes = Array.isArray(raw.scenes) ? raw.scenes.slice(0, 3) : [];
  if (!rawScenes.length) return fallback;

  const scenes = rawScenes.map((s, i) => {
    const visualType = normalizeVisualType(s.visualType, i, archetype);
    const parameters = mergeSweetRushProps(s.parameters, s.visualProps, s.props);
    return {
      sceneId: s.sceneId ?? i + 1,
      duration: DURATION_BY_INDEX[i] ?? Math.max(5, Number(s.durationSec ?? s.duration) || 7),
      phase: String(s.phaseTitle || s.phase || PHASE_BY_INDEX[i] || `Scene ${i + 1}`).toUpperCase(),
      voiceoverText:
        String(s.voiceover || s.voiceoverText || '').trim() ||
        fallback.scenes[Math.min(i, fallback.scenes.length - 1)].voiceoverText,
      visualType,
      visualProps: parameters,
      animationType: String(s.animationType || visualTypeToAnimation(visualType)),
      parameters,
    };
  });

  while (scenes.length < 3) {
    scenes.push(fallback.scenes[scenes.length]);
  }

  return {
    topicTitle: raw.topicTitle || ctx.title,
    archetype,
    pedagogicalPattern: raw.pedagogicalPattern || fallback.pedagogicalPattern,
    totalDurationSeconds: scenes.reduce((a, s) => a + s.duration, 0),
    scenes,
  };
}

/** Step 2 — SweetRush micro-lesson script from RAG textbook excerpts. */
export async function generateStructuredVideoScript(
  ctx: TopicContextPacket,
): Promise<VideoScriptManifest> {
  const provider = getActiveProvider();
  const excerpts = ctx.ragExcerpts.slice(0, 10).join('\n---\n');
  console.log(
    `[videoPipeline/script] SweetRush design — RAG excerpts=${ctx.ragExcerpts.length} topic="${ctx.code} ${ctx.title}"`,
  );

  const user = [
    `Topic code: ${ctx.code}`,
    `Topic title: ${ctx.title}`,
    `Chapter: ${ctx.chapterTitle}`,
    `Textbook: ${ctx.textbookTitle} (${ctx.subject}, ${ctx.gradeLabel})`,
    `Chapter summary: ${ctx.chapterSummary}`,
    ctx.teacherPrompt ? `Teacher refinement: ${ctx.teacherPrompt}` : '',
    `RAW PDF RAG EXCERPTS (GROUND TRUTH — quote activities, apparatus, measurements, and questions):\n${excerpts || '(no excerpts — use topic title and chapter summary only)'}`,
    'Output exactly 3 scenes: CHALLENGE (6s), SIMULATION (12s), DISCOVERY (7s). Total 25 seconds.',
  ]
    .filter(Boolean)
    .join('\n\n');

  if (!provider) return heuristicManifest(ctx);

  try {
    const raw = await Promise.race([
      provider.completeJson<LlmManifestRaw>({
        system: SWEETRUSH_INSTRUCTIONAL_PROMPT,
        user,
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('LLM script timed out')), 45_000);
      }),
    ]);
    return normalizeManifest(raw ?? {}, ctx);
  } catch (err) {
    console.warn('[videoPipeline/script] LLM failed/timed out, using SweetRush heuristic:', err);
    return heuristicManifest(ctx);
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
      label: String(s.phase || s.visualType || s.voiceoverText.slice(0, 40)),
    };
    t += s.duration;
    return cue;
  });
}
