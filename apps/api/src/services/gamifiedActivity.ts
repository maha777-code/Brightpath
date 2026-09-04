import { z } from 'zod';
import {
  cinematicScriptFromQuiz,
  extractTemplateIdFromContent,
  getGenerationTemplate,
  getTemplateConfig,
  parseCinematicScript,
  questionLoopsFromScript,
  questionsFromCinematicScript,
  templateIdFromActivityType,
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
  const templateId =
    extractTemplateIdFromContent(row.content) ?? templateIdFromActivityType(row.type);
  const fromContent = parseCinematicScript(row.content, templateId);
  if (questionLoopsFromScript(fromContent).length > 0) return fromContent;
  const fromJson = parseCinematicScript(row.questionsJson, templateId);
  if (questionLoopsFromScript(fromJson).length > 0) return fromJson;
  const questions = parseQuizQuestions(row.questionsJson);
  if (questions.length > 0) return cinematicScriptFromQuiz(questions, title, templateId);
  return fromContent;
}

export function toTeacherActivity(row: ActivityRow): TeacherActivity {
  const templateId =
    extractTemplateIdFromContent(row.content) ?? templateIdFromActivityType(row.type);
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
    templateId,
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

function fallbackCinematicScript(input: {
  code: string;
  title: string;
  chapterTitle: string;
  excerpts: string[];
  templateId?: string;
}): CinematicScriptScene[] {
  const quiz = fallbackQuestions(input);
  return cinematicScriptFromQuiz(quiz, input.title, input.templateId);
}

function ensureOutcomeScenes(
  script: CinematicScriptScene[],
  templateId?: string,
): CinematicScriptScene[] {
  const cfg = getTemplateConfig(templateId);
  const host = cfg.characters.host;
  const runner = cfg.characters.runner;
  const hasSetup = script.some((s) => s.scene_type === 'setup');
  const hasCorrect = script.some((s) => s.scene_type === 'correct_outcome');
  const hasIncorrect = script.some((s) => s.scene_type === 'incorrect_outcome');
  const hasCompleted = script.some((s) => s.scene_type === 'completed');
  const next = [...script];
  if (!hasSetup) {
    next.unshift({
      scene_type: 'setup',
      tom_dialogue: `${host}: Hold it, ${runner}! Answer correctly to continue.`,
      animation_trigger: cfg.animationTriggers.setup,
    });
  }
  if (!hasCorrect) {
    next.push({
      scene_type: 'correct_outcome',
      tom_dialogue_on_failure: `${host}: Foiled again!`,
      animation_outcome: cfg.animationTriggers.correctOutcome,
    });
  }
  if (!hasIncorrect) {
    next.push({
      scene_type: 'incorrect_outcome',
      tom_dialogue_on_failure: `${host}: Caught you! Time for a lesson.`,
      animation_outcome: cfg.animationTriggers.incorrectOutcome,
    });
  }
  if (!hasCompleted) {
    next.push({
      scene_type: 'completed',
      tom_dialogue: `${host}: Not again!`,
      jerry_dialogue: `${runner}: Science saves the day!`,
      animation_trigger: cfg.animationTriggers.completed,
    });
  }
  return next;
}

function cinematicSystemPrompt(templateId?: string): string {
  const template = getGenerationTemplate(templateId);
  const cfg = getTemplateConfig(template.id);
  return `You write a character-driven classroom game script for Class 9 Science — NOT a plain quiz.
templateId MUST be "${template.id}".
Theme: ${cfg.themeName}.
${cfg.systemPrompt}
Host (${cfg.characters.host}) delivers setup/questions. Runner (${cfg.characters.runner}) responses are the answer options.
Do NOT invent Tom & Jerry unless templateId is tom_and_jerry.
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
  const cfg = getTemplateConfig(template.id);
  const host = cfg.characters.host;
  const runner = cfg.characters.runner;
  return `Create a ${cfg.themeName} activity for this subtopic.
Subtopic: ${input.code} ${input.title}
Chapter: ${input.chapterTitle}

${templatePromptBlock(template.id)}

Textbook / RAG context:
${input.context}

Return JSON with this exact shape:
{
  "templateId": "${template.id}",
  "subtopicId": "${input.code}",
  "title": "${template.title}: ${input.title}",
  "xpReward": 50,
  "script": [
    {
      "scene_type": "setup",
      "tom_dialogue": "${host}: setup line in this theme's voice",
      "animation_trigger": "${cfg.animationTriggers.setup}"
    },
    {
      "scene_type": "question_loop",
      "prompt": "Curriculum question grounded in the textbook",
      "game_mechanics": "${cfg.gameMechanics}",
      "tom_dialogue_repeat": "${host}: Choose the correct ${cfg.choiceLabel}!",
      "options": [
        { "id": "A", "text": "Wrong claim", "correct": false, "jerry_action": "${cfg.animationTriggers.wrongAction}" },
        { "id": "B", "text": "Correct claim", "correct": true, "jerry_action": "${cfg.animationTriggers.correctAction}" },
        { "id": "C", "text": "Wrong claim", "correct": false, "jerry_action": "${cfg.animationTriggers.wrongAction}" },
        { "id": "D", "text": "Wrong claim", "correct": false, "jerry_action": "${cfg.animationTriggers.wrongAction}" }
      ]
    },
    {
      "scene_type": "correct_outcome",
      "tom_dialogue_on_failure": "${host}: reaction when ${runner} succeeds",
      "animation_outcome": "${cfg.animationTriggers.correctOutcome}"
    },
    {
      "scene_type": "incorrect_outcome",
      "tom_dialogue_on_failure": "${host}: reaction when ${runner} fails",
      "animation_outcome": "${cfg.animationTriggers.incorrectOutcome}"
    },
    {
      "scene_type": "completed",
      "tom_dialogue": "${host}: closing line",
      "jerry_dialogue": "${runner}: victory line",
      "animation_trigger": "${cfg.animationTriggers.completed}"
    }
  ]
}

Rules:
- Ground every prompt and option in the textbook context.
- Include exactly 1 setup, exactly ${QUESTION_COUNT} question_loop scenes, 1 correct_outcome, 1 incorrect_outcome, and 1 completed.
- Each question_loop has exactly 4 options A–D with exactly one correct:true.
- Correct options use jerry_action "${cfg.animationTriggers.correctAction}". Incorrect use "${cfg.animationTriggers.wrongAction}".
- game_mechanics must be "${cfg.gameMechanics}".
- Characters must be ${host} and ${runner} only for this templateId.
- Field names stay tom_dialogue / jerry_action for schema compatibility, but spoken content must match ${host}/${runner}.`;
}

async function generateCinematicScriptFromLlm(input: {
  code: string;
  title: string;
  chapterTitle: string;
  excerpts: string[];
  templateId?: string;
}): Promise<CinematicScriptScene[]> {
  const templateId = getGenerationTemplate(input.templateId).id;
  const cfg = getTemplateConfig(templateId);
  const provider = getActiveProvider();
  if (!provider) {
    return fallbackCinematicScript({ ...input, templateId });
  }

  const context = input.excerpts.slice(0, 8).join('\n\n').slice(0, 6000);
  const raw = await withTimeout(
    provider.completeJson<unknown>({
      system: cinematicSystemPrompt(templateId),
      user: cinematicUserPrompt({ ...input, templateId, context }),
    }),
    LLM_TIMEOUT_MS,
    'Activity generation timed out',
  );

  const asObject =
    Array.isArray(raw) ? { script: raw } : raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const quizQuestions = parseQuizQuestions(asObject.questions);
  let script = ensureOutcomeScenes(parseCinematicScript(raw, templateId), templateId);
  if (questionLoopsFromScript(script).length < 3 && quizQuestions.length >= 3) {
    script = cinematicScriptFromQuiz(quizQuestions, input.title, templateId);
  }
  if (questionLoopsFromScript(script).length < 3) {
    return fallbackCinematicScript({ ...input, templateId });
  }

  return script.map((scene) => {
    if (scene.scene_type !== 'question_loop') return scene;
    return {
      ...scene,
      game_mechanics: scene.game_mechanics || cfg.gameMechanics,
      options: scene.options.slice(0, 4).map((opt, i) => ({
        ...opt,
        id: OPTION_IDS[i] ?? opt.id,
        jerry_action: opt.correct
          ? cfg.animationTriggers.correctAction
          : cfg.animationTriggers.wrongAction,
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
  const script = await generateCinematicScriptFromLlm({
    code: sub.code,
    title: sub.title,
    chapterTitle: sub.chapter.title,
    excerpts: packet.ragExcerpts,
    templateId: template.id,
  });

  const contentPayload = {
    templateId: template.id,
    subtopicId: sub.code,
    script,
  };

  const questions = questionsFromCinematicScript(script, 50);
  const title = `${sub.code} ${template.title}`;
  const totalXp = questions.reduce((sum, q) => sum + q.xpReward, 0) || 250;

  const row = await activityClient().activity.create({
    data: {
      subtopicId: sub.id,
      chapterId: sub.chapterId,
      type: template.activityType || input.type || template.id,
      title,
      content: contentPayload,
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
    activity: toTeacherActivity({ ...row, content: contentPayload, questionsJson: questions }),
    subtopicId: sub.id,
    activityTitle: title,
  };
}
