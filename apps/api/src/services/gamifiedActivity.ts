import { z } from 'zod';
import {
  buildPhysicsWorldForTemplate,
  cinematicScriptFromQuiz,
  extractPhysicsWorldFromContent,
  extractTemplateIdFromContent,
  getTemplateConfig,
  parseCinematicScript,
  parsePhysicsWorld,
  questionLoopsFromScript,
  questionsFromCinematicScript,
  resolveActiveTemplate,
  outcomeLabelsForTemplate,
  templateIdFromActivityType,
  templatePromptBlock,
  TEMPLATE_CONFIGS,
  type CinematicScriptScene,
  type GamifiedQuizQuestion,
  type PhysicsWorldSpec,
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
  const loops = questionLoopsFromScript(content);
  const optionSeeds = (loops[0]?.options ?? []).map((o) => ({ id: o.id, correct: o.correct }));
  const physicsWorld = extractPhysicsWorldFromContent(row.content, templateId, optionSeeds);
  return {
    id: row.id,
    subtopicId: row.subtopicId,
    chapterId: row.chapterId,
    type: row.type,
    title: row.title,
    templateId,
    content: {
      templateId,
      script: content,
      physicsWorld,
    },
    physicsWorld,
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
  templateId?: string;
}): GamifiedQuizQuestion[] {
  const cfg = getTemplateConfig(input.templateId);
  const host = cfg.characters.host;
  const runner = cfg.characters.runner;
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
      questionText: `How can you check an answer during this ${cfg.themeName}?`,
      options: [
        'Ignore the textbook entirely',
        'Pick the longest option every time',
        `Compare ${runner}'s path with the textbook excerpt`,
        'Skip all questions',
      ],
      correctAnswerIndex: 2,
      explanation: `Each ${cfg.choiceLabel} maps to a claim you can check against the text.`,
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
      explanation: `${host} would accept the first option — it comes from the retrieved textbook context.`,
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
  const { id, config: cfg, template } = resolveActiveTemplate(templateId);
  return `You write a character-driven classroom game script for Class 9 Science — NOT a plain quiz.
templateId MUST be "${id}".
Theme: ${cfg.themeName}.
${cfg.systemPrompt}
Host (${cfg.characters.host}) delivers setup/questions. Runner (${cfg.characters.runner}) responses are the answer options.
JSON schema: script[] with scene_type in [setup, question_loop, correct_outcome, incorrect_outcome, completed]; question_loop.options[] use id A–D, text, correct, jerry_action.
Do NOT invent Tom & Jerry unless templateId is tom_and_jerry.
Template title: ${template.title}.
Return JSON only.`;
}

const PHYSICS_GRAVITY_HINT: Record<string, [number, number, number]> = {
  tom_and_jerry: [0, -9.8, 0],
  space_shooter: [0, -0.15, 0],
  detective_mystery: [0, -9.8, 0],
  sweetrush_quest: [0, -6.2, 0],
};

