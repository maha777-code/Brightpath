import type {
  PedagogicalArchetype,
  SceneVisualType,
  VideoSceneParameters,
  VideoScriptManifest,
} from '@brightpath/shared';
import { getActiveProvider } from '../llm/provider.js';
import type { TopicContextPacket } from './types.js';

const UNIVERSAL_INSTRUCTIONAL_PROMPT = `
You are an expert Instructional Designer creating engaging, gamified 3D video lessons (SweetRush style) from textbook excerpts for ANY subject.

You will receive an extracted textbook section (RAG context). Strictly ground the lesson in this content — do NOT invent generic filler.

STEP 1: Identify the primary Pedagogical Archetype of the text:
- "experiment": activities, lab equipment, steps, or physical observations
- "comparison": contrasts two concepts, theories, or classifications
- "process": cycle, sequence, timeline, or multi-step phenomenon
- "concept": abstract law, definition, equation, or core rule

STEP 2: Generate a 3-scene gamified script JSON following this EXACT schema:
{
  "topicTitle": "Extracted section title",
  "archetype": "experiment | comparison | process | concept",
  "totalDurationSeconds": 18-24,
  "scenes": [
    {
      "sceneId": 1,
      "duration": 6-8,
      "phase": "Hook / Dilemma",
      "voiceover": "Engaging hook grounded in the text's opening question or real-world example.",
      "visualType": "comparison_split | question_card | concept_hero",
      "visualProps": {
        "leftLabel": "Label A",
        "rightLabel": "Label B",
        "primaryObject": "object_name",
        "showLabels": ["Label A", "Label B"]
      }
    },
    {
      "sceneId": 2,
      "duration": 6-8,
      "phase": "Core Activity / Demonstration",
      "voiceover": "Step-by-step breakdown of the text's primary activity, experiment, or process.",
      "visualType": "lab_simulation | flow_step | dynamic_diagram",
      "visualProps": {
        "container": "beaker | flask | grid | timeline",
        "action": "dissolve | heat | move | compare",
        "primarySubstance": "water",
        "secondarySubstance": "salt",
        "stepLabels": ["Step 1", "Step 2", "Step 3"],
        "showLabels": ["Activity"]
      }
    },
    {
      "sceneId": 3,
      "duration": 6-8,
      "phase": "Microscopic / Conceptual Discovery",
      "voiceover": "Why this happens — micro-scale interactions or key takeaways from the text.",
      "visualType": "particle_zoom | macro_reveal | callout_summary",
      "visualProps": {
        "particleTypeA": "blue_water_spheres",
        "particleTypeB": "yellow_salt_spheres",
        "keyTakeaway": "Summary sentence from the text",
        "showLabels": ["Key Takeaway"]
      }
    }
  ]
}

STRICT RULES:
- Use exact real-world examples, activities, and questions from the PDF text.
- Prefer subject-agnostic visuals driven by visualProps (works for Science, History, Math, etc.).
- totalDurationSeconds MUST be 15–25. Scene durations must sum ≈ totalDurationSeconds.
- Return ONLY valid JSON (no markdown).
`;

type LlmSceneRaw = {
  sceneId?: number;
  duration?: number;
  phase?: string;
  voiceover?: string;
  voiceoverText?: string;
  visualType?: string;
  visualProps?: Record<string, unknown>;
  animationType?: string;
  parameters?: Record<string, unknown>;
};

type LlmManifestRaw = {
  topicTitle?: string;
  archetype?: string;
  totalDurationSeconds?: number;
  scenes?: LlmSceneRaw[];
};

function visualTypeToAnimation(visualType: string, archetype: string): string {
  switch (visualType) {
    case 'lab_simulation':
    case 'dynamic_diagram':
      return 'TemperatureEffect';
    case 'comparison_split':
    case 'question_card':
      return 'StateComparison';
    case 'particle_zoom':
    case 'macro_reveal':
      return 'ParticleMotion3D';
    case 'flow_step':
    case 'callout_summary':
    case 'concept_hero':
      return 'ConceptCallout';
    default:
      if (archetype === 'experiment') return 'TemperatureEffect';
      if (archetype === 'comparison') return 'StateComparison';
      if (archetype === 'process') return 'ConceptCallout';
      return 'ParticleMotion3D';
  }
}

