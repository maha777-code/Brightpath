/** Normalize SweetRush script JSON so visualArchetype + visualConfig drive 3D primitives. */

export type VisualArchetypeName =
  | 'split_comparison'
  | 'interactive_stage'
  | 'micro_zoom'
  | 'concept_card';

export type SceneProp = {
  sceneId: number;
  duration: number;
  durationSec?: number;
  voiceoverText?: string;
  voiceover?: string;
  animationType?: string;
  phase?: string;
  phaseTitle?: string;
  visualType?: string;
  visual_type?: string;
  visualArchetype?: string;
  visualConfig?: Record<string, unknown>;
  visualProps?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
  props?: Record<string, unknown>;
};

export type ScriptData = {
  topicTitle?: string;
  archetype?: string;
  pedagogicalPattern?: string;
  totalDurationSeconds?: number;
  scenes?: SceneProp[];
  wordTimings?: { word: string; start: number; end: number }[];
};

export type GamifiedLessonProps = {
  topicId: string;
  topicTitle: string;
  totalDurationSeconds: number;
  archetype?: string;
  pedagogicalPattern?: string;
  scenes: SceneProp[];
  wordTimings: { word: string; start: number; end: number }[];
  audioUrl?: string;
  scriptData?: ScriptData;
};

export type NormalizedScene = {
  sceneId: number;
  duration: number;
  durationSec: number;
  phase: string;
  phaseTitle: string;
  voiceoverText: string;
  voiceover: string;
  visualType: string;
  visualArchetype: VisualArchetypeName;
  animationType: string;
  visualConfig: Record<string, unknown>;
  visualProps: Record<string, unknown>;
  parameters: Record<string, unknown>;
  props: Record<string, unknown>;
};

const LEGACY_TO_ARCHETYPE: Record<string, VisualArchetypeName> = {
  split_comparison: 'split_comparison',
  comparison_split: 'split_comparison',
  question_card: 'split_comparison',
  interactive_stage: 'interactive_stage',
  '3d_beaker_experiment': 'interactive_stage',
  lab_simulation: 'interactive_stage',
  flow_step: 'interactive_stage',
  dynamic_diagram: 'interactive_stage',
  micro_zoom: 'micro_zoom',
  '3d_particle_zoom': 'micro_zoom',
  particle_zoom: 'micro_zoom',
  macro_reveal: 'micro_zoom',
  concept_card: 'concept_card',
  callout_summary: 'concept_card',
  concept_hero: 'concept_card',
  TemperatureEffect: 'interactive_stage',
  StateComparison: 'split_comparison',
  ParticleMotion3D: 'micro_zoom',
  ConceptCallout: 'concept_card',
};

export function canonicalVisualArchetype(raw: string | undefined, index = 0): VisualArchetypeName {
  const key = String(raw ?? '')
    .toLowerCase()
    .trim()
    .replace(/-/g, '_');
  if (LEGACY_TO_ARCHETYPE[key]) return LEGACY_TO_ARCHETYPE[key];
  if (index === 0) return 'split_comparison';
  if (index === 1) return 'interactive_stage';
  if (index === 2) return 'micro_zoom';
  return 'concept_card';
}

export function canonicalVisualType(raw: string): string {
  return canonicalVisualArchetype(raw, 0);
}

export function sceneDuration(raw: SceneProp | undefined): number {
  const n = Number(raw?.durationSec ?? raw?.duration);
  return Number.isFinite(n) && n > 0 ? n : 8;
}

export function sceneVisualType(raw: SceneProp | undefined, index = 0): string {
  return canonicalVisualArchetype(
    raw?.visualArchetype || raw?.visualType || raw?.visual_type || raw?.animationType,
    index,
  );
}

export function sceneProps(raw: SceneProp | undefined): Record<string, unknown> {
  return {
    ...(raw?.parameters && typeof raw.parameters === 'object' ? raw.parameters : {}),
    ...(raw?.visualProps && typeof raw.visualProps === 'object' ? raw.visualProps : {}),
    ...(raw?.props && typeof raw.props === 'object' ? raw.props : {}),
    ...(raw?.visualConfig && typeof raw.visualConfig === 'object' ? raw.visualConfig : {}),
  };
}

export function normalizeScene(raw: SceneProp | undefined, index = 0): NormalizedScene {
  const duration = sceneDuration(raw);
  const visualArchetype = canonicalVisualArchetype(
    raw?.visualArchetype || raw?.visualType || raw?.visual_type || raw?.animationType,
    index,
  );
  const props = sceneProps(raw);
  const phase = String(raw?.phaseTitle || raw?.phase || '').trim() || `Scene ${index + 1}`;
  const voiceover = String(raw?.voiceoverText || raw?.voiceover || '').trim();
  return {
    sceneId: Number(raw?.sceneId) || index + 1,
    duration,
    durationSec: duration,
    phase: phase.toUpperCase(),
    phaseTitle: phase,
    voiceoverText: voiceover,
    voiceover,
    visualType: visualArchetype,
    visualArchetype,
    animationType: String(raw?.animationType || ''),
    visualConfig: props,
    visualProps: props,
    parameters: props,
    props,
  };
}

export function pickRawScenes(props: GamifiedLessonProps): SceneProp[] {
  if (props.scriptData?.scenes?.length) return props.scriptData.scenes;
  if (props.scenes?.length) return props.scenes;
  return [];
}

export function resolveLessonProps(props: GamifiedLessonProps): GamifiedLessonProps {
  const scenes = pickRawScenes(props).map((scene, i) => normalizeScene(scene, i));
  const totalDurationSeconds =
    Number(props.scriptData?.totalDurationSeconds) ||
    Number(props.totalDurationSeconds) ||
    scenes.reduce((acc, s) => acc + s.duration, 0) ||
    28;
  const topicTitle = props.scriptData?.topicTitle || props.topicTitle;
  const wordTimings = props.scriptData?.wordTimings?.length
    ? props.scriptData.wordTimings
    : props.wordTimings;
  const scriptData: ScriptData = {
    ...(props.scriptData ?? {}),
    topicTitle,
    archetype: props.scriptData?.archetype || props.archetype,
    pedagogicalPattern: props.scriptData?.pedagogicalPattern || props.pedagogicalPattern,
    totalDurationSeconds,
    scenes,
    wordTimings,
  };
  return {
    ...props,
    topicTitle,
    totalDurationSeconds,
    archetype: scriptData.archetype,
    pedagogicalPattern: scriptData.pedagogicalPattern,
    scenes,
    wordTimings: wordTimings ?? [],
    scriptData,
  };
}

export function resolveActiveScene(
  scenes: NormalizedScene[],
  currentTime: number,
): { scene: NormalizedScene; start: number; end: number; index: number } {
  let accumulated = 0;
  for (let i = 0; i < scenes.length; i++) {
    const duration = Math.max(0.5, scenes[i].duration);
    const start = accumulated;
    const end = accumulated + duration;
    if (currentTime >= start && currentTime < end) {
      return { scene: scenes[i], start, end, index: i };
    }
    accumulated = end;
  }
  const last = scenes[scenes.length - 1];
  return {
    scene: last ?? normalizeScene(undefined, 0),
    start: Math.max(0, accumulated - (last?.duration ?? 8)),
    end: accumulated || 8,
    index: Math.max(0, scenes.length - 1),
  };
}
