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
    href: '/tools/curriculum-textbook-studio',
    requiredPlan: 'center_pro',
    badge: 'Hot',
    popularity: 100,
    newestRank: 11,
    highlighted: true,
    icon: 'book-open',
  },
  {
    id: 'song-generator',
    title: 'Educational Song Generator',
    description: 'Generate custom lyrics and a song on any topic — to the tune of your choice!',
    focusArea: 'content',
    href: '/teacher/tools/song-generator',
    requiredPlan: 'pro',
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
    requiredPlan: 'pro',
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
    id: 'presentation-generator',
    title: 'Presentation Generator',
    description: 'Generate exportable slides based on a topic or video.',
    focusArea: 'content',
    href: '/teacher/tools/presentation-generator',
    requiredPlan: 'pro',
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
    requiredPlan: 'pro',
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
    requiredPlan: 'pro',
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
    requiredPlan: 'pro',
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
  attachments?: string[];
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
  currentWorksheet?: WorksheetGeneratorResponse;
}

export interface WorksheetTranslatePayload {
  worksheetId?: string;
  targetLanguage: string;
  currentWorksheet?: WorksheetGeneratorResponse;
}

const TRANSLATION_PREFIX: Record<string, string> = {
  Spanish: 'Versión en español:',
  French: 'Version française :',
  German: 'Deutsche Fassung:',
  Hindi: 'हिंदी संस्करण:',
  Chinese: '中文译本：',
  Arabic: 'النسخة العربية:',
  Portuguese: 'Versão em português:',
};

const TRANSLATED_HEADINGS: Record<string, Record<string, string>> = {
  Spanish: {
    'Reading Passage': 'Pasaje de lectura',
    'Reading Comprehension': 'Comprensión lectora',
    Vocabulary: 'Vocabulario',
    'Vocabulary in Context': 'Vocabulario en contexto',
    Comprehension: 'Comprensión',
    Apply: 'Aplicar',
    Practice: 'Práctica',
    'Answer Key': 'Clave de respuestas',
    'Critical Thinking & Historical Analysis': 'Pensamiento crítico y análisis histórico',
    'Follow-up': 'Seguimiento',
    'Multiple Choice': 'Opción múltiple',
  },
  French: {
    'Reading Passage': 'Texte de lecture',
    'Reading Comprehension': 'Compréhension écrite',
    Vocabulary: 'Vocabulaire',
    'Vocabulary in Context': 'Vocabulaire en contexte',
    Comprehension: 'Compréhension',
    Apply: 'Appliquer',
    Practice: 'Exercices',
    'Answer Key': 'Corrigé',
    'Critical Thinking & Historical Analysis': 'Esprit critique et analyse historique',
    'Follow-up': 'Suivi',
    'Multiple Choice': 'QCM',
  },
  German: {
    'Reading Passage': 'Lesetext',
    'Reading Comprehension': 'Leseverstehen',
    Vocabulary: 'Wortschatz',
    'Vocabulary in Context': 'Wortschatz im Kontext',
    Comprehension: 'Verstehen',
    Apply: 'Anwenden',
    Practice: 'Übung',
    'Answer Key': 'Lösungsschlüssel',
    'Critical Thinking & Historical Analysis': 'Kritisches Denken und historische Analyse',
    'Follow-up': 'Fortsetzung',
    'Multiple Choice': 'Multiple Choice',
  },
  Hindi: {
    'Reading Passage': 'पठन अंश',
    'Reading Comprehension': 'पठन बोध',
    Vocabulary: 'शब्दावली',
    'Vocabulary in Context': 'संदर्भ में शब्दावली',
    Comprehension: 'बोध',
    Apply: 'लागू करें',
    Practice: 'अभ्यास',
    'Answer Key': 'उत्तर कुंजी',
    'Critical Thinking & Historical Analysis': 'आलोचनात्मक सोच और ऐतिहासिक विश्लेषण',
    'Follow-up': 'अनुवर्ती',
    'Multiple Choice': 'बहुविकल्पीय',
  },
  Chinese: {
    'Reading Passage': '阅读短文',
    'Reading Comprehension': '阅读理解',
    Vocabulary: '词汇',
    'Vocabulary in Context': '语境词汇',
    Comprehension: '理解',
    Apply: '应用',
    Practice: '练习',
    'Answer Key': '参考答案',
    'Critical Thinking & Historical Analysis': '批判性思维与历史分析',
    'Follow-up': '后续练习',
    'Multiple Choice': '选择题',
  },
  Arabic: {
    'Reading Passage': 'قطعة القراءة',
    'Reading Comprehension': 'الاستيعاب القرائي',
    Vocabulary: 'المفردات',
    'Vocabulary in Context': 'المفردات في السياق',
    Comprehension: 'الاستيعاب',
    Apply: 'التطبيق',
    Practice: 'التدريب',
    'Answer Key': 'مفتاح الإجابات',
    'Critical Thinking & Historical Analysis': 'التفكير النقدي والتحليل التاريخي',
    'Follow-up': 'متابعة',
    'Multiple Choice': 'اختيار من متعدد',
  },
  Portuguese: {
    'Reading Passage': 'Texto de leitura',
    'Reading Comprehension': 'Compreensão leitora',
    Vocabulary: 'Vocabulário',
    'Vocabulary in Context': 'Vocabulário em contexto',
    Comprehension: 'Compreensão',
    Apply: 'Aplicar',
    Practice: 'Prática',
    'Answer Key': 'Gabarito',
    'Critical Thinking & Historical Analysis': 'Pensamento crítico e análise histórica',
    'Follow-up': 'Acompanhamento',
    'Multiple Choice': 'Múltipla escolha',
  },
};

