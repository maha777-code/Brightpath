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
    dialogueTone:
      'Classic cartoon villain vs clever mouse. Tom gloats, sets traps, and panics. Jerry answers by running, never lecturing.',
    mechanics:
      'Jerry chase maze: four labeled mouseholes (A–D). Correct hole = escape and Tom gets bonked. Wrong hole = Jerry is caught.',
    visualComposition:
      'Kitchen / house interior, layered 2D stage, close-up trap gags, wide chase lanes, high-contrast warm lighting.',
    gameScriptNotes:
      'Keep the cinematic script shape (setup, question_loop, correct_outcome, incorrect_outcome, completed). Tom speaks setup; options are Jerry paths.',
  },
  {
    id: 'space_shooter',
    title: 'Retro Arcade Boss Battle',
    subtitle: 'Space shooter showdown',
    description:
      'A pixel-art mothership quizzes the class. Students fire the correct answer-laser to break the boss shield.',
    icon: '🚀',
    accent: '#38BDF8',
    kind: 'both',
    activityType: 'space_shooter',
    dialogueTone:
      'Campy 1980s arcade announcer plus a booming boss. Short radio-chatter lines. High energy, never slang-heavy.',
    mechanics:
      'Four firing lanes (A–D). Correct shot collapses a shield ring and awards XP. Miss drains a life and triggers a boss taunt.',
    visualComposition:
      'Starfield, CRT scanlines, neon HUD, mothership silhouette, projectile streaks, deep-space blues and magentas.',
    gameScriptNotes:
      'Reuse the cinematic scene sequence. Map Tom lines to the boss/announcer and Jerry actions to ship maneuvers (strafe, shield-break, caught-in-tractor-beam).',
  },
  {
    id: 'detective_mystery',
    title: 'Interactive Clue-Solving Story',
    subtitle: 'Classroom mystery case',
    description:
      'A detective boards clues from the textbook. Students pick the next lead to crack the case.',
    icon: '🔍',
    accent: '#A78BFA',
    kind: 'both',
    activityType: 'detective_mystery',
    dialogueTone:
      'Noir-lite and curious, never grim. The detective thinks aloud; a witty assistant offers the four leads.',
    mechanics:
      'Clue board with four leads (A–D). Correct lead reveals the next evidence card. Wrong lead is a red herring and a retry.',
    visualComposition:
      'Rainy window, corkboard, pinned photos, warm desk lamp, parchment cards, tight over-the-shoulder shots.',
    gameScriptNotes:
      'Keep scene_type sequence. Setup is the case briefing. question_loop options are clues. Outcomes are “case cracked” vs “false lead.”',
  },
  {
    id: 'sweetrush_quest',
    title: 'SweetRush Map Quest',
    subtitle: 'Gamified map adventure',
    description:
      'Professor Maya guides a three-beat quest across a story map: challenge, simulation, discovery.',
    icon: '🗺️',
    accent: '#34D399',
    kind: 'both',
    activityType: 'sweetrush_quest',
    dialogueTone:
      'Warm, cinematic teacher-host. Encouraging, precise, and grounded in the textbook. No gimmick voices.',
    mechanics:
      'Map nodes. For activities: four path stones (A–D). For videos: CHALLENGE → SIMULATION → DISCOVERY (8s / 12s / 8s).',
    visualComposition:
      'Illustrated quest map, glowing path, concept cards, split comparisons, lab-stage lighting, jewel-tone accents.',
    gameScriptNotes:
      'Videos must follow SweetRush visualArchetypes. Activities still emit the cinematic JSON so the player can run path choices.',
  },
];

export const DEFAULT_GENERATION_TEMPLATE_ID: GenerationTemplateId = 'tom_and_jerry';

export function isGenerationTemplateId(value: unknown): value is GenerationTemplateId {
  return (
    typeof value === 'string' &&
    (GENERATION_TEMPLATE_IDS as readonly string[]).includes(value)
  );
}

export function getGenerationTemplate(
  id?: string | null,
): GenerationTemplate {
  if (id && isGenerationTemplateId(id)) {
    const found = GENERATION_TEMPLATES.find((t) => t.id === id);
    if (found) return found;
  }
  return GENERATION_TEMPLATES[0];
}

export function templatePromptBlock(id?: string | null): string {
  const t = getGenerationTemplate(id);
  return [
    `Generation template: ${t.id} — ${t.title}`,
    `Dialogue tone: ${t.dialogueTone}`,
    `Game mechanics: ${t.mechanics}`,
    `Visual composition: ${t.visualComposition}`,
    `Script notes: ${t.gameScriptNotes}`,
  ].join('\n');
}
