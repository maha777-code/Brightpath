import { escapeRoomToPlayableHtml } from './escapeRoomHtml.js';

export const GAMIFIED_ACTIVITY_KINDS = [
  'escape_room',
  'branching_quest',
  'skill_tree',
] as const;

export type GamifiedActivityKind = (typeof GAMIFIED_ACTIVITY_KINDS)[number];

export interface GamifiedActivityOption {
  id: GamifiedActivityKind;
  title: string;
  subtitle: string;
  description: string;
  exportHint: string;
}

export const GAMIFIED_ACTIVITY_OPTIONS: GamifiedActivityOption[] = [
  {
    id: 'escape_room',
    title: 'Digital Escape Room',
    subtitle: 'Playable HTML / Google Sites',
    description:
      'A 4-stage lockout students play in the browser: start mission, countdown timer, instant feedback, and a victory screen.',
    exportHint: 'single-file HTML',
  },
  {
    id: 'branching_quest',
    title: 'Choose Your Own Adventure',
    subtitle: 'Google Docs / Slides export',
    description:
      'Students take a role, make 3 scored decisions, get immediate feedback, and finish with a scorecard.',
    exportHint: 'Branching Google Doc or Slides',
  },
  {
    id: 'skill_tree',
    title: 'XP & Skill-Tree Challenge',
    subtitle: 'Choice board / practice sets',
    description:
      'A 3-tier choice board with XP, unlock rules, badges, and a student tracking key.',
    exportHint: 'Classroom choice board',
  },
];

export interface GamifiedActivityInsights {
  keyTerms: string[];
  learningObjectives: string[];
  misconceptions: string[];
}

export interface EscapeRoomStage {
  stage: 1 | 2 | 3 | 4;
  title: string;
  kind: 'vocabulary' | 'sequence' | 'data' | 'mastery';
  puzzle: string;
  hiddenClues: string[];
  lockCode: string;
  validationNote: string;
}

export interface EscapeVocabPair {
  term: string;
  definition: string;
}

