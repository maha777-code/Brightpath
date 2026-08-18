import type { VideoAnimationCue } from '@brightpath/shared';
import { SAMPLE_VIDEOS } from '../data/chapterSeeds.js';
import { prisma } from './prisma.js';

export function buildDefaultScript(code: string, title: string, prompt?: string): string {
  const tip = prompt?.trim() ? `\n\nTeacher note applied: ${prompt.trim()}` : '';
  return (
    `Welcome to ${code}: ${title}.\n\n` +
    `In this explainer, we break the idea into clear steps for Class 9 learners. ` +
    `First, we define the core concept in everyday language. ` +
    `Next, we use a 3D visualization to show how particles and energy interact. ` +
    `Finally, we connect the idea to a classroom example so students can recall it in exams.` +
    tip
  );
}

export function buildDefaultCues(title: string): VideoAnimationCue[] {
  return [
    { timeSec: 5, label: `Introduce: ${title}` },
    { timeSec: 15, label: 'Molecular / particle motion' },
    { timeSec: 28, label: 'Temperature and energy effect' },
    { timeSec: 42, label: 'Classroom example wrap-up' },
  ];
}

export function sampleGeneratedVideoUrl(): string {
  return SAMPLE_VIDEOS[3]?.url ?? SAMPLE_VIDEOS[0].url;
}

export async function syncPublishedVideoToStudents(subtopicId: string) {
  const sub = await prisma.teacherSubtopic.findUnique({
    where: { id: subtopicId },
    include: {
      chapter: { include: { textbook: true } },
    },
  });
  if (!sub?.videoUrl) return { synced: false as const, reason: 'no_video' };

  const subjectHint = sub.chapter.textbook.subject || 'Science';
  const subjects = await prisma.subjectCatalog.findMany();
  const subject =
    subjects.find((s) => s.name.toLowerCase().includes(subjectHint.toLowerCase())) ||
    subjects.find((s) => /science/i.test(s.name)) ||
    subjects[0];

  if (!subject) return { synced: false as const, reason: 'no_subject' };

  const { ensureChapterCurriculumSeeded } = await import('./curriculumEngine.js');
  await ensureChapterCurriculumSeeded();

  let chapter = await prisma.chapter.findFirst({
    where: {
      subjectId: subject.id,
      sequenceOrder: sub.chapter.sequenceOrder,
    },
  });

  if (!chapter) {
    chapter = await prisma.chapter.create({
      data: {
        subjectId: subject.id,
        title: sub.chapter.title.replace(/^Chapter\s+\d+:\s*/i, ''),
        sequenceOrder: sub.chapter.sequenceOrder,
      },
    });
  }

  const title = `${sub.code} ${sub.title}`;
  const existing = await prisma.videoLesson.findFirst({
    where: {
      chapterId: chapter.id,
      sequenceOrder: sub.sequenceOrder,
    },
  });

  if (existing) {
    await prisma.videoLesson.update({
      where: { id: existing.id },
      data: {
        title,
        videoUrl: sub.videoUrl,
        durationInSeconds: Math.max(existing.durationInSeconds, 60),
      },
    });
  } else {
    await prisma.videoLesson.create({
      data: {
        chapterId: chapter.id,
        title,
        videoUrl: sub.videoUrl,
        durationInSeconds: 60,
        sequenceOrder: sub.sequenceOrder,
      },
    });
  }

  return { synced: true as const, subjectId: subject.id, chapterId: chapter.id };
}
