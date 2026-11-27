import type {
  QuizGeneratorPayload,
  QuizGeneratorResponse,
  WorksheetGeneratorPayload,
  WorksheetGeneratorResponse,
  SongLyricsPayload,
  SongLyricsDraft,
  LessonPlanPayload,
  LessonPlanResponse,
  PresentationPayload,
  PresentationResponse,
  PresentationSlide,
  SharadaChatRequest,
  SharadaChatResponse,
  RouterIntent,
  EmailResponderRequest,
  EmailResponderResponse,
} from '@brightpath/shared';
import { assignSlideLayouts, classifyUserIntent, cleanLessonSource, emailResponderPrompt, KHDA_LESSON_RULES, lessonSubjectLabel, PRESENTATION_LAYOUTS, presentationSlideTarget, sharadaTitleFromPrompt } from '@brightpath/shared';
import { imagePartsFromDataUrls } from '../lib/llm/provider.js';
import { AiGenerationError, aiUnusable, requireAiProvider, runAi } from '../lib/llm/errors.js';

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
- When ATTACHED DOCUMENT CONTEXT or images are provided, every question must be answerable from that source.
- Use names, terms, events, and claims that appear in the file. Do not replace the file with a generic quiz about the filename.
- If the teacher also wrote a topic or focus, use it to choose which parts of the file to assess.
- A standards file controls alignment. Treat it as the reading only when no assessment file was attached.
- No markdown fences, no extra commentary.`;

/**
 * AI time budgets. Each must stay below that call's timeout in the web client (apps/web/src/lib/api.ts)
 * so the browser gets an error message instead of aborting.
 */
const QUIZ_LLM_TIMEOUT_MS = 90_000;
const WORKSHEET_LLM_TIMEOUT_MS = 90_000;
const LESSON_PLAN_LLM_TIMEOUT_MS = 90_000;
/** The route also draws slide pictures after this, inside the 180s client timeout. */
const PRESENTATION_LLM_TIMEOUT_MS = 100_000;
const SONG_LYRICS_LLM_TIMEOUT_MS = 70_000;
const SHARADA_LLM_TIMEOUT_MS = 70_000;
const EMAIL_LLM_TIMEOUT_MS = 70_000;

export async function generateMultipleChoiceQuiz(
  input: QuizGeneratorPayload,
): Promise<QuizGeneratorResponse> {
  const llm = requireAiProvider('quiz');
  const topic = topicFrom(input);
  const documentContext = input.attachedDocumentContext?.trim().slice(0, 150_000) ?? '';
  const raw = await runAi(
    'quiz',
    () => llm.completeJson<{
      questions?: unknown;
      answerKey?: unknown;
    }>({
      system: QUIZ_SYSTEM,
      user: [
        `Grade level: ${input.gradeLevel}`,
        `Number of questions: ${input.numberOfQuestions}`,
        `Options per question: ${input.optionsPerQuestion}`,
        topic
          ? `Topic / description:\n${topic}`
          : 'Topic / description: Create the quiz from the attached file. Base every item on that source.',
        input.standardsAlignment?.trim()
          ? `Standards to align to:\n${input.standardsAlignment.trim()}`
          : '',
        input.attachments?.length ? `Attached file names: ${input.attachments.join(', ')}` : '',
        documentContext ? `ATTACHED DOCUMENT CONTEXT:\n${documentContext}` : '',
        input.imageFiles?.length
          ? `Attached images: ${input.imageFiles.length}. Read each image and use its visible text, labels, and diagrams as source material for the questions.`
          : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
      images: imagePartsFromDataUrls(input.imageFiles),
      timeoutMs: QUIZ_LLM_TIMEOUT_MS,
    }),
    { timeoutHint: 'Try again, or use a shorter file or fewer questions.' },
  );

  const quiz = normalizeQuizResponse(raw, input);
  if (!quiz) {
    console.error('[llm] quiz generation returned unusable output');
    throw aiUnusable('quiz');
  }
  return quiz;
}

/**
 * Keeps only complete model questions (text plus every requested option).
 * Returns null when none are usable. May return fewer questions than requested.
 */
export function normalizeQuizResponse(
  raw: { questions?: unknown; answerKey?: unknown },
  input: QuizGeneratorPayload,
): QuizGeneratorResponse | null {
  if (!Array.isArray(raw.questions)) return null;
  const fromModel = Array.isArray(raw.answerKey)
    ? raw.answerKey.map((k) => String(k).trim().toUpperCase().replace(/[^A-G]/g, ''))
    : [];

  const questions: QuizGeneratorResponse['questions'] = [];
  const answerKey: string[] = [];
  raw.questions.forEach((item, i) => {
    if (questions.length >= input.numberOfQuestions) return;
    const q = (item ?? {}) as {
      question?: string;
      options?: unknown;
      correctOption?: string;
      correctIndex?: number;
    };
    const question = String(q.question ?? '').trim();
    const rawOptions = Array.isArray(q.options)
      ? q.options.map((o) => String(o).trim()).filter(Boolean)
      : [];
    if (!question || rawOptions.length < input.optionsPerQuestion) return;
    const options = rawOptions
      .slice(0, input.optionsPerQuestion)
      .map((opt, j) => withOptionPrefix(opt, j));

    let correctOption = String(q.correctOption ?? '').trim().toUpperCase().replace(/[^A-G]/g, '');
    if (!correctOption && typeof q.correctIndex === 'number') {
      correctOption = optionLetter(q.correctIndex);
    }
    if (!correctOption) correctOption = fromModel[i] ?? '';
    if (!correctOption || letterToIndex(correctOption) >= options.length) return;

    questions.push({ id: questions.length + 1, question, options, correctOption });
    answerKey.push(correctOption);
  });

  return questions.length ? { questions, answerKey } : null;
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

type WorksheetRaw = {
  title?: unknown;
  gradeLevel?: unknown;
  instructions?: unknown;
  passage?: unknown;
  sections?: unknown;
};

type WorksheetLabels = Pick<WorksheetGeneratorResponse, 'title' | 'gradeLevel' | 'instructions' | 'passage'>;

/** Labels for fields the model left out. Never invents prompts or passage text. */
function worksheetLabels(input: { gradeLevel: string; topicOrText: string; attachments?: string[] }): WorksheetLabels {
  const label = input.topicOrText.trim().split('\n')[0]?.slice(0, 80).trim() || input.attachments?.[0] || '';
  return {
    title: label ? `${label} Worksheet` : 'Worksheet',
    gradeLevel: input.gradeLevel,
    instructions: 'Answer each question.',
    passage: '',
  };
}

/** Keeps only model items with a real prompt. Returns null when no section has one. */
export function normalizeWorksheetResponse(
  raw: WorksheetRaw,
  labels: WorksheetLabels,
): WorksheetGeneratorResponse | null {
  if (!Array.isArray(raw.sections)) return null;

  let nextId = 1;
  const sections = raw.sections
    .slice(0, 6)
    .map((section) => {
      const s = (section ?? {}) as { heading?: unknown; items?: unknown };
      const rawItems = Array.isArray(s.items) ? s.items : [];
      const items = rawItems.slice(0, 12).flatMap((item) => {
        const it = (item ?? {}) as { id?: unknown; prompt?: unknown; question?: unknown };
        const prompt = String(it.prompt ?? it.question ?? '')
          .trim()
          .replace(/^(\d+[\.\)]\s*)+/g, '')
          .trim();
        if (!prompt) return [];
        const id = typeof it.id === 'number' ? it.id : nextId;
        nextId += 1;
        return [{ id, prompt }];
      });
      return { heading: String(s.heading ?? '').trim() || 'Section', items };
    })
    .filter((section) => section.items.length > 0);
  if (!sections.length) return null;

  return {
    title: String(raw.title ?? '').trim() || labels.title,
    gradeLevel: String(raw.gradeLevel ?? '').trim() || labels.gradeLevel,
    instructions: String(raw.instructions ?? '').trim() || labels.instructions,
    passage: String(raw.passage ?? '').trim() || labels.passage,
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
  const llm = requireAiProvider('worksheet');
  const raw = await runAi('worksheet', () =>
    llm.completeJson<WorksheetRaw>({
      system: WORKSHEET_SYSTEM,
      user: worksheetSourcePrompt(input),
      images: imagePartsFromDataUrls(input.imageFiles),
      timeoutMs: WORKSHEET_LLM_TIMEOUT_MS,
    }),
  );
  const worksheet = normalizeWorksheetResponse(raw, worksheetLabels(input));
  if (!worksheet) throw aiUnusable('worksheet');
  return worksheet;
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
  const llm = requireAiProvider('worksheet');
  const raw = await runAi('revised worksheet', () =>
    llm.completeJson<WorksheetRaw>({
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
        input.current ? `Current worksheet JSON:\n${JSON.stringify(input.current)}` : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
      images: imagePartsFromDataUrls(input.imageFiles),
      timeoutMs: WORKSHEET_LLM_TIMEOUT_MS,
    }),
  );
  const worksheet = normalizeWorksheetResponse(raw, input.current ?? worksheetLabels(input));
  if (!worksheet) throw aiUnusable('revised worksheet', 'Try again, or reword the change.');
  return worksheet;
}

export async function translateWorksheet(input: {
  targetLanguage: string;
  current: WorksheetGeneratorResponse;
  gradeLevel?: string;
}): Promise<WorksheetGeneratorResponse> {
  const llm = requireAiProvider('worksheet');
  const raw = await runAi('translation', () =>
    llm.completeJson<WorksheetRaw>({
      system: `${WORKSHEET_SYSTEM}\nTranslate the entire worksheet into ${input.targetLanguage}. Keep the same JSON shape, item ids, and section count. Translate title, instructions, passage, headings, and prompts. Do not add extra commentary.`,
      user: [
        input.gradeLevel ? `Grade level: ${input.gradeLevel}` : '',
        `Target language: ${input.targetLanguage}`,
        `Current worksheet JSON:\n${JSON.stringify(input.current)}`,
      ]
        .filter(Boolean)
        .join('\n\n'),
      timeoutMs: WORKSHEET_LLM_TIMEOUT_MS,
    }),
  );
  const missingPassage = Boolean(input.current.passage?.trim()) && !String(raw.passage ?? '').trim();
  const worksheet = missingPassage ? null : normalizeWorksheetResponse(raw, input.current);
  if (!worksheet) throw aiUnusable('translation', 'Please try again.');
  return worksheet;
}

const SONG_LYRICS_SYSTEM = `You write original, classroom-safe educational songs for K-12 students.
Return strict JSON with keys: title (string), lyrics (string).
Lyrics must include labeled sections such as Verse 1, Chorus, Verse 2, and Bridge when helpful.
Keep language grade-appropriate, scientifically/historically accurate, catchy, and singable.
Do not include markdown or extra commentary.`;

export async function generateSongLyrics(input: SongLyricsPayload): Promise<SongLyricsDraft> {
  const llm = requireAiProvider('song');
  const topic = input.topic.trim();
  const raw = await runAi(
    'song',
    () =>
      llm.completeJson<{ title?: unknown; lyrics?: unknown }>({
        system: SONG_LYRICS_SYSTEM,
        user: [
          `Song topic: ${topic}`,
          `Grade level: ${input.gradeLevel}`,
          `Song style: ${input.songStyle}`,
          input.customInstructions?.trim()
            ? `Custom instructions: ${input.customInstructions.trim()}`
            : '',
        ]
          .filter(Boolean)
          .join('\n'),
        timeoutMs: SONG_LYRICS_LLM_TIMEOUT_MS,
      }),
    { timeoutHint: 'Please try again.' },
  );
  const lyrics = String(raw.lyrics ?? '').trim();
  if (!lyrics) throw aiUnusable('song', 'Please try again.');
  return {
    title: String(raw.title ?? '').trim() || `${topic || 'Class'} Song`,
    lyrics,
    topic,
    gradeLevel: input.gradeLevel,
    songStyle: input.songStyle,
    customInstructions: input.customInstructions,
  };
}

const LESSON_PLAN_SYSTEM = `You are an expert AI curriculum designer. Write an in-depth lesson plan that does what the teacher asked.