export interface EscapeSequenceCard {
  id: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface EscapeDataField {
  id: 'X' | 'Y' | 'Z';
  label: string;
  answer: string;
}

export interface EscapeMasteryOption {
  id: string;
  text: string;
  correct: boolean;
}

export interface EscapeRoomPlayable {
  timerMinutes: number;
  missionName: string;
  vocabulary: {
    prompt: string;
    pairs: EscapeVocabPair[];
  };
  sequence: {
    prompt: string;
    cards: EscapeSequenceCard[];
    correctOrder: Array<'A' | 'B' | 'C' | 'D'>;
  };
  data: {
    scenario: string;
    table: { headers: string[]; rows: string[][] };
    fields: EscapeDataField[];
  };
  mastery: {
    prompt: string;
    flawedClaim: string;
    options: EscapeMasteryOption[];
  };
}

export interface EscapeRoomDocument {
  kind: 'escape_room';
  title: string;
  theme: string;
  subject: string;
  gradeLabel: string;
  storyIntro: string;
  gameRules: string[];
  stages: EscapeRoomStage[];
  playable: EscapeRoomPlayable;
  answerKey: { stage: number; code: string; rationale: string }[];
  formsBranchingNotes: string[];
  extensionActivity: { title: string; instructions: string };
}

export interface QuestChoice {
  id: 'A' | 'B' | 'C';
  label: string;
  text: string;
  points: 100 | 50 | 0;
  outcome: string;
  feedback: string;
}

export interface QuestDecision {
  id: number;
  title: string;
  scene: string;
  choices: QuestChoice[];
}

export interface BranchingQuestDocument {
  kind: 'branching_quest';
  title: string;
  subject: string;
  gradeLabel: string;
  persona: string;
  personaBrief: string;
  decisions: QuestDecision[];
  scorecard: {
    title: string;
    bands: { min: number; max: number; label: string; meaning: string }[];
  };
}

export interface SkillTask {
  id: string;
  title: string;
  description: string;
  xp: number;
}

export interface SkillTreeDocument {
  kind: 'skill_tree';
  title: string;
  subject: string;
  duration: string;
  unlockRule: string;
  targetXp: number;
  tiers: { id: 1 | 2 | 3; name: string; xpEach: number; tasks: SkillTask[] }[];
  badges: { name: string; description: string; rubric: string }[];
  trackingKey: string[];
}

export type GamifiedActivityDocument =
  | EscapeRoomDocument
  | BranchingQuestDocument
  | SkillTreeDocument;

export interface GamifiedActivityPayload {
  kind: GamifiedActivityKind;
  topic: string;
  gradeLevel: string;
  subject?: string;
  duration?: string;
  attachments?: string[];
  attachedDocumentContext?: string;
  imageFiles?: string[];
}

export interface GamifiedActivityResponse {
  kind: GamifiedActivityKind;
  insights: GamifiedActivityInsights;
  document: GamifiedActivityDocument;
  markdown: string;
  html?: string;
}

export function isGamifiedActivityKind(value: unknown): value is GamifiedActivityKind {
  return value === 'escape_room' || value === 'branching_quest' || value === 'skill_tree';
}

export function getGamifiedActivityOption(kind: GamifiedActivityKind): GamifiedActivityOption {
  return GAMIFIED_ACTIVITY_OPTIONS.find((item) => item.id === kind) ?? GAMIFIED_ACTIVITY_OPTIONS[0];
}

export interface GamifiedLessonContext {
  topic: string;
  gradeLevel: string;
  subject: string;
  duration?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function asStringList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const next = value.map((item) => asString(item)).filter(Boolean);
  return next.length > 0 ? next : fallback;
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clampCode(value: string, fallback: string, max = 12): string {
  const cleaned = value.replace(/\s+/g, '').slice(0, max);
  return cleaned || fallback;
}

export function fallbackInsights(ctx: GamifiedLessonContext): GamifiedActivityInsights {
  return {
    keyTerms: [`${ctx.topic} core idea`, 'Required condition', 'Observable result'],
    learningObjectives: [
      `Define the central idea of ${ctx.topic}`,
      `Apply ${ctx.topic} to a classroom or real-world case`,
      `Spot a common misconception about ${ctx.topic}`,
    ],
    misconceptions: [
      `${ctx.topic} is optional flavor instead of the mechanism`,
      'One surprising example overwrites the unit model',
    ],
  };
}

function isBioEnergyTopic(topic: string): boolean {
  return /photo\s*synth|cellular\s*resp|chloro|mitochond/i.test(topic);
}

function playableLockCodes(playable: EscapeRoomPlayable): [string, string, string, string] {
  const vocab = playable.vocabulary.pairs.map((pair) => pair.term.replace(/[^A-Za-z]/g, '').charAt(0).toUpperCase()).join('');
  const sequence = playable.sequence.correctOrder.join('');
  const data = playable.data.fields.map((field) => String(field.answer).trim()).join('');
  const mastery = playable.mastery.options.find((option) => option.correct)?.id ?? 'A';
  return [vocab || 'LOCK', sequence || 'BDCA', data || '620', mastery];
}

export function fallbackPlayable(ctx: GamifiedLessonContext): EscapeRoomPlayable {
  if (isBioEnergyTopic(ctx.topic)) {
    return {
      timerMinutes: 30,
      missionName: 'Project Green Horizon',
      vocabulary: {
        prompt: 'Match each station definition to the correct biological term. All four must lock in before the keyword will form.',
        pairs: [
          { term: 'Chloroplast', definition: 'The organelle that captures light energy to run photosynthesis.' },
          { term: 'ATP', definition: 'The usable energy molecule cells make during cellular respiration.' },
          { term: 'Glucose', definition: 'The sugar produced by photosynthesis and later broken down for energy.' },
          { term: 'Mitochondria', definition: 'The organelle where cellular respiration releases ATP, CO₂, and water.' },
        ],
      },
      sequence: {
        prompt: 'Restore the bio-dome energy cycle. Place the process cards in the only order that keeps oxygen and ATP flowing (B → D → C → A).',
        cards: [
          { id: 'A', text: 'Mitochondria convert glucose and oxygen into ATP, carbon dioxide, and water.' },
          { id: 'B', text: 'Chloroplasts absorb light energy, water, and carbon dioxide.' },
          { id: 'C', text: 'Cells take in the glucose and oxygen produced by the plants.' },
          { id: 'D', text: 'Photosynthesis releases glucose and oxygen as products.' },
        ],
        correctOrder: ['B', 'D', 'C', 'A'],
      },
      data: {
        scenario:
          'Elodea chambers were logged for 1 hour. Use the table to find X, Y, and Z. In the light, photosynthesis output exceeds respiration. In the dark, photosynthesis stops but respiration continues.',
        table: {
          headers: ['Chamber', 'Light', 'Organism', 'O₂ change (units)', 'CO₂ change (units)'],
          rows: [
            ['A', 'High', 'Elodea', '+6', '−6'],
            ['B', 'Dark', 'Elodea', '−2', '+2'],
            ['C', 'High', 'None (control)', '0', '0'],
          ],
        },
        fields: [
          { id: 'X', label: 'X = O₂ produced in Chamber A (high light)', answer: '6' },
          { id: 'Y', label: 'Y = CO₂ released in Chamber B (dark, respiration only)', answer: '2' },
          { id: 'Z', label: 'Z = net gas change in empty Chamber C', answer: '0' },
        ],
      },
      mastery: {
        prompt: 'The station AI posted a corrupted protocol. Choose the scientifically correct repair.',
        flawedClaim:
          'To save energy, keep every plant in permanent darkness. Plants only perform photosynthesis and never perform cellular respiration.',
        options: [
          {
            id: 'A',
            text: 'Reject it. Plants photosynthesize in light and respire day and night. Darkness stops food-making, not ATP production.',
            correct: true,
          },
          {
            id: 'B',
            text: 'Accept it. Plants only photosynthesize, so darkness is a safe energy-saving mode.',
            correct: false,
          },
          {
            id: 'C',
            text: 'Accept it. Cellular respiration is the same as breathing, so plants do not do it.',
            correct: false,
          },
          {
            id: 'D',
            text: 'Rewrite it to say darkness increases photosynthesis because plants rest and store extra energy.',
            correct: false,
          },
        ],
      },
    };
  }

  const topic = ctx.topic;
  return {
    timerMinutes: 30,
    missionName: `${topic} Lockout`,
    vocabulary: {
      prompt: `Match each definition to the correct ${topic} term.`,
      pairs: [
        { term: 'Core idea', definition: `The central mechanism of ${topic}.` },
        { term: 'Condition', definition: `What must be true before ${topic} can start.` },
        { term: 'Evidence', definition: `An observable result that ${topic} occurred.` },
        { term: 'Limit', definition: `A constraint or misconception to watch for in ${topic}.` },
      ],
    },
    sequence: {
      prompt: `Order the ${topic} process so the later steps only happen after the required earlier ones (B → D → C → A).`,
      cards: [
        { id: 'A', text: `The observable result of ${topic} is recorded.` },
        { id: 'B', text: `The required starting condition for ${topic} is in place.` },
        { id: 'C', text: `The mechanism of ${topic} is applied to the new situation.` },
        { id: 'D', text: `The key transformation in ${topic} begins.` },
      ],
      correctOrder: ['B', 'D', 'C', 'A'],
    },
    data: {
      scenario: `A three-trial table from the ${topic} notes is missing three values. Read or calculate X, Y, and Z.`,
      table: {
        headers: ['Trial', 'Input', 'Measured result'],
        rows: [
          ['1', 'High', '6'],
          ['2', 'Low', '2'],
          ['3', 'Control', '0'],
        ],
      },
      fields: [
        { id: 'X', label: 'X = high-input result', answer: '6' },
        { id: 'Y', label: 'Y = low-input result', answer: '2' },
        { id: 'Z', label: 'Z = control result', answer: '0' },
      ],
    },
    mastery: {
      prompt: `A report about ${topic} contains one flawed claim. Choose the correction.`,
      flawedClaim: `${topic} is optional flavor instead of the mechanism, so any surprising example can overwrite the unit model.`,
      options: [
        {
          id: 'A',
          text: `Keep the unit model. A surprising example must still satisfy the required conditions of ${topic}.`,
          correct: true,
        },
        {
          id: 'B',
          text: `Throw out the model because one surprising number appeared.`,
          correct: false,
        },
        {
          id: 'C',
          text: `Treat ${topic} as optional flavor and guess from intuition.`,
          correct: false,
        },
        {
          id: 'D',
          text: `Recommend the opposite of the unit rule because it feels efficient.`,
          correct: false,
        },
      ],
    },
  };
}

export function fallbackEscapeRoom(ctx: GamifiedLessonContext): EscapeRoomDocument {
  const topic = ctx.topic;
  const playable = fallbackPlayable(ctx);
  const [keyword, sequence, dataCode, vault] = playableLockCodes(playable);
  const bio = isBioEnergyTopic(topic);
  return {
    kind: 'escape_room',
    title: bio ? 'Escape Bio-Dome Alpha: Project Green Horizon' : `${topic} Lockout`,
    theme: bio ? 'Project Green Horizon' : `The ${topic} Lockout`,
    subject: ctx.subject,
    gradeLabel: ctx.gradeLevel,
    storyIntro: bio
      ? 'WARNING. Emergency at Bio-Dome Alpha. A power surge sealed the life-support locks. Oxygen is falling and the atmospheric scrubbers are offline. As chief station biologist, you must clear four overrides with photosynthesis and cellular respiration before the air runs out.'
      : `The classroom lab just sealed. Only a team that understands ${topic} can restore power before the period ends. Four locks stand between you and the vault.`,
    gameRules: [
      'Work Stage 1 to Stage 4 in order. Later locks stay closed until the previous code is accepted.',
      'Use only the attached unit material — no outside spoilers.',
      'Wrong answers shake the panel and reveal a hint. Correct answers flash green and unlock the next room.',
      'The mission clock starts when you press Start Mission.',
    ],
    stages: [
      {
        stage: 1,
        title: 'Vocabulary Match',
        kind: 'vocabulary',
        puzzle: `Match four key terms from ${topic} to their definitions. The first letter of each correctly matched term, in definition order, spells the 4-letter keyword lock.`,
        hiddenClues: [
          `The first definition names the core idea of ${topic}.`,
          'Ignore decoy terms from a neighboring unit.',
        ],
        lockCode: keyword,
        validationNote: `Accept ${keyword} only. Correct answers go to Stage 2; anything else returns to Stage 1.`,
      },
      {
        stage: 2,
        title: 'Sequence Puzzle',
        kind: 'sequence',
        puzzle: `Arrange the main steps of ${topic} in the correct order. The step numbers you place in positions 1–4 become the numerical lock.`,
        hiddenClues: [
          `Start with the condition that must be true before ${topic} can begin.`,
          'The last step is the observable result, not the first cause.',
        ],
        lockCode: sequence,
        validationNote: `Accept ${sequence}. Branch successful teams to the data station.`,
      },
      {
        stage: 3,
        title: 'Data Analysis',
        kind: 'data',
        puzzle: `A short table or graph from the ${topic} notes is missing one value. Calculate or read the missing result for a 3-digit combination.`,
        hiddenClues: [
          'Units matter: convert before combining values.',
          'The middle digit is the ones place of the most important measured quantity.',
        ],
        lockCode: dataCode,
        validationNote: `Accept ${dataCode} with response validation so only this code opens Stage 4.`,
      },
      {
        stage: 4,
        title: 'Mastery Challenge',
        kind: 'mastery',
        puzzle: `A report about ${topic} contains one flawed claim. Identify the error and rewrite the claim. The first two letters of the corrected keyword plus the Stage 3 digits form the vault key.`,
        hiddenClues: [
          'The flaw is a common misconception from this unit, not a spelling typo.',
          'The corrected claim must be something a classmate could check in the source material.',
        ],
        lockCode: vault,
        validationNote: `Accept ${vault} as the final Forms section jump.`,
      },
    ],
    playable,
    answerKey: [
      { stage: 1, code: keyword, rationale: `First letters of the four required ${topic} terms.` },
      { stage: 2, code: sequence, rationale: `Correct process order for ${topic}.` },
      { stage: 3, code: dataCode, rationale: 'Missing graph or table value after unit conversion.' },
      { stage: 4, code: vault, rationale: 'Corrected misconception keyword plus the Stage 3 digits.' },
    ],
    formsBranchingNotes: [
      'Create 5 sections: Intro, Stage 1, Stage 2, Stage 3, Stage 4 / Vault.',
      'Each stage is a short-answer question with response validation = exact lock code.',
      'Go to section based on answer: correct code → next stage; anything else → same stage with a hint.',
      'Keep the teacher answer key on a hidden last section or a separate Docs file.',
    ],
    extensionActivity: {
      title: 'Design the fifth lock',
      instructions: `Students who escape early invent one extra lock for a peer team. It must use a new representation of ${topic} and include a 4-character code plus a teacher-facing solution.`,
    },
  };
}

export function fallbackBranchingQuest(ctx: GamifiedLessonContext): BranchingQuestDocument {
  const topic = ctx.topic;
  return {
    kind: 'branching_quest',
    title: `${topic} Decision Quest`,
    subject: ctx.subject,
    gradeLabel: ctx.gradeLevel,
    persona: `Lead investigator for ${topic}`,
    personaBrief: `You are trusted to apply ${topic} when a real classroom or community problem appears. Each choice should show whether you understand the concept.`,
    decisions: [1, 2, 3].map((id) => ({
      id,
      title: id === 1 ? 'First signal' : id === 2 ? 'Pressure test' : 'Final recommendation',
      scene:
        id === 1
          ? `A situation involving ${topic} appears. Choose the first move that matches the unit principle.`
          : id === 2
            ? `New data conflicts with a classmate’s shortcut explanation of ${topic}. What do you advise?`
            : `Brief the class on what to do next using ${topic}.`,
      choices: [
        {
          id: 'A',
          label: 'Ideal',
          text:
            id === 1
              ? `Use the defining rule of ${topic} and collect the evidence the source says matters first.`
              : id === 2
                ? `Compare the new data to the model of ${topic} and keep only the claim the evidence supports.`
                : `State the principle, the evidence, and one testable next action grounded in ${topic}.`,
          points: 100,
          outcome: 'The team stays on solid ground.',
          feedback: `This matches the conceptually correct move for ${topic}.`,
        },
        {
          id: 'B',
          label: 'Partial',
          text:
            id === 1
              ? `Notice ${topic} but skip one required condition and jump ahead.`
              : id === 2
                ? 'Keep both explanations so nobody feels wrong.'
                : 'Give a catchy slogan without naming the limiting condition.',
          points: 50,
          outcome: 'You gain time, then have to backtrack.',
          feedback: `Related, but ${topic} only works when the required condition is checked.`,
        },
        {
          id: 'C',
          label: 'Misconception',
          text:
            id === 1
              ? `Treat ${topic} as optional flavor and guess from intuition.`
              : id === 2
                ? 'Throw out the unit model because one surprising number appeared.'
                : 'Recommend the opposite of the unit rule because it “feels efficient.”',
          points: 0,
          outcome: 'The plan fails and you must retry this decision.',
          feedback: `This is a common misconception about ${topic}.`,
        },
      ],
    })),
    scorecard: {
      title: `${topic} Achievement Scorecard`,
      bands: [
        { min: 250, max: 300, label: 'Master advisor', meaning: 'All three decisions used the accurate model.' },
        { min: 150, max: 249, label: 'Developing strategist', meaning: 'Some choices were only partly aligned.' },
        { min: 0, max: 149, label: 'Retry the briefing', meaning: 'Misconceptions drove the story. Replay failed nodes.' },
      ],
    },
  };
}

export function fallbackSkillTree(ctx: GamifiedLessonContext): SkillTreeDocument {
  const topic = ctx.topic;
  return {
    kind: 'skill_tree',
    title: `${topic} Skill Tree`,
    subject: ctx.subject,
    duration: ctx.duration || '1 week review unit',
    unlockRule: 'Earn 500 XP to complete the quest. At least one completed task must be Tier 2 or Tier 3.',
    targetXp: 500,
    tiers: [
      {
        id: 1,
        name: 'Apprentice Tasks',
        xpEach: 100,
        tasks: [
          { id: 'A1', title: 'Recall the core terms', description: `Define the 6 essential terms for ${topic} in your own words.`, xp: 100 },
          { id: 'A2', title: 'Formula / fact flash', description: `Identify the key rule that unlocks ${topic} and give one example.`, xp: 100 },
          { id: 'A3', title: 'Spot the impostor', description: `Circle the statement that does not belong in a correct explanation of ${topic}.`, xp: 100 },
        ],
      },
      {
        id: 2,
        name: 'Journeyman Tasks',
        xpEach: 250,
        tasks: [
          { id: 'J1', title: 'Multi-step problem', description: `Solve a multi-step problem that requires more than one idea from ${topic}.`, xp: 250 },
          { id: 'J2', title: 'Proof or justification', description: `Write a short evidence paragraph that a skeptic would accept for ${topic}.`, xp: 250 },
          { id: 'J3', title: 'Error analysis', description: `A sample student solution about ${topic} is flawed. Find the break and repair it.`, xp: 250 },
        ],
      },
      {
        id: 3,
        name: 'Master Tasks',
        xpEach: 500,
        tasks: [
          { id: 'M1', title: 'Real-world design', description: `Design a product, experiment, or civic action that only works if ${topic} is applied correctly.`, xp: 500 },
          { id: 'M2', title: 'Peer-teaching video', description: `Record a 90-second explainer teaching ${topic} to a younger student, with one check-for-understanding.`, xp: 500 },
          { id: 'M3', title: 'Transfer challenge', description: `Take ${topic} into a new context and defend why the same principle still holds.`, xp: 500 },
        ],
      },
    ],
    badges: [
      { name: `${topic} Scout`, description: 'Fluent recall of the unit language.', rubric: 'Earn at least 200 XP from Tier 1 with accurate definitions.' },
      { name: `${topic} Architect`, description: 'Can connect steps, proofs, or data.', rubric: 'Complete one Tier 2 task with a correct multi-step justification.' },
      { name: `${topic} Master`, description: 'Can teach or transfer the idea.', rubric: 'Reach 500 XP including one Tier 3 task a peer could follow.' },
    ],
    trackingKey: [
      'Write the task ID and XP in your tracker as soon as a task is approved.',
      'Running total must reach 500 XP.',
      'At least one Tier 2 (250 XP) or Tier 3 (500 XP) task is required.',
      'A task can be revised once if the first attempt misses the rubric.',
    ],
  };
}

export function fallbackGamifiedDocument(
  kind: GamifiedActivityKind,
  ctx: GamifiedLessonContext,
): GamifiedActivityDocument {
  if (kind === 'branching_quest') return fallbackBranchingQuest(ctx);
  if (kind === 'skill_tree') return fallbackSkillTree(ctx);
  return fallbackEscapeRoom(ctx);
}

function parseInsights(raw: unknown, ctx: GamifiedLessonContext): GamifiedActivityInsights {
  const rec = asRecord(raw) ?? {};
  const fallback = fallbackInsights(ctx);
  return {
    keyTerms: asStringList(rec.keyTerms, fallback.keyTerms),
    learningObjectives: asStringList(rec.learningObjectives, fallback.learningObjectives),
    misconceptions: asStringList(rec.misconceptions, fallback.misconceptions),
  };
}

function parsePlayable(raw: unknown, ctx: GamifiedLessonContext): EscapeRoomPlayable {
  const defaults = fallbackPlayable(ctx);
  const rec = asRecord(raw) ?? {};
  const vocab = asRecord(rec.vocabulary) ?? {};
  const sequence = asRecord(rec.sequence) ?? {};
  const data = asRecord(rec.data) ?? {};
  const mastery = asRecord(rec.mastery) ?? {};
  const pairsRaw = Array.isArray(vocab.pairs) ? vocab.pairs : [];
  const cardsRaw = Array.isArray(sequence.cards) ? sequence.cards : [];
  const fieldsRaw = Array.isArray(data.fields) ? data.fields : [];
  const optionsRaw = Array.isArray(mastery.options) ? mastery.options : [];
  const tableRaw = asRecord(data.table) ?? {};
  const rowsRaw = Array.isArray(tableRaw.rows) ? tableRaw.rows : [];
  const orderRaw = Array.isArray(sequence.correctOrder) ? sequence.correctOrder : [];
  const ids = ['A', 'B', 'C', 'D'] as const;

  const pairs = defaults.vocabulary.pairs.map((pair, index) => {
    const next = asRecord(pairsRaw[index]) ?? {};
    return {
      term: asString(next.term, pair.term),
      definition: asString(next.definition, pair.definition),
    };
  });

  const cards = defaults.sequence.cards.map((card, index) => {
    const next = asRecord(cardsRaw[index]) ?? {};
    const id = ids.includes(asString(next.id) as (typeof ids)[number])
      ? (asString(next.id) as (typeof ids)[number])
      : card.id;
    return { id, text: asString(next.text, card.text) };
  });

  const correctOrder = defaults.sequence.correctOrder.map((letter, index) => {
    const next = String(orderRaw[index] ?? '').trim().toUpperCase();
    return ids.includes(next as (typeof ids)[number]) ? (next as (typeof ids)[number]) : letter;
  });

  const fields = defaults.data.fields.map((field, index) => {
    const next = asRecord(fieldsRaw[index]) ?? {};
    return {
      ...field,
      label: asString(next.label, field.label),
      answer: asString(next.answer, field.answer),
    };
  });

  const options = defaults.mastery.options.map((option, index) => {
    const next = asRecord(optionsRaw[index]) ?? {};
    return {
      id: asString(next.id, option.id),
      text: asString(next.text, option.text),
      correct: typeof next.correct === 'boolean' ? next.correct : option.correct,
    };
  });
  if (!options.some((option) => option.correct)) options[0].correct = true;

  return {
    timerMinutes: Math.min(90, Math.max(5, asNumber(rec.timerMinutes, defaults.timerMinutes))),
    missionName: asString(rec.missionName, defaults.missionName),
    vocabulary: {
      prompt: asString(vocab.prompt, defaults.vocabulary.prompt),
      pairs,
    },
    sequence: {
      prompt: asString(sequence.prompt, defaults.sequence.prompt),
      cards,
      correctOrder,
    },
    data: {
      scenario: asString(data.scenario, defaults.data.scenario),
      table: {
        headers: asStringList(tableRaw.headers, defaults.data.table.headers),
        rows:
          rowsRaw.length >= defaults.data.table.rows.length
            ? defaults.data.table.rows.map((row, index) => {
                const next = Array.isArray(rowsRaw[index]) ? rowsRaw[index].map((cell) => asString(cell)) : row;
                return next.length ? next : row;
              })
            : defaults.data.table.rows,
      },
      fields,
    },
    mastery: {
      prompt: asString(mastery.prompt, defaults.mastery.prompt),
      flawedClaim: asString(mastery.flawedClaim, defaults.mastery.flawedClaim),
      options,
    },
  };
}

function parseEscapeRoom(raw: Record<string, unknown>, ctx: GamifiedLessonContext): EscapeRoomDocument {
  const defaults = fallbackEscapeRoom(ctx);
  const playable = parsePlayable(raw.playable ?? raw, ctx);
  const [vocabCode, sequenceCode, dataCode, masteryCode] = playableLockCodes(playable);
  const stagesRaw = Array.isArray(raw.stages) ? raw.stages : [];
  const generatedCodes = [vocabCode, sequenceCode, dataCode, masteryCode];
  const stages = defaults.stages.map((fallback, index) => {
    const rec = asRecord(stagesRaw[index]) ?? {};
    return {
      ...fallback,
      title: asString(rec.title, fallback.title),
      puzzle: asString(rec.puzzle, fallback.puzzle),
      hiddenClues: asStringList(rec.hiddenClues, fallback.hiddenClues),
      lockCode: clampCode(asString(rec.lockCode, generatedCodes[index] ?? fallback.lockCode), fallback.lockCode),
      validationNote: asString(rec.validationNote, fallback.validationNote),
    };
  });
  const answerRaw = Array.isArray(raw.answerKey) ? raw.answerKey : [];
  const extension = asRecord(raw.extensionActivity) ?? {};
  return {
    kind: 'escape_room',
    title: asString(raw.title, defaults.title),
    theme: asString(raw.theme, defaults.theme),
    subject: asString(raw.subject, ctx.subject),
    gradeLabel: asString(raw.gradeLabel, ctx.gradeLevel),
    storyIntro: asString(raw.storyIntro, defaults.storyIntro),
    gameRules: asStringList(raw.gameRules, defaults.gameRules),
    stages,
    playable,
    answerKey: stages.map((stage, index) => {
      const rec = asRecord(answerRaw[index]) ?? {};
      return {
        stage: stage.stage,
        code: clampCode(asString(rec.code, stage.lockCode), stage.lockCode),
        rationale: asString(rec.rationale, stage.validationNote),
      };
    }),
    formsBranchingNotes: asStringList(raw.formsBranchingNotes, defaults.formsBranchingNotes),
    extensionActivity: {
      title: asString(extension.title, defaults.extensionActivity.title),
      instructions: asString(extension.instructions, defaults.extensionActivity.instructions),
    },
  };
}

function parseBranchingQuest(raw: Record<string, unknown>, ctx: GamifiedLessonContext): BranchingQuestDocument {
  const defaults = fallbackBranchingQuest(ctx);
  const decisionsRaw = Array.isArray(raw.decisions) ? raw.decisions : [];
  const points = [100, 50, 0] as const;
  const scorecardRaw = asRecord(raw.scorecard) ?? {};
  const bandsRaw = Array.isArray(scorecardRaw.bands) ? scorecardRaw.bands : [];
  return {
    kind: 'branching_quest',
    title: asString(raw.title, defaults.title),
    subject: asString(raw.subject, ctx.subject),
    gradeLabel: asString(raw.gradeLabel, ctx.gradeLevel),
    persona: asString(raw.persona, defaults.persona),
    personaBrief: asString(raw.personaBrief, defaults.personaBrief),
    decisions: defaults.decisions.map((fallback, index) => {
      const rec = asRecord(decisionsRaw[index]) ?? {};
      const choicesRaw = Array.isArray(rec.choices) ? rec.choices : [];
      return {
        ...fallback,
        title: asString(rec.title, fallback.title),
        scene: asString(rec.scene, fallback.scene),
        choices: fallback.choices.map((choice, choiceIndex) => {
          const next = asRecord(choicesRaw[choiceIndex]) ?? {};
          return {
            ...choice,
            label: asString(next.label, choice.label),
            text: asString(next.text, choice.text),
            points: points[choiceIndex],
            outcome: asString(next.outcome, choice.outcome),
            feedback: asString(next.feedback, choice.feedback),
          };
        }),
      };
    }),
    scorecard: {
      title: asString(scorecardRaw.title, defaults.scorecard.title),
      bands: defaults.scorecard.bands.map((band, index) => {
        const rec = asRecord(bandsRaw[index]) ?? {};
        return {
          ...band,
          label: asString(rec.label, band.label),
          meaning: asString(rec.meaning, band.meaning),
        };
      }),
    },
  };
}

function parseSkillTree(raw: Record<string, unknown>, ctx: GamifiedLessonContext): SkillTreeDocument {
  const defaults = fallbackSkillTree(ctx);
  const tiersRaw = Array.isArray(raw.tiers) ? raw.tiers : [];
  const badgesRaw = Array.isArray(raw.badges) ? raw.badges : [];
  return {
    kind: 'skill_tree',
    title: asString(raw.title, defaults.title),
    subject: asString(raw.subject, ctx.subject),
    duration: asString(raw.duration, defaults.duration),
    unlockRule: asString(raw.unlockRule, defaults.unlockRule),
    targetXp: asNumber(raw.targetXp, defaults.targetXp),
    tiers: defaults.tiers.map((tier, index) => {
      const rec = asRecord(tiersRaw[index]) ?? {};
      const tasksRaw = Array.isArray(rec.tasks) ? rec.tasks : [];
      return {
        ...tier,
        name: asString(rec.name, tier.name),
        tasks: tier.tasks.map((task, taskIndex) => {
          const next = asRecord(tasksRaw[taskIndex]) ?? {};
          return {
            ...task,
            title: asString(next.title, task.title),
            description: asString(next.description, task.description),
            xp: asNumber(next.xp, task.xp),
          };
        }),
      };
    }),
    badges: defaults.badges.map((badge, index) => {
      const rec = asRecord(badgesRaw[index]) ?? {};
      return {
        name: asString(rec.name, badge.name),
        description: asString(rec.description, badge.description),
        rubric: asString(rec.rubric, badge.rubric),
      };
    }),
    trackingKey: asStringList(raw.trackingKey, defaults.trackingKey),
  };
}

export function parseGamifiedActivityResponse(
  kind: GamifiedActivityKind,
  raw: unknown,
  ctx: GamifiedLessonContext,
): GamifiedActivityResponse {
  const rec = asRecord(raw) ?? {};
  const nested = asRecord(rec.document) ?? rec;
  const document =
    kind === 'branching_quest'
      ? parseBranchingQuest(nested, ctx)
      : kind === 'skill_tree'
        ? parseSkillTree(nested, ctx)
        : parseEscapeRoom(nested, ctx);
  const insights = parseInsights(rec.insights, ctx);
  return {
    kind,
    insights,
    document,
    markdown: asString(rec.markdown, gamifiedActivityToMarkdown(insights, document)),
    html: document.kind === 'escape_room' ? escapeRoomToPlayableHtml(document) : undefined,
  };
}

export function gamifiedActivityToMarkdown(
  insights: GamifiedActivityInsights,
  document: GamifiedActivityDocument,
): string {
  const insightBlock = [
    `## Extracted from the source material`,
    ``,
    `**Key terms:** ${insights.keyTerms.join('; ')}`,
    `**Learning objectives:** ${insights.learningObjectives.join('; ')}`,
    `**Common misconceptions:** ${insights.misconceptions.join('; ')}`,
    ``,
  ];

  if (document.kind === 'escape_room') {
    return [
      `# ${document.title}`,
      ``,
      `Theme: ${document.theme}`,
      `Subject: ${document.subject} · ${document.gradeLabel}`,
      ``,
      ...insightBlock,
      `## Game rules & story intro`,
      ``,
      document.storyIntro,
      ``,
      ...document.gameRules.map((rule) => `- ${rule}`),
      ``,
      `## Puzzles`,
      ``,
      ...document.stages.flatMap((stage) => [
        `### Stage ${stage.stage}: ${stage.title}`,
        ``,
        stage.puzzle,
        ``,
        `Hidden clues:`,
        ...stage.hiddenClues.map((clue) => `- ${clue}`),
        ``,
      ]),
      `## Teacher answer key`,
      ``,
      ...document.answerKey.map((row) => `- Stage ${row.stage}: \`${row.code}\` — ${row.rationale}`),
      ``,
      `### Google Forms branching`,
      ``,
      ...document.formsBranchingNotes.map((note) => `- ${note}`),
      ``,
      `## Extension activity`,
      ``,
      `**${document.extensionActivity.title}**`,
      ``,
      document.extensionActivity.instructions,
      ``,
    ].join('\n');
  }

  if (document.kind === 'branching_quest') {
    return [
      `# ${document.title}`,
      ``,
      `Subject: ${document.subject} · ${document.gradeLabel}`,
      ``,
      ...insightBlock,
      `## Persona`,
      ``,
      `**${document.persona}**`,
      ``,
      document.personaBrief,
      ``,
      `## Decision points`,
      ``,
      ...document.decisions.flatMap((decision) => [
        `### Decision ${decision.id}: ${decision.title}`,
        ``,
        decision.scene,
        ``,
        ...decision.choices.map(
          (choice) =>
            `- **Choice ${choice.id} (${choice.label}, ${choice.points} pts):** ${choice.text}\n  - Outcome: ${choice.outcome}\n  - Feedback: ${choice.feedback}`,
        ),
        ``,
      ]),
      `## ${document.scorecard.title}`,
      ``,
      ...document.scorecard.bands.map((band) => `- ${band.min}–${band.max} · **${band.label}**: ${band.meaning}`),
      ``,
    ].join('\n');
  }

  return [
    `# ${document.title}`,
    ``,
    `Subject: ${document.subject}`,
    `Duration: ${document.duration}`,
    `Quest complete: ${document.unlockRule}`,
    ``,
    ...insightBlock,
    `## Choice board`,
    ``,
    `| Tier | Task | Description | XP |`,
    `| --- | --- | --- | --- |`,
    ...document.tiers.flatMap((tier) =>
      tier.tasks.map((task) => `| ${tier.name} | ${task.title} | ${task.description} | ${task.xp} |`),
    ),
    ``,
    `## Badges`,
    ``,
    ...document.badges.map((badge) => `- **${badge.name}** — ${badge.description}  \n  Rubric: ${badge.rubric}`),
    ``,
    `## XP tracking key`,
    ``,
    ...document.trackingKey.map((line) => `- ${line}`),
    ``,
  ].join('\n');
}
