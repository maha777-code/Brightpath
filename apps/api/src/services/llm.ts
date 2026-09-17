import type {
  QuizGeneratorPayload,
  QuizGeneratorResponse,
  WorksheetGeneratorPayload,
  WorksheetGeneratorResponse,
  SongLyricsPayload,
  SongLyricsDraft,
  LessonPlanPayload,
  LessonPlanResponse,
  SharadaChatRequest,
  SharadaChatResponse,
} from '@brightpath/shared';
import { fallbackSharadaChat } from '@brightpath/shared';
import { applyWorksheetFollowUp, applyWorksheetTranslation } from '@brightpath/shared';
import { getActiveProvider } from '../lib/llm/provider.js';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;

export function optionLetter(index: number): string {
  return LETTERS[index] ?? String.fromCharCode(65 + index);
}

export function withOptionPrefix(text: string, index: number): string {
  const letter = optionLetter(index);
  const trimmed = text.trim();
  if (/^[A-G][.)]\s+/i.test(trimmed)) {
    return `${letter}. ${trimmed.replace(/^[A-G][.)]\s+/i, '')}`;
  }
  return `${letter}. ${trimmed}`;
}

export function letterToIndex(letter: string): number {
  const ch = letter.trim().toUpperCase().replace(/[^A-G]/g, '');
  return Math.max(0, ch.charCodeAt(0) - 65);
}

function topicFrom(input: QuizGeneratorPayload): string {
  return (input.topicDescription ?? input.assessmentDescription ?? '').trim();
}

export function fallbackQuiz(input: QuizGeneratorPayload): QuizGeneratorResponse {
  const topic = topicFrom(input) || 'this topic';
  const n = input.numberOfQuestions;
  const k = input.optionsPerQuestion;
  const questions = Array.from({ length: n }, (_, i) => {
    const options = Array.from({ length: k }, (__, j) => {
      if (j === 0) return withOptionPrefix(`A core idea of ${topic}`, j);
      if (j === 1) return withOptionPrefix(`A common misconception about ${topic}`, j);
      return withOptionPrefix(`An unrelated distractor for ${topic} (${optionLetter(j)})`, j);
    });
    const correctIndex = 0;
    return {
      id: i + 1,
      question: `Which statement best describes ${topic} for ${input.gradeLevel} (item ${i + 1})?`,
      options,
      correctOption: optionLetter(correctIndex),
    };
  });
  return {
    questions,
    answerKey: questions.map((q) => q.correctOption),
  };
}

const QUIZ_SYSTEM = `You are an expert K–12 assessment writer. Generate a clean, curriculum-aligned multiple-choice quiz.

Return JSON only in this exact shape:
{
  "questions": [
    {
      "id": 1,
      "question": "string",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correctOption": "D"
    }
  ],
  "answerKey": ["D", "B", "C"]
}

Rules:
- Match the requested question count exactly.
- Each question has exactly the requested number of options.
- Prefix every option with A., B., C., D. (then E., F., G. if needed).
- correctOption is a single letter matching one option.
- answerKey length equals the question count, in order.
- Age-appropriate for the given grade level.
- Align to provided standards when present.
- One clearly correct answer; plausible distractors.
- No markdown fences, no extra commentary.`;