When a document is attached, analyze that file and use it. The teacher's request decides the focus, grade, timing, and kind of lesson. The file supplies the concepts, definitions, examples, experiments, and vocabulary. Do not ignore either one. If the teacher names a chapter, topic, skill, or activity, teach that part of the file and do not drift into a different chapter. If no file is attached, write the lesson from the request alone.

CRITICAL CONSTRAINTS:
1. DO NOT use generic placeholders such as "Generate lesson plan for chapter 1", "Explain the idea", or "Model the core idea using this source excerpt".
2. DO NOT include publisher names, copyright notices, street addresses, prices, ISBNs, or page numbers.
3. When a file is attached, extract the real title, concepts, vocabulary, definitions, and lab activities that match the teacher's request.
4. If the teacher says "Chapter 1" or names a topic, find that part of the document and teach it.
5. Every objective, key point, station, and homework task must follow the request and, when a file is attached, name ideas from that file.

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
    '1. Read the user request first. The lesson must do what the teacher asked, including any additional criteria.',
    '2. If document content is present, analyze it and use the concepts, definitions, examples, and activities that match the request.',
    '3. If the request names a chapter, topic, skill, or activity, stay on that part of the file.',
    `4. The lesson title must name the requested subject ("${subject}"), never the filename or the words "generate lesson plan".`,
    '5. Return the JSON object from the system instruction.',
    imageCount ? `6. ${imageCount} image(s) are attached. Read their labels and diagrams as part of the source.` : '',
    input.khdaAlign ? '7. Apply the Dubai private school (KHDA) alignment rules from the system instruction.' : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