function defaultVisualTypeForPhase(sceneIndex: number, archetype: PedagogicalArchetype): SceneVisualType {
  if (sceneIndex === 0) {
    if (archetype === 'comparison') return 'comparison_split';
    if (archetype === 'concept') return 'concept_hero';
    return 'question_card';
  }
  if (sceneIndex === 1) {
    if (archetype === 'experiment') return 'lab_simulation';
    if (archetype === 'process') return 'flow_step';
    if (archetype === 'comparison') return 'dynamic_diagram';
    return 'dynamic_diagram';
  }
  if (archetype === 'experiment' || archetype === 'concept') return 'particle_zoom';
  if (archetype === 'process') return 'callout_summary';
  return 'callout_summary';
}

function classifyArchetypeFromText(text: string): PedagogicalArchetype {
  const t = text.toLowerCase();
  if (
    /\b(activity|experiment|apparatus|observe|beaker|flask|lab|procedure|materials)\b/.test(t)
  ) {
    return 'experiment';
  }
  if (/\b(vs\.?|versus|compare|difference|contrast|either|or|two types|classification)\b/.test(t)) {
    return 'comparison';
  }
  if (/\b(cycle|process|steps?|sequence|then|next|stage|timeline|flow|phase)\b/.test(t)) {
    return 'process';
  }
  return 'concept';
}

function normalizeArchetype(raw: string | undefined, fallback: PedagogicalArchetype): PedagogicalArchetype {
  const v = String(raw ?? '').toLowerCase().trim();
  if (v === 'experiment' || v === 'comparison' || v === 'process' || v === 'concept') return v;
  return fallback;
}

function mergeProps(
  visualProps: Record<string, unknown> | undefined,
  parameters: Record<string, unknown> | undefined,
): VideoSceneParameters {
  const merged = { ...(parameters ?? {}), ...(visualProps ?? {}) } as VideoSceneParameters;
  if (!merged.particleDensity) merged.particleDensity = 'medium';
  if (merged.temperature == null) merged.temperature = 30;
  if (merged.speedMultiplier == null) merged.speedMultiplier = 1.3;
  if (!Array.isArray(merged.showLabels)) {
    const labels = [
      merged.leftLabel,
      merged.rightLabel,
      merged.keyTakeaway,
      merged.primaryObject,
      merged.primarySubstance,
    ]
      .map((x) => (typeof x === 'string' ? x : null))
      .filter((x): x is string => Boolean(x));
    merged.showLabels = labels.length ? labels.slice(0, 3) : ['Concept'];
  }
  return merged;
}

