import { request } from '@/lib/api';

export type OrgUnit = { id: string; name: string; kind: 'grade' | 'department' | 'course'; sortOrder: number };

export type RosterClass = {
  id: string;
  name: string;
  subject: string | null;
  gradeLevel: string | null;
  orgUnitId: string | null;
  inviteCode: string;
  teacher: { id: string; name: string | null; email: string };
  studentCount: number;
  createdAt: string;
};

export type RosterOverview = {
  organization: {
    id: string;
    name: string;
    type: 'school' | 'tutor_center';
    maxLicenses: number;
    seatsUsed: number | null;
  } | null;
  canManageOrg: boolean;
  units: OrgUnit[];
  classes: RosterClass[];
  teachers: { id: string; name: string | null; email: string; subjectFocus: string | null }[];
};

export type StudentProfile = {
  gradeLevel: string | null;
  board: string | null;
  preferredLanguage: string | null;
  readingLevel: 'below_grade' | 'at_grade' | 'above_grade' | null;
  accommodations: string[];
  learningPreferences: string[];
  notes: string;
};

export type RosterStudent = {
  id: string;
  name: string | null;
  email: string;
  joinedAt: string;
  profile: StudentProfile;
  lastSharadaAt: string | null;
  openAlerts: number;
};

export type ImportRow = { name: string; email: string; gradeLevel?: string; board?: string; preferredLanguage?: string };

export type ImportResult = {
  created: { name: string; email: string; tempPassword: string; inviteSent: boolean }[];
  enrolledExisting: { name: string; email: string }[];
  skipped: { email: string; reason: string }[];
};

export type ClassInput = {
  name: string;
  subject?: string | null;
  gradeLevel?: string | null;
  orgUnitId?: string | null;
  teacherId?: string;
};

export type TutorSessionSummary = {
  id: string;
  title: string;
  subject: string | null;
  chapter: string | null;
  topic: string | null;
  summary: string;
  messageCount: number;
  flagCount: number;
  classBatchId: string | null;
  startedAt: string;
  lastMessageAt: string;
  isLive: boolean;
};

export type OversightSession = TutorSessionSummary & {
  student: { id: string; name: string | null; email: string };
  className: string | null;
};

export type TutorMessage = { id: string; sender: 'student' | 'sharada'; content: string; flags: string[]; createdAt: string };

export type SafetyAlert = {
  id: string;
  sessionId: string;
  messageId: string | null;
  studentUserId: string;
  category: 'distress' | 'harm' | 'inappropriate' | 'academic_dishonesty';
  severity: 'low' | 'medium' | 'high';
  excerpt: string;
  reason: string;
  status: 'open' | 'reviewed' | 'dismissed';
  notifiedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  sessionTitle?: string;
  studentName?: string;
  className?: string | null;
};

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

export const rosterApi = {
  joinInfo: (code: string) =>
    request<{ code: string; className: string; subject: string | null; teacherName: string | null; organizationName: string | null }>(
      `/roster/join/${encodeURIComponent(code)}`,
    ),
  overview: () => request<RosterOverview>('/roster/overview'),
  createUnit: (body: { name: string; kind?: OrgUnit['kind'] }) => request<{ unit: OrgUnit }>('/roster/units', json('POST', body)),
  deleteUnit: (id: string) => request<{ ok: true }>(`/roster/units/${id}`, json('DELETE')),
  createClass: (body: ClassInput) => request<{ classBatch: RosterClass }>('/roster/classes', json('POST', body)),
  updateClass: (id: string, body: Partial<ClassInput>) =>
    request<{ classBatch: RosterClass }>(`/roster/classes/${id}`, json('PATCH', body)),
  rotateCode: (id: string) => request<{ classBatch: RosterClass }>(`/roster/classes/${id}/rotate-code`, json('POST')),
  deleteClass: (id: string) => request<{ ok: true }>(`/roster/classes/${id}`, json('DELETE')),
  classStudents: (id: string) => request<{ students: RosterStudent[] }>(`/roster/classes/${id}/students`),
  importStudents: (id: string, rows: ImportRow[], sendInvites: boolean) =>
    request<ImportResult>(`/roster/classes/${id}/students/import`, { ...json('POST', { rows, sendInvites }), timeoutMs: 120_000 }),
  removeStudent: (classId: string, studentId: string) =>
    request<{ ok: true }>(`/roster/classes/${classId}/students/${studentId}`, json('DELETE')),
  updateProfile: (studentId: string, profile: Partial<StudentProfile>) =>
    request<{ profile: StudentProfile }>(`/roster/students/${studentId}/profile`, json('PUT', profile)),
};

export const sharadaStudentApi = {
  context: () => request<{ classes: { id: string; name: string; subject: string | null }[] }>('/sharada/student/context'),
  sessions: () => request<{ sessions: TutorSessionSummary[] }>('/sharada/student/sessions'),
  createSession: (classBatchId?: string | null) =>
    request<{ session: TutorSessionSummary }>('/sharada/student/sessions', json('POST', { classBatchId: classBatchId ?? null })),
  session: (id: string) => request<{ session: TutorSessionSummary; messages: TutorMessage[] }>(`/sharada/student/sessions/${id}`),
  send: (id: string, content: string) =>
    request<{ studentMessage: TutorMessage; sharadaMessage: TutorMessage; session: TutorSessionSummary }>(
      `/sharada/student/sessions/${id}/messages`,
      { ...json('POST', { content }), timeoutMs: 90_000 },
    ),
};

export const oversightApi = {
  summary: () =>
    request<{ activeNow: number; sessionsThisWeek: number; openAlerts: number; highAlerts: number }>('/sharada/oversight/summary'),
  sessions: (filters: { classId?: string; studentId?: string; flagged?: boolean; live?: boolean } = {}) => {
    const qs = new URLSearchParams();
    if (filters.classId) qs.set('classId', filters.classId);
    if (filters.studentId) qs.set('studentId', filters.studentId);
    if (filters.flagged) qs.set('flagged', '1');
    if (filters.live) qs.set('live', '1');
    const suffix = qs.toString() ? `?${qs}` : '';
    return request<{ sessions: OversightSession[] }>(`/sharada/oversight/sessions${suffix}`);
  },
  session: (id: string, after?: string) =>
    request<{ session: OversightSession; messages: TutorMessage[]; alerts: SafetyAlert[] }>(
      `/sharada/oversight/sessions/${id}${after ? `?after=${encodeURIComponent(after)}` : ''}`,
    ),
  alerts: (status?: SafetyAlert['status']) =>
    request<{ alerts: SafetyAlert[] }>(`/sharada/oversight/alerts${status ? `?status=${status}` : ''}`),
  setAlertStatus: (id: string, status: SafetyAlert['status']) =>
    request<{ alert: SafetyAlert }>(`/sharada/oversight/alerts/${id}`, json('PATCH', { status })),
};
