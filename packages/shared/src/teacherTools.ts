/** MagicSchool-style teacher AI tools catalog */

export type TeacherToolBadge = 'New' | 'Hot' | 'Beta';

export type TeacherToolFocusArea = 'curriculum' | 'content' | 'assessment' | 'communication';

export const TEACHER_TOOL_FOCUS_LABELS: Record<TeacherToolFocusArea, string> = {
  curriculum: 'Curriculum',
  content: 'Content creation',
  assessment: 'Assessment',
  communication: 'Communication',
};

export type AiToolPlan = 'free' | 'pro' | 'center_pro';

export interface TeacherToolDefinition {
  id: string;
  title: string;
  description: string;
  focusArea: TeacherToolFocusArea;
  /** In-app route. Curriculum studio goes to the existing dashboard. */
  href: string;
  requiredPlan: AiToolPlan;
  badge?: TeacherToolBadge | null;
  badges?: TeacherToolBadge[];
  popularity: number;
  newestRank: number;
  highlighted?: boolean;
  custom?: boolean;
  icon: string;
  /** Admin library default. Omitted tools stay active until an admin toggles them off. */
  isActive?: boolean;
}

export const TEACHER_TOOLS_CATALOG: TeacherToolDefinition[] = [
  {
    id: 'curriculum-studio',
    title: 'Curriculum & Textbook Studio',
    description:
      'Upload textbooks, standards, and syllabus documents to enrich lessons and align teaching content.',
    focusArea: 'curriculum',
    href: '/tools/curriculum-textbook-studio',
    requiredPlan: 'pro',
    badge: 'Hot',
    badges: ['Hot', 'Beta'],
    popularity: 100,
    newestRank: 11,
    highlighted: true,
    isActive: true,
    icon: 'book-open',
  },
  {
    id: 'song-generator',
    title: 'Educational Song Generator',
    description: 'Generate custom lyrics and a song on any topic — to the tune of your choice!',
    focusArea: 'content',
    href: '/teacher/tools/song-generator',
    requiredPlan: 'free',
    badge: 'Beta',
    popularity: 88,
    newestRank: 1,
    icon: 'music',
  },
  {
    id: 'podcast-generator',
    title: 'Educational Podcast Generator',
    description: 'Generate an original podcast episode script and audio.',
    focusArea: 'content',
    href: '/teacher/tools/podcast-generator',
    requiredPlan: 'free',
    badge: 'New',
    popularity: 82,
    newestRank: 2,
    icon: 'mic',
  },
  {
    id: 'worksheet-generator',
    title: 'Worksheet Generator',
    description: 'Generate a worksheet based on any topic or text.',
    focusArea: 'assessment',
    href: '/teacher/tools/worksheet-generator',
    requiredPlan: 'free',
    badge: 'Hot',
    popularity: 91,
    newestRank: 6,
    icon: 'file-text',
  },
  {
    id: 'text-rewriter',
    title: 'Text Rewriter',
    description: 'Take any text and rewrite it with custom criteria.',
    focusArea: 'content',
    href: '/teacher/tools/text-rewriter',
    requiredPlan: 'free',
    popularity: 74,
    newestRank: 8,
    icon: 'pencil',
  },
  {
    id: 'lesson-plan',
    title: 'Lesson Plan Generator',
    description: 'Generate a lesson plan based on a standard, topic, or objective.',
    focusArea: 'curriculum',
    href: '/teacher/tools/lesson-plan-generator',
    requiredPlan: 'free',
    popularity: 86,
    newestRank: 5,
    icon: 'clipboard-list',
  },
  {
    id: 'quiz-generator',
    title: 'Multiple Choice Quiz / Assessment Generator',
    description: 'Generate quizzes based on textbook topics.',
    focusArea: 'assessment',
    href: '/teacher/tools/quiz-generator',
    requiredPlan: 'free',
    badge: 'Hot',
    popularity: 93,
    newestRank: 4,
    icon: 'list-checks',
  },
  {
    id: 'classroom',
    title: 'Classroom',
    description:
      'Create classes, run a stream, assign classwork, grade with rubrics, and send guardian summaries — for schools and tutor centers.',
    focusArea: 'communication',
    href: '/teacher/tools/classroom',
    requiredPlan: 'free',
    badge: 'New',
    popularity: 96,
    newestRank: 0,
    highlighted: true,
    icon: 'school',
  },
  {
    id: 'gamified-activity',
    title: 'Gamified Activity',
    description:
      'Turn unit PDFs, Docs, or slides into a playable HTML escape room, choose-your-own-adventure quest, or XP skill-tree challenge.',
    focusArea: 'content',
    href: '/teacher/tools/gamified-activity',
    requiredPlan: 'free',
    badge: 'New',
    popularity: 90,
    newestRank: 0,
    highlighted: true,
    icon: 'gamepad-2',
  },
  {
    id: 'presentation-generator',
    title: 'Presentation Generator',
    description: 'All-new presentation generator experience with images, themes, editing, and exports.',
    focusArea: 'content',
    href: '/teacher/tools/presentation-generator',
    requiredPlan: 'free',
    badge: 'Beta',
    popularity: 70,
    newestRank: 3,
    icon: 'presentation',
  },
  {
    id: 'writing-feedback',
    title: 'Writing Feedback Tool',
    description: 'Generate feedback on student writing based on custom rubrics.',
    focusArea: 'assessment',
    href: '/teacher/tools/writing-feedback',
    requiredPlan: 'free',
    popularity: 68,
    newestRank: 7,
    icon: 'message-square',
  },
  {
    id: 'youtube-questions',
    title: 'YouTube Video Questions Generator',
    description: 'Generate guiding questions aligned to a YouTube video.',
    focusArea: 'content',
    href: '/teacher/tools/youtube-questions',
    requiredPlan: 'free',
    popularity: 64,
    newestRank: 9,
    icon: 'youtube',
  },
  {
    id: 'family-email',
    title: 'Email Responder / Family Email Generator',
    description: 'Draft professional communications.',
    focusArea: 'communication',
    href: '/teacher/tools/family-email',
    requiredPlan: 'free',
    popularity: 77,
    newestRank: 10,
    icon: 'mail',
  },
];