export async function generateMultipleChoiceQuiz(
  input: QuizGeneratorPayload,
): Promise<QuizGeneratorResponse> {
  const fallback = fallbackQuiz(input);
  const llm = getActiveProvider();
  if (!llm) return fallback;

  try {
    const topic = topicFrom(input);
    const raw = await llm.completeJson<{
      questions?: unknown;
      answerKey?: unknown;
    }>({
      system: QUIZ_SYSTEM,
      user: [
        `Grade level: ${input.gradeLevel}`,
        `Number of questions: ${input.numberOfQuestions}`,
        `Options per question: ${input.optionsPerQuestion}`,
        `Topic / description:\n${topic}`,
        input.standardsAlignment?.trim()
          ? `Standards to align to:\n${input.standardsAlignment.trim()}`
          : '',
        input.attachments?.length ? `Attached files: ${input.attachments.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
    });

    return normalizeQuizResponse(raw, input, fallback);
  } catch (err) {
    console.error('[llm] quiz generation failed', err);
    return fallback;
  }
}

export function normalizeQuizResponse(
  raw: { questions?: unknown; answerKey?: unknown },
  input: QuizGeneratorPayload,
  fallback: QuizGeneratorResponse,
): QuizGeneratorResponse {
  if (!Array.isArray(raw.questions) || raw.questions.length === 0) return fallback;

  const questions = raw.questions.slice(0, input.numberOfQuestions).map((item, i) => {
    const q = item as {
      id?: number;
      question?: string;
      options?: unknown;
      correctOption?: string;
      correctIndex?: number;
    };
    const rawOptions = Array.isArray(q.options) ? q.options.map((o) => String(o)) : [];
    const options = Array.from({ length: input.optionsPerQuestion }, (_, j) =>
      withOptionPrefix(rawOptions[j] ?? `Option ${optionLetter(j)}`, j),
    );
    let correctOption = String(q.correctOption ?? '').trim().toUpperCase().replace(/[^A-G]/g, '');
    if (!correctOption && typeof q.correctIndex === 'number') {
      correctOption = optionLetter(q.correctIndex);
    }
    if (!correctOption || letterToIndex(correctOption) >= options.length) {
      correctOption = 'A';
    }
    return {
      id: typeof q.id === 'number' ? q.id : i + 1,
      question: String(q.question ?? '').trim() || `Question ${i + 1}`,
      options,
      correctOption,
    };
  });

  while (questions.length < input.numberOfQuestions) {
    questions.push(fallback.questions[questions.length] ?? fallback.questions[0]);
  }

  const fromModel = Array.isArray(raw.answerKey)
    ? raw.answerKey.map((k) => String(k).trim().toUpperCase().replace(/[^A-G]/g, '') || 'A')
    : [];
  const answerKey = questions.map((q, i) => fromModel[i] || q.correctOption);

  return { questions, answerKey };
}

const WORKSHEET_SYSTEM = `You are an expert K–12 worksheet designer. Generate a clean, printable classroom worksheet.

Return JSON only in this exact shape:
{
  "title": "string",
  "gradeLevel": "string",
  "instructions": "string",
  "passage": "string",
  "sections": [
    {
      "heading": "string",
      "items": [{ "id": 1, "prompt": "string" }]
    }
  ]
}

Rules:
- Age-appropriate for the given grade level.
- Include a 2–4 paragraph reading passage in "passage".
- First section heading should often be "Reading Passage" questions that follow the passage.
- 2–4 sections after the passage (Comprehension, Vocabulary, Practice, Apply).
- 8–12 numbered items total across all sections.
- Each prompt is a complete student-facing question or task.
- No markdown fences, no extra commentary.`;

export function fallbackWorksheet(input: WorksheetGeneratorPayload): WorksheetGeneratorResponse {
  const topic = input.topicOrText.trim() || 'this topic';
  const grade = input.gradeLevel;
  const war = /world\s*war|ww\s*2|wwii/i.test(topic);
  if (war) {
    return {
      title: 'World War II Worksheet',
      gradeLevel: grade,
      instructions: 'Read the passage, then answer the questions in complete sentences.',
      passage:
        'World War II was a global conflict that lasted from 1939 to 1945. It involved most of the world’s nations and reshaped borders, governments, and daily life. Causes included unresolved tensions from World War I, economic hardship, and the rise of aggressive dictatorships. The conflict spread across Europe, Asia, Africa, and the Pacific. Its consequences included enormous loss of life, the founding of the United Nations, and a new balance of power that defined the second half of the twentieth century.',
      sections: [
        {
          heading: 'Comprehension',
          items: [
            { id: 1, prompt: 'When did World War II begin and end?' },
            { id: 2, prompt: 'Name two causes of the war mentioned in the passage.' },
            { id: 3, prompt: 'What international organization was founded after the war?' },
          ],
        },
        {
          heading: 'Vocabulary',
          items: [
            { id: 4, prompt: 'Define “dictatorship” in your own words.' },
            { id: 5, prompt: 'What does “consequences” mean in the last sentence?' },
          ],
        },
        {
          heading: 'Apply',
          items: [
            { id: 6, prompt: 'Why might unresolved tensions from an earlier war lead to a new conflict?' },
            { id: 7, prompt: 'Give one way World War II still influences the world today.' },
          ],
        },
      ],
    };
  }
  return {
    title: `${topic} Worksheet`,
    gradeLevel: grade,
    instructions: `Complete every section. Use complete sentences where asked. Grade: ${grade}.`,
    passage: `${topic} is an important idea for ${grade} students to understand. Read carefully, then answer the questions that follow using evidence from the text and your own reasoning.`,
    sections: [
      {
        heading: 'Comprehension',
        items: [
          { id: 1, prompt: `In your own words, what is ${topic}?` },
          { id: 2, prompt: `Name one real-world example of ${topic}.` },
        ],
      },
      {
        heading: 'Vocabulary & ideas',
        items: [
          { id: 3, prompt: `List two key terms related to ${topic} and define each.` },
          { id: 4, prompt: `What is a common misconception about ${topic}?` },
          { id: 5, prompt: `How would you explain ${topic} to a classmate who missed class?` },
        ],
      },
      {
        heading: 'Practice',
        items: [
          { id: 6, prompt: `Apply ${topic} to a short ${grade} classroom scenario.` },
          { id: 7, prompt: `What evidence would you use to show that a student understands ${topic}?` },
          { id: 8, prompt: `Write one follow-up question a teacher could ask about ${topic}.` },
        ],
      },
    ],
  };
}

export function normalizeWorksheetResponse(
  raw: {
    title?: unknown;
    gradeLevel?: unknown;
    instructions?: unknown;
    passage?: unknown;
    sections?: unknown;
  },
  input: WorksheetGeneratorPayload,
  fallback: WorksheetGeneratorResponse,
): WorksheetGeneratorResponse {
  if (!Array.isArray(raw.sections) || raw.sections.length === 0) return fallback;

  let nextId = 1;
  const sections = raw.sections.slice(0, 6).map((section) => {
    const s = (section ?? {}) as { heading?: unknown; items?: unknown };
    const rawItems = Array.isArray(s.items) ? s.items : [];
    const items = rawItems.slice(0, 12).map((item) => {
      const it = (item ?? {}) as { id?: unknown; prompt?: unknown; question?: unknown };
      const prompt = String(it.prompt ?? it.question ?? '').trim() || `Practice item ${nextId}`;
      const id = typeof it.id === 'number' ? it.id : nextId;
      nextId += 1;
      return { id, prompt };
    });
    return {
      heading: String(s.heading ?? '').trim() || 'Section',
      items: items.length ? items : [{ id: nextId++, prompt: `Respond to a question about this topic.` }],
    };
  });

  return {
    title: String(raw.title ?? '').trim() || fallback.title,
    gradeLevel: String(raw.gradeLevel ?? '').trim() || input.gradeLevel,
    instructions: String(raw.instructions ?? '').trim() || fallback.instructions,
    passage: String(raw.passage ?? '').trim() || fallback.passage,
    sections,
  };
}

export async function generateWorksheet(
  input: WorksheetGeneratorPayload,
): Promise<WorksheetGeneratorResponse> {
  const fallback = fallbackWorksheet(input);
  const llm = getActiveProvider();
  if (!llm) return fallback;

  try {
    const raw = await llm.completeJson<{
      title?: unknown;
      gradeLevel?: unknown;
      instructions?: unknown;
      passage?: unknown;
      sections?: unknown;
    }>({
      system: WORKSHEET_SYSTEM,
      user: [
        `Grade level: ${input.gradeLevel}`,
        `Topic or source text:\n${input.topicOrText.trim()}`,
        input.attachments?.length ? `Attached files: ${input.attachments.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
    });
    return normalizeWorksheetResponse(raw, input, fallback);
  } catch (err) {
    console.error('[llm] worksheet generation failed', err);
    return fallback;
  }
}

export async function refineWorksheet(input: {
  gradeLevel: string;
  topicOrText: string;
  instruction: string;
  attachments?: string[];
  current?: WorksheetGeneratorResponse;
}): Promise<WorksheetGeneratorResponse> {
  const base = input.current ?? fallbackWorksheet(input);
  const heuristic = applyWorksheetFollowUp(base, input.instruction);
  const llm = getActiveProvider();
  if (!llm) return heuristic;

  try {
    const raw = await llm.completeJson<{
      title?: unknown;
      gradeLevel?: unknown;
      instructions?: unknown;
      passage?: unknown;
      sections?: unknown;
    }>({
      system: `${WORKSHEET_SYSTEM}\nRevise the existing worksheet to satisfy the teacher instruction. Return the complete updated worksheet JSON.`,
      user: [
        `Grade level: ${input.gradeLevel}`,
        `Original topic or text:\n${input.topicOrText.trim()}`,
        `Teacher instruction:\n${input.instruction.trim()}`,
        input.attachments?.length ? `Attached files: ${input.attachments.join(', ')}` : '',
        `Current worksheet JSON:\n${JSON.stringify(base)}`,
      ]
        .filter(Boolean)
        .join('\n\n'),
    });
    return normalizeWorksheetResponse(raw, input, heuristic);
  } catch (err) {
    console.error('[llm] worksheet refine failed', err);
    return heuristic;
  }
}

export async function translateWorksheet(input: {
  targetLanguage: string;
  current: WorksheetGeneratorResponse;
  gradeLevel?: string;
}): Promise<WorksheetGeneratorResponse> {
  const heuristic = applyWorksheetTranslation(input.current, input.targetLanguage);
  const llm = getActiveProvider();
  if (!llm) return heuristic;

  try {
    const raw = await llm.completeJson<{
      title?: unknown;
      gradeLevel?: unknown;
      instructions?: unknown;
      passage?: unknown;
      sections?: unknown;
    }>({
      system: `${WORKSHEET_SYSTEM}\nTranslate the entire worksheet into ${input.targetLanguage}. Keep the same JSON shape, item ids, and section count. Translate title, instructions, passage, headings, and prompts. Do not add extra commentary.`,
      user: [
        input.gradeLevel ? `Grade level: ${input.gradeLevel}` : '',
        `Target language: ${input.targetLanguage}`,
        `Current worksheet JSON:\n${JSON.stringify(input.current)}`,
      ]
        .filter(Boolean)
        .join('\n\n'),
    });
    return normalizeWorksheetResponse(
      raw,
      { gradeLevel: input.current.gradeLevel, topicOrText: input.current.title },
      heuristic,
    );
  } catch (err) {
    console.error('[llm] worksheet translate failed', err);
    return heuristic;
  }
}

const SONG_LYRICS_SYSTEM = `You write original, classroom-safe educational songs for K-12 students.
Return strict JSON with keys: title (string), lyrics (string).
Lyrics must include labeled sections such as Verse 1, Chorus, Verse 2, and Bridge when helpful.
Keep language grade-appropriate, scientifically/historically accurate, catchy, and singable.
Do not include markdown or extra commentary.`;

export function fallbackSongLyrics(input: SongLyricsPayload): SongLyricsDraft {
  const topic = input.topic.trim() || 'this topic';
  const title = `${topic} Song`;
  const lyrics = [
    `Verse 1`,
    `Let's explore ${topic} today,`,
    `${input.gradeLevel} learners leading the way.`,
    `Ask a question, look around —`,
    `clues and evidence can be found.`,
    ``,
    `Chorus`,
    `${topic}, ${topic}, sing it true,`,
    `learn the steps and follow through.`,
    `In the style of ${input.songStyle},`,
    `we remember what we do.`,
    ``,
    `Verse 2`,
    `Break it down and say it slow,`,
    `that's the way the big ideas grow.`,
    `Try an example, check your claim,`,
    `then we sing the facts by name.`,
  ].join('\n');
  return {
    title,
    lyrics,
    topic,
    gradeLevel: input.gradeLevel,
    songStyle: input.songStyle,
    customInstructions: input.customInstructions,
  };
}

export async function generateSongLyrics(input: SongLyricsPayload): Promise<SongLyricsDraft> {
  const fallback = fallbackSongLyrics(input);
  const llm = getActiveProvider();
  if (!llm) return fallback;

  try {
    const raw = await llm.completeJson<{ title?: unknown; lyrics?: unknown }>({
      system: SONG_LYRICS_SYSTEM,
      user: [
        `Song topic: ${input.topic.trim()}`,
        `Grade level: ${input.gradeLevel}`,
        `Song style: ${input.songStyle}`,
        input.customInstructions?.trim()
          ? `Custom instructions: ${input.customInstructions.trim()}`
          : '',
      ]
        .filter(Boolean)
        .join('\n'),
    });
    const title = String(raw.title ?? '').trim() || fallback.title;
    const lyrics = String(raw.lyrics ?? '').trim() || fallback.lyrics;
    return {
      title,
      lyrics,
      topic: input.topic.trim(),
      gradeLevel: input.gradeLevel,
      songStyle: input.songStyle,
      customInstructions: input.customInstructions,
    };
  } catch (err) {
    console.error('[llm] song lyrics generation failed', err);
    return fallback;
  }
}

const LESSON_PLAN_SYSTEM = `You are an expert K–12 instructional planner. Generate a classroom-ready lesson plan.

Return JSON only in this exact shape:
{
  "title": "string",
  "gradeLevel": "string",
  "objective": "string",
  "standards": ["string"],
  "durationMinutes": 50,
  "materials": ["string"],
  "sections": [
    { "heading": "Warm-up", "minutes": 5, "activities": ["string"] }
  ],
  "assessment": "string",
  "differentiation": "string"
}

Rules:
- Match the requested grade level.
- Include warm-up, mini-lesson, guided/group practice, independent practice, and closing.
- Honor additional criteria (grouping, prior lesson, materials).
- Align to named standards when provided.
- Keep activities specific and teachable in one class period.
`;

export function fallbackLessonPlan(input: LessonPlanPayload): LessonPlanResponse {
  const topic = input.topic.trim() || 'this topic';
  const firstLine = topic.split('\n')[0]?.trim() || topic;
  return {
    title: `${firstLine.slice(0, 72)} — Lesson Plan`,
    gradeLevel: input.gradeLevel,
    objective: `Students will explain ${firstLine.slice(0, 140)} with an example and apply it in a short collaborative task.`,
    standards: input.standards
      ? input.standards.split(/[;,\n]/).map((s) => s.trim()).filter(Boolean)
      : [`Aligned to ${input.gradeLevel} classroom objectives`],
    durationMinutes: 50,
    materials: ['Whiteboard or slide deck', 'Student notebooks', 'Exit ticket slips'],
    sections: [
      {
        heading: 'Warm-up',
        minutes: 5,
        activities: [`Activate prior knowledge related to ${firstLine.slice(0, 80)}.`, 'Turn and talk: what do you already know?'],
      },
      {
        heading: 'Mini-lesson',
        minutes: 12,
        activities: ['Model the core idea with a worked example.', 'Check for understanding with two targeted questions.'],
      },
      {
        heading: 'Guided / group practice',
        minutes: 18,
        activities: [
          input.additionalCriteria?.trim() || 'Students complete a collaborative task using the lesson objective.',
          'Teacher circulates with a success-criteria checklist.',
        ],
      },
      {
        heading: 'Independent practice',
        minutes: 8,
        activities: ['Students apply the idea to one new example in writing.'],
      },
      {
        heading: 'Closing',
        minutes: 7,
        activities: ['Exit ticket: explain the idea in one sentence and give one example.'],
      },
    ],
    assessment: 'Exit ticket plus teacher observation during group work.',
    differentiation:
      'Provide sentence starters for emerging writers; extension asks students to connect the idea to a real-world case.',
  };
}

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function normalizeLessonPlan(
  raw: Record<string, unknown>,
  input: LessonPlanPayload,
  fallback: LessonPlanResponse,
): LessonPlanResponse {
  const sectionsRaw = Array.isArray(raw.sections) ? raw.sections : [];
  const sections = sectionsRaw.map((item) => {
    const rec = (item ?? {}) as Record<string, unknown>;
    const activities = asStringList(rec.activities);
    return {
      heading: String(rec.heading ?? '').trim() || 'Section',
      minutes: typeof rec.minutes === 'number' ? rec.minutes : undefined,
      activities: activities.length ? activities : ['Complete the planned classroom task.'],
    };
  });
  const standards = asStringList(raw.standards);
  const materials = asStringList(raw.materials);
  return {
    title: String(raw.title ?? '').trim() || fallback.title,
    gradeLevel: String(raw.gradeLevel ?? '').trim() || input.gradeLevel,
    objective: String(raw.objective ?? '').trim() || fallback.objective,
    standards: standards.length ? standards : fallback.standards,
    durationMinutes:
      typeof raw.durationMinutes === 'number' ? raw.durationMinutes : fallback.durationMinutes,
    materials: materials.length ? materials : fallback.materials,
    sections: sections.length ? sections : fallback.sections,
    assessment: String(raw.assessment ?? '').trim() || fallback.assessment,
    differentiation: String(raw.differentiation ?? '').trim() || fallback.differentiation,
  };
}

export async function generateLessonPlan(input: LessonPlanPayload): Promise<LessonPlanResponse> {
  const fallback = fallbackLessonPlan(input);
  const llm = getActiveProvider();
  if (!llm) return fallback;

  try {
    const raw = await llm.completeJson<Record<string, unknown>>({
      system: LESSON_PLAN_SYSTEM,
      user: [
        `Grade level: ${input.gradeLevel}`,
        `Topic, standard, or objective:\n${input.topic.trim()}`,
        input.additionalCriteria?.trim() ? `Additional criteria:\n${input.additionalCriteria.trim()}` : '',
        input.standards?.trim() ? `Standards set to align to:\n${input.standards.trim()}` : '',
        input.attachments?.length ? `Attached files: ${input.attachments.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
    });
    return normalizeLessonPlan(raw, input, fallback);
  } catch (err) {
    console.error('[llm] lesson plan generation failed', err);
    return fallback;
  }
}

const SHARADA_SYSTEM = `You are Sharada, an expert AI pedagogical assistant. When requested to generate educational material (worksheets, quizzes, lesson plans), produce a complete, classroom-ready document formatted cleanly in Markdown. Include headers, clear instructions, word banks, and structured question parts.

Return JSON only in this exact shape:
{
  "title": "short breadcrumb title, e.g. Photosynthesis worksheet",
  "statusLine": "I'll search for the right tool to create your worksheet.",
  "confirmation": "Great! Here's a photosynthesis worksheet you can use right away:",
  "markdown": "# Full markdown document..."
}

Rules:
- markdown must be a complete student-facing document: title, name/date lines, Part 1 Fill in the Blanks with a Word Bank, Part 2 Multiple Choice with a–d options, and a teacher answer key.
- Use Markdown headings, bold labels, numbered lists, and blank lines (______) for fill-ins.
- Keep statusLine and confirmation concise and warm.
- Do not wrap markdown in code fences.
- Match the teacher's requested topic, grade, and format.`;

function normalizeSharadaChat(raw: Record<string, unknown>, fallback: SharadaChatResponse): SharadaChatResponse {
  const markdown = String(raw.markdown ?? '').trim();
  return {
    title: String(raw.title ?? '').trim() || fallback.title,
    statusLine: String(raw.statusLine ?? '').trim() || fallback.statusLine,
    confirmation: String(raw.confirmation ?? '').trim() || fallback.confirmation,
    markdown: markdown || fallback.markdown,
  };
}

export async function generateSharadaChat(input: SharadaChatRequest): Promise<SharadaChatResponse> {
  const fallback = fallbackSharadaChat(input.prompt);
  const llm = getActiveProvider();
  if (!llm) return fallback;

  const historyBlock = (input.history ?? [])
    .slice(-12)
    .map((msg) => `${msg.role === 'user' ? 'Teacher' : 'Sharada'}: ${msg.content}`)
    .join('\n\n');

  try {
    const raw = await llm.completeJson<Record<string, unknown>>({
      system: SHARADA_SYSTEM,
      user: [historyBlock ? `Conversation so far:\n${historyBlock}` : '', `New request:\n${input.prompt.trim()}`]
        .filter(Boolean)
        .join('\n\n'),
    });
    return normalizeSharadaChat(raw, fallback);
  } catch (err) {
    console.error('[llm] sharada chat generation failed', err);
    return fallback;
  }
}
