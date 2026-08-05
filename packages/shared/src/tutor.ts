import type { AgeBand, Locale, Subject } from './index.js';

export interface TutorMessageInput {
  role: 'tutor' | 'learner';
  content: string;
}

export interface TutorStepContext {
  id: string;
  tutorPrompt: string;
  hint: string;
  explanation: string;
  skillTag: string;
  acceptableAnswers?: string[];
}

export interface TutorRespondRequest {
  childName: string;
  age: number;
  ageBand: AgeBand;
  locale: Locale;
  subject: Subject;
  lessonId: string;
  lessonTitle: string;
  stepIndex: number;
  totalSteps: number;
  step: TutorStepContext;
  studentAnswer: string;
  priorHintShown: boolean;
  history: TutorMessageInput[];
}

export interface TutorRespondResponse {
  message: string;
  isCorrect: boolean;
  advanceStep: boolean;
  showHint: boolean;
  sessionComplete: boolean;
  provider: 'gemini' | 'openai';
  /**
   * True when the answer shows a conceptual gap (not just a careless slip).
   * Client may inject Age 4–7 foundation practice without changing dashboard theme.
   */
  misconceptionDetected?: boolean;
  /** Optional skill tag from the EARLY / 5–7 foundation library */
  suggestedFoundationSkillTag?: string;
}

export interface TutorStatusResponse {
  llmAvailable: boolean;
  provider: 'gemini' | 'openai' | null;
  phase: 1;
  /** Server STT engine: deepgram when configured */
  sttEngine?: 'deepgram' | null;
}

export interface TutorGreetingRequest {
  childName: string;
  age: number;
  ageBand: AgeBand;
  locale: Locale;
  subject: Subject;
  lessonTitle: string;
  firstPrompt: string;
}

export interface TutorGreetingResponse {
  greeting: string;
  provider: 'gemini' | 'openai';
}