function heuristicManifest(ctx: TopicContextPacket): VideoScriptManifest {
  const text = [ctx.title, ctx.chapterSummary, ...ctx.ragExcerpts.slice(0, 3)].join(' ');
  const archetype = classifyArchetypeFromText(text);
  const tip = ctx.teacherPrompt?.trim() ? ` ${ctx.teacherPrompt.trim()}` : '';
  const excerptHint = ctx.ragExcerpts[0]?.slice(0, 120)?.trim();

  const hooks: Record<PedagogicalArchetype, string> = {
    experiment: `Let's try what the textbook describes for ${ctx.title}.${tip}`,
    comparison: `The text asks us to compare two ideas in ${ctx.title}.${tip}`,
    process: `Follow the sequence the textbook lays out for ${ctx.title}.${tip}`,
    concept: `Here's the key idea behind ${ctx.title}.${tip}`,
  };

  const demos: Record<PedagogicalArchetype, string> = {
    experiment: excerptHint
      ? `In this activity: ${excerptHint}`
      : 'We follow the steps, observe carefully, and note what changes.',
    comparison: 'Side by side, notice what stays the same and what differs.',
    process: 'Each step leads to the next — watch how the system changes over time.',
    concept: 'The rule becomes clear when we see how the parts interact.',
  };

  const discoveries: Record<PedagogicalArchetype, string> = {
    experiment: `Remember ${ctx.code}: observation plus explanation reveals why it works.`,
    comparison: `Remember ${ctx.code}: contrast helps us classify correctly.`,
    process: `Remember ${ctx.code}: order matters in this process.`,
    concept: `Remember ${ctx.code}: this principle explains everyday examples.`,
  };

  const scenes = [
    {
      sceneId: 1,
      duration: 7,
      phase: 'Hook / Dilemma',
      voiceoverText: hooks[archetype],
      visualType: defaultVisualTypeForPhase(0, archetype),
      animationType: visualTypeToAnimation(defaultVisualTypeForPhase(0, archetype), archetype),
      parameters: {
        leftLabel: archetype === 'comparison' ? 'View A' : ctx.code,
        rightLabel: archetype === 'comparison' ? 'View B' : 'Explore',
        primaryObject: ctx.title.split(' ').slice(0, 2).join(' ') || 'concept',
        particleDensity: 'medium',
        temperature: 28,
        speedMultiplier: 1.2,
        showLabels: [ctx.code, 'Hook'],
      },
      visualProps: {
        leftLabel: archetype === 'comparison' ? 'View A' : ctx.code,
        rightLabel: archetype === 'comparison' ? 'View B' : 'Explore',
        primaryObject: ctx.title,
      },
    },
    {
      sceneId: 2,
      duration: 8,
      phase: 'Core Activity / Demonstration',
      voiceoverText: demos[archetype],
      visualType: defaultVisualTypeForPhase(1, archetype),
      animationType: visualTypeToAnimation(defaultVisualTypeForPhase(1, archetype), archetype),
      parameters: {
        container: archetype === 'experiment' ? 'beaker' : 'timeline',
        action: archetype === 'experiment' ? 'dissolve' : 'move',
        primarySubstance: 'water',
        secondarySubstance: 'salt',
        stepLabels: ['Step 1', 'Step 2', 'Step 3'],
        particleDensity: 'medium',
        temperature: 45,
        speedMultiplier: 1.5,
        showLabels: ['Demonstration'],
      },
      visualProps: {
        container: archetype === 'experiment' ? 'beaker' : 'timeline',
        action: archetype === 'experiment' ? 'dissolve' : 'move',
        primarySubstance: 'water',
        secondarySubstance: 'salt',
        stepLabels: ['Step 1', 'Step 2', 'Step 3'],
      },
    },
    {
      sceneId: 3,
      duration: 7,
      phase: 'Microscopic / Conceptual Discovery',
      voiceoverText: discoveries[archetype],
      visualType: defaultVisualTypeForPhase(2, archetype),
      animationType: visualTypeToAnimation(defaultVisualTypeForPhase(2, archetype), archetype),
      parameters: {
        particleTypeA: 'blue_water_spheres',
        particleTypeB: 'yellow_salt_spheres',
        keyTakeaway: `${ctx.code}: ${ctx.title}`,
        particleDensity: 'high',
        temperature: 35,
        speedMultiplier: 1.4,
        showLabels: ['Key Takeaway', ctx.code],
      },
      visualProps: {
        particleTypeA: 'blue_water_spheres',
        particleTypeB: 'yellow_salt_spheres',
        keyTakeaway: `${ctx.code}: ${ctx.title}`,
      },
    },
  ];

  return {
    topicTitle: ctx.title,
    archetype,
    totalDurationSeconds: scenes.reduce((a, s) => a + s.duration, 0),
    scenes,
  };
}

function clampDuration(sec: number): number {
  return Math.min(25, Math.max(15, Math.round(sec)));
}

