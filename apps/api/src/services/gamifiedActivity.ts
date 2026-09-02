import { z } from 'zod';
import type { GamifiedQuizQuestion, TeacherActivity } from '@brightpath/shared';
import { prisma } from '../lib/prisma.js';
import { getActiveProvider } from '../lib/llm/provider.js';
import { retrieveTextbookContext } from '../lib/videoPipeline/retrieveContext.js';

const LLM_TIMEOUT_MS = 45_000;

const questionSchema = z.object({
  questionText: z.string().min(8).max(400),
  options: z.array(z.string().min(1).max(180)).length(4),
  correctAnswerIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(8).max(500),
  xpReward: z.number().int().min(10).max(200).optional(),
});

const quizPayloadSchema = z.object({
  questions: z.array(questionSchema).min(5).max(5),
});

type ActivityRow = {
  id: string;
  subtopicId: string;
  chapterId: string;
  type: string;
  title: string;
  questionsJson: unknown;
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

export function toTeacherActivity(row: ActivityRow): TeacherActivity {
  const questions = parseQuizQuestions(row.questionsJson);
  return {
    id: row.id,
    subtopicId: row.subtopicId,
    chapterId: row.chapterId,
    type: row.type,
    title: row.title,
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
      explanation: 'Gamified quizzes are generated from indexed textbook context for this subtopic.',
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
      questionText: 'What is a good way to check a quiz answer in this activity?',
      options: [
        'Ignore the explanation',
        'Pick the longest option every time',
        'Read the explanation and compare it with the textbook excerpt',
        'Skip all questions',
      ],
      correctAnswerIndex: 2,
      explanation: 'Each item includes an explanation so students can connect the answer back to the text.',
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

async function generateQuestionsFromLlm(input: {
  code: string;
  title: string;
  chapterTitle: string;
  excerpts: string[];
}): Promise<GamifiedQuizQuestion[]> {
  const provider = getActiveProvider();
  if (!provider) {
    return fallbackQuestions(input);
  }

  const context = input.excerpts.slice(0, 8).join('\n\n').slice(0, 6000);
  const raw = await withTimeout(
    provider.completeJson<unknown>({
      system:
        'You generate curriculum-grounded multiple-choice quizzes for Class 9 Science. Return JSON only.',
      user: `Create exactly 5 gamified quiz questions for this subtopic.
Subtopic: ${input.code} ${input.title}
Chapter: ${input.chapterTitle}

Textbook / RAG context:
${context}

Return JSON:
{
  "questions": [
    {
      "questionText": "string",
      "options": ["A", "B", "C", "D"],
      "correctAnswerIndex": 0,
      "explanation": "why the correct option is right",
      "xpReward": 50
    }
  ]
}

Rules:
- Ground every question in the provided context.
- options must have exactly 4 distinct strings.
- correctAnswerIndex is 0-3.
- xpReward is 50 unless a question is clearly harder (then 75).`,
    }),
    LLM_TIMEOUT_MS,
    'Activity generation timed out',
  );

  const asObject =
    Array.isArray(raw) ? { questions: raw } : raw && typeof raw === 'object' ? raw : {};
  const parsed = quizPayloadSchema.safeParse(asObject);
  if (!parsed.success) {
    throw new Error('The model returned an invalid quiz payload');
  }

  return parsed.data.questions.map((q) => ({
    questionText: q.questionText,
    options: q.options,
    correctAnswerIndex: q.correctAnswerIndex,
    explanation: q.explanation,
    xpReward: q.xpReward ?? 50,
  }));
}

export async function generateGamifiedActivity(input: {
  teacherId: string;
  subtopicId: string;
  chapterId: string;
  type: 'gamified_quiz';
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

  const packet = await retrieveTextbookContext(sub.id);
  const questions = await generateQuestionsFromLlm({
    code: sub.code,
    title: sub.title,
    chapterTitle: sub.chapter.title,
    excerpts: packet.ragExcerpts,
  });

  const title = `${sub.code} Gamified Quiz`;
  const totalXp = questions.reduce((sum, q) => sum + q.xpReward, 0);

  const row = await activityClient().activity.create({
    data: {
      subtopicId: sub.id,
      chapterId: sub.chapterId,
      type: input.type,
      title,
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
    activity: toTeacherActivity(row),
    subtopicId: sub.id,
    activityTitle: title,
  };
}
