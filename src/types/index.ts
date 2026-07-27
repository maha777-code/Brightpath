export type Subject = 'reading' | 'writing' | 'math';

export type AgeBand = '5-7' | '8-10' | '11-14';

export interface LearnerProfile {
  name: string;
  age: number;
  ageBand: AgeBand;
  subjects: Subject[];
  onboardingComplete: boolean;
}

export interface SkillProgress {
  subject: Subject;
  lessonsCompleted: number;
  streakDays: number;
  lastSession: string | null;
  masteryPercent: number;
}

export interface TutorMessage {
  id: string;
  role: 'tutor' | 'learner';
  content: string;
  timestamp: number;
  hint?: string;
  celebrate?: boolean;
}

export interface LessonStep {
  id: string;
  tutorPrompt: string;
  expectedPatterns?: RegExp[];
  acceptableAnswers?: string[];
  hint: string;
  explanation: string;
  skillTag: string;
}

export interface Lesson {
  id: string;
  subject: Subject;
  ageBand: AgeBand;
  title: string;
  description: string;
  durationMin: number;
  steps: LessonStep[];
}

export interface SessionState {
  lessonId: string;
  stepIndex: number;
  messages: TutorMessage[];
  correctCount: number;
  startedAt: number;
}

export function ageToBand(age: number): AgeBand {
  if (age <= 7) return '5-7';
  if (age <= 10) return '8-10';
  return '11-14';
}

export const SUBJECT_META: Record<Subject, { label: string; emoji: string; color: string }> = {
  reading: { label: 'Reading', emoji: '📖', color: '#6366F1' },
  writing: { label: 'Writing', emoji: '✏️', color: '#EC4899' },
  math: { label: 'Math', emoji: '🔢', color: '#10B981' },
};

export const AGE_BAND_LABELS: Record<AgeBand, string> = {
  '5-7': 'Early learners (5–7)',
  '8-10': 'Elementary (8–10)',
  '11-14': 'Middle grades (11–14)',
};