export interface TeacherToolsCatalogResponse {
  tools: TeacherToolDefinition[];
  focusAreas: { id: TeacherToolFocusArea | 'all'; label: string }[];
  favoriteIds: string[];
}

export interface ToggleTeacherToolFavoriteRequest {
  toolId: string;
}

export interface ToggleTeacherToolFavoriteResponse {
  toolId: string;
  favorited: boolean;
  favoriteIds: string[];
}

export interface QuizGeneratorPayload {
  gradeLevel: string;
  numberOfQuestions: number;
  optionsPerQuestion: number;
  /** Preferred field for the assessment prompt */
  topicDescription?: string;
  /** @deprecated use topicDescription */
  assessmentDescription?: string;
  standardsAlignment?: string;
  attachments?: string[];
  /** Extracted text from uploaded PDF, DOCX, text, or image files. */
  attachedDocumentContext?: string;
  /** Image data URLs sent to the model. Omitted from any saved history. */
  imageFiles?: string[];
}

export interface QuizGeneratorQuestion {
  id: number;
  question: string;
  options: string[];
  correctOption: string;
}

export interface QuizGeneratorResponse {
  questions: QuizGeneratorQuestion[];
  answerKey: string[];
}

export interface WorksheetGeneratorPayload {
  gradeLevel: string;
  topicOrText: string;
  attachments?: string[];
  /** Extracted text from uploaded PDF, DOCX, or text files. */
  attachedDocumentContext?: string;
  /** Image data URLs sent to the model. Omitted from saved history. */
  imageFiles?: string[];
}

export interface WorksheetItem {
  id: number;
  prompt: string;
}

