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
    description: 'Generate custom lyrics and a song on any topic — to the tune of your choice!',
    focusArea: 'content',
    href: '/teacher/tools/song-generator',
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
    description: 'Generate a lesson plan based on a standard, topic, or objective.',
    focusArea: 'curriculum',
    href: '/teacher/tools/lesson-plan-generator',
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

export function fallbackSharadaChat(prompt: string): SharadaChatResponse {
  const topic = extractTopic(prompt);
  const title = sharadaTitleFromPrompt(prompt);
  const isWorksheet = /worksheet|fill in|word bank|homework/i.test(prompt);
  const isQuiz = /quiz|multiple choice|assessment/i.test(prompt);
  const photosynthesis = /photosynthesis/i.test(prompt);

  if (photosynthesis || (isWorksheet && /photo/i.test(topic))) {
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

  const kind = isQuiz ? 'quiz' : isWorksheet ? 'worksheet' : 'classroom resource';
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