/**
 * Keeps only real model content. Returns null without an objective or a section with activities.
 * `base` is the plan being translated; its values fill fields the model left out.
 */
function normalizeLessonPlan(
  raw: Record<string, unknown>,
  labels: { title: string; gradeLevel: string },
  base?: LessonPlanResponse,
): LessonPlanResponse | null {
  const sectionsRaw = Array.isArray(raw.sections) ? raw.sections : [];
  const sections = sectionsRaw
    .map((item) => {
      const rec = (item ?? {}) as Record<string, unknown>;
      return {
        heading: scrubLessonText(String(rec.heading ?? '')) || 'Section',
        minutes: typeof rec.minutes === 'number' ? rec.minutes : undefined,
        activities: asStringList(rec.activities).map(scrubLessonText).filter(Boolean),
      };
    })
    .filter((section) => section.activities.length > 0);
  const objective = scrubLessonText(String(raw.objective ?? ''));
  if (!sections.length || !objective) return null;

  const standards = asStringList(raw.standards).map(scrubLessonText).filter(Boolean);
  const materials = asStringList(raw.materials).map(scrubLessonText).filter((item) => item && !/attached file content/i.test(item));
  const title = scrubLessonText(String(raw.title ?? ''));
  const genericTitle = !title || /generate lesson plan|explain the idea/i.test(title);
  const minutes = sections.reduce((sum, section) => sum + (section.minutes ?? 0), 0);
  return {
    title: genericTitle ? base?.title ?? labels.title : title,
    gradeLevel: String(raw.gradeLevel ?? '').trim() || base?.gradeLevel || labels.gradeLevel,
    objective,
    standards: standards.length ? standards : base?.standards ?? [],
    durationMinutes:
      typeof raw.durationMinutes === 'number' ? raw.durationMinutes : base?.durationMinutes ?? (minutes || 50),
    materials: materials.length ? materials : base?.materials ?? [],
    sections,
    assessment: scrubLessonText(String(raw.assessment ?? '')) || base?.assessment || '',
    differentiation: scrubLessonText(String(raw.differentiation ?? '')) || base?.differentiation || '',
  };
}

