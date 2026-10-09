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
  RouterIntent,
  EmailResponderRequest,
  EmailResponderResponse,
} from '@brightpath/shared';
import { applyWorksheetFollowUp, applyWorksheetTranslation, classroomLessonPlanFallback, classifyUserIntent, cleanLessonSource, emailResponderPrompt, fallbackEmailResponse, fallbackSharadaChat, lessonSubjectLabel } from '@brightpath/shared';
import { getActiveProvider, imagePartsFromDataUrls } from '../lib/llm/provider.js';

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
- Do not put number prefixes inside prompt text. Never start a prompt with "1.", "2.", "1)", "1. 1.", or "1. 5.". The app numbers questions itself.
- No markdown fences, no extra commentary.
- When ATTACHED DOCUMENT CONTEXT or images are provided, write the passage and every question from that source.
- Do not use generic placeholders such as "In your own words, what is [user prompt]".
- Pull real concepts, definitions, facts, and reading lines from the document or image.
- Include comprehension items, multiple-choice options labeled A–D when a choice question fits, short-answer items, and practice tasks based on the source.
- Use the user instruction only to choose the focus, chapter, or question types.`;

export function fallbackWorksheet(input: WorksheetGeneratorPayload): WorksheetGeneratorResponse {
  const documentText = input.attachedDocumentContext?.replace(/\s+/g, ' ').trim();
  if (documentText) {
    const topic = input.topicOrText.trim() || input.attachments?.[0] || 'the attached document';
    const sentences = documentText
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => sentence.trim())
      .filter((sentence) => sentence.length > 40)
      .slice(0, 6);
    const passage = (sentences.slice(0, 4).join(' ') || documentText).slice(0, 1200);
    const prompts = (sentences.length ? sentences : [passage]).slice(0, 6).map((sentence, index) => ({
      id: index + 1,
      prompt:
        index % 2 === 0
          ? `Using the source, explain this statement: "${sentence.slice(0, 180)}"`
          : `What does the document say about: "${sentence.slice(0, 160)}"?`,
    }));
    return {
      title: `${topic} Worksheet`,
      gradeLevel: input.gradeLevel,
      instructions: 'Read the passage taken from the attached document, then answer the questions.',
      passage,
      sections: [
        { heading: 'Comprehension', items: prompts.slice(0, 3) },
        { heading: 'Practice', items: prompts.slice(3).length ? prompts.slice(3) : prompts.slice(0, 1) },
      ],
    };
  }
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
      const rawPrompt = String(it.prompt ?? it.question ?? '').trim();
      const prompt = rawPrompt.replace(/^(\d+[\.\)]\s*)+/g, '').trim() || rawPrompt || `Practice item ${nextId}`;
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

function worksheetSourcePrompt(input: WorksheetGeneratorPayload): string {
  return [
    `Grade level: ${input.gradeLevel}`,
    input.topicOrText.trim()
      ? `User instruction:\n${input.topicOrText.trim()}`
      : 'User instruction: Create a worksheet from the attached document.',
    input.attachments?.length ? `Attached file names: ${input.attachments.join(', ')}` : '',
    input.attachedDocumentContext?.trim()
      ? `ATTACHED DOCUMENT CONTEXT:\n${input.attachedDocumentContext.trim()}`
      : '',
    input.imageFiles?.length
      ? `Attached images: ${input.imageFiles.length}. Read each image and use its visible text, labels, and diagrams as source material.`
      : '',
  ]
    .filter(Boolean)
    .join('\n\n');
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
      user: worksheetSourcePrompt(input),
      images: imagePartsFromDataUrls(input.imageFiles),
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
  attachedDocumentContext?: string;
  imageFiles?: string[];
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
        input.attachedDocumentContext?.trim()
          ? `ATTACHED DOCUMENT CONTEXT:\n${input.attachedDocumentContext.trim()}`
          : '',
        input.imageFiles?.length
          ? `Attached images: ${input.imageFiles.length}. Use the visible text and diagrams as source material.`
          : '',
        `Current worksheet JSON:\n${JSON.stringify(base)}`,
      ]
        .filter(Boolean)
        .join('\n\n'),
      images: imagePartsFromDataUrls(input.imageFiles),
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

const LESSON_PLAN_SYSTEM = `You are an expert AI curriculum designer. Read the DOCUMENT CONTENT and write an in-depth lesson plan based exclusively on the subject matter, concepts, experiments, and terminology in that document.

