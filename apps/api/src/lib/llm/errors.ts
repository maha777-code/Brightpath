import type { Response } from 'express';
import { getActiveProvider, LlmTimeoutError, type LlmProvider } from './provider.js';

export type AiErrorStatus = 502 | 503 | 504;

/** AI output could not be produced. `status` is the HTTP status the route sends with `message`. */
export class AiGenerationError extends Error {
  readonly status: AiErrorStatus;
  constructor(status: AiErrorStatus, message: string) {
    super(message);
    this.name = 'AiGenerationError';
    this.status = status;
  }
}

const DEFAULT_HINT = 'Try again, or use a shorter file.';

export function isTimeoutError(err: unknown): boolean {
  return err instanceof LlmTimeoutError || (err instanceof Error && err.name === 'TimeoutError');
}

/** `what` is a short noun such as "quiz" or "lesson plan", used in every message. */
export function requireAiProvider(what: string): LlmProvider {
  const llm = getActiveProvider();
  if (!llm) {
    throw new AiGenerationError(503, `AI ${what} generation is not set up on the server yet. Please contact support.`);
  }
  return llm;
}

export function aiUnusable(what: string, hint = DEFAULT_HINT): AiGenerationError {
  return new AiGenerationError(502, `The AI returned a ${what} we could not use. ${hint}`);
}

export function toAiError(err: unknown, what: string, timeoutHint = DEFAULT_HINT): AiGenerationError {
  if (err instanceof AiGenerationError) return err;
  if (isTimeoutError(err)) {
    return new AiGenerationError(504, `The AI took too long to write this ${what}. ${timeoutHint}`);
  }
  return new AiGenerationError(
    502,
    `The AI service could not generate this ${what} right now. Please try again in a moment.`,
  );
}

/** Runs an AI step and converts any failure into an AiGenerationError for that `what`. */
export async function runAi<T>(
  what: string,
  fn: () => Promise<T>,
  options: { timeoutHint?: string } = {},
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[llm] ${what} generation failed`, err);
    throw toAiError(err, what, options.timeoutHint);
  }
}

/** Sends an AiGenerationError with its status, or a 500 with `fallbackMessage` for anything else. */
export function sendAiError(res: Response, err: unknown, fallbackMessage: string): void {
  if (err instanceof AiGenerationError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: fallbackMessage });
}
