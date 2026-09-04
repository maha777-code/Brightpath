import type {
  CinematicCompletedScene,
  CinematicCorrectOutcomeScene,
  CinematicIncorrectOutcomeScene,
  CinematicQuestionLoopScene,
  CinematicQuestionOption,
  CinematicScriptScene,
  CinematicSetupScene,
  GamifiedQuizQuestion,
  TeacherActivity,
} from './teacher.js';
import {
  getTemplateConfig,
  isGenerationTemplateId,
  templateIdFromActivityType,
  type GenerationTemplateId,
} from './generationTemplates.js';

export const JERRY_ACTION_CORRECT = 'jerry_escapes_into_mousehole';
export const JERRY_ACTION_WRONG = 'jerry_runs_into_wrong_hole';
export const DEFAULT_GAME_MECHANICS = 'jerry_chase_maze';
export const TOM_TRAP_SETUP = 'tom_sets_trap_setup';
export const TOM_BONKED = 'tom_gets_bonked';
export const JERRY_CAUGHT_CINEMATIC = 'jerry_caught_cinematic';

const OPTION_IDS = ['A', 'B', 'C', 'D'] as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function normalizeOption(
  raw: unknown,
  index: number,
  templateId?: GenerationTemplateId,
): CinematicQuestionOption | null {
  const cfg = getTemplateConfig(templateId);
  const rec = asRecord(raw);
  if (!rec) return null;
  const text = asString(rec.text) || asString(rec.label);
  if (!text) return null;
  const id = asString(rec.id, OPTION_IDS[index] ?? String(index + 1)).slice(0, 4).toUpperCase();
  const correct = Boolean(rec.correct);
  const jerry_action = asString(
    rec.jerry_action ?? rec.runner_action,
    correct ? cfg.animationTriggers.correctAction : cfg.animationTriggers.wrongAction,
  );
  return { id, text, correct, jerry_action };
}

function normalizeQuestionLoop(
  rec: Record<string, unknown>,
  templateId?: GenerationTemplateId,
): CinematicQuestionLoopScene | null {
  const cfg = getTemplateConfig(templateId);
  const prompt = asString(rec.prompt) || asString(rec.questionText);
  if (!prompt) return null;
  const rawOptions = Array.isArray(rec.options) ? rec.options : [];
  const options = rawOptions
    .map((opt, i) => normalizeOption(opt, i, templateId))
    .filter((opt): opt is CinematicQuestionOption => Boolean(opt))
    .slice(0, 4);
  if (options.length < 2) return null;
  if (!options.some((opt) => opt.correct)) {
    options[0] = {
      ...options[0],
      correct: true,
      jerry_action: cfg.animationTriggers.correctAction,
    };
  }
  let seenCorrect = false;
  const unique = options.map((opt, i) => {
    const isCorrect = opt.correct && !seenCorrect;
    if (isCorrect) seenCorrect = true;
    return {
      ...opt,
      id: OPTION_IDS[i] ?? opt.id,
      correct: isCorrect,
      jerry_action: isCorrect
        ? asString(opt.jerry_action, cfg.animationTriggers.correctAction)
        : cfg.animationTriggers.wrongAction,
    };
  });
  return {
    scene_type: 'question_loop',
    prompt,
    game_mechanics: asString(rec.game_mechanics, cfg.gameMechanics),
    tom_dialogue_repeat: asString(
      rec.tom_dialogue_repeat ?? rec.host_dialogue_repeat,
      `${cfg.characters.host}: Choose wisely!`,
    ),
    options: unique,
  };
}

function parseScene(raw: unknown, templateId?: GenerationTemplateId): CinematicScriptScene | null {
  const cfg = getTemplateConfig(templateId);
  const rec = asRecord(raw);
  if (!rec) return null;
  const kind = asString(rec.scene_type);
  if (kind === 'setup') {
    const tom_dialogue = asString(rec.tom_dialogue) || asString(rec.host_dialogue);
    if (!tom_dialogue) return null;
    const scene: CinematicSetupScene = {
      scene_type: 'setup',
      tom_dialogue,
      animation_trigger: asString(rec.animation_trigger, cfg.animationTriggers.setup),
    };
    return scene;
  }
  if (kind === 'question_loop') {
    return normalizeQuestionLoop(rec, templateId);
  }
  if (kind === 'correct_outcome') {
    const scene: CinematicCorrectOutcomeScene = {
      scene_type: 'correct_outcome',
      tom_dialogue_on_failure: asString(
        rec.tom_dialogue_on_failure ?? rec.host_dialogue,
        `${cfg.characters.host}: Foiled again!`,
      ),
      animation_outcome: asString(rec.animation_outcome, cfg.animationTriggers.correctOutcome),
    };
    return scene;
  }
  if (kind === 'incorrect_outcome') {
    const scene: CinematicIncorrectOutcomeScene = {
      scene_type: 'incorrect_outcome',
      tom_dialogue_on_failure: asString(
        rec.tom_dialogue_on_failure ?? rec.host_dialogue,
        `${cfg.characters.host}: Gotcha!`,
      ),
      animation_outcome: asString(rec.animation_outcome, cfg.animationTriggers.incorrectOutcome),
    };
    return scene;
  }
  if (kind === 'completed') {
    const scene: CinematicCompletedScene = {
      scene_type: 'completed',
      tom_dialogue: asString(rec.tom_dialogue ?? rec.host_dialogue) || undefined,
      jerry_dialogue: asString(rec.jerry_dialogue ?? rec.runner_dialogue) || undefined,
      animation_trigger:
        asString(rec.animation_trigger, cfg.animationTriggers.completed) || undefined,
    };
    return scene;
  }
  return null;
}