export interface WorksheetSection {
  heading: string;
  items: WorksheetItem[];
}

export interface WorksheetGeneratorResponse {
  id?: string;
  title: string;
  gradeLevel: string;
  instructions?: string;
  /** Optional reading passage shown at the top of the printable sheet */
  passage?: string;
  sections: WorksheetSection[];
}

export interface WorksheetHistoryItem {
  id: string;
  createdAt: string;
  title: string;
  gradeLevel: string;
  topicOrText: string;
  payload: WorksheetGeneratorPayload;
  worksheet: WorksheetGeneratorResponse;
}

export interface WorksheetHistoryResponse {
  items: WorksheetHistoryItem[];
}

export const LESSON_PLAN_GRADE_LEVELS = [
  'Elementary',
  'Kindergarten',
  '1st grade',
  '2nd grade',
  '3rd grade',
  '4th grade',
  '5th grade',
  '6th grade',
  '7th grade',
  '8th grade',
  '9th grade',
  '10th grade',
  '11th grade',
  '12th grade',
  'University',
] as const;

export interface LessonPlanPayload {
  gradeLevel: string;
  topic: string;
  additionalCriteria?: string;
  standards?: string;
  /** File names, for display and citation. */
  attachments?: string[];
  /** Extracted text from uploaded PDF, DOCX, or text files. */
  attachedDocumentContext?: string;
  /** Image data URLs sent to the model for vision. */
  imageFiles?: string[];
  /** When set, the lesson follows Dubai private-school curriculum, safety, and wellbeing rules. */
  khdaAlign?: boolean;
}

export interface LessonPlanSection {
  heading: string;
  minutes?: number;
  activities: string[];
}

export interface LessonPlanResponse {
  title: string;
  gradeLevel: string;
  objective: string;
  standards: string[];
  durationMinutes: number;
  materials: string[];
  sections: LessonPlanSection[];
  assessment: string;
  differentiation: string;
}

export interface TeacherToolFeedbackPayload {
  worksheetId: string;
  rating: 'positive' | 'negative';
}

export interface TeacherToolFeedbackResponse {
  ok: true;
  worksheetId: string;
  rating: 'positive' | 'negative';
}

export interface WorksheetRefinePayload {
  worksheetId?: string;
  gradeLevel: string;
  topicOrText: string;
  instruction: string;
  attachments?: string[];
  attachedDocumentContext?: string;
  imageFiles?: string[];
  currentWorksheet?: WorksheetGeneratorResponse;
}

export interface WorksheetTranslatePayload {
  worksheetId?: string;
  targetLanguage: string;
  currentWorksheet?: WorksheetGeneratorResponse;
}

export const SONG_GRADE_LEVELS = ['K–2', '3–5', '6–8', '9th grade', '9–12'] as const;

export const SONG_STYLES = [
  'Classic Schoolhouse Rock',
  'Modern Pop',
  'Hip Hop',
  'Acoustic Folk',
] as const;

export const SONG_VOICES = [
  { id: 'bright-kids', label: 'Bright Kids Choir' },
  { id: 'warm-alto', label: 'Warm Teacher Alto' },
  { id: 'upbeat-tenor', label: 'Upbeat Tenor' },
  { id: 'classroom', label: 'Classroom Narrator' },
] as const;

export const FREE_SONGS_PER_WEEK = 1;
export const PLUS_SONGS_PER_WEEK = 5;

export interface SongLyricsPayload {
  topic: string;
  gradeLevel: string;
  songStyle: string;
  customInstructions?: string;
}

export interface SongLyricsDraft {
  title: string;
  lyrics: string;
  topic: string;
  gradeLevel: string;
  songStyle: string;
  customInstructions?: string;
}

export interface SongRenderPayload extends SongLyricsDraft {
  voiceId: string;
}

export interface TeacherSong {
  id: string;
  title: string;
  topic: string;
  lyrics: string;
  lyricsPreview: string;
  songStyle: string;
  gradeLevel: string;
  voiceId: string;
  voiceLabel: string;
  artUrl: string;
  audioUrl?: string;
  createdAt: string;
}