CRITICAL CONSTRAINTS:
1. DO NOT use generic placeholders such as "Generate lesson plan for chapter 1", "Explain the idea", or "Model the core idea using this source excerpt".
2. DO NOT include publisher names, copyright notices, street addresses, prices, ISBNs, or page numbers.
3. EXTRACT the real title, scientific concepts, vocabulary, definitions, and lab activities from the DOCUMENT CONTENT.
4. If the teacher says "Chapter 1", identify what that chapter is about from the document (for example, "Matter in Our Surroundings: Particles, States, and Phase Changes") and teach that.
5. Every objective, key point, station, and homework task must name ideas that appear in the document.

Return JSON only in this exact shape:
{
  "title": "Actual subject or chapter title — Grade level",
  "gradeLevel": "string",
  "objective": "Students will be able to ... (one precise Bloom's Taxonomy statement)",
  "standards": ["CODE: full standard description"],
  "durationMinutes": 50,
  "materials": ["classroom material, not a file dump"],
  "sections": [
    { "heading": "Key Points", "activities": ["3 to 5 core takeaways"] },
    { "heading": "Opening", "minutes": 8, "activities": ["prior-knowledge hook", "real-world question", "why this lesson matters"] },
    { "heading": "Introduction to New Material", "minutes": 12, "activities": ["step-by-step walkthrough", "core model", "key distinction", "Common Misconception: ...", "Correction: ..."] },
    { "heading": "Guided Practice", "minutes": 15, "activities": ["Station 1 (Name): instructions and probing questions", "Station 2 (Name): ...", "Station 3 (Name): ...", "Teacher Role: circulation, safety, and what to observe"] },
    { "heading": "Independent Practice", "minutes": 8, "activities": ["a new real-world scenario with a sketch or writing prompt"] },
    { "heading": "Closing", "minutes": 5, "activities": ["summary or sentence frame", "link to the next topic"] },
    { "heading": "Extension / Above-Grade Challenge", "activities": ["a harder scenario for fast finishers"] },
    { "heading": "Homework", "activities": ["one clear task that reinforces today's concept"] }
  ],
  "assessment": "formative or summative task, success criteria, and the student deliverable",
  "differentiation": "Below grade level: ...\\nOn grade level: ...\\nAbove grade level: ..."
}

Use those section headings exactly, in that order. Every activity must name the real concept, not the filename.`;

const LEAKED_SOURCE = /===\s*ATTACHED FILE CONTENT(?:\s*\([^)]*\))?\s*===|---\s*Page\s+\d+\s+---|government of karnataka|@?ktbs|not to be republished/gi;

function scrubLessonText(value: string): string {
  return value.replace(LEAKED_SOURCE, '').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function lessonPlanUserPrompt(input: LessonPlanPayload, source = cleanLessonSource(input.attachedDocumentContext, input.topic)): string {
  const subject = lessonSubjectLabel(input.topic, source);
  const imageCount = input.imageFiles?.length ?? 0;
  return [
    '=== USER REQUEST ===',
    `Grade Level: ${input.gradeLevel}`,
    `User Input / Request: ${input.topic.trim()}`,
    `Additional Criteria: ${input.additionalCriteria?.trim() || 'None provided'}`,
    `Standards to Align: ${input.standards?.trim() || 'Use only standards named by the teacher or printed in the document. Do not invent a code.'}`,
    `Chapter title already identified: ${source.chapterTitle || subject}`,
    source.terms.length ? `Key terms already identified: ${source.terms.join(', ')}` : '',
    '',
    '=== EXTRACTED DOCUMENT CONTENT (ANALYSIS MANDATORY) ===',
    source.cleanedText || 'NO FILE ATTACHED',
    '',
    '=== INSTRUCTIONS ===',
    '1. Analyze only the EXTRACTED DOCUMENT CONTENT above.',
    '2. Identify the core topic, scientific models, definitions, lab ideas, and a misconception that fits this chapter.',
    `3. The lesson title must be the real chapter subject ("${subject}"), never the teacher's filename or the words "generate lesson plan".`,
    '4. Return the JSON object from the system instruction. Ground every section in the document.',
    imageCount ? `5. ${imageCount} image(s) are attached. Use their labels and diagrams as part of the document.` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function fallbackLessonPlan(input: LessonPlanPayload): LessonPlanResponse {
  return classroomLessonPlanFallback(input);
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
    const activities = asStringList(rec.activities).map(scrubLessonText).filter(Boolean);
    return {
      heading: scrubLessonText(String(rec.heading ?? '')) || 'Section',
      minutes: typeof rec.minutes === 'number' ? rec.minutes : undefined,
      activities: activities.length ? activities : ['Complete the planned classroom task.'],
    };
  });
  const standards = asStringList(raw.standards).map(scrubLessonText).filter(Boolean);
  const materials = asStringList(raw.materials).map(scrubLessonText).filter((item) => item && !/attached file content/i.test(item));
  const title = scrubLessonText(String(raw.title ?? ''));
  const genericTitle = !title || /generate lesson plan|explain the idea/i.test(title);
  return {
    title: genericTitle ? fallback.title : title,
    gradeLevel: String(raw.gradeLevel ?? '').trim() || input.gradeLevel,
    objective: scrubLessonText(String(raw.objective ?? '')) || fallback.objective,
    standards: standards.length ? standards : fallback.standards,
    durationMinutes:
      typeof raw.durationMinutes === 'number' ? raw.durationMinutes : fallback.durationMinutes,
    materials: materials.length ? materials : fallback.materials,
    sections: sections.length ? sections : fallback.sections,
    assessment: scrubLessonText(String(raw.assessment ?? '')) || fallback.assessment,
    differentiation: scrubLessonText(String(raw.differentiation ?? '')) || fallback.differentiation,
  };
}

