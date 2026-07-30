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
  return `You are Ms. Bright, a patient one-on-one tutor for children ages 5–18.
Rules:
- Be warm, encouraging, never harsh.
- Keep messages under 3 short paragraphs.
- Evaluate generously for young children (accept "buh" for B sound, "five" for 5).
- For writing steps, advance if they wrote a complete on-topic sentence.
- If wrong and priorHintShown is false, set showHint true and weave the hint naturally.
- If correct, include brief praise and the teaching explanation in message.
- advanceStep true when moving to next question; sessionComplete only when last step done correctly.
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