function cinematicUserPrompt(input: {
  code: string;
  title: string;
  chapterTitle: string;
  context: string;
  templateId?: string;
}): string {
  const { id, config: cfg, template } = resolveActiveTemplate(input.templateId);
  const host = cfg.characters.host;
  const runner = cfg.characters.runner;
  const labels = outcomeLabelsForTemplate(id);
  const exampleCorrect =
    id === 'space_shooter'
      ? 'CORRECT — ALIEN BOSS HIT!'
      : id === 'detective_mystery'
        ? 'CORRECT — SUSPECT CONFESSED!'
        : labels.correct;
  const exampleIncorrect =
    id === 'space_shooter'
      ? 'INCORRECT — SHIP TOOK DAMAGE!'
      : id === 'detective_mystery'
        ? 'INCORRECT — FALSE LEAD!'
        : labels.incorrect;
  return `Create a ${cfg.themeName} activity for this subtopic.
Subtopic: ${input.code} ${input.title}
Chapter: ${input.chapterTitle}

${templatePromptBlock(id)}

Textbook / RAG context:
${input.context}

Return JSON with this exact shape:
{
  "templateId": "${id}",
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
      "correct_outcome_text": "${exampleCorrect}",
      "incorrect_outcome_text": "${exampleIncorrect}",
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
  ],
  "physicsWorld": {
    "gravity": ${JSON.stringify(PHYSICS_GRAVITY_HINT[id] ?? [0, -9.8, 0])},
    "targets": [
      { "id": "A", "position": [-3.2, 1.2, 0], "mass": 5, "isCorrect": false },
      { "id": "B", "position": [-1.05, 1.2, 0], "mass": 5, "isCorrect": true },
      { "id": "C", "position": [1.05, 1.2, 0], "mass": 5, "isCorrect": false },
      { "id": "D", "position": [3.2, 1.2, 0], "mass": 5, "isCorrect": false }
    ]
  }
}

Rules:
- Ground every prompt and option in the textbook context.
- Include exactly 1 setup, exactly ${QUESTION_COUNT} question_loop scenes, 1 correct_outcome, 1 incorrect_outcome, and 1 completed.
- Each question_loop has exactly 4 options A–D with exactly one correct:true.
- Each question_loop MUST include correct_outcome_text and incorrect_outcome_text matching this template's theme (not Tom & Jerry unless templateId is tom_and_jerry).
- Include physicsWorld with gravity vector and 4 targets matching option ids; isCorrect must match the correct option in the first question_loop.
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
}): Promise<{ script: CinematicScriptScene[]; physicsWorld: PhysicsWorldSpec }> {
  const { id: templateId, config: cfg } = resolveActiveTemplate(input.templateId);
  const activeConfig = TEMPLATE_CONFIGS[templateId] || TEMPLATE_CONFIGS.tom_and_jerry;
  void activeConfig;

  const buildFallback = (): { script: CinematicScriptScene[]; physicsWorld: PhysicsWorldSpec } => {
    const script = getFallbackScriptForTemplate(templateId, input);
    const loops = questionLoopsFromScript(script);
    const seeds = (loops[0]?.options ?? []).map((o) => ({ id: o.id, correct: o.correct }));
    return {
      script,
      physicsWorld: buildPhysicsWorldForTemplate(templateId, seeds),
    };
  };

  const provider = getActiveProvider();
  if (!provider) return buildFallback();

  const context = input.excerpts.slice(0, 8).join('\n\n').slice(0, 6000);

  let raw: unknown;
  try {
    raw = await withTimeout(
      provider.completeJson<unknown>({
        system: cinematicSystemPrompt(templateId),
        user: cinematicUserPrompt({ ...input, templateId, context }),
      }),
      LLM_TIMEOUT_MS,
      'Activity generation timed out',
    );
  } catch (err) {
    console.warn(
      `[gamifiedActivity] LLM call failed for templateId=${templateId}; using fallback script.`,
      err instanceof Error ? err.message : err,
    );
    return buildFallback();
  }

  try {
    let parsedRaw: unknown = raw;
    if (typeof raw === 'string') {
      try {
        parsedRaw = JSON.parse(raw);
      } catch (parseErr) {
        console.error(
          '[Template Generation Error] Failed to parse LLM JSON output for template:',
          templateId,
          parseErr,
        );
        return buildFallback();
      }
    }

    const asObject =
      Array.isArray(parsedRaw)
        ? { script: parsedRaw }
        : parsedRaw && typeof parsedRaw === 'object'
          ? (parsedRaw as Record<string, unknown>)
          : {};
    const quizQuestions = parseQuizQuestions(asObject.questions);
    let script = ensureOutcomeScenes(parseCinematicScript(parsedRaw, templateId), templateId);
    if (questionLoopsFromScript(script).length < 3 && quizQuestions.length >= 3) {
      script = cinematicScriptFromQuiz(quizQuestions, input.title, templateId);
    }
    if (questionLoopsFromScript(script).length < 3) {
      console.error(
        '[Template Generation Error] Failed to parse LLM JSON output for template:',
        templateId,
        'too few question_loops',
      );
      return buildFallback();
    }

    script = script.map((scene) => {
      if (scene.scene_type !== 'question_loop') return scene;
      const labels = outcomeLabelsForTemplate(templateId);
      return {
        ...scene,
        game_mechanics: scene.game_mechanics || cfg.gameMechanics,
        correct_outcome_text: scene.correct_outcome_text || labels.correct,
        incorrect_outcome_text: scene.incorrect_outcome_text || labels.incorrect,
        options: scene.options.slice(0, 4).map((opt, i) => ({
          ...opt,
          id: OPTION_IDS[i] ?? opt.id,
          jerry_action: opt.correct
            ? cfg.animationTriggers.correctAction
            : cfg.animationTriggers.wrongAction,
        })),
      };
    });

    const loops = questionLoopsFromScript(script);
    const seeds = (loops[0]?.options ?? []).map((o) => ({ id: o.id, correct: o.correct }));
    const physicsWorld = parsePhysicsWorld(asObject.physicsWorld, templateId, seeds);
    return { script, physicsWorld };
  } catch (err) {
    console.error(
      '[Template Generation Error] Failed to parse LLM JSON output for template:',
      templateId,
      err,
    );
    return buildFallback();
  }
}

/** Alias used by fail-safe parse blocks — structured default schema for any templateId. */
function getFallbackScriptForTemplate(
  templateId: string,
  input: {
    code: string;
    title: string;
    chapterTitle: string;
    excerpts: string[];
    templateId?: string;
  },
): CinematicScriptScene[] {
  return fallbackCinematicScript({ ...input, templateId });
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

  const { id: templateId, template } = resolveActiveTemplate(input.templateId);
  const packet = await retrieveTextbookContext(sub.id);
  const { script, physicsWorld } = await generateCinematicScriptFromLlm({
    code: sub.code,
    title: sub.title,
    chapterTitle: sub.chapter.title,
    excerpts: packet.ragExcerpts,
    templateId,
  });

  const contentPayload = {
    templateId,
    subtopicId: sub.code,
    script,
    physicsWorld,
  };

  const questions = questionsFromCinematicScript(script, 50);
  const title = `${sub.code} ${template.title}`;
  const totalXp = questions.reduce((sum, q) => sum + q.xpReward, 0) || 250;

  const row = await activityClient().activity.create({
    data: {
      subtopicId: sub.id,
      chapterId: sub.chapterId,
      type: template.activityType || input.type || templateId,
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
      activityTemplateId: templateId,
    },
  }).catch(async (err) => {
    console.warn('[gamifiedActivity] activityTemplateId update failed, retrying without it:', err);
    await prisma.teacherSubtopic.update({
      where: { id: sub.id },
      data: {
        hasGamifiedActivity: true,
        activityTitle: title,
      },
    });
  });

  return {
    activity: toTeacherActivity({ ...row, content: contentPayload, questionsJson: questions }),
    subtopicId: sub.id,
    activityTitle: title,
  };
}