export async function translateLessonPlan(input: {
  targetLanguage: string;
  plan: LessonPlanResponse;
}): Promise<LessonPlanResponse> {
  const llm = requireAiProvider('lesson plan');
  const raw = await runAi(
    'translation',
    () =>
      llm.completeJson<Record<string, unknown>>({
        system: `${LESSON_PLAN_SYSTEM}
Translate every user-facing string into ${input.targetLanguage}.
Keep the same JSON keys, numeric minutes, section count, and activity count.
Do not add commentary or change the lesson's meaning.`,
        user: `Target language: ${input.targetLanguage}\n\nLesson plan JSON:\n${JSON.stringify(input.plan)}`,
        timeoutMs: LESSON_PLAN_LLM_TIMEOUT_MS,
      }),
    { timeoutHint: 'Please try again.' },
  );
  const plan = normalizeLessonPlan(raw, input.plan, input.plan);
  if (!plan) throw aiUnusable('translation', 'Please try again.');
  return plan;
}

export async function generateLessonPlan(input: LessonPlanPayload): Promise<LessonPlanResponse> {
  const rawDocument = input.attachedDocumentContext?.trim() ?? '';
  const source = cleanLessonSource(rawDocument, input.topic);
  const documentForModel = source.readable
    ? source.cleanedText
    : rawDocument.replace(/===\s*ATTACHED FILE CONTENT(?:\s*\([^)]*\))?\s*===|---\s*Page\s+\d+\s+---/gi, '\n').slice(0, 15_000);
  const sourceForPrompt = { ...source, cleanedText: documentForModel.trim(), readable: documentForModel.trim().length >= 40 };
  const fileWasAttached = Boolean(rawDocument || input.attachments?.length || input.imageFiles?.length);
  if (fileWasAttached && !sourceForPrompt.readable && !(input.imageFiles?.length)) {
    throw new Error('Could not read the attached file. Upload a PDF, Word, or text file with selectable text.');
  }

  const llm = requireAiProvider('lesson plan');
  const raw = await runAi('lesson plan', () =>
    llm.completeJson<Record<string, unknown>>({
      system: input.khdaAlign ? `${LESSON_PLAN_SYSTEM}\n\n${KHDA_LESSON_RULES}` : LESSON_PLAN_SYSTEM,
      user: lessonPlanUserPrompt(input, sourceForPrompt),
      images: imagePartsFromDataUrls(input.imageFiles),
      temperature: 0.2,
      timeoutMs: LESSON_PLAN_LLM_TIMEOUT_MS,
    }),
  );
  const plan = normalizeLessonPlan(raw, {
    title: `${lessonSubjectLabel(input.topic, source)} — ${input.gradeLevel}`,
    gradeLevel: input.gradeLevel,
  });
  if (!plan) throw aiUnusable('lesson plan');
  return plan;
}

