import type { AgeGroup, ModuleStatus } from '@prisma/client';
import { prisma } from './prisma.js';
import {
  SAMPLE_VIDEOS,
  buildChapterQuizQuestions,
  chapterTitlesFor,
  videoTitlesFor,
} from '../data/chapterSeeds.js';

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
};

export type VideoDto = {
  id: string;
  title: string;
  videoUrl: string;
  durationInSeconds: number;
  sequenceOrder: number;
  isCompleted: boolean;
  watchTimeSeconds: number;
  maxWatchedTime: number;
  isLocked: boolean;
};

export type ChapterDto = {
  id: string;
  title: string;
  sequenceOrder: number;
  status: ModuleStatus;
  videos: VideoDto[];
  allVideosCompleted: boolean;
  quizUnlocked: boolean;
  quizPassed: boolean;
  quizScore: number | null;
};

export type SubjectCurriculumDto = {
  subjectId: string;
  subjectName: string;
  color: string;
  ageGroup: AgeGroup;
  masteryPercentage: number;
  chapters: ChapterDto[];
};

/**
 * Ensure every subject has 2 chapters × 5 videos + a quiz.
 */
export async function ensureChapterCurriculumSeeded(): Promise<void> {
  const subjectCount = await prisma.subjectCatalog.count();
  if (subjectCount === 0) {
    const { ensureAnalyticsCatalogSeeded } = await import('./analyticsEngine.js');
    await ensureAnalyticsCatalogSeeded();
  }

  const subjects = await prisma.subjectCatalog.findMany({
    include: { chapters: true },
  });

  for (const subject of subjects) {
    if (subject.chapters.length >= 2) continue;

    const titles = chapterTitlesFor(subject.name);
    for (let c = 0; c < titles.length; c++) {
      const existing = await prisma.chapter.findUnique({
        where: {
          subjectId_sequenceOrder: { subjectId: subject.id, sequenceOrder: c + 1 },
        },
      });
      if (existing) continue;

      const chapter = await prisma.chapter.create({
        data: {
          subjectId: subject.id,
          title: titles[c],
          sequenceOrder: c + 1,
        },
      });

      const vTitles = videoTitlesFor(titles[c]);
      for (let v = 0; v < 5; v++) {
        const sample = SAMPLE_VIDEOS[v % SAMPLE_VIDEOS.length];
        await prisma.videoLesson.create({
          data: {
            chapterId: chapter.id,
            title: vTitles[v],
            videoUrl: sample.url,
            durationInSeconds: sample.durationInSeconds,
            sequenceOrder: v + 1,
          },
        });
      }

      await prisma.chapterQuiz.create({
        data: {
          chapterId: chapter.id,
          questions: buildChapterQuizQuestions(subject.name, titles[c]),
        },
      });
    }
  }
}

export function computeSubjectCurriculumProgress(opts: {
  totalVideos: number;
  completedVideos: number;
  totalChapters: number;
  passedQuizzes: number;
}): number {
  if (opts.totalVideos <= 0 || opts.totalChapters <= 0) return 0;
  const videoPart = (opts.completedVideos / opts.totalVideos) * 50;
  const quizPart = (opts.passedQuizzes / opts.totalChapters) * 50;
  return Math.round(Math.min(100, videoPart + quizPart));
}

async function syncSubjectSkillMastery(userId: string, subjectId: string, mastery: number) {
  const skills = await prisma.skillNode.findMany({ where: { subjectId } });
  for (const skill of skills) {
    await prisma.userSkillMastery.upsert({
      where: { userId_skillId: { userId, skillId: skill.id } },
      create: {
        userId,
        skillId: skill.id,
        masteryScore: mastery,
        totalAttempts: 1,
        correctAttempts: mastery >= 60 ? 1 : 0,
        lastEvaluatedAt: new Date(),
      },
      update: {
        masteryScore: mastery,
        lastEvaluatedAt: new Date(),
      },
    });
  }
}

