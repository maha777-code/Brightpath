/** Teacher Dashboard domain models & API contracts */

export type { UserRole, SignupRole, AppRole, PlanType } from './rbac.js';
import type { PlanType } from './rbac.js';

export type TextbookStatus = 'UPLOADED' | 'VERIFYING' | 'INDEXED' | 'FAILED';

export type DoubtStatus = 'PENDING' | 'AI_DRAFT' | 'APPROVED' | 'OVERRIDDEN' | 'REJECTED';

export type TopicVideoStatus =
  | 'none'
  | 'generating'
  | 'pending_review'
  | 'published'
  | 'rejected'
  | 'failed';

export type TopicVideoJobStage =
  | 'queued'
  | 'retrieving'
  | 'scripting'
  | 'tts'
  | 'rendering'
  | 'done'
  | 'error';

export interface VideoAnimationCue {
  timeSec: number;
  label: string;
}

export type VisualArchetype =
  | 'split_comparison'
  | 'interactive_stage'
  | 'micro_zoom'
  | 'concept_card';

export interface VisualStageElement {
  name?: string;
  type?: string;
  color?: string;
}

export interface SceneVisualConfig {
  title?: string;
  leftLabel?: string;
  rightLabel?: string;
  primaryShape?: string;
  primaryColor?: string;
  secondaryColor?: string;
  calloutBadges?: string[];
  stageLabel?: string;
  elements?: VisualStageElement[];
  actionText?: string;
  headline?: string;
  particleMatrix?: { typeA?: string; typeB?: string };
  takeawayBadge?: string;
  lighting?: string;
  [key: string]: unknown;
}

export interface VideoSceneParameters {
  particleDensity?: string;
  temperature?: number;
  speedMultiplier?: number;
  showLabels?: string[];
  leftLabel?: string;
  rightLabel?: string;
  leftConcept?: string;
  rightConcept?: string;
  accentColor?: string;
  primaryObject?: string;
  primaryShape?: string;
  primaryColor?: string;
  secondaryColor?: string;
  container?: string;
  action?: string;
  actionText?: string;
  primarySubstance?: string;
  secondarySubstance?: string;
  liquidLevel?: number;
  solute?: string;
  waterLevelChanged?: boolean;
  particleTypeA?: string;
  particleTypeB?: string;
  primaryParticles?: string;
  secondaryParticles?: string;
  interstitialFitting?: boolean;
  takeawayBadge?: string;
  keyTakeaway?: string;
  headline?: string;
  title?: string;
  stageLabel?: string;
  calloutBadges?: string[];
  stepLabels?: string[];
  elements?: VisualStageElement[];
  particleMatrix?: { typeA?: string; typeB?: string };
  [key: string]: unknown;
}

export type PedagogicalArchetype = 'experiment' | 'comparison' | 'process' | 'concept';

export type SceneVisualType =
  | VisualArchetype
  | 'comparison_split'
  | 'question_card'
  | 'concept_hero'
  | 'lab_simulation'
  | '3d_beaker_experiment'
  | 'flow_step'
  | 'dynamic_diagram'
  | 'particle_zoom'
  | '3d_particle_zoom'
  | 'macro_reveal'
  | 'callout_summary'
  | string;

export interface VideoSceneSpec {
  sceneId: number;
  duration: number;
  /** LLM alias for duration — Remotion reads durationSec or duration. */
  durationSec?: number;
  voiceoverText: string;
  /** LLM alias for voiceoverText */
  voiceover?: string;
  /** Legacy Remotion animation key (kept for older compositions). */
  animationType: string;
  parameters: VideoSceneParameters;
  /** SweetRush pedagogical phase label */
  phase?: string;
  /** LLM alias for phase */
  phaseTitle?: string;
  /** Dynamic scene router key (legacy + mapped from visualArchetype) */
  visualType?: SceneVisualType;
  visualProps?: VideoSceneParameters;
  /** LLM alias for visualProps */
  props?: VideoSceneParameters;
  /** Universal SweetRush visual family */
  visualArchetype?: VisualArchetype | string;
  /** Parameter bag that drives generic 3D primitives */
  visualConfig?: SceneVisualConfig;
  /** Cartoon teacher performance cue */
  teacherGesture?: string;
  /** Movie camera move for this scene */
  cameraMotion?: string;
}

