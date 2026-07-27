import type { AgeBand, Lesson, Subject } from '@/types';
import { lessons } from '@/data/lessons';

export function getLessonsFor(subject: Subject, ageBand: AgeBand): Lesson[] {
  return lessons.filter((l) => l.subject === subject && l.ageBand === ageBand);
}

export function getLessonById(id: string): Lesson | undefined {
  return lessons.find((l) => l.id === id);
}

export function getRecommendedLesson(
  subject: Subject,
  ageBand: AgeBand,
  completedIds: string[],
): Lesson | undefined {
  const available = getLessonsFor(subject, ageBand);
  return available.find((l) => !completedIds.includes(l.id)) ?? available[0];
}

export function normalizeAnswer(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function checkAnswer(
  input: string,
  step: import('@/types').LessonStep,
): boolean {
  const normalized = normalizeAnswer(input);

  if (step.acceptableAnswers?.length) {
    return step.acceptableAnswers.some((a) => normalizeAnswer(a) === normalized);
  }

  if (step.expectedPatterns?.length) {
    return step.expectedPatterns.some((p) => p.test(normalized));
  }

  return normalized.length > 0;
}

export function tutorEncouragement(name: string, correct: boolean): string {
  if (correct) {
    const phrases = [
      `Excellent work, ${name}! 🌟`,
      `That's exactly right, ${name}!`,
      `You got it, ${name}! I'm proud of you.`,
      `Perfect, ${name}! You're really getting this.`,
    ];
    return phrases[Math.floor(Math.random() * phrases.length)];
  }

  const phrases = [
    `Good try, ${name}. Let's think about this together.`,
    `Not quite, ${name} — but that's how we learn!`,
    `Almost there, ${name}. Want a hint?`,
    `No worries, ${name}. Every tutor's favorite students make mistakes.`,
  ];
  return phrases[Math.floor(Math.random() * phrases.length)];
}

export function buildTutorGreeting(name: string, subject: Subject): string {
  const subjectLines: Record<Subject, string> = {
    reading: `Today we'll read together — I'll guide you step by step, just like sitting side by side with a book.`,
    writing: `Today we'll write together. I'll help you find the right words, one sentence at a time.`,
    math: `Today we'll solve problems together. I'll show you how to think through each one — not just the answer.`,
  };

  return `Hi ${name}! I'm Ms. Bright, your personal tutor. ${subjectLines[subject]} Ready when you are — just type your answers below, and I'll help you along the way.`;
}

export function buildSessionSummary(
  name: string,
  correct: number,
  total: number,
  subject: Subject,
): string {
  const ratio = total > 0 ? correct / total : 0;
  if (ratio >= 0.9) {
    return `What a session, ${name}! You nailed ${correct} out of ${total}. A private tutor would charge a lot for progress like that — and you did it right here. 🎉`;
  }
  if (ratio >= 0.6) {
    return `Great effort today, ${name}! You got ${correct} out of ${total} right. The ones you missed? Those are tomorrow's wins.`;
  }
  return `Thanks for sticking with it, ${name}. You got ${correct} out of ${total} — and showing up is half the battle. We'll pick up right where we left off next time.`;
}
