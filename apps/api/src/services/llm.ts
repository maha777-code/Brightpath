import type { QuizGeneratorPayload, QuizGeneratorResponse } from '@brightpath/shared';
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