function extractSceneArray(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw;
  const rec = asRecord(raw);
  if (!rec) return null;
  if (Array.isArray(rec.script)) return rec.script;
  if (Array.isArray(rec.content)) return rec.content;
  if (Array.isArray(rec.scenes)) return rec.scenes;
  return null;
}

export function extractTemplateIdFromContent(raw: unknown): GenerationTemplateId | undefined {
  const rec = asRecord(raw);
  if (!rec) return undefined;
  if (isGenerationTemplateId(rec.templateId)) return rec.templateId;
  return undefined;
}

export function parseCinematicScript(
  raw: unknown,
  templateId?: GenerationTemplateId | string | null,
): CinematicScriptScene[] {
  const tid =
    (isGenerationTemplateId(templateId) ? templateId : undefined) ??
    extractTemplateIdFromContent(raw);
  const arr = extractSceneArray(raw);
  if (!arr) return [];
  return arr
    .map((scene) => parseScene(scene, tid))
    .filter((scene): scene is CinematicScriptScene => Boolean(scene));
}

export function questionLoopsFromScript(script: CinematicScriptScene[]): CinematicQuestionLoopScene[] {
  return script.filter((s): s is CinematicQuestionLoopScene => s.scene_type === 'question_loop');
}

export function questionsFromCinematicScript(
  script: CinematicScriptScene[],
  xpReward = 50,
): GamifiedQuizQuestion[] {
  const correct = script.find(
    (s): s is CinematicCorrectOutcomeScene => s.scene_type === 'correct_outcome',
  );
  return questionLoopsFromScript(script).map((loop) => {
    const correctIndex = Math.max(0, loop.options.findIndex((opt) => opt.correct));
    return {
      questionText: loop.prompt,
      options: loop.options.map((opt) => opt.text),
      correctAnswerIndex: correctIndex,
      explanation: correct?.tom_dialogue_on_failure || loop.tom_dialogue_repeat,
      xpReward,
    };
  });
}

export function cinematicScriptFromQuiz(
  questions: GamifiedQuizQuestion[],
  topicTitle: string,
  templateId?: GenerationTemplateId | string | null,
): CinematicScriptScene[] {
  const cfg = getTemplateConfig(templateId);
  const topic = topicTitle.trim() || 'this topic';
  const host = cfg.characters.host;
  const runner = cfg.characters.runner;
  const scenes: CinematicScriptScene[] = [
    {
      scene_type: 'setup',
      tom_dialogue: `${host}: Hold it, ${runner}! Prove you understand ${topic} before you pass.`,
      animation_trigger: cfg.animationTriggers.setup,
    },
  ];
  for (const q of questions) {
    scenes.push({
      scene_type: 'question_loop',
      prompt: q.questionText,
      game_mechanics: cfg.gameMechanics,
      tom_dialogue_repeat: `${host}: Pick the correct option!`,
      options: q.options.slice(0, 4).map((text, i) => ({
        id: OPTION_IDS[i] ?? String(i + 1),
        text,
        correct: i === q.correctAnswerIndex,
        jerry_action:
          i === q.correctAnswerIndex
            ? cfg.animationTriggers.correctAction
            : cfg.animationTriggers.wrongAction,
      })),
    });
  }
  scenes.push({
    scene_type: 'correct_outcome',
    tom_dialogue_on_failure: `${host}: Foiled again! ${runner} knew the science.`,
    animation_outcome: cfg.animationTriggers.correctOutcome,
  });
  scenes.push({
    scene_type: 'incorrect_outcome',
    tom_dialogue_on_failure: `${host}: Caught you! Time for a textbook lesson.`,
    animation_outcome: cfg.animationTriggers.incorrectOutcome,
  });
  scenes.push({
    scene_type: 'completed',
    tom_dialogue: `${host}: Not again!`,
    jerry_dialogue: `${runner}: ${topic} unlocked — on to the next challenge!`,
    animation_trigger: cfg.animationTriggers.completed,
  });
  return scenes;
}

export function resolveActivityTemplateId(
  activity: Pick<TeacherActivity, 'templateId' | 'type' | 'content'>,
): GenerationTemplateId {
  if (isGenerationTemplateId(activity.templateId)) return activity.templateId;
  const fromContent = extractTemplateIdFromContent(activity.content);
  if (fromContent) return fromContent;
  return templateIdFromActivityType(activity.type);
}

export function resolveActivityScript(
  activity: Pick<TeacherActivity, 'content' | 'questions' | 'title' | 'templateId' | 'type'>,
): CinematicScriptScene[] {
  const templateId = resolveActivityTemplateId(activity);
  const fromContent = parseCinematicScript(activity.content, templateId);
  if (fromContent.some((s) => s.scene_type === 'question_loop')) return fromContent;
  if (activity.questions.length > 0) {
    return cinematicScriptFromQuiz(activity.questions, activity.title, templateId);
  }
  return fromContent;
}

export function isActivityPlayable(
  activity: Pick<TeacherActivity, 'content' | 'questions'> | null | undefined,
): boolean {
  if (!activity) return false;
  if (parseCinematicScript(activity.content).some((s) => s.scene_type === 'question_loop')) return true;
  return activity.questions.length > 0;
}