export async function getSubjectCurriculumProgress(
  userId: string,
  subjectId: string,
): Promise<number> {
  const chapters = await prisma.chapter.findMany({
    where: { subjectId },
    include: {
      videos: true,
      quizResults: { where: { userId } },
    },
  });
  if (chapters.length === 0) return 0;

  const videoIds = chapters.flatMap((c) => c.videos.map((v) => v.id));
  const completed = await prisma.userVideoProgress.count({
    where: { userId, videoId: { in: videoIds }, isCompleted: true },
  });
  const passed = chapters.filter((c) => c.quizResults.some((r) => r.isPassed)).length;

  return computeSubjectCurriculumProgress({
    totalVideos: videoIds.length,
    completedVideos: completed,
    totalChapters: chapters.length,
    passedQuizzes: passed,
  });
}

export async function refreshSubjectMasteryFromCurriculum(
  userId: string,
  subjectId: string,
): Promise<number> {
  const mastery = await getSubjectCurriculumProgress(userId, subjectId);
  await syncSubjectSkillMastery(userId, subjectId, mastery);
  return mastery;
}

async function ensureChapterUnlockRows(userId: string, subjectId: string) {
  const chapters = await prisma.chapter.findMany({
    where: { subjectId },
    orderBy: { sequenceOrder: 'asc' },
  });

  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    const existing = await prisma.userChapterProgress.findUnique({
      where: { userId_chapterId: { userId, chapterId: ch.id } },
    });
    if (existing) continue;

    await prisma.userChapterProgress.create({
      data: {
        userId,
        chapterId: ch.id,
        status: i === 0 ? 'UNLOCKED' : 'LOCKED',
      },
    });
  }

  // Recompute statuses from quiz passes
  for (let i = 0; i < chapters.length; i++) {
    const ch = chapters[i];
    const quiz = await prisma.userQuizResult.findUnique({
      where: { userId_chapterId: { userId, chapterId: ch.id } },
    });
    let status: ModuleStatus = i === 0 ? 'UNLOCKED' : 'LOCKED';
    if (quiz?.isPassed) status = 'COMPLETED';
    else if (i === 0) status = 'IN_PROGRESS';
    else {
      const prev = chapters[i - 1];
      const prevQuiz = await prisma.userQuizResult.findUnique({
        where: { userId_chapterId: { userId, chapterId: prev.id } },
      });
      if (prevQuiz?.isPassed) status = 'IN_PROGRESS';
    }

    await prisma.userChapterProgress.upsert({
      where: { userId_chapterId: { userId, chapterId: ch.id } },
      create: { userId, chapterId: ch.id, status },
      update: { status },
    });
  }
}