const PRESENTATION_SYSTEM = `You are an expert instructional designer creating an advanced classroom slide deck.
Return JSON only:
{
  "title": "short deck title",
  "objective": "one sentence students will be able to do",
  "slides": [
    {
      "title": "slide title",
      "subtitle": "optional short line",
      "bullets": ["short spoken line"],
      "question": "a student question, or empty string",
      "speakerNotes": "what the teacher says and listens for",
      "layout": "cover",
      "imagePrompt": ""
    }
  ]
}
Rules:
- Match the requested slide count exactly.
- Write for the stated grade. Use the topic, additional criteria, and attached source. Do not invent page numbers or quotations that are not in the source.
- Progress from a phenomenon, to the model, to a worked example, to a misconception, to a new case, to an exit ticket.
- At least three slides must have a non-empty question.
- Bullets are short lines a teacher can say, not paragraphs.
- The first slide is a title slide only: layout "cover", a short title, one driving question in the subtitle, and an empty bullets array. Do not put teaching points on the title slide.
- Every later slide uses a different job and a different layout. layout is one of: split, cards, quote, steps, focus. Do not use the same layout twice in a row.
- split and focus are the picture layouts. Use them when a student needs to see a phenomenon, a structure, a process, or a comparison. A short deck has 2 picture slides. A longer deck has 3 to 5. Never use a picture layout for the cover, a goal list, vocabulary, partner talk, or the exit ticket.
- cards shows two or three separate ideas. steps shows an ordered process. quote is one big student question with an empty or one-item bullets array.
- imagePrompt is empty except on split and focus. There it is one sentence of 12 to 30 words naming that slide's exact objects and what they are doing. No words, labels, or slide layout in the picture. Each picture is a different scene.
- Example: "An Elodea sprig underwater in a glass tube, bright light from above, oxygen bubbles rising from the cut stem."
- Name the real mechanism for the grade. Do not write generic welcome lines.`;

