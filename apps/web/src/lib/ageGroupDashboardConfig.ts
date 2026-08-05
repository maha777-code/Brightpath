import type { AgeGroup } from '@brightpath/shared';

export type PathNodeState = 'done' | 'active' | 'unlocked' | 'locked';

export interface PathNodeConfig {
  id: string;
  title: string;
  meta: string;
  state: PathNodeState;
}

export interface DashboardSubjectConfig {
  id: string;
  title: string;
  mastery: number;
  color: string;
  route?: string;
}

export interface AnalyticsConfig {
  radar: { skill: string; value: number }[];
  treeRoot: string;
  treeMid: string[];
  treeLeaves: string[];
}

export interface AiChatConfig {
  initialMessages: { role: 'user' | 'tutor'; text: string }[];
  replyTemplate: string;
  placeholder: string;
  tone: string;
}

export interface AgeGroupDashboardConfig {
  personalizedPath: PathNodeConfig[];
  subjects: DashboardSubjectConfig[];
  analytics: AnalyticsConfig;
  upcomingGoals: string[];
  aiChat: AiChatConfig;
  theme: {
    accent: string;
    pathDone: string;
    pathActive: string;
  };
}

export const AGE_GROUP_CONFIG: Record<AgeGroup, AgeGroupDashboardConfig> = {
  TODDLER_1_3: {
    theme: { accent: '#f472b6', pathDone: '#ec4899', pathActive: '#f472b6' },
    personalizedPath: [
      { id: 'animal', title: 'Animal Sounds', meta: '100%', state: 'done' },
      { id: 'colors', title: 'Primary Colors', meta: '60%', state: 'active' },
      { id: 'count', title: 'Next: Counting 1–5', meta: '→', state: 'unlocked' },
      { id: 'songs', title: 'Future: Nursery Songs', meta: '', state: 'locked' },
    ],
    subjects: [
      { id: 'sensory', title: 'Sensory Play', mastery: 47, color: '#f472b6' },
      { id: 'nursery_rhymes', title: 'Nursery Rhymes', mastery: 49, color: '#a78bfa' },
      { id: 'visual_sound', title: 'Visual & Sound Games', mastery: 55, color: '#38bdf8' },
    ],
    analytics: {
      radar: [
        { skill: 'Sounds', value: 82 },
        { skill: 'Colors', value: 70 },
        { skill: 'Shapes', value: 58 },
        { skill: 'Motor Skills', value: 75 },
      ],
      treeRoot: 'Play Skills',
      treeMid: ['Audio', 'Visual'],
      treeLeaves: ['Touch', 'Tap', 'Listen →'],
    },
    upcomingGoals: [
      "Listen to 'Old MacDonald' song",
      'Pop 10 red balloons in Color Game',
      'Tap every animal sound once',
    ],
    aiChat: {
      tone: 'Nursery, encouraging, short sentences with emojis',
      placeholder: 'Tap or type a sound… 🐮',
      initialMessages: [
        {
          role: 'tutor',
          text: "Hi {name}! 🐥 Let's sing a song or tap the colorful shapes! What sound does a cow make?",
        },
      ],
      replyTemplate:
        'Moo! 🐮 Great listening, {name}! Want to try a duck 🦆 or find the red circle next?',
    },
  },

  EARLY_4_7: {
    theme: { accent: '#6366f1', pathDone: '#4f46e5', pathActive: '#6366f1' },
    personalizedPath: [
      { id: 'phonics', title: 'Phonics Basics', meta: '90%', state: 'done' },
      { id: 'sight', title: 'Sight Words', meta: '40%', state: 'active' },
      { id: 'add', title: 'Next: Simple Addition', meta: '→', state: 'unlocked' },
      { id: 'plants', title: 'Future: Plant Life', meta: '', state: 'locked' },
    ],
    subjects: [
      { id: 'early_reading', title: 'Early Reading', mastery: 78, color: '#6366f1', route: '/learn/reading' },
      { id: 'basic_math', title: 'Basic Math', mastery: 62, color: '#10b981', route: '/learn/math' },
      { id: 'fun_science', title: 'Fun Science', mastery: 45, color: '#22c55e' },
      { id: 'creative_arts', title: 'Creative Arts', mastery: 55, color: '#ec4899', route: '/learn/writing' },
    ],
    analytics: {
      radar: [
        { skill: 'Phonics', value: 88 },
        { skill: 'Counting', value: 72 },
        { skill: 'Writing', value: 61 },
        { skill: 'Curiosity', value: 80 },
      ],
      treeRoot: 'Early Skills',
      treeMid: ['Letters', 'Numbers'],
      treeLeaves: ['Sounds', 'Words', 'Add →'],
    },
    upcomingGoals: [
      'Spell 5 new sight words',
      'Complete Level 2 Addition',
      'Read one short story aloud',
    ],
    aiChat: {
      tone: 'Playful coach — short, clear, celebratory',
      placeholder: 'Type your answer…',
      initialMessages: [
        {
          role: 'tutor',
          text: "Hi {name}! 🌟 Ready for phonics or a quick counting game? What sound does B make?",
        },
      ],
      replyTemplate:
        'Nice try, {name}! ✨ Let’s practice together — open Early Reading or Basic Math when you’re ready.',
    },
  },

  UPPER_ELEM_8_10: {
    theme: { accent: '#0d9488', pathDone: '#0f766e', pathActive: '#0d9488' },
    personalizedPath: [
      { id: 'mult', title: 'Multiplication', meta: '85%', state: 'done' },
      { id: 'frac', title: 'Fractions', meta: '30%', state: 'active' },
      { id: 'div', title: 'Next: Division', meta: '→', state: 'unlocked' },
      { id: 'earth', title: 'Future: Earth Science', meta: '', state: 'locked' },
    ],
    subjects: [
      { id: 'mathematics', title: 'Mathematics', mastery: 72, color: '#0d9488', route: '/learn/math' },
      { id: 'language_arts', title: 'Language Arts', mastery: 65, color: '#ec4899', route: '/learn/writing' },
      { id: 'life_sciences', title: 'Life Sciences', mastery: 48, color: '#22c55e' },
      { id: 'coding_logic', title: 'Coding Logic', mastery: 40, color: '#6366f1' },
    ],
    analytics: {
      radar: [
        { skill: 'Multiply', value: 85 },
        { skill: 'Fractions', value: 55 },
        { skill: 'Grammar', value: 68 },
        { skill: 'Logic', value: 60 },
      ],
      treeRoot: 'Core Skills',
      treeMid: ['Math', 'Language'],
      treeLeaves: ['Fractions', 'Paragraphs', 'Code →'],
    },
    upcomingGoals: [
      'Finish Fractions Lesson 2',
      'Write a 5-sentence paragraph',
      'Solve 8 multiplication facts',
    ],
    aiChat: {
      tone: 'Friendly step-by-step coach with hints',
      placeholder: 'Ask about fractions, writing, or coding…',
      initialMessages: [
        {
          role: 'user',
          text: 'Can you help me with fractions?',
        },
        {
          role: 'tutor',
          text: "Absolutely, {name}! A fraction is a part of a whole — like 1/4 of a pizza. Want to try shading 2/4 next?",
        },
      ],
      replyTemplate:
        'Great question, {name}! Let’s break it into steps — open Mathematics or Language Arts for a full lesson. I’m here 24/7.',
    },
  },

  MIDDLE_11_14: {
    theme: { accent: '#4338ca', pathDone: '#3730a3', pathActive: '#4f46e5' },
    personalizedPath: [
      { id: 'alg', title: 'Algebra 2', meta: '85%', state: 'done' },
      { id: 'geo', title: 'Geometry', meta: '30%', state: 'active' },
      { id: 'trig', title: 'Next: Trigonometry', meta: '→', state: 'unlocked' },
      { id: 'phys', title: 'Future: Physics', meta: '', state: 'locked' },
    ],
    subjects: [
      { id: 'alg_geo', title: 'Algebra & Geometry', mastery: 70, color: '#0f766e', route: '/learn/math' },
      { id: 'chem_phys', title: 'Chemistry & Physics', mastery: 45, color: '#7c3aed' },
      { id: 'literature', title: 'Literature Analysis', mastery: 58, color: '#db2777', route: '/learn/reading' },
      { id: 'python', title: 'Python', mastery: 38, color: '#2563eb' },
    ],
    analytics: {
      radar: [
        { skill: 'Algebra', value: 88 },
        { skill: 'Geometry', value: 62 },
        { skill: 'Proofs', value: 54 },
        { skill: 'Equations', value: 81 },
      ],
      treeRoot: 'Core Math',
      treeMid: ['Algebra', 'Geometry'],
      treeLeaves: ['Equations', 'Proofs', 'Trig →'],
    },
    upcomingGoals: [
      'Complete Lesson 3 by Friday',
      'Practice 10 Geometry problems',
      'Review Algebra quiz mistakes',
    ],
    aiChat: {
      tone: 'Socratic, analytical, step-by-step math solver',
      placeholder: 'Ask about equations, proofs, or literature…',
      initialMessages: [
        {
          role: 'user',
          text: 'Can you explain the quadratic formula with examples?',
        },
        {
          role: 'tutor',
          text: "Absolutely! Let's break it down into steps. For ax² + bx + c = 0, the solutions are x = (−b ± √(b² − 4ac)) / 2a. Try a = 1, b = 5, c = 6.",
        },
      ],
      replyTemplate:
        'Solid question, {name}. Let’s reason through it step by step — open Algebra & Geometry when you want a full walkthrough.',
    },
  },
};

export function getAgeGroupDashboardConfig(ageGroup: AgeGroup): AgeGroupDashboardConfig {
  return AGE_GROUP_CONFIG[ageGroup] ?? AGE_GROUP_CONFIG.EARLY_4_7;
}