export async function translateLessonPlan(input: {
  targetLanguage: string;
  plan: LessonPlanResponse;
}): Promise<LessonPlanResponse> {
  const llm = getActiveProvider();
  if (!llm) throw new Error('Translation model is not configured');
  const raw = await llm.completeJson<Record<string, unknown>>({
    system: `${LESSON_PLAN_SYSTEM}
Translate every user-facing string into ${input.targetLanguage}.
Keep the same JSON keys, numeric minutes, section count, and activity count.
Do not add commentary or change the lesson's meaning.`,
    user: `Target language: ${input.targetLanguage}\n\nLesson plan JSON:\n${JSON.stringify(input.plan)}`,
  });
  return normalizeLessonPlan(
    raw,
    { gradeLevel: input.plan.gradeLevel, topic: input.plan.title },
    input.plan,
  );
}

export async function generateLessonPlan(input: LessonPlanPayload): Promise<LessonPlanResponse> {
  const source = cleanLessonSource(input.attachedDocumentContext, input.topic);
  const fileWasAttached = Boolean(input.attachedDocumentContext?.trim() || input.attachments?.length);
  if (fileWasAttached && !source.readable && !(input.imageFiles?.length)) {
    throw new Error('Could not find readable chapter content in the attached file.');
  }

  const fallback = fallbackLessonPlan(input);
  const llm = getActiveProvider();
  if (!llm) return fallback;

  try {
    const raw = await llm.completeJson<Record<string, unknown>>({
      system: LESSON_PLAN_SYSTEM,
      user: lessonPlanUserPrompt(input, source),
      images: imagePartsFromDataUrls(input.imageFiles),
      temperature: 0.2,
    });
    return normalizeLessonPlan(raw, input, fallback);
  } catch (err) {
    if (err instanceof Error && /readable chapter content/i.test(err.message)) throw err;
    console.error('[llm] lesson plan generation failed', err);
    return fallback;
  }
}

function looksLikeWorksheet(markdown: string): boolean {
  return /fill in the blanks|word bank|teacher answer key/i.test(markdown);
}

