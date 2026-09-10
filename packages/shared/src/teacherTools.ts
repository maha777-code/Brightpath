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
  currentWorksheet?: WorksheetGeneratorResponse;
}

export function applyWorksheetFollowUp(
  worksheet: WorksheetGeneratorResponse,
  instruction: string,
): WorksheetGeneratorResponse {
  const text = instruction.trim();
  const lower = text.toLowerCase();
  const nextId = () =>
    worksheet.sections.reduce((max, section) => Math.max(max, ...section.items.map((item) => item.id)), 0) + 1;

  if (/answer key/.test(lower)) {
    const items = worksheet.sections.flatMap((section) =>
      section.items.map((item, i) => ({
        id: nextId() + i,
        prompt: `Answer key — ${item.prompt} Sample response: cite the reading passage and use a complete sentence.`,
      })),
    );
    return {
      ...worksheet,
      sections: [...worksheet.sections.filter((s) => s.heading !== 'Answer Key'), { heading: 'Answer Key', items }],
    };
  }

  if (/harder|more difficult|challenge/.test(lower)) {
    return {
      ...worksheet,
      instructions: [worksheet.instructions, 'Challenge: justify each answer with evidence from the passage.']
        .filter(Boolean)
        .join(' '),
      sections: worksheet.sections.map((section) => ({
        ...section,
        items: section.items.map((item) => ({
          ...item,
          prompt: /explain|why|justify/i.test(item.prompt)
            ? item.prompt
            : `${item.prompt} Explain your reasoning.`,
        })),
      })),
    };
  }

  if (/multiple[- ]?choice|mcq/.test(lower)) {
    const start = nextId();
    return {
      ...worksheet,
      sections: [
        ...worksheet.sections,
        {
          heading: 'Multiple Choice',
          items: [1, 2, 3, 4, 5].map((n) => ({
            id: start + n - 1,
            prompt: `${n}. Which statement is most accurate? A. Option one  B. Option two  C. Option three  D. Option four`,
          })),
        },
      ],
    };
  }

  if (/spanish|translate/.test(lower)) {
    return {
      ...worksheet,
      title: /spanish/.test(lower) ? `${worksheet.title} (Español)` : worksheet.title,
      passage: worksheet.passage
        ? `Versión en español (borrador): ${worksheet.passage}`
        : worksheet.passage,
      instructions: [worksheet.instructions, `Teacher update: ${text}`].filter(Boolean).join(' '),
    };
  }

  return {
    ...worksheet,
    instructions: [worksheet.instructions, `Teacher update: ${text}`].filter(Boolean).join(' '),
    sections: [
      ...worksheet.sections,
      {
        heading: 'Follow-up',
        items: [{ id: nextId(), prompt: text }],
      },
    ],
  };
}

export function getTeacherToolById(id: string): TeacherToolDefinition | undefined {
  return TEACHER_TOOLS_CATALOG.find((t) => t.id === id);
}