function normalizeManifest(raw: LlmManifestRaw, ctx: TopicContextPacket): VideoScriptManifest {
  const fallback = heuristicManifest(ctx);
  const archetype = normalizeArchetype(raw.archetype, fallback.archetype ?? 'concept');
  const rawScenes = Array.isArray(raw.scenes) ? raw.scenes.slice(0, 3) : [];

  if (!rawScenes.length) return fallback;

  const scenes = rawScenes.map((s, i) => {
    const voiceoverText =
      String(s.voiceover || s.voiceoverText || '').trim() ||
      fallback.scenes[Math.min(i, fallback.scenes.length - 1)].voiceoverText;
    const visualType = String(
      s.visualType || defaultVisualTypeForPhase(i, archetype),
    ) as SceneVisualType;
    const parameters = mergeProps(
      s.visualProps as Record<string, unknown> | undefined,
      s.parameters as Record<string, unknown> | undefined,
    );
    return {
      sceneId: s.sceneId ?? i + 1,
      duration: Math.max(5, Math.min(12, Number(s.duration) || 7)),
      phase: String(s.phase || fallback.scenes[Math.min(i, 2)].phase || `Scene ${i + 1}`),
      voiceoverText,
      visualType,
      visualProps: parameters,
      animationType: String(s.animationType || visualTypeToAnimation(visualType, archetype)),
      parameters,
    };
  });

  // Pad to 3 scenes if LLM returned fewer
  while (scenes.length < 3) {
    scenes.push(fallback.scenes[scenes.length]);
  }

  let totalDurationSeconds =
    Number(raw.totalDurationSeconds) || scenes.reduce((a, s) => a + s.duration, 0);
  totalDurationSeconds = clampDuration(totalDurationSeconds);
  const sceneSum = scenes.reduce((a, s) => a + s.duration, 0);
  if (sceneSum > 0 && Math.abs(sceneSum - totalDurationSeconds) > 2) {
    const scale = totalDurationSeconds / sceneSum;
    for (const s of scenes) {
      s.duration = Math.max(5, Math.round(s.duration * scale));
    }
  }

  return {
    topicTitle: raw.topicTitle || ctx.title,
    archetype,
    totalDurationSeconds: scenes.reduce((a, s) => a + s.duration, 0),
    scenes,
  };
}

/** Step 2 — universal pedagogical script via LLM (archetype-aware heuristic fallback). */
export async function generateStructuredVideoScript(
  ctx: TopicContextPacket,
): Promise<VideoScriptManifest> {
  const provider = getActiveProvider();
  const excerpts = ctx.ragExcerpts.slice(0, 8).join('\n---\n');
  const user = [
    `Topic code: ${ctx.code}`,
    `Topic title: ${ctx.title}`,
    `Chapter: ${ctx.chapterTitle}`,
    `Textbook: ${ctx.textbookTitle} (${ctx.subject}, ${ctx.gradeLabel})`,
    `Chapter summary: ${ctx.chapterSummary}`,
    ctx.teacherPrompt ? `Teacher refinement: ${ctx.teacherPrompt}` : '',
    `RAG textbook excerpts (GROUND TRUTH — use these examples/activities/questions):\n${excerpts || '(no excerpts — use topic title and chapter summary only)'}`,
    'Target length: 15–25 seconds across exactly 3 scenes.',
  ]
    .filter(Boolean)
    .join('\n\n');

  if (!provider) return heuristicManifest(ctx);

  try {
    const raw = await Promise.race([
      provider.completeJson<LlmManifestRaw>({
        system: UNIVERSAL_INSTRUCTIONAL_PROMPT,
        user,
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('LLM script timed out')), 45_000);
      }),
    ]);
    return normalizeManifest(raw ?? {}, ctx);
  } catch (err) {
    console.warn('[videoPipeline/script] LLM failed/timed out, using archetype heuristic:', err);
    return heuristicManifest(ctx);
  }
}

export function flattenVoiceover(manifest: VideoScriptManifest): string {
  return manifest.scenes.map((s) => s.voiceoverText).join(' ');
}

export function cuesFromManifest(manifest: VideoScriptManifest) {
  let t = 0;
  return manifest.scenes.map((s) => {
    const label =
      s.phase ||
      s.visualType ||
      s.animationType ||
      (s.parameters.showLabels as string[] | undefined)?.[0] ||
      s.voiceoverText.slice(0, 40);
    const cue = {
      timeSec: t + Math.min(2, s.duration / 3),
      label: String(label),
    };
    t += s.duration;
    return cue;
  });
}