export interface TeacherSongsListResponse {
  items: TeacherSong[];
  usedThisWeek: number;
  weeklyLimit: number;
  resetsAt: string;
  plusLimit: number;
}

export interface SongDeleteResponse {
  ok: true;
  id: string;
}

export function nextMondayIso(from = new Date()): string {
  const date = new Date(from);
  const day = date.getDay();
  const daysUntilMonday = (8 - day) % 7 || 7;
  date.setDate(date.getDate() + daysUntilMonday);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

export function lyricsPreview(lyrics: string, max = 90): string {
  const compact = lyrics.replace(/\s+/g, ' ').trim();
  if (compact.length <= max) return compact;
  return `${compact.slice(0, max - 1).trim()}…`;
}

export function getTeacherToolById(id: string): TeacherToolDefinition | undefined {
  return TEACHER_TOOLS_CATALOG.find((t) => t.id === id);
}

export function teacherToolBadges(tool: Pick<TeacherToolDefinition, 'badge' | 'badges'>): TeacherToolBadge[] {
  if (tool.badges?.length) return tool.badges;
  return tool.badge ? [tool.badge] : [];
}

export interface SharadaChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SharadaChatRequest {
  prompt: string;
  history?: SharadaChatMessage[];
}

export interface SharadaChatResponse {
  title: string;
  statusLine: string;
  confirmation: string;
  markdown: string;
}

function titleCaseWords(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function sharadaTitleFromPrompt(prompt: string): string {
  const raw = prompt.replace(/\s+/g, ' ').trim();
  if (!raw) return 'New conversation';

  const topicMatch = raw.match(/\btopic\s+([^,.!?]+)/i);
  if (topicMatch?.[1]) {
    const topic = titleCaseWords(topicMatch[1].trim());
    if (/worksheet/i.test(raw)) return `${topic} worksheet`;
    if (/quiz|assessment/i.test(raw)) return `${topic} quiz`;
    if (/lesson\s*plan/i.test(raw)) return `${topic} lesson plan`;
    return topic;
  }

  const cleaned = raw
    .replace(/^(please\s+)?(generate|create|make|write|build|draft)\s+(a|an|the)?\s*/i, '')
    .replace(/\s+for\s+(grade|class)\s+\S+/i, '')
    .trim();
  const short = (cleaned || raw).slice(0, 48).trim();
  return short.charAt(0).toUpperCase() + short.slice(1);
}

export type RouterIntentType =
  | 'EXPLANATION'
  | 'TOOL_WORKSHEET'
  | 'TOOL_QUIZ'
  | 'TOOL_LESSON_PLAN'
  | 'TOOL_EMAIL'
  | 'TOOL_PRESENTATION'
  | 'GENERAL_CHAT';

export interface RouterIntent {
  type: RouterIntentType;
  targetTool?: string;
  gradeLevel?: string;
  topic?: string;
}

function ordinalGrade(value: string): string {
  const num = Number(value);
  const mod100 = num % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${num}th`;
  switch (num % 10) {
    case 1:
      return `${num}st`;
    case 2:
      return `${num}nd`;
    case 3:
      return `${num}rd`;
    default:
      return `${num}th`;
  }
}

function includesAny(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

export function classifyUserIntent(prompt: string): RouterIntent {
  const lower = prompt.toLowerCase();
  const gradeMatch = lower.match(/(\d{1,2})(?:st|nd|rd|th)?\s*grade|grade\s*(\d{1,2})/);
  const gradeNumber = gradeMatch?.[1] || gradeMatch?.[2];
  const gradeLevel = gradeNumber ? `${ordinalGrade(gradeNumber)} grade` : undefined;
  const topic = prompt.trim();

  const isWorksheet = includesAny(lower, [
    'worksheet',
    'practice problems',
    'fill in the blanks',
    'fill-in-the-blank',
    'handout',
    'practice sheet',
  ]);
  const strongQuiz = includesAny(lower, ['quiz', 'multiple choice', 'mcq', 'test questions']) || /\btests?\b/.test(lower);
  const weakQuiz = /\bquestions\b/.test(lower);
  const isLessonPlan = includesAny(lower, ['lesson plan', 'curriculum plan', 'teaching objectives', 'teaching plan']);
  const isEmail = includesAny(lower, ['email', 'draft message']);
  const isPresentation = includesAny(lower, ['slides', 'presentation', 'deck']);
  const isExplanation = includesAny(lower, [
    'explain',
    'what is',
    'what are',
    'how does',
    'how do',
    'describe',
    'simplify',
    'teach',
    'walk through',
    'walkthrough',
    'break down',
  ]);

  if (isWorksheet) return { type: 'TOOL_WORKSHEET', targetTool: 'Worksheet Generator', gradeLevel, topic };
  if (strongQuiz || (weakQuiz && !isExplanation)) {
    return { type: 'TOOL_QUIZ', targetTool: 'Multiple Choice Quiz', gradeLevel, topic };
  }
  if (isLessonPlan) return { type: 'TOOL_LESSON_PLAN', targetTool: 'Lesson Plan Generator', gradeLevel, topic };
  if (isEmail) return { type: 'TOOL_EMAIL', targetTool: 'Professional Email', gradeLevel, topic };
  if (isPresentation) return { type: 'TOOL_PRESENTATION', targetTool: 'Presentation Generator', gradeLevel, topic };
  if (isExplanation) return { type: 'EXPLANATION', gradeLevel, topic };
  return { type: 'GENERAL_CHAT', topic };
}

export interface EmailResponderRequest {
  authorName?: string;
  incomingEmail: string;
  responseIntent: string;
  attachments?: string[];
  /** When set, revise currentEmail instead of drafting from scratch. */
  followUp?: string;
  currentEmail?: string;
}

export interface EmailResponderResponse {
  email: string;
  suggestions: string[];
}

export function emailResponderPrompt(input: EmailResponderRequest): string {
  const author = input.authorName?.trim() || 'Teacher';
  const files = (input.attachments ?? []).map((name) => name.trim()).filter(Boolean);
  const fileNote = files.length ? `\nAttached files to consider: ${files.join(', ')}` : '';
  const revision = input.followUp?.trim()
    ? `\n\nCurrent draft to revise:\n"""\n${(input.currentEmail ?? '').trim()}\n"""\n\nFollow-up instruction from the user. Apply this to the current draft:\n"""\n${input.followUp.trim()}\n"""`
    : '';
  return `You are a professional educational communication assistant. Write the email the author would actually send. Use only facts from the message they received and the points they asked you to communicate. Turn a short note such as "that sounds great, let's set up a time" into a complete reply.

Sender / Author Name: ${author}
Original Email Received:
"""
${input.incomingEmail.trim()}
"""

What the author wants to say:
"""
${input.responseIntent.trim()}
"""${fileNote}${revision}

Write three short paragraphs after the greeting:
1. Thank them and answer their ask. Repeat their specific details in their words: who they are, their school or university, and the project or study they named.
2. If they want to meet, name two or three topics worth covering that follow from their email (for a research partnership, that can include goals, timeline, and any approvals their note implies). Offer a 30-minute call and propose two specific windows, such as Tuesday afternoon and Thursday morning next week, then say you can be flexible if they share other times. If they do not want a meeting, carry out the requested next step instead.
3. Close in one warm sentence about working together.

Rules:
- Do not invent calendar links, URLs, phone numbers, dates, times, room names, or placeholders such as [Insert Calendly Link].
- Do not mention a product, school, or person that is not in the inputs.
- Sound like a person, not a template. No "I would be delighted to explore potential collaboration opportunities."
- Start with "Subject: " and a subject that names their actual request.
- Sign off with "${author}".`;
}
