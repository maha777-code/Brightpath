/** Absolute API origin, or same-host `/api` when no production API URL is configured. */
const rawBaseUrl =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'https://brightpath-2-4q2s.onrender.com';
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

const REQUEST_TIMEOUT_MS = 45_000;
const COLD_START_MESSAGE =
  'Server is waking up from a cold start. Please try again in a few seconds.';
const WAKE_MESSAGE =
  'Unable to reach server. If the server is spinning up, please wait 30 seconds and try again.';

function apiUrl(endpoint: string): string {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${path}`;
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}

function isLocalHost(): boolean {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  return host === 'localhost' || host === '127.0.0.1';
}

function networkMessage(err: unknown): string {
  if (isLocalHost()) {
    return 'Cannot reach the API server. From the project root run: npm run dev (starts web + api). Check http://localhost:3001/health';
  }
  if (isAbortError(err)) return COLD_START_MESSAGE;
  return WAKE_MESSAGE;
}

/** Fetch with a 45s timeout and one retry so a sleeping Render service can finish booting. */
export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const url = apiUrl(endpoint);
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal,
      });
    } catch (err) {
      lastError = err;
      const retryable = !options.signal?.aborted && (isAbortError(err) || err instanceof TypeError);
      if (attempt === 0 && retryable) continue;
      console.error('API request failed', url, err);
      throw new Error(networkMessage(err));
    } finally {
      clearTimeout(timeoutId);
    }
  }
  throw new Error(networkMessage(lastError));
}

function authHeaders(json = true): HeadersInit {
  const token = localStorage.getItem('brightpath_token');
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function errorText(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value && typeof value === 'object') {
    const flat = value as { formErrors?: string[]; fieldErrors?: Record<string, string[]> };
    const parts = [
      ...(Array.isArray(flat.formErrors) ? flat.formErrors : []),
      ...Object.values(flat.fieldErrors ?? {}).flat(),
    ].filter((part): part is string => typeof part === 'string' && part.trim().length > 0);
    if (parts.length) return parts.join(' ');
  }
  return null;
}

async function parseError(res: Response): Promise<string> {
  const raw = await res.text();
  const contentType = res.headers.get('content-type') ?? '';
  let payload: { error?: unknown; message?: unknown } = {};
  if (raw && !contentType.includes('text/html') && !raw.trimStart().startsWith('<')) {
    try {
      payload = JSON.parse(raw) as { error?: unknown; message?: unknown };
    } catch {
      payload = {};
    }
  }
  const message = errorText(payload.error) || errorText(payload.message);
  if (message) return message;
  if (res.status === 413) {
    return 'File size exceeds the 80 MB limit. Please select a smaller PDF.';
  }
  if (
    contentType.includes('text/html') ||
    raw.trimStart().startsWith('<') ||
    res.status === 404 ||
    res.status === 405
  ) {
    console.error('API request returned a non-API response', {
      status: res.status,
      url: res.url,
      contentType,
    });
    return `Sign-in could not reach the API (HTTP ${res.status}). This site is serving the website only.`;
  }
  console.error('API request failed', { status: res.status, url: res.url, body: raw.slice(0, 300) });
  return res.statusText || 'Request failed';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await apiFetch(path, {
      ...init,
      credentials: 'include',
      headers: { ...authHeaders(true), ...init?.headers },
    });
  } catch (err) {
    console.error('API request failed', path, err);
    if (err instanceof Error) throw err;
    throw new Error(networkMessage(err));
  }
  if (!res.ok) throw new Error(await parseError(res));
  if (res.status === 204) return undefined as T;
  const raw = await res.text();
  if (!raw) return undefined as T;
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error('API response was not JSON', path, err);
    throw new Error(networkMessage(err));
  }
}

/** Multipart upload — do not set Content-Type (browser sets boundary). */
async function requestFormData<T>(path: string, form: FormData): Promise<T> {
  let res: Response;
  try {
    res = await apiFetch(path, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(false),
      body: form,
    });
  } catch (err) {
    console.error('API upload failed', path, err);
    if (err instanceof Error) throw err;
    throw new Error(networkMessage(err));
  }
  if (!res.ok) throw new Error(await parseError(res));
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
  AttachSubtopicFilesResponse,
  TeacherSubtopic,
  TeacherChapter,
  Textbook,
  TeacherToolsCatalogResponse,
  ToggleTeacherToolFavoriteResponse,
  QuizGeneratorPayload,
  QuizGeneratorResponse,
  WorksheetGeneratorPayload,
  WorksheetGeneratorResponse,
  WorksheetHistoryResponse,
  TeacherToolFeedbackPayload,
  TeacherToolFeedbackResponse,
  WorksheetRefinePayload,
  WorksheetTranslatePayload,
  LessonPlanPayload,
  LessonPlanResponse,
  SharadaChatRequest,
  SharadaChatResponse,
  EmailResponderRequest,
  EmailResponderResponse,
  SongLyricsPayload,
  SongLyricsDraft,
  SongRenderPayload,
  TeacherSong,
  TeacherSongsListResponse,
  SongDeleteResponse,
  GenerateActivityRequest,
  GenerateActivityResponse,
  GenerationTemplate,
  UserRole,
  PlanType,
  PlatformUserPublic,
  OrganizationPublic,
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
      planType?: PlanType;
      organizationId?: string | null;
      user?: PlatformUserPublic;
      organization?: OrganizationPublic | null;
      curriculum?: CurriculumUpgradeEvent;
    }>('/auth/me'),

  orgMe: () =>
    request<{
      organization: OrganizationPublic;
      stats: {
        memberCount: number;
        tutorCount: number;
        batchCount: number;
        seatsUsed: number;
        maxLicenses: number;
        subjects: {
          subject: string;
          instructor: string;
          syllabusProgress: number;
          quizzesConducted: number;
          assignmentsGiven: number;
          nextTestDate: string | null;
        }[];
      };
    }>('/auth/org/me'),

  parentLinkCode: () => request<{ parentLinkCode: string }>('/auth/parent/link-code'),

  rotateParentLinkCode: () =>
    request<{ parentLinkCode: string }>('/auth/parent/link-code/rotate', {
      method: 'POST',
      body: '{}',
    }),

  linkedStudents: () =>
    request<{
      students: { id: string; email: string; name: string | null; planType: string }[];
    }>('/auth/parent/linked-students'),

  joinClass: (classCode: string) =>
    request<{ ok: boolean; classBatch: { id: string; name: string; inviteCode: string } }>(
      '/auth/student/join-class',
      { method: 'POST', body: JSON.stringify({ classCode }) },
    ),

  createBatch: (name: string) =>
    request<{
      classBatch: {
        id: string;
        name: string;
        inviteCode: string;
        teacherId: string;
        organizationId: string | null;
      };
    }>('/auth/teacher/batches', { method: 'POST', body: JSON.stringify({ name }) }),

  bulkImportUsers: (body: {
    rows: { name: string; email: string; classGrade?: string; role: 'student' | 'teacher' }[];
    sendInvites?: boolean;
  }) =>
    request<{
      createdCount: number;
      skippedCount: number;
      created: { email: string; role: string; tempPassword: string; inviteSent: boolean }[];
      skipped: { email: string; reason: string }[];
    }>('/admin/users/bulk-import', { method: 'POST', body: JSON.stringify(body) }),

  ownerOverview: () =>
    request<{
      subscribers: { planType: string; count: number }[];
      feedback: {
        id: string;
        email: string;
        planType: string;
        rating: string;
        text: string | null;
        createdAt: string;
      }[];
    }>('/admin/owner/overview'),

  submitFeedback: (body: {
    rating: number;
    category: string;
    comments: string;
    pageUrl: string;
  }) =>
    request<{ ok: true }>('/feedback', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  sendContact: (body: { name: string; email: string; message: string }) =>
    request<{ success: true; message: string }>('/contact', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  subscribeNewsletter: (email: string) =>
    request<{ success: true; message: string }>('/subscribe', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  getBranding: () => request<{ organization: OrganizationPublic }>('/org/branding'),

  updateBranding: (body: {
    name?: string;
    primaryColor?: string;
    primaryHoverColor?: string;
    accentColor?: string;
  }) =>
    request<{ organization: OrganizationPublic }>('/org/branding', {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  uploadOrgLogo: (file: File) => {
    const form = new FormData();
    form.append('logo', file);
    return requestFormData<{ organization: OrganizationPublic; logoUrl: string }>(
      '/org/branding/logo',
      form,
    );
  },

  createStripeCheckout: (body: {
    planType: string;
    interval: 'monthly' | 'yearly';
    successUrl?: string;
    cancelUrl?: string;
  }) =>
    request<{ url: string | null; sessionId: string }>('/payments/stripe/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  createRazorpayOrder: (body: { planType: string; interval: 'monthly' | 'yearly' }) =>
    request<{
      orderId: string;
      amount: number;
      currency: string;
      keyId: string;
      planType: string;
      interval: string;
    }>('/payments/razorpay/create-order', { method: 'POST', body: JSON.stringify(body) }),

  verifyRazorpayPayment: (body: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    planType: string;
    interval: 'monthly' | 'yearly';
  }) =>
    request<{ ok: boolean; planType: string; subscriptionStatus: string }>(
      '/payments/razorpay/verify-signature',
      { method: 'POST', body: JSON.stringify(body) },
    ),

  paymentStatus: () =>
    request<{
      scope: string;
      planType?: string;
      subscriptionStatus: string;
      active: boolean;
      billingInterval?: string | null;
    }>('/payments/status'),

  doubtAssistant: (q: string) =>
    request<{
      query: string;
      answer: string;
      sources: { textbookId: string; title: string; excerpt: string; score: number }[];
    }>(`/ai/doubt-assistant?q=${encodeURIComponent(q)}`),

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

  getChapterVideoStream: (chapterId: string) =>
    request<{
      chapterId: string;
      title: string;
      subjectName: string;
      sequenceOrder: number;
      tutor: { name: string; avatarUrl: string };
      stream: {
        videoUrl: string;
        mimeType: string;
        durationSec: number;
        displayDurationSec: number;
        qualityOptions: string[];
        defaultQuality: string;
      };
      progress: {
        chapterPct: number;
        timeSpentSec: number;
        timeBudgetSec: number;
      };
      transcript: { t: number; text: string }[];
      callouts: {
        id: string;
        label: string;
        xPct: number;
        yPct: number;
        appearAt: number;
        hideAt: number;
      }[];
      captions: { start: number; end: number; text: string }[];
    }>(`/chapters/${chapterId}/video-stream`),

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
    request<TeacherChapterListResponse>('/teacher/chapters', {
      cache: 'no-store',
    }),

  teacherTextbookCurrent: () =>
    request<{ textbook: Textbook | null }>('/teacher/textbooks/current', {
      cache: 'no-store',
    }),

  teacherChapter: (id: string) =>
    request<{ chapter: TeacherChapter }>(`/teacher/chapters/${id}`),

  uploadTextbook: (body: UploadTextbookRequest & { file: File | Blob }) => {
    const form = new FormData();
    if (body.title?.trim()) form.append('title', body.title.trim());
    if (body.subject) form.append('subject', body.subject);
    if (body.gradeLabel) form.append('gradeLabel', body.gradeLabel);
    const fileName =
      body.fileName ?? (body.file instanceof File ? body.file.name : 'textbook.pdf');
    form.append('file', body.file, fileName);
    return requestFormData<UploadTextbookResponse>('/teacher/textbooks/upload', form);
  },

  verifyTextbook: (id: string) =>
    request<VerifyTextbookResponse>(`/teacher/textbooks/${id}/verify`, {
      method: 'POST',
      body: '{}',
    }),

  teacherDoubts: (status?: string) =>
    request<TeacherDoubtsResponse>(
      status ? `/teacher/doubts?status=${encodeURIComponent(status)}` : '/teacher/doubts',
    ),

  teacherTools: () =>
    request<TeacherToolsCatalogResponse>('/teacher/tools', { cache: 'no-store' }),

  toggleTeacherToolFavorite: (toolId: string) =>
    request<ToggleTeacherToolFavoriteResponse>('/teacher/tools/favorite', {
      method: 'POST',
      body: JSON.stringify({ toolId }),
    }),

  generateQuiz: (body: QuizGeneratorPayload) =>
    request<QuizGeneratorResponse>('/teacher/tools/quiz-generator', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  generateWorksheet: (body: WorksheetGeneratorPayload) =>
    request<WorksheetGeneratorResponse>('/teacher/tools/worksheet-generator', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  generateLessonPlan: (body: LessonPlanPayload) =>
    request<LessonPlanResponse>('/teacher/tools/lesson-plan-generator', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  sharadaChat: (body: SharadaChatRequest) =>
    request<SharadaChatResponse>('/teacher/sharada/chat', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  generateEmailResponse: (body: EmailResponderRequest) =>
    request<EmailResponderResponse>('/teacher/tools/email-responder', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  bookmarkLessonPlan: (id: string, bookmarked: boolean, title?: string) =>
    request<{ ok: true; id: string; bookmarked: boolean }>('/teacher/tools/lesson-plan-generator/bookmark', {
      method: 'POST',
      body: JSON.stringify({ id, bookmarked, title }),
    }),

  worksheetHistory: (topic?: string) =>
    request<WorksheetHistoryResponse>(
      topic
        ? `/teacher/tools/worksheet-generator/history?topic=${encodeURIComponent(topic)}`
        : '/teacher/tools/worksheet-generator/history',
      { cache: 'no-store' },
    ),

  refineWorksheet: (body: WorksheetRefinePayload) =>
    request<WorksheetGeneratorResponse>('/teacher/tools/worksheet-generator/refine', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  translateWorksheet: (body: WorksheetTranslatePayload) =>
    request<WorksheetGeneratorResponse>('/teacher/tools/worksheet-generator/translate', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  submitTeacherToolFeedback: (body: TeacherToolFeedbackPayload) =>
    request<TeacherToolFeedbackResponse>('/teacher/tools/feedback', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  listTeacherSongs: () =>
    request<TeacherSongsListResponse>('/teacher/songs', { cache: 'no-store' }),

  generateSongLyrics: (body: SongLyricsPayload) =>
    request<SongLyricsDraft>('/teacher/songs/generate-lyrics', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  renderSongAudio: (body: SongRenderPayload) =>
    request<TeacherSong>('/teacher/songs/render-audio', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  deleteTeacherSong: (id: string) =>
    request<SongDeleteResponse>(`/teacher/songs/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }),

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

  listTemplates: () => request<{ templates: GenerationTemplate[] }>('/teacher/templates'),

  generateActivity: (body: GenerateActivityRequest, init?: RequestInit) =>
    request<GenerateActivityResponse>('/teacher/generate-activity', {
      method: 'POST',
      body: JSON.stringify(body),
      ...init,
    }),

  attachSubtopicFiles: (subtopicId: string, files: File[]) => {
    const form = new FormData();
    for (const file of files) form.append('files', file);
    return requestFormData<AttachSubtopicFilesResponse>(
      `/teacher/subtopic/${subtopicId}/attach-media`,
      form,
    );
  },

  generateTopicVideo: (topicId: string, body?: { prompt?: string; templateId?: string }) =>
    request<{ subtopic: TeacherSubtopic; message: string }>(
      `/teacher/topics/${topicId}/generate-video`,
      { method: 'POST', body: JSON.stringify(body ?? {}) },
    ),

  getTopicVideoStatus: (topicId: string) =>
    request<{
      topicId: string;
      status: 'generating' | 'pending_review' | 'failed';
      progress: number;
      error: string | null;
      videoUrl: string | null;
      stage?: string | null;
      subtopic: TeacherSubtopic;
    }>(`/teacher/topics/${topicId}/video-status`),

  updateTopicVideoScript: (topicId: string, videoScript: string) =>
    request<{ subtopic: TeacherSubtopic }>(`/teacher/topics/${topicId}/video-script`, {
      method: 'PATCH',
      body: JSON.stringify({ videoScript }),
    }),

  rejectTopicVideo: (topicId: string) =>
    request<{ subtopic: TeacherSubtopic }>(`/teacher/topics/${topicId}/reject-video`, {
      method: 'POST',
      body: '{}',
    }),

  approveTopicVideo: (topicId: string) =>
    request<{
      subtopic: TeacherSubtopic;
      published: boolean;
      studentSync: { synced: boolean; subjectId?: string; chapterId?: string; reason?: string };
      message: string;
    }>(`/topics/${topicId}/approve-video`, {
      method: 'POST',
      body: '{}',
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

export function saveSession(input: {
  token: string;
  role: UserRole;
  planType?: PlanType | null;
  parent?: ParentUser | null;
  teacher?: TeacherUser | null;
  user?: PlatformUserPublic | null;
  organization?: OrganizationPublic | null;
}) {
  localStorage.setItem('brightpath_token', input.token);
  localStorage.setItem('brightpath_role', input.role);
  if (input.planType) localStorage.setItem('brightpath_plan', input.planType);
  else localStorage.removeItem('brightpath_plan');

  if (input.parent) localStorage.setItem('brightpath_parent', JSON.stringify(input.parent));
  else localStorage.removeItem('brightpath_parent');

  if (input.teacher) localStorage.setItem('brightpath_teacher', JSON.stringify(input.teacher));
  else localStorage.removeItem('brightpath_teacher');

  if (input.user) localStorage.setItem('brightpath_user', JSON.stringify(input.user));
  else localStorage.removeItem('brightpath_user');

  if (input.organization) {
    localStorage.setItem('brightpath_org', JSON.stringify(input.organization));
  } else localStorage.removeItem('brightpath_org');

  const displayName =
    input.user?.name?.trim() ||
    input.teacher?.name?.trim() ||
    input.parent?.name?.trim() ||
    '';
  if (displayName) localStorage.setItem('user_name', displayName);
  else localStorage.removeItem('user_name');

  const schoolName = input.organization?.name?.trim() || input.teacher?.schoolName?.trim() || '';
  if (schoolName) localStorage.setItem('user_school', schoolName);
  else localStorage.removeItem('user_school');
}

/** @deprecated prefer saveSession */
export function saveAuth(
  token: string,
  parent: ParentUser,
  role: Extract<UserRole, 'parent' | 'student'> = 'student',
) {
  saveSession({ token, role, parent, planType: role === 'student' ? 'student_free' : 'parent_free' });
}

export function saveTeacherAuth(token: string, teacher: TeacherUser) {
  saveSession({
    token,
    role: 'teacher',
    teacher,
    planType: teacher.planType ?? 'teacher_free',
  });
}

export function clearAuth() {
  localStorage.removeItem('brightpath_token');
  localStorage.removeItem('brightpath_parent');
  localStorage.removeItem('brightpath_teacher');
  localStorage.removeItem('brightpath_role');
  localStorage.removeItem('brightpath_plan');
  localStorage.removeItem('brightpath_user');
  localStorage.removeItem('brightpath_org');
  localStorage.removeItem('user_name');
  localStorage.removeItem('user_school');
}

const ALL_ROLES: UserRole[] = [
  'org_admin',
  'center_admin',
  'teacher',
  'parent',
  'student',
];

export function loadStoredRole(): UserRole | null {
  const role = localStorage.getItem('brightpath_role');
  return role && ALL_ROLES.includes(role as UserRole) ? (role as UserRole) : null;
}

export function loadStoredPlanType(): PlanType | null {
  return (localStorage.getItem('brightpath_plan') as PlanType | null) ?? null;
}

export function loadStoredUser(): PlatformUserPublic | null {
  try {
    const raw = localStorage.getItem('brightpath_user');
    return raw ? (JSON.parse(raw) as PlatformUserPublic) : null;
  } catch {
    return null;
  }
}

export function loadStoredOrganization(): OrganizationPublic | null {
  try {
    const raw = localStorage.getItem('brightpath_org');
    return raw ? (JSON.parse(raw) as OrganizationPublic) : null;
  } catch {
    return null;
  }
}

export function isLearnerRole(role: UserRole | null | undefined): boolean {
  return role === 'student';
}

export function isParentPortalRole(role: UserRole | null | undefined): boolean {
  return role === 'parent';
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
