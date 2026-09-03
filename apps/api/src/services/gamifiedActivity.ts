import { z } from 'zod';
import {
  DEFAULT_GAME_MECHANICS,
  JERRY_ACTION_CORRECT,
  JERRY_ACTION_WRONG,
  JERRY_CAUGHT_CINEMATIC,
  TOM_BONKED,
  TOM_TRAP_SETUP,
  cinematicScriptFromQuiz,
  getGenerationTemplate,
  parseCinematicScript,
  questionLoopsFromScript,
  questionsFromCinematicScript,
  templatePromptBlock,
  type CinematicScriptScene,
  type GamifiedQuizQuestion,
  type TeacherActivity,
} from '@brightpath/shared';
import { prisma } from '../lib/prisma.js';
import { getActiveProvider } from '../lib/llm/provider.js';
import { retrieveTextbookContext } from '../lib/videoPipeline/retrieveContext.js';

const LLM_TIMEOUT_MS = 45_000;
const QUESTION_COUNT = 5;
const OPTION_IDS = ['A', 'B', 'C', 'D'] as const;

const questionSchema = z.object({
  questionText: z.string().min(8).max(400),
  options: z.array(z.string().min(1).max(180)).length(4),
  correctAnswerIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(8).max(500),
  xpReward: z.number().int().min(10).max(200).optional(),
});

type ActivityRow = {
  id: string;
  subtopicId: string;
  chapterId: string;
  type: string;
  title: string;
  questionsJson: unknown;
  content?: unknown;
  totalXp: number;
  createdAt: Date;
};