/** Keeps only model slides that have a title. Returns null when there are none. May return fewer slides than asked. */
function normalizePresentation(
  raw: Record<string, unknown>,
  input: PresentationPayload,
  options?: { revising?: boolean },
): PresentationResponse | null {
  const wanted = presentationSlideTarget(input.slideCount);
  const parsed = Array.isArray(raw.slides) ? raw.slides : [];
  const slides: PresentationSlide[] = [];
  for (const item of parsed) {
    const slide = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const title = String(slide.title ?? '').trim();
    if (!title) continue;
    const question = String(slide.question ?? '').trim();
    const subtitle = String(slide.subtitle ?? '').trim();
    const layout = String(slide.layout ?? '').trim();
    slides.push({
      title,
      subtitle: subtitle || undefined,
      bullets: asStringList(slide.bullets).slice(0, 5),
      question: question || undefined,
      speakerNotes: String(slide.speakerNotes ?? '').trim(),
      imagePrompt: String(slide.imagePrompt ?? '').trim(),
      layout: PRESENTATION_LAYOUTS.includes(layout as (typeof PRESENTATION_LAYOUTS)[number])
        ? (layout as (typeof PRESENTATION_LAYOUTS)[number])
        : undefined,
    });
  }

  const kept = slides.slice(0, options?.revising ? 20 : wanted);
  if (!kept.length) return null;
  return {
    title: String(raw.title ?? '').trim() || input.topic.trim().split('\n')[0].slice(0, 80) || 'Presentation',
    gradeLevel: input.gradeLevel,
    objective: String(raw.objective ?? '').trim(),
    slides: assignSlideLayouts(kept),
  };
}

const PRESENTATION_REVISION_SYSTEM = `You revise an existing classroom slide deck. Return JSON only:
{
  "title": "short deck title",
  "objective": "one sentence students will be able to do",
  "slides": [
    {
      "title": "slide title",
      "subtitle": "optional short line",
      "bullets": ["short spoken line"],
      "question": "a student question, or empty string",
      "speakerNotes": "what the teacher says and listens for",
      "layout": "cover",
      "imagePrompt": ""
    }
  ]
}
Rules:
- Apply the teacher's follow-up to the current deck. If they ask to add a slide, keep the existing slides and add the new one. If they ask to change a slide, change that slide and keep the rest.
- The first slide stays a title slide: layout "cover", short title, driving question in the subtitle, empty bullets. Later slides keep a headline, short bullets, and their layout.
- Return the full updated deck, not only the new slide.
- Keep the grade and topic. Do not drop slides the teacher did not ask to remove.
- Copy layout and imagePrompt unchanged on every slide you do not change.
- A new slide needs its own layout: split, cards, quote, steps, or focus. Do not repeat the previous slide's layout.
- imagePrompt stays empty unless the slide layout is split or focus and a picture of a phenomenon, structure, process, or comparison would teach it. At most 5 slides in the deck may have a picture. A new picture prompt names the exact objects and the action, with no words in the picture.`;

