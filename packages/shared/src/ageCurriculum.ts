/** Age-based curriculum tiers for Brightpath AI Tutor */

export const AGE_GROUPS = [
  'TODDLER_1_3',
  'EARLY_4_7',
  'UPPER_ELEM_8_10',
  'MIDDLE_11_14',
] as const;

export type AgeGroup = (typeof AGE_GROUPS)[number];

export const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  TODDLER_1_3: 'Toddler (1–3)',
  EARLY_4_7: 'Early Learner (4–7)',
  UPPER_ELEM_8_10: 'Upper Elementary (8–10)',
  MIDDLE_11_14: 'Middle School (11–14)',
};

export const AGE_GROUP_LEVEL_NAMES: Record<AgeGroup, string> = {
  TODDLER_1_3: 'Level Toddler',
  EARLY_4_7: 'Level Early Explorer',
  UPPER_ELEM_8_10: 'Level Upper Elementary',
  MIDDLE_11_14: 'Level Middle Scholar',
};

/** Curriculum subject keys unlocked per age group */
export interface CurriculumSubject {
  id: string;
  title: string;
  description: string;
  emoji: string;
  color: string;
  /** Optional route into existing lesson engine */
  learnRoute?: string;
}

export const CURRICULUM_BY_AGE_GROUP: Record<AgeGroup, CurriculumSubject[]> = {
  TODDLER_1_3: [
    {
      id: 'sensory',
      title: 'Sensory Play',
      description: 'Touch, sound & color discovery',
      emoji: '🌈',
      color: '#f472b6',
    },
    {
      id: 'nursery_rhymes',
      title: 'Nursery Rhymes',
      description: 'Sing-along stories & rhythm',
      emoji: '🎵',
      color: '#a78bfa',
    },
    {
      id: 'visual_sound_games',
      title: 'Visual & Sound Games',
      description: 'Big buttons, audio-first fun',
      emoji: '🔊',
      color: '#38bdf8',
    },
  ],
  EARLY_4_7: [
    {
      id: 'phonics',
      title: 'Phonics',
      description: 'Letter sounds adventure',
      emoji: '🔤',
      color: '#6366f1',
      learnRoute: '/learn/reading',
    },
    {
      id: 'early_math',
      title: 'Early Math',
      description: 'Counting, shapes & patterns',
      emoji: '🔢',
      color: '#10b981',
      learnRoute: '/learn/math',
    },
    {
      id: 'general_science',
      title: 'General Science',
      description: 'Wonder walks & simple experiments',
      emoji: '🌱',
      color: '#22c55e',
    },
    {
      id: 'writing',
      title: 'Early Writing',
      description: 'Letters & short words',
      emoji: '✏️',
      color: '#ec4899',
      learnRoute: '/learn/writing',
    },
  ],
  UPPER_ELEM_8_10: [
    {
      id: 'fractions',
      title: 'Fractions',
      description: 'Parts, wholes & number sense',
      emoji: '➗',
      color: '#0d9488',
      learnRoute: '/learn/math',
    },
    {
      id: 'grammar',
      title: 'Grammar',
      description: 'Sentences that shine',
      emoji: '📝',
      color: '#ec4899',
      learnRoute: '/learn/writing',
    },
    {
      id: 'coding_logic',
      title: 'Coding Logic',
      description: 'Sequences, loops & puzzles',
      emoji: '💻',
      color: '#6366f1',
    },
    {
      id: 'life_science',
      title: 'Life Science',
      description: 'Living things & habitats',
      emoji: '🔬',
      color: '#22c55e',
    },
    {
      id: 'reading',
      title: 'Reading',
      description: 'Stories & comprehension',
      emoji: '📖',
      color: '#8b5cf6',
      learnRoute: '/learn/reading',
    },
  ],
  MIDDLE_11_14: [
    {
      id: 'pre_algebra',
      title: 'Pre-Algebra',
      description: 'Equations & analytical practice',
      emoji: '📐',
      color: '#0f766e',
      learnRoute: '/learn/math',
    },
    {
      id: 'physics',
      title: 'Physics',
      description: 'Forces, motion & energy',
      emoji: '⚛️',
      color: '#2563eb',
    },
    {
      id: 'chemistry',
      title: 'Chemistry',
      description: 'Atoms, reactions & labs',
      emoji: '🧪',
      color: '#7c3aed',
    },
    {
      id: 'literature',
      title: 'Literature Analysis',
      description: 'Themes, voice & critique',
      emoji: '📚',
      color: '#db2777',
      learnRoute: '/learn/reading',
    },
  ],
};

