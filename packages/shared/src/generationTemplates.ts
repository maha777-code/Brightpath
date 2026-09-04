export const GENERATION_TEMPLATE_IDS = [
  'tom_and_jerry',
  'space_shooter',
  'detective_mystery',
  'sweetrush_quest',
] as const;

export type GenerationTemplateId = (typeof GENERATION_TEMPLATE_IDS)[number];

export type GenerationTemplateKind = 'video' | 'activity' | 'both';

export interface GenerationTemplate {
  id: GenerationTemplateId;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  accent: string;
  kind: GenerationTemplateKind;
  activityType: string;
  dialogueTone: string;
  mechanics: string;
  visualComposition: string;
  gameScriptNotes: string;
}

export interface TemplateConfig {
  themeName: string;
  characters: { host: string; runner: string };
  systemPrompt: string;
  animationTriggers: {
    setup: string;
    correctAction: string;
    wrongAction: string;
    correctOutcome: string;
    incorrectOutcome: string;
    completed: string;
  };
  gameMechanics: string;
  choiceLabel: string;
  hostIdle: string;
  hostActive: string;
  hostWin: string;
  hostLose: string;
  runnerIdle: string;
  runnerMove: string;
  runnerWin: string;
  runnerLose: string;
  stageClass: string;
  choiceEmoji: string;
}

export const TEMPLATE_CONFIGS: Record<GenerationTemplateId, TemplateConfig> = {
  tom_and_jerry: {
    themeName: 'Tom & Jerry Cinematic Chase',
    characters: { host: 'Tom', runner: 'Jerry' },
    systemPrompt:
      'Generate a comedic chase dialogue script between Tom (asking questions as traps) and Jerry (running and picking options). Tom is Character 1; Jerry never narrates — his responses are the answer options.',
    animationTriggers: {
      setup: 'tom_sets_trap_setup',
      correctAction: 'jerry_escapes_into_mousehole',
      wrongAction: 'jerry_runs_into_wrong_hole',
      correctOutcome: 'tom_gets_bonked',
      incorrectOutcome: 'jerry_caught_cinematic',
      completed: 'jerry_victory_dance',
    },
    gameMechanics: 'jerry_chase_maze',
    choiceLabel: 'mouseholes',
    hostIdle: '🐱',
    hostActive: '😼',
    hostWin: '😵🐱',
    hostLose: '😼',
    runnerIdle: '🐭',
    runnerMove: '🐭',
    runnerWin: '💨🐭',
    runnerLose: '🙀',
    stageClass: 'tj-stage',
    choiceEmoji: '🕳️',
  },
  space_shooter: {
    themeName: 'Retro Space Arcade',
    characters: { host: 'Alien Boss', runner: 'Space Pilot' },
    systemPrompt:
      'Generate a sci-fi space battle script where an Alien Boss fires question lasers and the Space Pilot maneuvers ships into correct answer warp gates. Alien Boss is Character 1; Space Pilot chooses among warp lanes A–D.',
    animationTriggers: {
      setup: 'laser_fire',
      correctAction: 'ship_warp',
      wrongAction: 'tractor_beam_miss',
      correctOutcome: 'boss_explosion',
      incorrectOutcome: 'pilot_caught_tractor',
      completed: 'warp_victory',
    },
    gameMechanics: 'warp_gate_lanes',
    choiceLabel: 'warp gates',
    hostIdle: '👾',
    hostActive: '🛸',
    hostWin: '💥👾',
    hostLose: '👽',
    runnerIdle: '🚀',
    runnerMove: '🚀',
    runnerWin: '✨🚀',
    runnerLose: '☄️',
    stageClass: 'space-stage',
    choiceEmoji: '🌀',
  },
  detective_mystery: {
    themeName: 'Detective Clue Quest',
    characters: { host: 'Detective', runner: 'Assistant' },
    systemPrompt:
      'Generate a noir mystery dialogue where the Detective inspects evidence questions and the Assistant offers four leads. Detective is Character 1; Assistant responses are the clue options A–D.',
    animationTriggers: {
      setup: 'magnifying_glass',
      correctAction: 'clue_unlocked',
      wrongAction: 'red_herring',
      correctOutcome: 'case_closed',
      incorrectOutcome: 'false_lead',
      completed: 'mystery_solved',
    },
    gameMechanics: 'clue_board_leads',
    choiceLabel: 'leads',
    hostIdle: '🕵️',
    hostActive: '🔍',
    hostWin: '😮🕵️',
    hostLose: '🕵️',
    runnerIdle: '🗂️',
    runnerMove: '🏃',
    runnerWin: '✅',
    runnerLose: '❌',
    stageClass: 'detective-stage',
    choiceEmoji: '📌',
  },
  sweetrush_quest: {
    themeName: 'SweetRush Map Quest',
    characters: { host: 'Professor Maya', runner: 'Explorer' },
    systemPrompt:
      'Generate a warm map-quest script where Professor Maya poses textbook challenges and the Explorer chooses among glowing path stones A–D. Follow SweetRush challenge → simulation → discovery energy.',
    animationTriggers: {
      setup: 'map_unfurl',
      correctAction: 'path_stone_correct',
      wrongAction: 'path_stone_wrong',
      correctOutcome: 'node_unlocked',
      incorrectOutcome: 'path_blocked',
      completed: 'quest_complete',
    },
    gameMechanics: 'map_path_stones',
    choiceLabel: 'path stones',
    hostIdle: '👩‍🏫',
    hostActive: '✨',
    hostWin: '🎉',
    hostLose: '🤔',
    runnerIdle: '🧭',
    runnerMove: '🏃',
    runnerWin: '🏆',
    runnerLose: '🚧',
    stageClass: 'quest-stage',
    choiceEmoji: '🪨',
  },
};

