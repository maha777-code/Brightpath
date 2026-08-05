/** Supported locales — India, US, UAE (Dubai), Kuwait */
export type Locale = 'en-IN' | 'en-US' | 'hi-IN' | 'ar-AE' | 'ar-KW';

export const LOCALES: Locale[] = ['en-IN', 'en-US', 'hi-IN', 'ar-AE', 'ar-KW'];

export const LOCALE_LABELS: Record<Locale, string> = {
  'en-IN': 'English (India)',
  'en-US': 'English (US)',
  'hi-IN': 'हिन्दी (India)',
  'ar-AE': 'العربية (UAE)',
  'ar-KW': 'العربية (Kuwait)',
};

export const RTL_LOCALES: Locale[] = ['ar-AE', 'ar-KW'];

export const SUBJECTS = [
  'reading', 'writing', 'math', 'science', 'social',
  'geometry', 'civics', 'economics', 'biology', 'chemistry', 'physics',
] as const;

export type Subject = (typeof SUBJECTS)[number];

export type AgeBand = '5-7' | '8-10' | '11-14' | '15-18';

export function ageToBand(age: number): AgeBand {
  if (age <= 7) return '5-7';
  if (age <= 10) return '8-10';
  if (age <= 14) return '11-14';
  return '15-18';
}

export type {
  AgeGroup,
  CurriculumSubject,
  AgePersona,
} from './ageCurriculum.js';

export {
  AGE_GROUPS,
  AGE_GROUP_LABELS,
  AGE_GROUP_LEVEL_NAMES,
  CURRICULUM_BY_AGE_GROUP,
  PERSONA_BY_AGE_GROUP,
  getAgeFromDOB,
  getAgeGroupFromAge,
  getAgeGroupFromDOB,
  subjectsForAgeGroup,
  mergeUnlockedSubjects,
  resolveCurriculumSubjects,
  ageGroupToLegacyBand,
  legacyBandToAgeGroup,
} from './ageCurriculum.js';

import type { AgeGroup } from './ageCurriculum.js';

export interface ParentUser {
  id: string;
  email: string;
  name: string | null;
  locale: Locale;
  createdAt: string;
  dateOfBirth: string | null;
  calculatedAgeGroup: AgeGroup | null;
  unlockedSubjects: string[];
  currentAge: number | null;
}

export interface ChildProfile {
  id: string;
  parentId: string;
  name: string;
  age: number;
  ageBand: AgeBand;
  dateOfBirth: string | null;
  calculatedAgeGroup: AgeGroup;
  unlockedSubjects: string[];
  subjects: Subject[];
  locale: Locale;
  createdAt: string;
}

export interface CurriculumUpgradeEvent {
  upgraded: boolean;
  previousGroup: AgeGroup | null;
  newGroup: AgeGroup;
  unlockedSubjects: string[];
  currentAge: number;
  message?: string;
}

export interface AuthResponse {
  token: string;
  parent: ParentUser;
  curriculum?: CurriculumUpgradeEvent;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
  locale?: Locale;
  /** ISO date string YYYY-MM-DD — required for age-based curriculum */
  dateOfBirth: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateAgeSettingsRequest {
  dateOfBirth?: string;
  /** Manual override — if set, forces this group (optionally with DOB) */
  ageGroup?: AgeGroup;
}

export interface CreateChildRequest {
  name: string;
  age?: number;
  dateOfBirth?: string;
  subjects: Subject[];
  locale?: Locale;
}

export interface UpdateChildRequest {
  name?: string;
  age?: number;
  dateOfBirth?: string;
  subjects?: Subject[];
  locale?: Locale;
}

export type {
  TutorMessageInput,
  TutorStepContext,
  TutorRespondRequest,
  TutorRespondResponse,
  TutorStatusResponse,
  TutorGreetingRequest,
  TutorGreetingResponse,
} from './tutor.js';
