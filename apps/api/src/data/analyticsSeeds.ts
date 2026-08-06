import type { AgeGroup } from '@brightpath/shared';

export interface SkillSeedDef {
  key: string;
  name: string;
  radarAxis?: string;
  parentKey?: string;
  skillTags?: string[];
  /** Demo starter mastery 0–100 */
  demoScore?: number;
}

export interface SubjectSeedDef {
  slug: string;
  name: string;
  ageGroup: AgeGroup;
  colorTheme: string;
  learnRoute?: string;
  sortOrder: number;
  skills: SkillSeedDef[];
}

/**
 * Catalog for My Subjects + Analytics per age group.
 * Skill trees: root → mid → leaves. Radar axes are marked via radarAxis.
 */
export const SUBJECT_SEEDS: SubjectSeedDef[] = [
  // ── Toddler 1–3 ──
  {
    slug: 'sensory',
    name: 'Sensory Play',
    ageGroup: 'TODDLER_1_3',
    colorTheme: '#f472b6',
    sortOrder: 1,
    skills: [
      { key: 'tod-root', name: 'Play Skills', demoScore: 70 },
      { key: 'tod-audio', name: 'Audio', parentKey: 'tod-root', radarAxis: 'Sounds', skillTags: ['Sensory', 'Music'], demoScore: 82 },
      { key: 'tod-visual', name: 'Visual', parentKey: 'tod-root', radarAxis: 'Colors', skillTags: ['Sensory'], demoScore: 70 },
      { key: 'tod-shapes', name: 'Shapes', parentKey: 'tod-visual', radarAxis: 'Shapes', demoScore: 58 },
      { key: 'tod-motor', name: 'Motor Skills', parentKey: 'tod-root', radarAxis: 'Motor Skills', demoScore: 75 },
      { key: 'tod-touch', name: 'Touch', parentKey: 'tod-motor', demoScore: 72 },
      { key: 'tod-tap', name: 'Tap', parentKey: 'tod-audio', demoScore: 68 },
      { key: 'tod-listen', name: 'Listen', parentKey: 'tod-audio', demoScore: 80 },
    ],
  },
  {
    slug: 'nursery_rhymes',
    name: 'Nursery Rhymes',
    ageGroup: 'TODDLER_1_3',
    colorTheme: '#a78bfa',
    sortOrder: 2,
    skills: [
      { key: 'tod-rhyme', name: 'Rhymes', radarAxis: 'Sounds', skillTags: ['Music'], demoScore: 49 },
    ],
  },
  {
    slug: 'visual_sound',
    name: 'Visual & Sound Games',
    ageGroup: 'TODDLER_1_3',
    colorTheme: '#38bdf8',
    sortOrder: 3,
    skills: [
      { key: 'tod-games', name: 'Sound Games', skillTags: ['Sensory'], demoScore: 55 },
    ],
  },

  // ── Early 4–7 ──
  {
    slug: 'early_reading',
    name: 'Early Reading',
    ageGroup: 'EARLY_4_7',
    colorTheme: '#6366f1',
    learnRoute: '/learn/reading',
    sortOrder: 1,
    skills: [
      { key: 'early-root', name: 'Early Skills', demoScore: 75 },
      { key: 'early-letters', name: 'Letters', parentKey: 'early-root', radarAxis: 'Phonics', skillTags: ['Reading'], demoScore: 88 },
      { key: 'early-sounds', name: 'Sounds', parentKey: 'early-letters', skillTags: ['Reading'], demoScore: 90 },
      { key: 'early-words', name: 'Words', parentKey: 'early-letters', skillTags: ['Reading'], demoScore: 40 },
      { key: 'early-writing', name: 'Writing Marks', parentKey: 'early-root', radarAxis: 'Writing', skillTags: ['Writing'], demoScore: 61 },
    ],
  },
  {
    slug: 'basic_math',
    name: 'Basic Math',
    ageGroup: 'EARLY_4_7',
    colorTheme: '#10b981',
    learnRoute: '/learn/math',
    sortOrder: 2,
    skills: [
      { key: 'early-numbers', name: 'Numbers', parentKey: 'early-root', radarAxis: 'Counting', skillTags: ['Math'], demoScore: 72 },
      { key: 'early-add', name: 'Add', parentKey: 'early-numbers', skillTags: ['Math'], demoScore: 52 },
    ],
  },
  {
    slug: 'fun_science',
    name: 'Fun Science',
    ageGroup: 'EARLY_4_7',
    colorTheme: '#22c55e',
    sortOrder: 3,
    skills: [
      { key: 'early-curiosity', name: 'Curiosity', radarAxis: 'Curiosity', skillTags: ['Science'], demoScore: 80 },
      { key: 'early-plants-skill', name: 'Plant Life', skillTags: ['Science'], demoScore: 10 },
    ],
  },
  {
    slug: 'creative_arts',
    name: 'Creative Arts',
    ageGroup: 'EARLY_4_7',
    colorTheme: '#ec4899',
    learnRoute: '/learn/writing',
    sortOrder: 4,
    skills: [
      { key: 'early-arts', name: 'Creative Expression', skillTags: ['Writing'], demoScore: 55 },
    ],
  },

  // ── Upper 8–10 ──
  {
    slug: 'mathematics',
    name: 'Mathematics',
    ageGroup: 'UPPER_ELEM_8_10',
    colorTheme: '#0d9488',
    learnRoute: '/learn/math',
    sortOrder: 1,
    skills: [
      { key: 'up-root', name: 'Core Skills', demoScore: 70 },
      { key: 'up-math', name: 'Math', parentKey: 'up-root', radarAxis: 'Multiply', skillTags: ['Math'], demoScore: 85 },
      { key: 'up-frac', name: 'Fractions', parentKey: 'up-math', radarAxis: 'Fractions', skillTags: ['Math'], demoScore: 30 },
      { key: 'up-code-leaf', name: 'Code', parentKey: 'up-math', demoScore: 40 },
    ],
  },
  {
    slug: 'language_arts',
    name: 'Language Arts',
    ageGroup: 'UPPER_ELEM_8_10',
    colorTheme: '#ec4899',
    learnRoute: '/learn/writing',
    sortOrder: 2,
    skills: [
      { key: 'up-lang', name: 'Language', parentKey: 'up-root', radarAxis: 'Grammar', skillTags: ['Writing', 'Reading'], demoScore: 68 },
      { key: 'up-para', name: 'Paragraphs', parentKey: 'up-lang', demoScore: 62 },
    ],
  },
  {
    slug: 'life_sciences',
    name: 'Life Sciences',
    ageGroup: 'UPPER_ELEM_8_10',
    colorTheme: '#22c55e',
    sortOrder: 3,
    skills: [
      { key: 'up-sci', name: 'Life Science', skillTags: ['Science'], demoScore: 48 },
    ],
  },
  {
    slug: 'coding_logic',
    name: 'Coding Logic',
    ageGroup: 'UPPER_ELEM_8_10',
    colorTheme: '#6366f1',
    sortOrder: 4,
    skills: [
      { key: 'up-logic', name: 'Logic', radarAxis: 'Logic', demoScore: 40 },
    ],
  },

  // ── Middle 11–14 ──
  {
    slug: 'alg_geo',
    name: 'Algebra & Geometry',
    ageGroup: 'MIDDLE_11_14',
    colorTheme: '#0f766e',
    learnRoute: '/learn/math',
    sortOrder: 1,
    skills: [
      { key: 'mid-root', name: 'Core Math', demoScore: 72 },
      { key: 'mid-alg', name: 'Algebra', parentKey: 'mid-root', radarAxis: 'Algebra', skillTags: ['Math'], demoScore: 88 },
      { key: 'mid-geo', name: 'Geometry', parentKey: 'mid-root', radarAxis: 'Geometry', skillTags: ['Math'], demoScore: 30 },
      { key: 'mid-eq', name: 'Equations', parentKey: 'mid-alg', radarAxis: 'Equations', demoScore: 81 },
      { key: 'mid-proofs', name: 'Proofs', parentKey: 'mid-geo', radarAxis: 'Proofs', demoScore: 54 },
      { key: 'mid-trig-leaf', name: 'Trig', parentKey: 'mid-geo', demoScore: 15 },
    ],
  },
  {
    slug: 'chem_phys',
    name: 'Chemistry & Physics',
    ageGroup: 'MIDDLE_11_14',
    colorTheme: '#7c3aed',
    sortOrder: 2,
    skills: [
      { key: 'mid-phys', name: 'Physics Intro', skillTags: ['Science'], demoScore: 45 },
    ],
  },
  {
    slug: 'literature',
    name: 'Literature Analysis',
    ageGroup: 'MIDDLE_11_14',
    colorTheme: '#db2777',
    learnRoute: '/learn/reading',
    sortOrder: 3,
    skills: [
      { key: 'mid-lit', name: 'Literature', skillTags: ['Reading'], demoScore: 58 },
    ],
  },
  {
    slug: 'python',
    name: 'Python',
    ageGroup: 'MIDDLE_11_14',
    colorTheme: '#2563eb',
    sortOrder: 4,
    skills: [
      { key: 'mid-py', name: 'Python Basics', demoScore: 38 },
    ],
  },
];

/** Goal templates keyed by low skill radar/name keywords */
export const GOAL_TEMPLATES: { match: RegExp; goals: string[] }[] = [
  { match: /phonic|letter|sound|sight|word|reading/i, goals: ['Spell 5 new sight words', 'Read one short story aloud'] },
  { match: /count|add|number|math|multiply|fraction/i, goals: ['Complete Level 2 Addition', 'Solve 8 practice problems'] },
  { match: /writ|grammar|paragraph|literature/i, goals: ['Write a 5-sentence paragraph', 'Practice handwriting for 10 minutes'] },
  { match: /curios|science|plant|phys/i, goals: ['Explore one science experiment', 'Name 3 facts about plants'] },
  { match: /color|sound|motor|play|rhyme/i, goals: ["Listen to 'Old MacDonald' song", 'Pop 10 red balloons in Color Game'] },
  { match: /algebra|geometry|proof|equation|trig/i, goals: ['Practice 10 Geometry problems', 'Review Algebra quiz mistakes'] },
  { match: /logic|code|python/i, goals: ['Complete one coding puzzle', 'Trace a simple algorithm on paper'] },
];