function activityClient() {
  return prisma as typeof prisma & {
    activity: {
      create: (args: { data: Record<string, unknown> }) => Promise<ActivityRow>;
      findMany: (args: {
        where: { subtopicId: { in: string[] } };
        orderBy: { createdAt: 'desc' };
      }) => Promise<ActivityRow[]>;
    };
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(label)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export function parseQuizQuestions(raw: unknown): GamifiedQuizQuestion[] {
  if (!Array.isArray(raw)) return [];
  if (raw.some((item) => item && typeof item === 'object' && 'scene_type' in item)) {
    return questionsFromCinematicScript(parseCinematicScript(raw));
  }
  return raw
    .map((item) => questionSchema.safeParse(item))
    .filter((r): r is z.ZodSafeParseSuccess<z.infer<typeof questionSchema>> => r.success)
    .map((r) => ({
      questionText: r.data.questionText,
      options: r.data.options,
      correctAnswerIndex: r.data.correctAnswerIndex,
      explanation: r.data.explanation,
      xpReward: r.data.xpReward ?? 50,
    }));
}

function resolveScript(row: ActivityRow, title: string): CinematicScriptScene[] {
  const fromContent = parseCinematicScript(row.content);
  if (questionLoopsFromScript(fromContent).length > 0) return fromContent;
  const fromJson = parseCinematicScript(row.questionsJson);
  if (questionLoopsFromScript(fromJson).length > 0) return fromJson;
  const questions = parseQuizQuestions(row.questionsJson);
  if (questions.length > 0) return cinematicScriptFromQuiz(questions, title);
  return fromContent;
}

export function toTeacherActivity(row: ActivityRow): TeacherActivity {
  const content = resolveScript(row, row.title);
  const parsedQuestions = parseQuizQuestions(row.questionsJson);
  const questions =
    parsedQuestions.length > 0 ? parsedQuestions : questionsFromCinematicScript(content);
  return {
    id: row.id,
    subtopicId: row.subtopicId,
    chapterId: row.chapterId,
    type: row.type,
    title: row.title,
    content,
    questions,
    totalXp: row.totalXp || questions.reduce((sum, q) => sum + q.xpReward, 0),
    createdAt: row.createdAt.toISOString(),
  };
}

export async function latestActivitiesBySubtopic(
  subtopicIds: string[],
): Promise<Map<string, TeacherActivity>> {
  const map = new Map<string, TeacherActivity>();
  if (subtopicIds.length === 0) return map;
  try {
    const rows = await activityClient().activity.findMany({
      where: { subtopicId: { in: subtopicIds } },
      orderBy: { createdAt: 'desc' },
    });
    for (const row of rows) {
      if (!map.has(row.subtopicId)) map.set(row.subtopicId, toTeacherActivity(row));
    }
  } catch {
    /* Activity table may not exist until prisma db push */
  }
  return map;
}

function fallbackQuestions(input: {
  code: string;
  title: string;
  chapterTitle: string;
  excerpts: string[];
}): GamifiedQuizQuestion[] {
  const snippet = input.excerpts[0]?.slice(0, 180) || `${input.code} ${input.title}`;
  return [
    {
      questionText: `Which statement best describes ${input.title}?`,
      options: [
        `${input.title} is a core idea in ${input.chapterTitle}.`,
        'It is unrelated to Class 9 Science.',
        'It only applies to living organisms.',
        'It is a sports technique, not a science topic.',
      ],
      correctAnswerIndex: 0,
      explanation: `${input.title} is taught in ${input.chapterTitle} and is grounded in the textbook.`,
      xpReward: 50,
    },
    {
      questionText: `What should you use as evidence when answering questions about ${input.code}?`,
      options: [
        'A random internet meme',
        'The indexed textbook / RAG excerpts for this subtopic',
        'Only opinions from classmates',
        'Unrelated history facts',
      ],
      correctAnswerIndex: 1,
      explanation: 'This challenge is generated from indexed textbook context for this subtopic.',
      xpReward: 50,
    },
    {
      questionText: `Why is ${input.title} grouped under ${input.chapterTitle}?`,
      options: [
        'The chapter is a random list of trivia',
        'The NCERT chapter builds this idea as a numbered subtopic',
        'It belongs to a different subject entirely',
        'Subtopic codes have no meaning',
      ],
      correctAnswerIndex: 1,
      explanation: `${input.code} is a numbered heading inside ${input.chapterTitle}.`,
      xpReward: 50,
    },
    {
      questionText: 'How can you check an answer during this chase?',
      options: [
        'Ignore the textbook entirely',
        'Pick the longest option every time',
        'Compare Jerry’s escape path with the textbook excerpt',
        'Skip all questions',
      ],
      correctAnswerIndex: 2,
      explanation: 'Each mousehole maps to a claim you can check against the text.',
      xpReward: 50,
    },
    {
      questionText: `Which excerpt is most relevant to ${input.code}?`,
      options: [
        snippet,
        'A recipe for making tea',
        'The rules of cricket bowling',
        'A list of world capitals',
      ],
      correctAnswerIndex: 0,
      explanation: 'The first option is taken from the retrieved textbook context for this subtopic.',
      xpReward: 50,
    },
  ];
}

function flavorTomSetup(title: string): string {
  return `Aha! You little mouse, think you can get past this? You must tell me the truth about ${title} first!`;
}

function fallbackCinematicScript(input: {
  code: string;
  title: string;
  chapterTitle: string;
  excerpts: string[];
}): CinematicScriptScene[] {
  const quiz = fallbackQuestions(input);
  const script = cinematicScriptFromQuiz(quiz, input.title);
  const setup = script.find((s) => s.scene_type === 'setup');
  if (setup && setup.scene_type === 'setup') {
    setup.tom_dialogue = flavorTomSetup(input.title);
    setup.animation_trigger = TOM_TRAP_SETUP;
  }
  return script;
}

function ensureOutcomeScenes(script: CinematicScriptScene[]): CinematicScriptScene[] {
  const hasSetup = script.some((s) => s.scene_type === 'setup');
  const hasCorrect = script.some((s) => s.scene_type === 'correct_outcome');
  const hasIncorrect = script.some((s) => s.scene_type === 'incorrect_outcome');
  const hasCompleted = script.some((s) => s.scene_type === 'completed');
  const next = [...script];
  if (!hasSetup) {
    next.unshift({
      scene_type: 'setup',
      tom_dialogue: flavorTomSetup('this lesson'),
      animation_trigger: TOM_TRAP_SETUP,
    });
  }
  if (!hasCorrect) {
    next.push({
      scene_type: 'correct_outcome',
      tom_dialogue_on_failure: 'Drat! That mouse is smarter than he looks!',
      animation_outcome: TOM_BONKED,
    });
  }
  if (!hasIncorrect) {
    next.push({
      scene_type: 'incorrect_outcome',
      tom_dialogue_on_failure: 'Caught you! Time for a lesson!',
      animation_outcome: JERRY_CAUGHT_CINEMATIC,
    });
  }
  if (!hasCompleted) {
    next.push({
      scene_type: 'completed',
      tom_dialogue: 'Not again! How does that mouse keep winning?',
      jerry_dialogue: 'Science saves the day!',
      animation_trigger: 'jerry_victory_dance',
    });
  }
  return next;
}

function cinematicSystemPrompt(templateId?: string): string {
  const template = getGenerationTemplate(templateId);
  return `You write a character-driven classroom game script for Class 9 Science — NOT a plain quiz.
Template: ${template.title}.
${template.dialogueTone}
Character 1 delivers the setup/question. Character 2's responses are the answer options (paths / holes / clues / firing lanes).
Return JSON only.`;
}

function cinematicUserPrompt(input: {
  code: string;
  title: string;
  chapterTitle: string;
  context: string;
  templateId?: string;
}): string {
  const template = getGenerationTemplate(input.templateId);
  return `Create a ${template.title} activity for this subtopic.
Subtopic: ${input.code} ${input.title}
Chapter: ${input.chapterTitle}

${templatePromptBlock(template.id)}

Textbook / RAG context:
${input.context}

Return JSON with this exact shape:
{
  "title": "${template.title}: ${input.title}",
  "xpReward": 50,
  "script": [
    {
      "scene_type": "setup",
      "tom_dialogue": "Aha! You little mouse, think you can get past this? You must tell me ... first!",
      "animation_trigger": "${TOM_TRAP_SETUP}"
    },
    {
      "scene_type": "question_loop",
      "prompt": "Curriculum question grounded in the textbook",
      "game_mechanics": "${DEFAULT_GAME_MECHANICS}",
      "tom_dialogue_repeat": "Answer correctly or it's mouse trap time!",
      "options": [
        { "id": "A", "text": "Wrong claim", "correct": false, "jerry_action": "${JERRY_ACTION_WRONG}" },
        { "id": "B", "text": "Correct claim", "correct": true, "jerry_action": "${JERRY_ACTION_CORRECT}" },
        { "id": "C", "text": "Wrong claim", "correct": false, "jerry_action": "${JERRY_ACTION_WRONG}" },
        { "id": "D", "text": "Wrong claim", "correct": false, "jerry_action": "${JERRY_ACTION_WRONG}" }
      ]
    },
    {
      "scene_type": "correct_outcome",
      "tom_dialogue_on_failure": "Drat! That mouse is smarter than he looks!",
      "animation_outcome": "${TOM_BONKED}"
    },
    {
      "scene_type": "incorrect_outcome",
      "tom_dialogue_on_failure": "Caught you! Time for a lesson!",
      "animation_outcome": "${JERRY_CAUGHT_CINEMATIC}"
    },
    {
      "scene_type": "completed",
      "tom_dialogue": "Not again!",
      "jerry_dialogue": "That's science for you, Tom!",
      "animation_trigger": "jerry_victory_dance"
    }
  ]
}

Rules:
- Ground every prompt and option in the textbook context. No trivia unrelated to the subtopic.
- Include exactly 1 setup scene, exactly ${QUESTION_COUNT} question_loop scenes, 1 correct_outcome, 1 incorrect_outcome, and 1 completed scene.
- Each question_loop has exactly 4 options with ids A, B, C, D. Exactly one option has correct: true.
- Correct options use jerry_action "${JERRY_ACTION_CORRECT}". Incorrect use "${JERRY_ACTION_WRONG}".
- game_mechanics should match this template (${template.mechanics}).
- Character-1 dialogue must match the template tone.
- animation_trigger for setup is "${TOM_TRAP_SETUP}".
- correct_outcome animation_outcome is "${TOM_BONKED}".
- incorrect_outcome animation_outcome is "${JERRY_CAUGHT_CINEMATIC}".`;
}

async function generateCinematicScriptFromLlm(input: {
  code: string;
  title: string;
  chapterTitle: string;
  excerpts: string[];
  templateId?: string;
}): Promise<CinematicScriptScene[]> {
  const provider = getActiveProvider();
  if (!provider) {
    return fallbackCinematicScript(input);
  }

  const context = input.excerpts.slice(0, 8).join('\n\n').slice(0, 6000);
  const raw = await withTimeout(
    provider.completeJson<unknown>({
      system: cinematicSystemPrompt(input.templateId),
      user: cinematicUserPrompt({ ...input, context }),
    }),
    LLM_TIMEOUT_MS,
    'Activity generation timed out',
  );

  const asObject =
    Array.isArray(raw) ? { script: raw } : raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const quizQuestions = parseQuizQuestions(asObject.questions);
  let script = ensureOutcomeScenes(parseCinematicScript(raw));
  if (questionLoopsFromScript(script).length < 3 && quizQuestions.length >= 3) {
    script = cinematicScriptFromQuiz(quizQuestions, input.title);
  }
  if (questionLoopsFromScript(script).length < 3) {
    return fallbackCinematicScript(input);
  }

  return script.map((scene) => {
    if (scene.scene_type !== 'question_loop') return scene;
    return {
      ...scene,
      game_mechanics: scene.game_mechanics || DEFAULT_GAME_MECHANICS,
      options: scene.options.slice(0, 4).map((opt, i) => ({
        ...opt,
        id: OPTION_IDS[i] ?? opt.id,
        jerry_action: opt.correct ? JERRY_ACTION_CORRECT : JERRY_ACTION_WRONG,
      })),
    };
  });
}

export async function generateGamifiedActivity(input: {
  teacherId: string;
  subtopicId: string;
  chapterId: string;
  type: 'gamified_quiz' | 'tom_jerry_cinematic' | string;
  templateId?: string;
}): Promise<{ activity: TeacherActivity; subtopicId: string; activityTitle: string }> {
  const sub = await prisma.teacherSubtopic.findFirst({
    where: {
      id: input.subtopicId,
      chapterId: input.chapterId,
      chapter: { textbook: { teacherId: input.teacherId } },
    },
    include: { chapter: true },
  });
  if (!sub) {
    throw Object.assign(new Error('Subtopic not found'), { status: 404 });
  }

  const template = getGenerationTemplate(input.templateId);
  const packet = await retrieveTextbookContext(sub.id);
  const content = await generateCinematicScriptFromLlm({
    code: sub.code,
    title: sub.title,
    chapterTitle: sub.chapter.title,
    excerpts: packet.ragExcerpts,
    templateId: template.id,
  });

  const questions = questionsFromCinematicScript(content, 50);
  const title = `${sub.code} ${template.title}`;
  const totalXp = questions.reduce((sum, q) => sum + q.xpReward, 0) || 250;

  const row = await activityClient().activity.create({
    data: {
      subtopicId: sub.id,
      chapterId: sub.chapterId,
      type: template.activityType || input.type || 'tom_jerry_cinematic',
      title,
      content,
      questionsJson: questions,
      totalXp,
    },
  });

  await prisma.teacherSubtopic.update({
    where: { id: sub.id },
    data: {
      hasGamifiedActivity: true,
      activityTitle: title,
    },
  });

  return {
    activity: toTeacherActivity({ ...row, content, questionsJson: questions }),
    subtopicId: sub.id,
    activityTitle: title,
  };
}
