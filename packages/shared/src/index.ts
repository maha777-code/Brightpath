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

export interface ParentUser {
  id: string;
  email: string;
  name: string | null;
  locale: Locale;
  createdAt: string;
}

export interface ChildProfile {
  id: string;
  parentId: string;
  name: string;
  age: number;
  ageBand: AgeBand;
  subjects: Subject[];
  locale: Locale;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  parent: ParentUser;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
  locale?: Locale;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CreateChildRequest {
  name: string;
  age: number;
  subjects: Subject[];
  locale?: Locale;
}

export interface UpdateChildRequest {
  name?: string;
  age?: number;
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