export async function buildSubjectCurriculum(
  userId: string,
  subjectId: string,
): Promise<SubjectCurriculumDto | null> {
  await ensureChapterCurriculumSeeded();

  const subject = await prisma.subjectCatalog.findUnique({
    where: { id: subjectId },
    include: {
      chapters: {
        orderBy: { sequenceOrder: 'asc' },
        include: {
          videos: { orderBy: { sequenceOrder: 'asc' } },
          quiz: true,
          quizResults: { where: { userId } },
          userProgress: { where: { userId } },
        },
      },
    },
  });
  if (!subject) return null;

  await ensureChapterUnlockRows(userId, subjectId);

  const allVideoIds = subject.chapters.flatMap((c) => c.videos.map((v) => v.id));
  const videoProgress = await prisma.userVideoProgress.findMany({
    where: { userId, videoId: { in: allVideoIds } },
  });
  const progByVideo = new Map(videoProgress.map((p) => [p.videoId, p]));

  const chapterProgress = await prisma.userChapterProgress.findMany({
    where: { userId, chapterId: { in: subject.chapters.map((c) => c.id) } },
  });
  const chStatus = new Map(chapterProgress.map((p) => [p.chapterId, p.status]));

  const chapters: ChapterDto[] = subject.chapters.map((ch) => {
    const status = chStatus.get(ch.id) ?? 'LOCKED';
    const chapterLocked = status === 'LOCKED';

    const videos: VideoDto[] = ch.videos.map((v, idx) => {
      const prog = progByVideo.get(v.id);
      const prevCompleted =
        idx === 0 ? true : Boolean(progByVideo.get(ch.videos[idx - 1].id)?.isCompleted);
      const isLocked = chapterLocked || !prevCompleted;
      return {
        id: v.id,
        title: v.title,
        videoUrl: v.videoUrl,
        durationInSeconds: v.durationInSeconds,
        sequenceOrder: v.sequenceOrder,
        isCompleted: Boolean(prog?.isCompleted),
        watchTimeSeconds: prog?.watchTimeSeconds ?? 0,
        maxWatchedTime: prog?.maxWatchedTime ?? 0,
        isLocked,
      };
    });

    const allVideosCompleted = videos.length > 0 && videos.every((v) => v.isCompleted);
    const quizResult = ch.quizResults[0];

    return {
      id: ch.id,
      title: ch.title,
      sequenceOrder: ch.sequenceOrder,
      status,
      videos,
      allVideosCompleted,
      quizUnlocked: !chapterLocked && allVideosCompleted,
      quizPassed: Boolean(quizResult?.isPassed),
      quizScore: quizResult?.scorePercentage ?? null,
    };
  });

  const masteryPercentage = await getSubjectCurriculumProgress(userId, subjectId);

  return {
    subjectId: subject.id,
    subjectName: subject.name,
    color: subject.colorTheme,
    ageGroup: subject.ageGroup,
    masteryPercentage,
    chapters,
  };
}

export async function trackVideoProgress(opts: {
  userId: string;
  videoId: string;
  watchTimeSeconds: number;
  maxWatchedTime: number;
}) {
  const video = await prisma.videoLesson.findUnique({
    where: { id: opts.videoId },
    include: { chapter: true },
  });
  if (!video) throw new Error('Video not found');

  const watch = Math.max(0, opts.watchTimeSeconds);
  const maxT = Math.max(0, Math.min(opts.maxWatchedTime, video.durationInSeconds + 2));

  const existing = await prisma.userVideoProgress.findUnique({
    where: { userId_videoId: { userId: opts.userId, videoId: opts.videoId } },
  });

  const row = await prisma.userVideoProgress.upsert({
    where: { userId_videoId: { userId: opts.userId, videoId: opts.videoId } },
    create: {
      userId: opts.userId,
      videoId: opts.videoId,
      watchTimeSeconds: watch,
      maxWatchedTime: maxT,
      isCompleted: false,
    },
    update: {
      watchTimeSeconds: Math.max(existing?.watchTimeSeconds ?? 0, watch),
      maxWatchedTime: Math.max(existing?.maxWatchedTime ?? 0, maxT),
    },
  });

  return { progress: row, video };
}

export async function completeVideo(opts: {
  userId: string;
  videoId: string;
  maxWatchedTime: number;
}) {
  const video = await prisma.videoLesson.findUnique({
    where: { id: opts.videoId },
    include: { chapter: { include: { subject: true } } },
  });
  if (!video) throw new Error('Video not found');

  const threshold = video.durationInSeconds * 0.95;
  if (opts.maxWatchedTime < threshold) {
    throw new Error('Watch at least 95% of the video without skipping to complete it');
  }

  const progress = await prisma.userVideoProgress.upsert({
    where: { userId_videoId: { userId: opts.userId, videoId: opts.videoId } },
    create: {
      userId: opts.userId,
      videoId: opts.videoId,
      watchTimeSeconds: opts.maxWatchedTime,
      maxWatchedTime: opts.maxWatchedTime,
      isCompleted: true,
    },
    update: {
      watchTimeSeconds: opts.maxWatchedTime,
      maxWatchedTime: opts.maxWatchedTime,
      isCompleted: true,
    },
  });

  const mastery = await refreshSubjectMasteryFromCurriculum(
    opts.userId,
    video.chapter.subjectId,
  );

  return { progress, masteryPercentage: mastery, subjectId: video.chapter.subjectId };
}

