export const CLASSROOM_BANNER_THEMES = ['blue', 'green', 'purple', 'rose', 'amber', 'teal'] as const;
export type ClassroomBannerTheme = (typeof CLASSROOM_BANNER_THEMES)[number];

export type ClassroomMemberRole = 'teacher' | 'student' | 'guardian';
export type ClassroomPostType = 'announcement' | 'assignment' | 'question' | 'material' | 'quiz';
export type ClassroomSubmissionStatus = 'assigned' | 'turned_in' | 'missing' | 'returned';
export type ClassroomGradingMode = 'points' | 'weighted';
export type ClassroomDigestCadence = 'off' | 'daily' | 'weekly';
export type ClassroomViewAs = 'teacher' | 'student';

export interface ClassroomPerson {
  id: string;
  name: string;
  email: string;
  role: ClassroomMemberRole;
}

export interface ClassroomClass {
  id: string;
  title: string;
  section: string;
  subject: string;
  room: string;
  code: string;
  inviteToken: string;
  bannerTheme: ClassroomBannerTheme;
  meetLink: string;
  archived: boolean;
  ownerId: string;
  gradingMode: ClassroomGradingMode;
  weights: { category: string; percent: number }[];
  guardianDigest: ClassroomDigestCadence;
  createdAt: string;
}

export interface ClassroomMember {
  id: string;
  classId: string;
  userId: string;
  role: ClassroomMemberRole;
  muted: boolean;
}

export interface ClassroomTopic {
  id: string;
  classId: string;
  name: string;
}

export interface ClassroomRubricLevel {
  label: string;
  points: number;
  descriptor: string;
}

export interface ClassroomRubricCriterion {
  name: string;
  points: number;
  levels: ClassroomRubricLevel[];
}

export interface ClassroomPost {
  id: string;
  classId: string;
  authorId: string;
  type: ClassroomPostType;
  title: string;
  body: string;
  topicId?: string;
  points?: number;
  dueAt?: string;
  category?: string;
  youtubeUrl?: string;
  driveUrl?: string;
  webUrl?: string;
  fileName?: string;
  makeCopyForEachStudent?: boolean;
  questionKind?: 'short' | 'multiple';
  choices?: string[];
  rubric?: ClassroomRubricCriterion[];
  createdAt: string;
}

export interface ClassroomComment {
  id: string;
  postId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

export interface ClassroomSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  status: ClassroomSubmissionStatus;
  workText: string;
  fileName?: string;
  grade?: number;
  privateComment?: string;
  originality?: { score: number; note: string };
  turnedInAt?: string;
  returnedAt?: string;
}

export interface ClassroomGuardianEmail {
  id: string;
  classId: string;
  to: string;
  subject: string;
  body: string;
  at: string;
}

export interface ClassroomWorkspace {
  people: ClassroomPerson[];
  classes: ClassroomClass[];
  members: ClassroomMember[];
  topics: ClassroomTopic[];
  posts: ClassroomPost[];
  comments: ClassroomComment[];
  submissions: ClassroomSubmission[];
  guardianEmails: ClassroomGuardianEmail[];
}

export interface ClassroomActor {
  id: string;
  name: string;
  email: string;
}

export interface ClassroomStateResponse {
  actor: ClassroomActor;
  workspace: ClassroomWorkspace;
}

export type ClassroomAction =
  | {
      type: 'create_class';
      title: string;
      section?: string;
      subject?: string;
      room?: string;
      bannerTheme?: ClassroomBannerTheme;
    }
  | { type: 'update_class'; classId: string; patch: Partial<ClassroomClass> }
  | { type: 'archive_class'; classId: string }
  | { type: 'restore_class'; classId: string }
  | { type: 'join_class'; code?: string; inviteToken?: string }
  | { type: 'invite_member'; classId: string; name: string; email: string; role: ClassroomMemberRole }
  | { type: 'mute_member'; memberId: string; muted: boolean }
  | { type: 'remove_member'; memberId: string }
  | { type: 'create_topic'; classId: string; name: string }
  | {
      type: 'create_post';
      classId: string;
      postType: ClassroomPostType;
      title: string;
      body: string;
      topicId?: string;
      points?: number;
      dueAt?: string;
      category?: string;
      youtubeUrl?: string;
      driveUrl?: string;
      webUrl?: string;
      fileName?: string;
      makeCopyForEachStudent?: boolean;
      questionKind?: 'short' | 'multiple';
      choices?: string[];
      rubric?: ClassroomRubricCriterion[];
    }
  | { type: 'add_comment'; postId: string; body: string }
  | { type: 'delete_comment'; commentId: string }
  | { type: 'submit_work'; assignmentId: string; studentId?: string; workText: string; fileName?: string }
  | {
      type: 'grade_submission';
      submissionId: string;
      grade: number;
      privateComment?: string;
      returnWork?: boolean;
    }
  | { type: 'generate_rubric'; topic: string }
  | { type: 'send_guardian_digest'; classId: string };

export interface ClassroomActionResponse extends ClassroomStateResponse {
  generated?: { instructions: string; rubric: ClassroomRubricCriterion[] };
}

export function emptyClassroomWorkspace(): ClassroomWorkspace {
  return {
    people: [],
    classes: [],
    members: [],
    topics: [],
    posts: [],
    comments: [],
    submissions: [],
    guardianEmails: [],
  };
}

export function classroomCode(): string {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';
  return Array.from({ length: 7 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
}

export function classroomMeetLink(code: string): string {
  return `https://meet.google.com/lookup/${code}`;
}

export function submissionStats(submissions: ClassroomSubmission[]) {
  return {
    assigned: submissions.filter((item) => item.status === 'assigned').length,
    turnedIn: submissions.filter((item) => item.status === 'turned_in').length,
    missing: submissions.filter((item) => item.status === 'missing').length,
    returned: submissions.filter((item) => item.status === 'returned').length,
  };
}
