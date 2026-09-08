/** MagicSchool-style teacher AI tools catalog */

export type TeacherToolBadge = 'New' | 'Hot' | 'Beta';

export type TeacherToolFocusArea = 'curriculum' | 'content' | 'assessment' | 'communication';

export const TEACHER_TOOL_FOCUS_LABELS: Record<TeacherToolFocusArea, string> = {
  curriculum: 'Curriculum',
  content: 'Content creation',
  assessment: 'Assessment',
  communication: 'Communication',
};

export interface TeacherToolDefinition {
  id: string;
  title: string;
  description: string;
  focusArea: TeacherToolFocusArea;
  /** In-app route. Curriculum studio goes to the existing dashboard. */
  href: string;
  badge?: TeacherToolBadge | null;
  popularity: number;
  newestRank: number;
  highlighted?: boolean;
  custom?: boolean;
  icon: string;
}

export const TEACHER_TOOLS_CATALOG: TeacherToolDefinition[] = [
  {
    id: 'curriculum-studio',
    title: 'Curriculum & Textbook Studio',
    description:
      'Upload state textbooks, extract chapters, generate gamified videos & doubt control.',
    focusArea: 'curriculum',
    href: '/teacher/dashboard',
    badge: 'Hot',
    popularity: 100,
    newestRank: 11,
    highlighted: true,
    icon: 'book-open',
  },
  {
    id: 'song-generator',
    title: 'Educational Song Generator',
    description: 'Generate an original song with lyrics and audio on any topic.',
    focusArea: 'content',
    href: '/teacher/tools/song-generator',
    badge: 'New',
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
    popularity: 74,
    newestRank: 8,
    icon: 'pencil',
  },
  {
    id: 'lesson-plan',
    title: 'Lesson Plan Generator',
    description: 'Generate a lesson plan based on standard, topic, or objective.',
    focusArea: 'curriculum',
    href: '/teacher/tools/lesson-plan',
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
    badge: 'Hot',
    popularity: 93,
    newestRank: 4,
    icon: 'list-checks',
  },
  {
    id: 'presentation-generator',
    title: 'Presentation Generator',
    description: 'Generate exportable slides based on a topic or video.',
    focusArea: 'content',
    href: '/teacher/tools/presentation-generator',
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

export function getTeacherToolById(id: string): TeacherToolDefinition | undefined {
  return TEACHER_TOOLS_CATALOG.find((t) => t.id === id);
}
