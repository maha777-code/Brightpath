/** Normalize lesson-board script JSON for the animated explainer. */

export type VisualArchetypeName =
  | 'video_overview'
  | 'cinematic_explainer'
  | 'science_explainer'
  | 'lesson_board'
  | 'pixel_game_hud'
  | 'split_comparison'
  | 'interactive_stage'
  | 'micro_zoom'
  | 'concept_card'
  | 'scatter_plot'
  | 'regression_fit'
  | 'math_overlay'
  | 'matrix_board';

export type SceneProp = {
  sceneId: number;
  duration: number;
  durationSec?: number;
  voiceoverText?: string;
  voiceover?: string;
  voiceoverNarration?: string;
  voiceover_narration?: string;
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
  teacherGesture?: string;
  cameraMotion?: string;
  level?: string;
  timestampRange?: [number, number];
  timestamp_range?: [number, number];
  gameplayVisual?: Record<string, unknown>;
  gameplay_visual?: Record<string, unknown>;
  lesson?: import('@brightpath/shared').LessonSlide;
  clipUrl?: string;
};

export type ScriptData = {
  topicTitle?: string;
  archetype?: string;
  pedagogicalPattern?: string;
  totalDurationSeconds?: number;
  scenes?: SceneProp[];
  wordTimings?: { word: string; start: number; end: number }[];
  teacherName?: string;
  audience?: string;
  architecture?: string;
};

export type GamifiedLessonProps = {
  topicId: string;
  topicTitle: string;
  textbookTitle?: string;
  chapterTitle?: string;
  totalDurationSeconds: number;
  archetype?: string;
  pedagogicalPattern?: string;
  scenes: SceneProp[];
  wordTimings: { word: string; start: number; end: number }[];
  audioUrl?: string;
  scriptData?: ScriptData;
  teacherName?: string;
  audience?: string;
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
  teacherGesture: string;
  cameraMotion: string;
  lesson?: import('@brightpath/shared').LessonSlide;
  clipUrl?: string;
};

const LEGACY_TO_ARCHETYPE: Record<string, VisualArchetypeName> = {
  video_overview: 'video_overview',
  videooverview: 'video_overview',
  VideoOverview: 'video_overview',
  cinematic_explainer: 'video_overview',
  cinematicexplainer: 'video_overview',
  CinematicExplainer: 'video_overview',
  science_explainer: 'video_overview',
  scienceexplainer: 'video_overview',
  ScienceExplainer: 'video_overview',
  cinematic_motion: 'video_overview',
  cinematic: 'video_overview',
  lesson_board: 'video_overview',
  lessonboard: 'video_overview',
  LessonBoard: 'video_overview',
  pixel_game_hud: 'video_overview',
  pixelquest: 'video_overview',
  PixelQuest: 'video_overview',
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
  scatter_plot: 'scatter_plot',
  scatter: 'scatter_plot',
  scatterplot: 'scatter_plot',
  regression_fit: 'regression_fit',
  regression: 'regression_fit',
  least_squares: 'regression_fit',
  math_overlay: 'math_overlay',
  latex: 'math_overlay',
  equation: 'math_overlay',
  formula: 'math_overlay',
  matrix_board: 'matrix_board',
  matrix: 'matrix_board',
  design_matrix: 'matrix_board',
  TemperatureEffect: 'interactive_stage',
  StateComparison: 'split_comparison',
  ParticleMotion3D: 'micro_zoom',
  ConceptCallout: 'concept_card',
  ScatterRegression: 'scatter_plot',
  MatrixBoard: 'matrix_board',
  MathOverlay: 'math_overlay',
};

export function canonicalVisualArchetype(raw: string | undefined, _index = 0): VisualArchetypeName {
  const key = String(raw ?? '')
    .toLowerCase()
    .trim()
    .replace(/-/g, '_');
  if (LEGACY_TO_ARCHETYPE[key]) return LEGACY_TO_ARCHETYPE[key];
  return 'video_overview';
}

export function canonicalVisualType(raw: string): string {
  return canonicalVisualArchetype(raw, 0);
}

export function sceneDuration(raw: SceneProp | undefined): number {
  const n = Number(raw?.durationSec ?? raw?.duration);
  return Number.isFinite(n) && n > 0 ? n : 45;
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
    raw?.visualArchetype || raw?.visualType || raw?.visual_type || raw?.animationType || 'video_overview',
    index,
  );
  const props = sceneProps(raw);
  const lesson = (raw?.lesson || props.lesson) as NormalizedScene['lesson'];
  const phase = String(raw?.phaseTitle || raw?.phase || props.headline || lesson?.heading || `Scene ${index + 1}`);
  const voiceover = String(
    raw?.voiceoverText || raw?.voiceover || raw?.voiceoverNarration || raw?.voiceover_narration || '',
  ).trim();
  const teacherGesture =
    String(raw?.teacherGesture || '').trim() || (index === 0 ? 'questioning' : 'demonstrating');
  const cameraMotion = String(raw?.cameraMotion || '').trim() || 'push_in_close';
  return {
    sceneId: Number(raw?.sceneId) || index + 1,
    duration,
    durationSec: duration,
    phase,
    phaseTitle: phase,
    voiceoverText: voiceover,
    voiceover,
    visualType: 'video_overview',
    visualArchetype,
    animationType: String(raw?.animationType || 'VideoOverview'),
    visualConfig: { ...props, lesson },
    visualProps: props,
    parameters: props,
    props,
    teacherGesture,
    cameraMotion,
    lesson,
    clipUrl: String(raw?.clipUrl || props.clipUrl || '').trim() || undefined,
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
    240;
  const topicTitle = props.scriptData?.topicTitle || props.topicTitle;
  const teacherName = props.scriptData?.teacherName || props.teacherName || 'Professor Maya';
  const wordTimings = props.scriptData?.wordTimings?.length
    ? props.scriptData.wordTimings
    : props.wordTimings;
  const scriptData: ScriptData = {
    ...(props.scriptData ?? {}),
    topicTitle,
    teacherName,
    archetype: props.scriptData?.archetype || props.archetype,
    pedagogicalPattern: props.scriptData?.pedagogicalPattern || props.pedagogicalPattern,
    architecture: props.scriptData?.architecture || 'video_overview',
    audience: props.scriptData?.audience,
    totalDurationSeconds,
    scenes,
    wordTimings,
  };
  return {
    ...props,
    topicTitle,
    teacherName,
    audience: scriptData.audience || props.audience,
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
