import type { SignupRole, TeacherUser, UserRole } from './teacher.js';
import type {
  AppRole,
  PlanType,
  OrgType,
  PlatformUserPublic,
  OrganizationPublic,
} from './rbac.js';

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

export {
  formatStudyTime,
  streakFlames,
  toLocalDateString,
  startOfWeekMonday,
  addDays,
  daysBetween,
} from './activityStats.js';

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
  /** Consecutive active learning days */
  currentStreak: number;
  longestStreak: number;
  /** YYYY-MM-DD of last active day (local calendar) */
  lastActiveDate: string | null;
  /** Accumulated seconds studied in the current calendar week */
  timeStudiedThisWeek: number;
  lastWeekResetTimestamp: string | null;
}

export interface TrackActivityRequest {
  durationInSeconds: number;
  /** Client local ISO timestamp */
  timestamp: string;
  /** Client local calendar date YYYY-MM-DD */
  localDate?: string;
  /** IANA timezone optional */
  timeZone?: string;
}

export interface TrackActivityResponse {
  parent: ParentUser;
  currentStreak: number;
  longestStreak: number;
  timeStudiedThisWeek: number;
  timeStudiedFormatted: string;
}

export type LearningPathNodeStatus = 'COMPLETED' | 'IN_PROGRESS' | 'UNLOCKED' | 'LOCKED';

export interface LearningPathNode {
  id: string;
  title: string;
  status: LearningPathNodeStatus;
  masteryScore: number;
  sequenceOrder: number;
  subjectCategory: string;
  learnRoute: string | null;
  isReview: boolean;
  reviewOfNodeId: string | null;
  unlockHint?: string;
}

export interface LearningPathResponse {
  ageGroup: AgeGroup;
  nodes: LearningPathNode[];
}

export interface SubmitAssessmentRequest {
  nodeId: string;
  scorePercent: number;
}

export interface SubmitAssessmentResponse {
  path: LearningPathNode[];
  node: LearningPathNode | null;
}

export type SkillBranchStatus = 'mastered' | 'in_progress' | 'locked';

export interface AnalyticsSubjectItem {
  subjectId: string;
  subjectName: string;
  masteryPercentage: number;
  color: string;
  learnRoute: string | null;
  slug: string;
}

export interface AnalyticsRadarPoint {
  subject: string;
  skill: string;
  score: number;
  value: number;
  fullMark: number;
}

export interface SkillBranchNode {
  id: string;
  name: string;
  status: SkillBranchStatus;
  masteryScore: number;
  parentSkillId: string | null;
  children: SkillBranchNode[];
}

export interface UserGoalItem {
  id: string;
  title: string;
  isCompleted: boolean;
  dueDate: string | null;
}

export interface UserAnalyticsResponse {
  ageGroup: AgeGroup;
  subjects: AnalyticsSubjectItem[];
  radar: AnalyticsRadarPoint[];
  skillTree: SkillBranchNode | null;
  goals: UserGoalItem[];
}

export interface SkillAssessmentRequest {
  scorePercent: number;
  skillId?: string;
  skillTags?: string[];
  correct?: boolean;
}

export type CurriculumChapterStatus = 'COMPLETED' | 'IN_PROGRESS' | 'UNLOCKED' | 'LOCKED';

export interface CurriculumVideoItem {
  id: string;
  title: string;
  videoUrl: string;
  durationInSeconds: number;
  sequenceOrder: number;
  isCompleted: boolean;
  watchTimeSeconds: number;
  maxWatchedTime: number;
  isLocked: boolean;
}

export interface CurriculumChapterItem {
  id: string;
  title: string;
  sequenceOrder: number;
  status: CurriculumChapterStatus;
  videos: CurriculumVideoItem[];
  allVideosCompleted: boolean;
  quizUnlocked: boolean;
  quizPassed: boolean;
  quizScore: number | null;
}

export interface SubjectCurriculumResponse {
  subjectId: string;
  subjectName: string;
  color: string;
  ageGroup: AgeGroup;
  masteryPercentage: number;
  chapters: CurriculumChapterItem[];
}

export interface ChapterQuizQuestionPublic {
  id: string;
  prompt: string;
  options: string[];
}

export interface ChapterQuizResponse {
  chapterId: string;
  chapterTitle: string;
  subjectId: string;
  subjectName: string;
  questions: ChapterQuizQuestionPublic[];
}

export interface SubmitChapterQuizRequest {
  answers: { questionId: string; selectedIndex: number }[];
}

export interface SubmitChapterQuizResponse {
  result: {
    scorePercentage: number;
    isPassed: boolean;
    correct: number;
    total: number;
  };
  masteryPercentage: number;
  subjectId: string;
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
  role: UserRole;
  planType?: PlanType;
  organizationId?: string | null;
  user?: PlatformUserPublic;
  organization?: OrganizationPublic | null;
  parent?: ParentUser;
  teacher?: TeacherUser;
  curriculum?: CurriculumUpgradeEvent;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
  locale?: Locale;
  /** Required on signup — drives post-register routing and JWT role */
  role: SignupRole;
  /** ISO date string YYYY-MM-DD — required when role is student */
  dateOfBirth?: string;
  schoolName?: string;
  subjectFocus?: string;
  organizationName?: string;
  orgType?: OrgType;
  planType?: PlanType;
  /** Optional class invite code for students */
  classCode?: string;
  /** Optional parent link code for students */
  parentCode?: string;
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

export type {
  UserRole,
  SignupRole,
  TextbookStatus,
  DoubtStatus,
  TopicVideoStatus,
  TopicVideoJobStage,
  VideoAnimationCue,
  VideoScriptManifest,
  VideoSceneSpec,
  VideoSceneParameters,
  PedagogicalArchetype,
  SceneVisualType,
  TeacherUser,
  Textbook,
  TeacherChapter,
  TeacherSubtopic,
  AIResponse,
  StudentDoubt,
  TeacherChapterListResponse,
  TeacherDoubtsResponse,
  UploadTextbookRequest,
  UploadTextbookResponse,
  VerifyTextbookResponse,
  ReviewDoubtRequest,
  ReviewDoubtResponse,
  AttachSubtopicMediaRequest,
  TeacherAuthResponse,
  TeacherLoginRequest,
  TeacherRegisterRequest,
} from './teacher.js';

export type {
  AppRole,
  OrgType,
  PlanType,
  FeatureName,
  FeatureLimits,
  PlatformUserPublic,
  OrganizationPublic,
  ClassBatchPublic,
} from './rbac.js';

export {
  DEFAULT_PLAN_FOR_ROLE,
  HOME_PATH_FOR_ROLE,
  PLAN_LIMITS,
  STRIPE_PLAN_PRICES,
  RAZORPAY_PLAN_AMOUNTS_INR,
  homePathForRole,
  isAppRole,
  toAppRole,
  getPlanLimits,
  hasFeatureAccess,
  maxPdfBytes,
  maxPdfCount,
  isSubscriptionActive,
} from './rbac.js';