export const GENERATION_TEMPLATES: GenerationTemplate[] = [
  {
    id: 'tom_and_jerry',
    title: 'Cinematic Tom & Jerry Chase',
    subtitle: 'Cartoon chase game / dialogue',
    description:
      'Tom sets traps and Jerry picks labeled mouseholes. Best for kinetic Q&A with slapstick outcomes.',
    icon: '🐱',
    accent: '#FBBF24',
    kind: 'both',
    activityType: 'tom_jerry_cinematic',
    dialogueTone: TEMPLATE_CONFIGS.tom_and_jerry.systemPrompt,
    mechanics: TEMPLATE_CONFIGS.tom_and_jerry.gameMechanics,
    visualComposition:
      'Kitchen / house interior, layered 2D stage, close-up trap gags, wide chase lanes, high-contrast warm lighting.',
    gameScriptNotes:
      'Keep cinematic scene_type sequence. Host speaks setup; options are runner paths.',
  },
  {
    id: 'space_shooter',
    title: 'Retro Arcade Boss Battle',
    subtitle: 'Space shooter showdown',
    description:
      'A pixel-art mothership quizzes the class. Students fire the correct answer-laser to break the boss shield.',
    icon: '🚀',
    accent: '#38BDF8',
    kind: 'activity',
    activityType: 'space_shooter',
    dialogueTone: TEMPLATE_CONFIGS.space_shooter.systemPrompt,
    mechanics: TEMPLATE_CONFIGS.space_shooter.gameMechanics,
    visualComposition:
      'Starfield, CRT scanlines, neon HUD, mothership silhouette, projectile streaks, deep-space blues and magentas.',
    gameScriptNotes:
      'Keep cinematic scene_type sequence. Map host lines to Alien Boss and runner actions to ship maneuvers.',
  },
  {
    id: 'detective_mystery',
    title: 'Interactive Clue-Solving Story',
    subtitle: 'Classroom mystery case',
    description:
      'A detective boards clues from the textbook. Students pick the next lead to crack the case.',
    icon: '🔍',
    accent: '#A78BFA',
    kind: 'activity',
    activityType: 'detective_mystery',
    dialogueTone: TEMPLATE_CONFIGS.detective_mystery.systemPrompt,
    mechanics: TEMPLATE_CONFIGS.detective_mystery.gameMechanics,
    visualComposition:
      'Rainy window, corkboard, pinned photos, warm desk lamp, parchment cards, tight over-the-shoulder shots.',
    gameScriptNotes:
      'Keep scene_type sequence. Setup is the case briefing. Options are clues. Outcomes are case cracked vs false lead.',
  },
  {
    id: 'sweetrush_quest',
    title: 'SweetRush Map Quest',
    subtitle: 'Remotion cinematic explainer',
    description:
      'Professor Maya guides a three-beat Remotion quest: challenge, simulation, discovery — ideal for Video Explainers.',
    icon: '🗺️',
    accent: '#34D399',
    kind: 'video',
    activityType: 'sweetrush_quest',
    dialogueTone: TEMPLATE_CONFIGS.sweetrush_quest.systemPrompt,
    mechanics: TEMPLATE_CONFIGS.sweetrush_quest.gameMechanics,
    visualComposition:
      'Illustrated quest map, glowing path, concept cards, split comparisons, lab-stage lighting, jewel-tone accents.',
    gameScriptNotes:
      'Videos follow SweetRush visualArchetypes. Activities still emit cinematic JSON for path choices.',
  },
];