function sharadaSystemFor(intent: RouterIntent): string {
  const shape = `Return JSON only in this exact shape:
{
  "title": "short breadcrumb title",
  "statusLine": "one short status sentence",
  "confirmation": "one short lead-in sentence",
  "markdown": "the full reply in Markdown"
}

Rules:
- Do not wrap markdown in code fences.
- Match the teacher's topic and grade level.`;

  if (intent.type === 'EXPLANATION') {
    const grade = intent.gradeLevel ? `Write for ${intent.gradeLevel} students.` : 'Write for the age group implied by the request, or upper elementary if none is given.';
    return `You are Sharada, an expert teacher. The teacher asked you to explain a concept in chat. Do NOT create a worksheet, quiz, lesson plan, handout, or practice sheet.

${grade}

Structure the markdown exactly like this:
1. Age-appropriate hook and analogy. Open with a vivid real-world comparison students that age already understand.
2. Key concepts as bullet points: what goes in, what comes out, and the one place or idea that matters.
3. Step-by-step breakdown. Use bold headings for each step.
4. Check for understanding. End with 1–2 short reflection questions. Do not include an answer key or fill-in blanks.

statusLine should say you are explaining the concept. confirmation should introduce the explanation.

${shape}`;
  }

  if (intent.type === 'GENERAL_CHAT') {
    return `You are Sharada, an expert teaching assistant. Answer the teacher directly in chat. Do NOT default to a worksheet, quiz, or lesson plan unless they explicitly asked for one.

${shape}`;
  }

  if (intent.type === 'TOOL_QUIZ') {
    return `You are Sharada. The teacher explicitly asked for a quiz. Produce a classroom-ready multiple-choice quiz in Markdown with an answer key. Do not turn an explanation-only request into a quiz.

${shape}`;
  }

  if (intent.type === 'TOOL_WORKSHEET') {
    return `You are Sharada. The teacher explicitly asked for a worksheet, handout, or practice problems. Produce a classroom-ready worksheet in Markdown with a word bank, fill-in items, and an answer key.

${shape}`;
  }

  return `You are Sharada. The teacher asked for ${intent.targetTool ?? 'a classroom tool'}. Respond for that tool only. Do not substitute a worksheet.

${shape}`;
}

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
  const intent = classifyUserIntent(input.prompt);
  const fallback = fallbackSharadaChat(input.prompt);
  const llm = getActiveProvider();
  if (!llm) return fallback;

  const historyBlock = (input.history ?? [])
    .slice(-12)
    .map((msg) => `${msg.role === 'user' ? 'Teacher' : 'Sharada'}: ${msg.content}`)
    .join('\n\n');

  try {
    const raw = await llm.completeJson<Record<string, unknown>>({
      system: sharadaSystemFor(intent),
      user: [
        `Intent: ${intent.type}${intent.gradeLevel ? ` (${intent.gradeLevel})` : ''}`,
        historyBlock ? `Conversation so far:\n${historyBlock}` : '',
        `New request:\n${input.prompt.trim()}`,
      ]
        .filter(Boolean)
        .join('\n\n'),
    });
    const reply = normalizeSharadaChat(raw, fallback);
    if ((intent.type === 'EXPLANATION' || intent.type === 'GENERAL_CHAT') && looksLikeWorksheet(reply.markdown)) {
      return fallback;
    }
    return reply;
  } catch (err) {
    console.error('[llm] sharada chat generation failed', err);
    return fallback;
  }
}

export async function generateEmailResponse(input: EmailResponderRequest): Promise<EmailResponderResponse> {
  const fallback = fallbackEmailResponse(input);
  const llm = getActiveProvider();
  if (!llm) return fallback;

  try {
    const raw = await llm.completeJson<{ email?: string; suggestions?: string[] }>({
      system: 'You draft professional school emails from the user\'s original email and the points they want to communicate. Return JSON only: {"email":"Subject: ...\\n\\nfull email body","suggestions":["short follow-up the user might ask","another follow-up"]}. suggestions must be exactly two plain sentences. Do not wrap the email in code fences.',
      user: emailResponderPrompt(input),
    });
    const email = String(raw.email ?? '').trim();
    if (!email) return fallback;
    const suggestions = Array.isArray(raw.suggestions)
      ? raw.suggestions.map((item) => String(item).trim()).filter(Boolean).slice(0, 2)
      : [];
    return {
      email: /^subject:/i.test(email) ? email : `Subject: Following up on your email\n\n${email}`,
      suggestions: suggestions.length === 2 ? suggestions : fallback.suggestions,
    };
  } catch (err) {
    console.error('[llm] email responder failed', err);
    return fallback;
  }
}