export async function getChapterQuiz(userId: string, chapterId: string) {
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: {
      videos: { orderBy: { sequenceOrder: 'asc' } },
      quiz: true,
      subject: true,
    },
  });
  if (!chapter || !chapter.quiz) throw new Error('Chapter quiz not found');

  await ensureChapterUnlockRows(userId, chapter.subjectId);

  const videoIds = chapter.videos.map((v) => v.id);
  const completed = await prisma.userVideoProgress.count({
    where: { userId, videoId: { in: videoIds }, isCompleted: true },
  });
  if (completed < chapter.videos.length) {
    throw new Error('Complete all 5 videos before taking the chapter test');
  }

  const progress = await prisma.userChapterProgress.findUnique({
    where: { userId_chapterId: { userId, chapterId } },
  });
  if (progress?.status === 'LOCKED') throw new Error('This chapter is still locked');

  const questions = chapter.quiz.questions as QuizQuestion[];
  return {
    chapterId: chapter.id,
    chapterTitle: chapter.title,
    subjectId: chapter.subjectId,
    subjectName: chapter.subject.name,
    questions: questions.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: q.options,
    })),
  };
}

export async function submitChapterQuiz(opts: {
  userId: string;
  chapterId: string;
  answers: { questionId: string; selectedIndex: number }[];
}) {
  const chapter = await prisma.chapter.findUnique({
    where: { id: opts.chapterId },
    include: {
      quiz: true,
      videos: true,
      subject: true,
    },
  });
  if (!chapter?.quiz) throw new Error('Chapter quiz not found');

  const videoIds = chapter.videos.map((v) => v.id);
  const completed = await prisma.userVideoProgress.count({
    where: { userId: opts.userId, videoId: { in: videoIds }, isCompleted: true },
  });
  if (completed < chapter.videos.length) {
    throw new Error('Complete all videos before submitting the test');
  }

  const questions = chapter.quiz.questions as QuizQuestion[];
  let correct = 0;
  for (const q of questions) {
    const ans = opts.answers.find((a) => a.questionId === q.id);
    if (ans && ans.selectedIndex === q.correctIndex) correct += 1;
  }
  const scorePercentage = Math.round((correct / Math.max(questions.length, 1)) * 100);
  const isPassed = scorePercentage >= 80;

  const result = await prisma.userQuizResult.upsert({
    where: { userId_chapterId: { userId: opts.userId, chapterId: opts.chapterId } },
    create: {
      userId: opts.userId,
      chapterId: opts.chapterId,
      scorePercentage,
      isPassed,
      answers: opts.answers,
      attemptedAt: new Date(),
    },
    update: {
      scorePercentage,
      isPassed,
      answers: opts.answers,
      attemptedAt: new Date(),
    },
  });

  if (isPassed) {
    await prisma.userChapterProgress.upsert({
      where: { userId_chapterId: { userId: opts.userId, chapterId: opts.chapterId } },
      create: { userId: opts.userId, chapterId: opts.chapterId, status: 'COMPLETED' },
      update: { status: 'COMPLETED' },
    });

    const next = await prisma.chapter.findFirst({
      where: {
        subjectId: chapter.subjectId,
        sequenceOrder: chapter.sequenceOrder + 1,
      },
    });
    if (next) {
      await prisma.userChapterProgress.upsert({
        where: { userId_chapterId: { userId: opts.userId, chapterId: next.id } },
        create: { userId: opts.userId, chapterId: next.id, status: 'IN_PROGRESS' },
        update: { status: 'IN_PROGRESS' },
      });
    }
  }

  const mastery = await refreshSubjectMasteryFromCurriculum(opts.userId, chapter.subjectId);

  return {
    result: {
      scorePercentage: result.scorePercentage,
      isPassed: result.isPassed,
      correct,
      total: questions.length,
    },
    masteryPercentage: mastery,
    subjectId: chapter.subjectId,
  };
}
