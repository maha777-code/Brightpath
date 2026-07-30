import type {
  TutorGreetingRequest,
  TutorGreetingResponse,
  TutorRespondRequest,
  TutorRespondResponse,
} from '@brightpath/shared';
import { retrieveContext } from '../rag/retrieve.js';
import { getActiveProvider, type LlmProvider } from '../llm/provider.js';

interface LlmEvalResult {
  message: string;
  isCorrect: boolean;
  advanceStep: boolean;
  showHint: boolean;
  sessionComplete: boolean;
}

const EVAL_SCHEMA = `Respond with JSON only:
{
  "message": "string — what Ms. Bright says to the child (warm, short, use their name)",
  "isCorrect": boolean,
  "advanceStep": boolean — true if answer is correct OR writing step has a reasonable attempt,
  "showHint": boolean — true if wrong and hint not yet shown,
  "sessionComplete": boolean — true only if advanceStep and this was the last step
}`;

function localeHint(locale: string): string {
  if (locale.startsWith('hi')) return 'Prefer simple Hindi mixed with English if locale is hi-IN.';
  if (locale.startsWith('ar')) return 'Prefer Modern Standard Arabic suitable for kids if locale is ar-AE or ar-KW.';
  return 'Use clear English appropriate for the child age.';
}

function buildSystemPrompt(): string {
  return `You are Ms. Bright, a warm private tutor for children ages 5–18. You are having a real conversation — never repeat canned phrases.

Rules:
- Use the child's name naturally. Keep each reply to 1–3 short sentences unless explaining.
- Read recentHistory: understand what was already asked and whether a hint was given.
- If studentAnswer is "yes", "ok", "hint", or "help" AND priorHintShown is false OR they want help: give the hint from step.hint in your message, set showHint true, advanceStep false.
- If studentAnswer is "yes" but priorHintShown is true: encourage them to try an answer to the question.
- Phonics: accept letter sounds ("buh", "b", "bee" for B is close — praise and nudge to short sound). Words like "ball" when asked for B sound: explain ball starts with buh, don't treat as fully correct unless they give the sound.
- Math: accept words or digits ("five" = 5).
- Meta questions ("you only teach me", "who are you"): answer briefly and warmly, then restate the current question. advanceStep false.
- If correct: celebrate, include step.explanation, advanceStep true.
- If wrong first try and priorHintShown is false: encourage, weave in hint, showHint true, advanceStep false.
- If wrong after hint shown: give a simpler nudge or partial credit explanation, advanceStep false unless they clearly got it.
- sessionComplete true ONLY when advanceStep true AND this is the last step (stepIndex + 1 >= totalSteps).

${EVAL_SCHEMA}`;
}

export async function evaluateAnswer(
  req: TutorRespondRequest,
): Promise<TutorRespondResponse> {
  const provider = getActiveProvider();
  if (!provider) {
    throw new Error('LLM not configured');
  }

  const rag = retrieveContext(
    req.subject,
    req.step.skillTag,
    req.ageBand,
    `${req.step.tutorPrompt} ${req.studentAnswer}`,
  );

  const userPayload = {
    child: { name: req.childName, age: req.age, ageBand: req.ageBand, locale: req.locale },
    subject: req.subject,
    lesson: { id: req.lessonId, title: req.lessonTitle },
    step: req.step,
    stepIndex: req.stepIndex,
    totalSteps: req.totalSteps,
    studentAnswer: req.studentAnswer,
    priorHintShown: req.priorHintShown,
    acceptableAnswers: req.step.acceptableAnswers ?? [],
    recentHistory: req.history.slice(-6),
    teachingContext: rag,
    localeNote: localeHint(req.locale),
  };

  const raw = await provider.completeJson<LlmEvalResult>({
    system: buildSystemPrompt(),
    user: JSON.stringify(userPayload, null, 2),
  });

  const isLastStep = req.stepIndex >= req.totalSteps - 1;
  const sessionComplete = Boolean(raw.sessionComplete) || (raw.advanceStep && isLastStep);

  return {
    message: raw.message || 'Great effort! Let\'s keep going.',
    isCorrect: Boolean(raw.isCorrect),
    advanceStep: Boolean(raw.advanceStep),
    showHint: Boolean(raw.showHint),
    sessionComplete,
    provider: provider.name,
  };
}

export async function generateGreeting(
  req: TutorGreetingRequest,
): Promise<TutorGreetingResponse> {
  const provider = getActiveProvider();
  if (!provider) throw new Error('LLM not configured');

  const rag = retrieveContext(req.subject, '', req.ageBand, req.lessonTitle);
  const greeting = await provider.completeJson<{ greeting: string }>({
    system: `You are Ms. Bright. Return JSON: { "greeting": "..." }. One short welcoming message using the child's name, mention the lesson, end ready for first question. ${localeHint(req.locale)}`,
    user: JSON.stringify({ ...req, teachingContext: rag, firstPrompt: req.firstPrompt }),
  });

  return {
    greeting: greeting.greeting,
    provider: provider.name,
  };
}

export function assertLlmConfigured(): LlmProvider {
  const p = getActiveProvider();
  if (!p) throw new Error('LLM not configured');
  return p;
}