export const DEFAULT_GENERATION_TEMPLATE_ID: GenerationTemplateId = 'tom_and_jerry';

export function templatesForGenerationType(generationType: 'video' | 'activity'): GenerationTemplate[] {
  const preferred = GENERATION_TEMPLATES.filter(
    (t) => t.kind === generationType || t.kind === 'both',
  );
  return preferred.length > 0 ? preferred : GENERATION_TEMPLATES;
}

export function isGenerationTemplateId(value: unknown): value is GenerationTemplateId {
  return (
    typeof value === 'string' &&
    (GENERATION_TEMPLATE_IDS as readonly string[]).includes(value)
  );
}

export function getGenerationTemplate(id?: string | null): GenerationTemplate {
  if (id && isGenerationTemplateId(id)) {
    const found = GENERATION_TEMPLATES.find((t) => t.id === id);
    if (found) return found;
  }
  return GENERATION_TEMPLATES[0];
}

export function getTemplateConfig(id?: string | null): TemplateConfig {
  const tid = isGenerationTemplateId(id) ? id : DEFAULT_GENERATION_TEMPLATE_ID;
  return TEMPLATE_CONFIGS[tid];
}

export function templateIdFromActivityType(type?: string | null): GenerationTemplateId {
  if (!type) return DEFAULT_GENERATION_TEMPLATE_ID;
  const byType = GENERATION_TEMPLATES.find((t) => t.activityType === type);
  if (byType) return byType.id;
  if (isGenerationTemplateId(type)) return type;
  if (type.includes('space')) return 'space_shooter';
  if (type.includes('detective')) return 'detective_mystery';
  if (type.includes('sweet')) return 'sweetrush_quest';
  return DEFAULT_GENERATION_TEMPLATE_ID;
}

export function templatePromptBlock(id?: string | null): string {
  const t = getGenerationTemplate(id);
  const cfg = getTemplateConfig(t.id);
  return [
    `Generation templateId: ${t.id}`,
    `Theme: ${cfg.themeName}`,
    `Host character (Character 1): ${cfg.characters.host}`,
    `Runner character (Character 2 / options): ${cfg.characters.runner}`,
    `System directive: ${cfg.systemPrompt}`,
    `Dialogue tone: ${t.dialogueTone}`,
    `Game mechanics key: ${cfg.gameMechanics}`,
    `Mechanics detail: ${t.mechanics}`,
    `Visual composition: ${t.visualComposition}`,
    `Animation triggers: setup=${cfg.animationTriggers.setup}, correct=${cfg.animationTriggers.correctOutcome}, incorrect=${cfg.animationTriggers.incorrectOutcome}`,
    `Script notes: ${t.gameScriptNotes}`,
    `CRITICAL: Do NOT use Tom & Jerry names, traps, or mouseholes unless templateId is tom_and_jerry.`,
  ].join('\n');
}