export async function generatePresentation(input: PresentationPayload): Promise<PresentationResponse> {
  const source = (input.attachedDocumentContext ?? '').replace(/\s+/g, ' ').trim().slice(0, 12_000);
  const revision = input.revision?.trim() ?? '';
  const current = input.currentSlides ?? [];
  const revising = Boolean(revision && current.length);
  const what = revising ? 'slide change' : 'presentation';
  const llm = requireAiProvider('presentation');
  const raw = await runAi(what, () =>
    llm.completeJson<Record<string, unknown>>({
      system: revising ? PRESENTATION_REVISION_SYSTEM : PRESENTATION_SYSTEM,
      user: revising
        ? [
            `Grade level: ${input.gradeLevel}`,
            `Topic:\n${input.topic}`,
            `Current deck JSON:\n${JSON.stringify({ slides: current })}`,
            `Teacher follow-up:\n${revision}`,
            'Return the full deck after applying that follow-up.',
          ].join('\n\n')
        : [
            `Grade level: ${input.gradeLevel}`,
            `Number of slides: ${presentationSlideTarget(input.slideCount)}`,
            `Topic, standard, or objective:\n${input.topic}`,
            input.additionalCriteria?.trim() ? `Additional criteria:\n${input.additionalCriteria.trim()}` : '',
            input.attachments?.length ? `Uploaded file names: ${input.attachments.join(', ')}` : '',
            source ? `Uploaded file text:\n${source}` : '',
            input.imageFiles?.length ? 'Images are attached. Read labels and diagrams in them.' : '',
          ]
            .filter(Boolean)
            .join('\n\n'),
      images: revising ? undefined : imagePartsFromDataUrls(input.imageFiles),
      temperature: revising ? 0.3 : 0.4,
      timeoutMs: PRESENTATION_LLM_TIMEOUT_MS,
    }),
  );
  const changeHint = 'Try again, or reword the change.';
  const deck = normalizePresentation(raw, input, { revising });
  if (!deck) throw aiUnusable(what, revising ? changeHint : undefined);
  if (!revising) return deck;
  const same =
    deck.slides.length === current.length &&
    deck.slides.every((slide, index) => slide.title === current[index]?.title && slide.bullets.join('|') === (current[index]?.bullets ?? []).join('|'));
  if (same) throw new AiGenerationError(502, `The AI did not apply that change to the slides. ${changeHint}`);
  return deck;
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

export async function generateSharadaChat(input: SharadaChatRequest): Promise<SharadaChatResponse> {
  const intent = classifyUserIntent(input.prompt);
  const llm = requireAiProvider('reply');

  const historyBlock = (input.history ?? [])
    .slice(-12)
    .map((msg) => `${msg.role === 'user' ? 'Teacher' : 'Sharada'}: ${msg.content}`)
    .join('\n\n');

  const raw = await runAi(
    'reply',
    () =>
      llm.completeJson<Record<string, unknown>>({
        system: sharadaSystemFor(intent),
        user: [
          `Intent: ${intent.type}${intent.gradeLevel ? ` (${intent.gradeLevel})` : ''}`,
          historyBlock ? `Conversation so far:\n${historyBlock}` : '',
          `New request:\n${input.prompt.trim()}`,
        ]
          .filter(Boolean)
          .join('\n\n'),
        timeoutMs: SHARADA_LLM_TIMEOUT_MS,
      }),
    { timeoutHint: 'Please try again.' },
  );
  const markdown = String(raw.markdown ?? '').trim();
  const offTask = (intent.type === 'EXPLANATION' || intent.type === 'GENERAL_CHAT') && looksLikeWorksheet(markdown);
  if (!markdown || offTask) {
    throw aiUnusable('reply', offTask ? 'Please try again, or rephrase your request.' : 'Please try again.');
  }
  return {
    title: String(raw.title ?? '').trim() || sharadaTitleFromPrompt(input.prompt),
    statusLine: String(raw.statusLine ?? '').trim(),
    confirmation: String(raw.confirmation ?? '').trim(),
    markdown,
  };
}

/** Drops a paragraph that invents a calendar link or a fill-in placeholder the user never provided. */
function dropInventedScheduling(email: string): string {
  return email
    .split(/\n{2,}/)
    .filter((part) => !/\[[^\]]*(insert|link|calendly|url)[^\]]*\]|calendly\.com|\[insert\b/i.test(part))
    .join('\n\n')
    .trim();
}

export async function generateEmailResponse(input: EmailResponderRequest): Promise<EmailResponderResponse> {
  const llm = requireAiProvider('email');
  const raw = await runAi(
    'email',
    () =>
      llm.completeJson<{ email?: string; suggestions?: string[] }>({
        system: 'You write the exact email a teacher or school leader will send. Ground every sentence in the incoming message and the user\'s notes. Never add a scheduling link, URL, or [placeholder]. Return JSON only: {"email":"Subject: ...\\n\\nfull email body","suggestions":["short follow-up the user might ask","another follow-up"]}. suggestions must be exactly two plain sentences. Do not wrap the email in code fences.',
        user: emailResponderPrompt(input),
        timeoutMs: EMAIL_LLM_TIMEOUT_MS,
      }),
    { timeoutHint: 'Try again, or shorten the email you pasted.' },
  );
  const email = dropInventedScheduling(String(raw.email ?? '').trim());
  if (!email) throw aiUnusable('email', 'Please try again.');
  const suggestions = Array.isArray(raw.suggestions)
    ? raw.suggestions.map((item) => String(item).trim()).filter(Boolean).slice(0, 2)
    : [];
  return {
    email: /^subject:/i.test(email) ? email : `Subject: Following up on your email\n\n${email}`,
    suggestions,
  };
}
