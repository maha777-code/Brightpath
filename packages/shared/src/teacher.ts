/** Teacher Dashboard domain models & API contracts */

export type UserRole = 'parent' | 'teacher';

export type TextbookStatus = 'UPLOADED' | 'VERIFYING' | 'INDEXED' | 'FAILED';

export type DoubtStatus = 'PENDING' | 'AI_DRAFT' | 'APPROVED' | 'OVERRIDDEN' | 'REJECTED';

export interface TeacherUser {
  id: string;
  email: string;
  name: string | null;
  schoolName: string | null;
  subjectFocus: string | null;
  createdAt: string;
  role: 'teacher';
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

export interface UploadTextbookRequest {
  title: string;
  subject?: string;
  gradeLabel?: string;
  fileName: string;
  /** Base64-encoded PDF (no data: prefix) */
  fileBase64: string;
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