export function applyWorksheetTranslation(
  worksheet: WorksheetGeneratorResponse,
  targetLanguage: string,
): WorksheetGeneratorResponse {
  const language = targetLanguage.trim() || 'Spanish';
  const prefix = TRANSLATION_PREFIX[language] ?? `${language}:`;
  const headings = TRANSLATED_HEADINGS[language] ?? {};
  const wrap = (value?: string) => {
    const text = value?.trim();
    if (!text) return text;
    return text.startsWith(prefix) ? text : `${prefix} ${text}`;
  };
  return {
    ...worksheet,
    title: worksheet.title.includes(language) ? worksheet.title : `${worksheet.title} (${language})`,
    instructions: wrap(worksheet.instructions),
    passage: wrap(worksheet.passage),
    sections: worksheet.sections.map((section) => ({
      heading: headings[section.heading] ?? `${section.heading} (${language})`,
      items: section.items.map((item) => ({
        ...item,
        prompt: wrap(item.prompt) ?? item.prompt,
      })),
    })),
  };
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

function extractTopic(prompt: string): string {
  const topicMatch = prompt.match(/\btopic\s+([^,.!?]+)/i);
  if (topicMatch?.[1]) return titleCaseWords(topicMatch[1].trim());
  const cleaned = prompt
    .replace(/^(please\s+)?(generate|create|make|write|build|draft)\s+(a|an|the)?\s*/i, '')
    .replace(/\b(worksheet|quiz|lesson plan|assessment)\b/gi, '')
    .replace(/\bfor\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return titleCaseWords(cleaned || 'this topic');
}

function explanationTopic(prompt: string): string {
  const cleaned = prompt
    .replace(/^(please\s+)?(can you\s+)?/i, '')
    .replace(/\b(explain|describe|simplify|teach|walk through|walkthrough|break down|what is|what are|how does|how do)\b/gi, '')
    .replace(/\b(for|to)\s+(\d{1,2}(?:st|nd|rd|th)?\s*grade|grade\s*\d{1,2})\s*(students|learners|kids|children)?/gi, '')
    .replace(/[?.!]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return titleCaseWords(cleaned || 'this topic');
}

function photosynthesisExplanation(gradeLevel?: string): SharadaChatResponse {
  const grade = gradeLevel ?? 'elementary students';
  return {
    title: 'Photosynthesis explanation',
    statusLine: `I'll explain photosynthesis for ${grade}.`,
    confirmation: `Here's a clear explanation of photosynthesis for ${grade}:`,
    markdown: `# Photosynthesis

## A plant's solar kitchen
Picture a plant as a tiny cook in a kitchen powered by the sun. It does not go to the store for food. It **makes its own meal** using sunlight, water, and air.

## What goes in and what comes out
- **What goes in:** sunlight, water (H₂O), and carbon dioxide (CO₂) from the air.
- **What comes out:** glucose, the plant's food, and oxygen (O₂), which people and animals breathe.
- **Where it happens:** mostly in the leaves, inside tiny green parts called chloroplasts. Chlorophyll is the green pigment that catches the light.

## How it happens
**1. Catch the light.** Leaves soak up sunlight the way a solar panel soaks up sunshine.

**2. Take a drink and a breath.** Roots pull in water. Tiny leaf openings let in carbon dioxide.

**3. Cook the food.** Inside the leaf, light energy helps turn water and carbon dioxide into glucose.

**4. Share the leftovers.** The plant keeps the glucose for energy and growth, and releases oxygen into the air.

## Check for understanding
1. If a plant were a cook, what three ingredients would it put in the pot?
2. Why should we thank plants when we take a deep breath?`,
  };
}

function directSharadaReply(prompt: string, intent: RouterIntent): SharadaChatResponse {
  const topic = explanationTopic(prompt);
  const grade = intent.gradeLevel;
  const audience = grade ? ` for ${grade}` : '';

  if (intent.type === 'EXPLANATION' && /photosynthesis/i.test(prompt)) {
    return photosynthesisExplanation(grade);
  }

  if (intent.type === 'EXPLANATION') {
    return {
      title: `${topic} explanation`,
      statusLine: `I'll explain ${topic}${audience}.`,
      confirmation: `Here's a clear explanation of ${topic}${audience}:`,
      markdown: `# ${topic}

## A simple picture
Imagine ${topic} as something students already know from everyday life. Start with that picture, then connect it to the science or idea underneath.

## Key ideas
- **What it is:** ${topic} in one plain sentence a student${grade ? ` in ${grade}` : ''} can repeat.
- **What matters:** the one or two parts students must remember.
- **What it is not:** a common mix-up to clear up early.

## Step by step
**1. Name it.** Say what ${topic} is, using words this age group already uses.

**2. Show the parts.** Point out the pieces that make ${topic} work, one at a time.

**3. Follow the sequence.** Walk through what happens first, next, and last.

**4. Tie it to real life.** Give one example students can see at school or at home.

## Check for understanding
1. In your own words, what is ${topic}?
2. What is one example of ${topic} you could point to today?`,
    };
  }

  return {
    title: sharadaTitleFromPrompt(prompt),
    statusLine: "I'll answer this directly.",
    confirmation: "Here's a direct answer:",
    markdown: `# ${topic}

Sharada can help with this in the chat. Ask for an explanation, or name a classroom tool if you want one made.

- Say **explain** when you want a concept taught out loud in the chat.
- Say **worksheet**, **quiz**, **lesson plan**, **email**, or **slides** only when you want that tool.`,
  };
}

export function fallbackSharadaChat(prompt: string): SharadaChatResponse {
  const intent = classifyUserIntent(prompt);
  if (intent.type === 'EXPLANATION' || intent.type === 'GENERAL_CHAT') {
    return directSharadaReply(prompt, intent);
  }

  const topic = extractTopic(prompt);
  const title = sharadaTitleFromPrompt(prompt);
  const isWorksheet = intent.type === 'TOOL_WORKSHEET';
  const isQuiz = intent.type === 'TOOL_QUIZ';
  const photosynthesis = /photosynthesis/i.test(prompt);

  if (isWorksheet && (photosynthesis || /photo/i.test(topic))) {
    return {
      title: 'Photosynthesis worksheet',
      statusLine: "I'll search for the right tool to create your worksheet.",
      confirmation: "Great! Here's a photosynthesis worksheet you can use right away:",
      markdown: `# Photosynthesis Worksheet

**Grade:** 6–8  
**Name:** ________________________  **Date:** ____________

## Learning objective
Students will identify the ingredients and products of photosynthesis and explain how plants convert light energy into chemical energy.

## Part 1: Fill in the Blanks

Use the **Word Bank** below. Each term is used once.

**Word Bank:** chlorophyll · sunlight · carbon dioxide · oxygen · glucose · water · chloroplast · stomata

1. Plants capture energy from ______.
2. The green pigment ______ absorbs light energy.
3. Photosynthesis takes place mainly in the ______ of plant cells.
4. Plants take in ______ from the air through tiny openings called ______.
5. Roots absorb ______ from the soil.
6. The sugar produced during photosynthesis is called ______.
7. A waste product released into the air is ______.

## Part 2: Multiple Choice

Circle the best answer.

1. The overall equation for photosynthesis is:
   a) carbon dioxide + water → glucose + oxygen
   b) glucose + oxygen → carbon dioxide + water
   c) nitrogen + sunlight → protein
   d) oxygen + water → carbon dioxide

2. Which organelle is the site of photosynthesis?
   a) mitochondrion
   b) nucleus
   c) chloroplast
   d) vacuole

3. Why do most leaves look green?
   a) They reflect green light
   b) They absorb only green light
   c) They contain no pigment
   d) They produce a blue dye

## Teacher answer key
**Part 1:** 1. sunlight  2. chlorophyll  3. chloroplast  4. carbon dioxide, stomata  5. water  6. glucose  7. oxygen  
**Part 2:** 1. a  2. c  3. a
`,
    };
  }

  if (!isWorksheet && !isQuiz) {
    const label = intent.targetTool ?? 'the matching classroom tool';
    return {
      title,
      statusLine: `I'll use ${label} for this request.`,
      confirmation: `This request matches ${label}, not a worksheet.`,
      markdown: `# ${title}

Use **${label}** for this request. Sharada will not turn it into a worksheet unless you ask for a worksheet, handout, or practice problems.`,
    };
  }

  const kind = isQuiz ? 'quiz' : 'worksheet';
  const statusLine = isWorksheet
    ? "I'll search for the right tool to create your worksheet."
    : isQuiz
      ? "I'll search for the right tool to create your quiz."
      : "I'll search for the right approach for this request.";
  const confirmation = isWorksheet
    ? `Great! Here's a ${topic.toLowerCase()} worksheet you can use right away:`
    : isQuiz
      ? `Great! Here's a ${topic.toLowerCase()} quiz you can use right away:`
      : `Great! Here's a ${topic.toLowerCase()} resource you can use right away:`;

  const markdown = isQuiz
    ? `# ${topic} Quiz

**Name:** ________________________  **Date:** ____________

## Directions
Circle the best answer for each question.

1. Which statement best describes ${topic}?
   a) A core idea of ${topic}
   b) A common misconception about ${topic}
   c) An unrelated fact
   d) A definition of a different process

2. Where would students most likely study ${topic}?
   a) In a classroom investigation
   b) Only in a dictionary
   c) Never in science class
   d) Only during recess

3. Why does ${topic} matter for learners?
   a) It builds conceptual understanding
   b) It replaces all other topics
   c) It cannot be taught
   d) It has no real-world connection

## Teacher answer key
1. a  2. a  3. a
`
    : `# ${topic} Worksheet

**Name:** ________________________  **Date:** ____________

## Learning objective
Students will explain key ideas about ${topic} using academic vocabulary.

## Part 1: Fill in the Blanks

Use the **Word Bank** below.

**Word Bank:** evidence · concept · example · process · cause · effect · vocabulary

1. The main ______ of this lesson is ${topic}.
2. Students should support claims with ______.
3. One real-world ______ of ${topic} is __________.
4. A ______ is a series of steps that explains how ${topic} works.
5. Identifying ______ and ______ helps learners see relationships.

## Part 2: Multiple Choice

1. Which strategy best helps students learn ${topic}?
   a) Connecting new ideas to prior knowledge
   b) Memorizing unrelated lists
   c) Skipping examples
   d) Avoiding discussion

2. A strong classroom ${kind} should include:
   a) Clear directions and structured questions
   b) No instructions
   c) Only pictures
   d) Hidden answer keys for students

## Teacher answer key
**Part 1:** 1. concept  2. evidence  3. example  4. process  5. cause, effect  
**Part 2:** 1. a  2. a
`;

  return { title, statusLine, confirmation, markdown };
}