export interface AgePersona {
  id: AgeGroup;
  headline: string;
  mode: string;
  touchScale: 'xl' | 'lg' | 'md' | 'sm';
  audioFirst: boolean;
  themeClass: string;
  accent: string;
}

export const PERSONA_BY_AGE_GROUP: Record<AgeGroup, AgePersona> = {
  TODDLER_1_3: {
    id: 'TODDLER_1_3',
    headline: 'Sensory & audio-first play',
    mode: 'Large touch targets · Nursery voice',
    touchScale: 'xl',
    audioFirst: true,
    themeClass: 'age-theme-toddler',
    accent: '#f472b6',
  },
  EARLY_4_7: {
    id: 'EARLY_4_7',
    headline: 'Gamified micro-lessons',
    mode: 'Phonics · Early math · Science wonder',
    touchScale: 'lg',
    audioFirst: true,
    themeClass: 'age-theme-early',
    accent: '#6366f1',
  },
  UPPER_ELEM_8_10: {
    id: 'UPPER_ELEM_8_10',
    headline: 'Interactive whiteboard mode',
    mode: 'Step-by-step hints · Coding logic',
    touchScale: 'md',
    audioFirst: false,
    themeClass: 'age-theme-upper',
    accent: '#0d9488',
  },
  MIDDLE_11_14: {
    id: 'MIDDLE_11_14',
    headline: 'Analytical workspace',
    mode: 'Socratic AI · Deep subject mastery',
    touchScale: 'sm',
    audioFirst: false,
    themeClass: 'age-theme-middle',
    accent: '#4338ca',
  },
};

/** Whole years completed since DOB (as of `asOf`). */
export function getAgeFromDOB(dob: Date, asOf: Date = new Date()): number {
  const birth = new Date(dob);
  let age = asOf.getFullYear() - birth.getFullYear();
  const monthDiff = asOf.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < birth.getDate())) {
    age -= 1;
  }
  return Math.max(0, age);
}

export function getAgeGroupFromAge(age: number): AgeGroup {
  if (age <= 3) return 'TODDLER_1_3';
  if (age <= 7) return 'EARLY_4_7';
  if (age <= 10) return 'UPPER_ELEM_8_10';
  return 'MIDDLE_11_14';
}

export function getAgeGroupFromDOB(dob: Date, asOf: Date = new Date()): AgeGroup {
  return getAgeGroupFromAge(getAgeFromDOB(dob, asOf));
}

/** Subjects for a single tier */
export function subjectsForAgeGroup(group: AgeGroup): string[] {
  return CURRICULUM_BY_AGE_GROUP[group].map((s) => s.id);
}

/**
 * Merge unlocked subjects when upgrading tiers.
 * Keeps prior unlocks so completion/streaks stay intact, adds new tier subjects.
 */
export function mergeUnlockedSubjects(
  existing: string[] | null | undefined,
  nextGroup: AgeGroup,
): string[] {
  const next = subjectsForAgeGroup(nextGroup);
  const set = new Set([...(existing ?? []), ...next]);
  return Array.from(set);
}

/** All subjects unlocked for the learner's current group (display list with metadata). */
export function resolveCurriculumSubjects(
  unlockedIds: string[],
  activeGroup: AgeGroup,
): CurriculumSubject[] {
  const byId = new Map<string, CurriculumSubject>();
  for (const group of AGE_GROUPS) {
    for (const subject of CURRICULUM_BY_AGE_GROUP[group]) {
      byId.set(subject.id, subject);
    }
  }
  const preferred = CURRICULUM_BY_AGE_GROUP[activeGroup].map((s) => s.id);
  const ordered = [
    ...preferred.filter((id) => unlockedIds.includes(id)),
    ...unlockedIds.filter((id) => !preferred.includes(id)),
  ];
  return ordered.map((id) => byId.get(id)).filter(Boolean) as CurriculumSubject[];
}

/** Map legacy ageBand strings ↔ AgeGroup for older APIs */
export function ageGroupToLegacyBand(group: AgeGroup): '5-7' | '8-10' | '11-14' | '15-18' {
  switch (group) {
    case 'TODDLER_1_3':
    case 'EARLY_4_7':
      return '5-7';
    case 'UPPER_ELEM_8_10':
      return '8-10';
    case 'MIDDLE_11_14':
      return '11-14';
  }
}

export function legacyBandToAgeGroup(band: string, age?: number): AgeGroup {
  if (typeof age === 'number') return getAgeGroupFromAge(age);
  if (band === '8-10') return 'UPPER_ELEM_8_10';
  if (band === '11-14' || band === '15-18') return 'MIDDLE_11_14';
  return 'EARLY_4_7';
}