export interface VideoScriptManifest {
  topicTitle: string;
  totalDurationSeconds: number;
  scenes: VideoSceneSpec[];
  /** Pedagogical archetype classifier result */
  archetype?: PedagogicalArchetype;
  /** SweetRush pattern: lab_experiment | conceptual_comparison | process_flow */
  pedagogicalPattern?: string;
  wordTimings?: { word: string; start: number; end: number }[];
  /** On-screen cartoon host name */
  teacherName?: string;
}

export interface TeacherUser {
  id: string;
  email: string;
  name: string | null;
  schoolName: string | null;
  subjectFocus: string | null;
  createdAt: string;
  role: 'teacher';
  planType?: PlanType;
  organizationId?: string | null;
}

export interface Textbook {
  id: string;
  teacherId: string;
  title: string;
  fileName: string;
  fileSizeBytes: number;
  subject: string;
  gradeLabel: string;
  status: TextbookStatus;
  pageCount: number | null;
  indexedChunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherChapter {
  id: string;
  textbookId: string;
  title: string;
  sequenceOrder: number;
  summary: string;
  classProgressPct: number;
  studentCount: number;
  completedCount: number;
  videoCount: number;
  activityCount: number;
  subtopics: TeacherSubtopic[];
}

export interface GamifiedQuizQuestion {
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  xpReward: number;
}

export interface TeacherActivity {
  id: string;
  subtopicId: string;
  chapterId: string;
  type: 'gamified_quiz' | string;
  title: string;
  questions: GamifiedQuizQuestion[];
  totalXp: number;
  createdAt: string;
}

export interface TeacherSubtopic {
  id: string;
  chapterId: string;
  code: string;
  title: string;
  sequenceOrder: number;
  hasVideoExplainer: boolean;
  hasGamifiedActivity: boolean;
  videoTitle: string | null;
  activityTitle: string | null;
  videoUrl: string | null;
  videoStatus: TopicVideoStatus;
  videoProgress: number;
  videoJobStage: TopicVideoJobStage | null;
  videoError: string | null;
  generatedVideoUrl: string | null;
  videoAudioUrl: string | null;
  videoScript: string | null;
  animationCues: VideoAnimationCue[];
  videoManifest: VideoScriptManifest | null;
  activity?: TeacherActivity | null;
}

export interface GenerateActivityRequest {
  subtopicId: string;
  chapterId: string;
  type: 'gamified_quiz';
}

export interface GenerateActivityResponse {
  activity: TeacherActivity;
  subtopic: TeacherSubtopic;
}

export interface AIResponse {
  id: string;
  doubtId: string;
  answerText: string;
  groundedSources: string[];
  confidence: number;
  createdAt: string;
}

export interface StudentDoubt {
  id: string;
  chapterId: string;
  subtopicId: string | null;
  studentName: string;
  question: string;
  status: DoubtStatus;
  aiResponse: AIResponse | null;
  teacherOverrideText: string | null;
  pointsAwarded: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherChapterListResponse {
  textbook: Textbook | null;
  chapters: TeacherChapter[];
}

export interface TeacherDoubtsResponse {
  doubts: StudentDoubt[];
}

/** Metadata fields for textbook upload (PDF sent as multipart binary field `file`). */
export interface UploadTextbookRequest {
  title: string;
  subject?: string;
  gradeLabel?: string;
  fileName?: string;
}

export interface UploadTextbookResponse {
  textbook: Textbook;
  message: string;
}

export interface VerifyTextbookResponse {
  textbook: Textbook;
  chaptersCreated: number;
  message: string;
}

export interface ReviewDoubtRequest {
  action: 'approve' | 'override' | 'reject';
  teacherOverrideText?: string;
  pointsAwarded?: number;
}

export interface ReviewDoubtResponse {
  doubt: StudentDoubt;
}

export interface AttachSubtopicMediaRequest {
  videoTitle?: string;
  videoUrl?: string;
  activityTitle?: string;
  hasVideoExplainer?: boolean;
  hasGamifiedActivity?: boolean;
}

export interface TeacherAuthResponse {
  token: string;
  teacher: TeacherUser;
  role: 'teacher';
}

export interface TeacherLoginRequest {
  email: string;
  password: string;
}

export interface TeacherRegisterRequest {
  email: string;
  password: string;
  name?: string;
  schoolName?: string;
  subjectFocus?: string;
}
