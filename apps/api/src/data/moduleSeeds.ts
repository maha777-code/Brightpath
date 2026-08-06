import type { AgeGroup } from '@brightpath/shared';

/** Canonical curriculum path definitions seeded into ModuleNode */
export interface ModuleSeed {
  key: string;
  title: string;
  ageGroup: AgeGroup;
  sequenceOrder: number;
  subjectCategory: string;
  learnRoute?: string;
  /** Keys of prerequisite modules within the same age group */
  prerequisiteKeys: string[];
  /** Shown when remediation is needed for this node */
  reviewTitle?: string;
}

export const MODULE_SEEDS: ModuleSeed[] = [
  // ── Toddler 1–3 ──
  {
    key: 'tod-animal',
    title: 'Animal Sounds',
    ageGroup: 'TODDLER_1_3',
    sequenceOrder: 1,
    subjectCategory: 'Sensory',
    prerequisiteKeys: [],
    reviewTitle: 'Review: Animal Sounds',
  },
  {
    key: 'tod-colors',
    title: 'Primary Colors',
    ageGroup: 'TODDLER_1_3',
    sequenceOrder: 2,
    subjectCategory: 'Sensory',
    prerequisiteKeys: ['tod-animal'],
    reviewTitle: 'Review: Color Names',
  },
  {
    key: 'tod-count',
    title: 'Counting 1–5',
    ageGroup: 'TODDLER_1_3',
    sequenceOrder: 3,
    subjectCategory: 'Math',
    prerequisiteKeys: ['tod-colors'],
    reviewTitle: 'Review: Counting Fingers',
  },
  {
    key: 'tod-songs',
    title: 'Nursery Songs',
    ageGroup: 'TODDLER_1_3',
    sequenceOrder: 4,
    subjectCategory: 'Music',
    prerequisiteKeys: ['tod-count'],
  },

  // ── Early 4–7 ──
  {
    key: 'early-phonics',
    title: 'Phonics Basics',
    ageGroup: 'EARLY_4_7',
    sequenceOrder: 1,
    subjectCategory: 'Reading',
    learnRoute: '/learn/reading',
    prerequisiteKeys: [],
    reviewTitle: 'Review: Letter Sounds',
  },
  {
    key: 'early-sight',
    title: 'Sight Words',
    ageGroup: 'EARLY_4_7',
    sequenceOrder: 2,
    subjectCategory: 'Reading',
    learnRoute: '/learn/reading',
    prerequisiteKeys: ['early-phonics'],
    reviewTitle: 'Review: Sight Word Flashcards',
  },
  {
    key: 'early-addition',
    title: 'Simple Addition',
    ageGroup: 'EARLY_4_7',
    sequenceOrder: 3,
    subjectCategory: 'Math',
    learnRoute: '/learn/math',
    prerequisiteKeys: ['early-sight'],
    reviewTitle: 'Review: Counting',
  },
  {
    key: 'early-plants',
    title: 'Plant Life',
    ageGroup: 'EARLY_4_7',
    sequenceOrder: 4,
    subjectCategory: 'Science',
    prerequisiteKeys: ['early-addition'],
  },

  // ── Upper elem 8–10 ──
  {
    key: 'upper-mult',
    title: 'Multiplication',
    ageGroup: 'UPPER_ELEM_8_10',
    sequenceOrder: 1,
    subjectCategory: 'Math',
    learnRoute: '/learn/math',
    prerequisiteKeys: [],
    reviewTitle: 'Review: Equal Groups',
  },
  {
    key: 'upper-frac',
    title: 'Fractions',
    ageGroup: 'UPPER_ELEM_8_10',
    sequenceOrder: 2,
    subjectCategory: 'Math',
    learnRoute: '/learn/math',
    prerequisiteKeys: ['upper-mult'],
    reviewTitle: 'Review: Parts of a Whole',
  },
  {
    key: 'upper-div',
    title: 'Division',
    ageGroup: 'UPPER_ELEM_8_10',
    sequenceOrder: 3,
    subjectCategory: 'Math',
    learnRoute: '/learn/math',
    prerequisiteKeys: ['upper-frac'],
    reviewTitle: 'Review: Sharing Equally',
  },
  {
    key: 'upper-earth',
    title: 'Earth Science',
    ageGroup: 'UPPER_ELEM_8_10',
    sequenceOrder: 4,
    subjectCategory: 'Science',
    prerequisiteKeys: ['upper-div'],
  },

  // ── Middle 11–14 ──
  {
    key: 'mid-alg',
    title: 'Algebra 2',
    ageGroup: 'MIDDLE_11_14',
    sequenceOrder: 1,
    subjectCategory: 'Math',
    learnRoute: '/learn/math',
    prerequisiteKeys: [],
    reviewTitle: 'Review: Linear Equations',
  },
  {
    key: 'mid-geo',
    title: 'Geometry',
    ageGroup: 'MIDDLE_11_14',
    sequenceOrder: 2,
    subjectCategory: 'Math',
    learnRoute: '/learn/math',
    prerequisiteKeys: ['mid-alg'],
    reviewTitle: 'Review: Angles & Shapes',
  },
  {
    key: 'mid-trig',
    title: 'Trigonometry',
    ageGroup: 'MIDDLE_11_14',
    sequenceOrder: 3,
    subjectCategory: 'Math',
    learnRoute: '/learn/math',
    prerequisiteKeys: ['mid-geo'],
    reviewTitle: 'Review: Right Triangles',
  },
  {
    key: 'mid-phys',
    title: 'Physics',
    ageGroup: 'MIDDLE_11_14',
    sequenceOrder: 4,
    subjectCategory: 'Science',
    prerequisiteKeys: ['mid-trig'],
  },
];

/** Starter mastery so the path looks alive for demos (first node progressing). */
export const DEMO_STARTER_SCORES: Record<string, number> = {
  'tod-animal': 100,
  'tod-colors': 60,
  'early-phonics': 90,
  'early-sight': 40,
  'upper-mult': 85,
  'upper-frac': 30,
  'mid-alg': 85,
  'mid-geo': 30,
};
