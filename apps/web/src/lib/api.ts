const BASE = import.meta.env.VITE_API_URL ?? '/api';

function authHeaders(): HeadersInit {
  const token = localStorage.getItem('brightpath_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { ...authHeaders(), ...init?.headers },
    });
  } catch {
    throw new Error(
      'Cannot reach the API server. From the project root run: npm run dev (starts web + api). Check http://localhost:3001/health',
    );
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const msg =
      res.status === 413
        ? typeof err.error === 'string'
          ? err.error
          : 'File size exceeds the 80 MB limit. Please select a smaller PDF.'
        : res.status === 401
          ? 'Unauthorized — log out and log in again as parent'
          : typeof err.error === 'string'
            ? err.error
            : typeof err.message === 'string'
              ? err.message
              : res.statusText || 'Request failed';
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

import type {
  AuthResponse,
  RegisterRequest,
  LoginRequest,
  ParentUser,
  ChildProfile,
  CreateChildRequest,
  UpdateChildRequest,
  UpdateAgeSettingsRequest,
  CurriculumUpgradeEvent,
  TrackActivityRequest,
  TrackActivityResponse,
  LearningPathResponse,
  SubmitAssessmentRequest,
  SubmitAssessmentResponse,
  UserAnalyticsResponse,
  SkillAssessmentRequest,
  UserGoalItem,
  SubjectCurriculumResponse,
  ChapterQuizResponse,
  SubmitChapterQuizRequest,
  SubmitChapterQuizResponse,
  TutorRespondRequest,
  TutorRespondResponse,
  TutorStatusResponse,
  TutorGreetingRequest,
  TutorGreetingResponse,
  TeacherAuthResponse,
  TeacherLoginRequest,
  TeacherUser,
  TeacherChapterListResponse,
  TeacherDoubtsResponse,
  UploadTextbookRequest,
  UploadTextbookResponse,
  VerifyTextbookResponse,
  ReviewDoubtRequest,
  ReviewDoubtResponse,
  AttachSubtopicMediaRequest,
  TeacherSubtopic,
  TeacherChapter,
  UserRole,
} from '@brightpath/shared';

export const api = {
  register: (body: RegisterRequest) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),

  login: (body: LoginRequest) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),

  me: () =>
    request<{
      parent?: ParentUser;
      teacher?: TeacherUser;
      role?: UserRole;
      curriculum?: CurriculumUpgradeEvent;
    }>('/auth/me'),

  updateAgeSettings: (body: UpdateAgeSettingsRequest) =>
    request<{ parent: ParentUser; curriculum: CurriculumUpgradeEvent }>('/auth/age-settings', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  trackActivity: (body: TrackActivityRequest) =>
    request<TrackActivityResponse>('/user/track-activity', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  userStats: () =>
    request<TrackActivityResponse>('/user/stats'),

  getLearningPath: () => request<LearningPathResponse>('/user/learning-path'),

  submitAssessment: (body: SubmitAssessmentRequest) =>
    request<SubmitAssessmentResponse>('/user/submit-assessment', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getAnalytics: () => request<UserAnalyticsResponse>('/user/analytics'),

  submitSkillAssessment: (body: SkillAssessmentRequest) =>
    request<UserAnalyticsResponse>('/user/skill-assessment', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  completeGoal: (goalId: string) =>
    request<{ goal: UserGoalItem; analytics: UserAnalyticsResponse | null }>(
      `/user/goals/${goalId}`,
      { method: 'PATCH', body: '{}' },
    ),

  getSubjectCurriculum: (subjectId: string) =>
    request<SubjectCurriculumResponse>(`/curriculum/subjects/${subjectId}`),

  trackVideoProgress: (body: {
    videoId: string;
    watchTimeSeconds: number;
    maxWatchedTime: number;
  }) =>
    request<{
      videoId: string;
      watchTimeSeconds: number;
      maxWatchedTime: number;
      isCompleted: boolean;
    }>('/curriculum/video/track-progress', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  completeVideo: (body: { videoId: string; maxWatchedTime: number }) =>
    request<{
      progress: { isCompleted: boolean };
      masteryPercentage: number;
      subjectId: string;
    }>('/curriculum/video/complete', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getChapterQuiz: (chapterId: string) =>
    request<ChapterQuizResponse>(`/curriculum/chapters/${chapterId}/quiz`),

  submitChapterQuiz: (chapterId: string, body: SubmitChapterQuizRequest) =>
    request<SubmitChapterQuizResponse>(`/curriculum/chapters/${chapterId}/quiz`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  listChildren: () => request<{ children: ChildProfile[] }>('/children'),

  createChild: (body: CreateChildRequest) =>
    request<{ child: ChildProfile }>('/children', { method: 'POST', body: JSON.stringify(body) }),

  updateChild: (id: string, body: UpdateChildRequest) =>
    request<{ child: ChildProfile }>(`/children/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  deleteChild: (id: string) =>
    request<void>(`/children/${id}`, { method: 'DELETE' }),

  tutorStatus: () => request<TutorStatusResponse>('/tutor/status'),

  tutorGreeting: (body: TutorGreetingRequest) =>
    request<TutorGreetingResponse>('/tutor/greeting', { method: 'POST', body: JSON.stringify(body) }),

  tutorRespond: (body: TutorRespondRequest) =>
    request<TutorRespondResponse>('/tutor/respond', { method: 'POST', body: JSON.stringify(body) }),

  tutorWarmup: () =>
    request<{ ok: boolean; provider: string }>('/tutor/warmup', { method: 'POST', body: '{}' }),

  teacherLogin: (body: TeacherLoginRequest) =>
    request<TeacherAuthResponse>('/auth/teacher/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  teacherMe: () =>
    request<{ teacher: TeacherUser; role: 'teacher' }>('/auth/teacher/me'),

  teacherChapters: () =>
    request<TeacherChapterListResponse>('/teacher/chapters'),

  teacherChapter: (id: string) =>
    request<{ chapter: TeacherChapter }>(`/teacher/chapters/${id}`),

  uploadTextbook: (body: UploadTextbookRequest) =>
    request<UploadTextbookResponse>('/teacher/textbooks/upload', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  verifyTextbook: (id: string) =>
    request<VerifyTextbookResponse>(`/teacher/textbooks/${id}/verify`, {
      method: 'POST',
      body: '{}',
    }),

  teacherDoubts: (status?: string) =>
    request<TeacherDoubtsResponse>(
      status ? `/teacher/doubts?status=${encodeURIComponent(status)}` : '/teacher/doubts',
    ),

  reviewDoubt: (id: string, body: ReviewDoubtRequest) =>
    request<ReviewDoubtResponse>(`/teacher/doubts/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateSubtopicMedia: (id: string, body: AttachSubtopicMediaRequest) =>
    request<{ subtopic: TeacherSubtopic }>(`/teacher/subtopics/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  tutorTranscribe: async (
    audioBlob: Blob,
    mimeType: string,
    locale?: string,
    browserTranscript?: string,
    durationSec?: number,
  ) => {
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const comma = result.indexOf(',');
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = () => reject(new Error('Failed to read audio'));
      reader.readAsDataURL(audioBlob);
    });

    return request<{ text: string; source?: string }>('/tutor/transcribe', {
      method: 'POST',
      body: JSON.stringify({ audioBase64: base64, mimeType, locale, browserTranscript, durationSec }),
    });
  },
};

export function saveAuth(
  token: string,
  parent: ParentUser,
  role: Extract<UserRole, 'parent' | 'student'> = 'student',
) {
  localStorage.setItem('brightpath_token', token);
  localStorage.setItem('brightpath_parent', JSON.stringify(parent));
  localStorage.setItem('brightpath_role', role);
  localStorage.removeItem('brightpath_teacher');
}

export function saveTeacherAuth(token: string, teacher: TeacherUser) {
  localStorage.setItem('brightpath_token', token);
  localStorage.setItem('brightpath_teacher', JSON.stringify(teacher));
  localStorage.setItem('brightpath_role', 'teacher');
  localStorage.removeItem('brightpath_parent');
}

export function clearAuth() {
  localStorage.removeItem('brightpath_token');
  localStorage.removeItem('brightpath_parent');
  localStorage.removeItem('brightpath_teacher');
  localStorage.removeItem('brightpath_role');
}

export function loadStoredRole(): UserRole | null {
  const role = localStorage.getItem('brightpath_role');
  return role === 'teacher' || role === 'parent' || role === 'student' ? role : null;
}

export function isLearnerRole(role: UserRole | null | undefined): boolean {
  return role === 'parent' || role === 'student';
}

export function loadStoredTeacher(): TeacherUser | null {
  try {
    const raw = localStorage.getItem('brightpath_teacher');
    return raw ? (JSON.parse(raw) as TeacherUser) : null;
  } catch {
    return null;
  }
}

export function loadStoredParent(): ParentUser | null {
  try {
    const raw = localStorage.getItem('brightpath_parent');
    if (!raw) return null;
    const p = JSON.parse(raw) as ParentUser;
    return {
      ...p,
      dateOfBirth: p.dateOfBirth ?? null,
      calculatedAgeGroup: p.calculatedAgeGroup ?? null,
      unlockedSubjects: p.unlockedSubjects ?? [],
      currentAge: p.currentAge ?? null,
      currentStreak: p.currentStreak ?? 0,
      longestStreak: p.longestStreak ?? 0,
      lastActiveDate: p.lastActiveDate ?? null,
      timeStudiedThisWeek: p.timeStudiedThisWeek ?? 0,
      lastWeekResetTimestamp: p.lastWeekResetTimestamp ?? null,
    };
  } catch {
    return null;
  }
}

export function loadStoredToken(): string | null {
  return localStorage.getItem('brightpath_token');
}
