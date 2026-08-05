import type { Lesson, LessonStep, Subject } from '@/types';
import { lessons } from '@/data/lessons';

/** After this many consecutive wrong answers on an upper-band topic, inject foundation practice. */
export const CONSECUTIVE_FAILURE_THRESHOLD = 3;

/**
 * Maps 8–10 / 11–14 skill tags → foundation (5–7 / EARLY_4_7) lesson + skills.
 * Dashboard AgeGroup / theme is never changed — only in-session content is scaffolded.
 */
const FOUNDATION_MAP: Record<
  string,
  { foundationLessonId: string; foundationSkillTags: string[]; bridgeLabel: string }
> = {
  'multiplication-concept': {
    foundationLessonId: 'math-57-counting',
    foundationSkillTags: ['addition-within-10'],
    bridgeLabel: 'equal groups & addition',
  },
  'multiplication-facts': {
    foundationLessonId: 'math-57-counting',
    foundationSkillTags: ['addition-within-10'],
    bridgeLabel: 'repeated addition',
  },
  'division-concept': {
    foundationLessonId: 'math-57-counting',
    foundationSkillTags: ['subtraction-within-10', 'addition-within-10'],
    bridgeLabel: 'sharing & taking away',
  },
  'fractions-representation': {
    foundationLessonId: 'math-57-counting',
    foundationSkillTags: ['number-comparison', 'addition-within-10'],
    bridgeLabel: 'parts of a whole with numbers',
  },
  'comprehension-detail': {
    foundationLessonId: 'read-57-phonics',
    foundationSkillTags: ['phonics-blending', 'phonics-consonants'],
    bridgeLabel: 'careful reading of key words',
  },
  'comprehension-inference': {
    foundationLessonId: 'read-57-phonics',
    foundationSkillTags: ['phonics-blending'],
    bridgeLabel: 'reading for meaning',
  },
  'topic-sentence': {
    foundationLessonId: 'write-57-sentences',
    foundationSkillTags: ['sentence-basics'],
    bridgeLabel: 'complete sentences',
  },
  'supporting-details': {
    foundationLessonId: 'write-57-sentences',
    foundationSkillTags: ['sentence-basics'],
    bridgeLabel: 'clear, complete sentences',
  },
  'closing-sentence': {
    foundationLessonId: 'write-57-sentences',
    foundationSkillTags: ['sentence-basics'],
    bridgeLabel: 'complete sentences',
  },
};

/** Default foundation lesson per subject when skill isn't mapped. */
const SUBJECT_FOUNDATION_FALLBACK: Record<Subject, string> = {
  math: 'math-57-counting',
  reading: 'read-57-phonics',
  writing: 'write-57-sentences',
};

export function getFoundationMapping(skillTag: string) {
  return FOUNDATION_MAP[skillTag] ?? null;
}

/**
 * Rewrites a 4–7 foundation step so tone stays age-appropriate for an 8–10+ learner.
 * Does NOT change dashboard theme — only wording of the practice module.
 */
export function adaptFoundationStepForOlderLearner(
  step: LessonStep,
  learnerAge: number,
): LessonStep {
  if (learnerAge < 8) return step;

  const soften = (text: string) =>
    text
      .replace(/\bLet'?s count!\s*/gi, '')
      .replace(/\bHold up \d+ fingers[^.]*\./gi, 'Try counting on from the first number.')
      .replace(/\bfingers\b/gi, 'a quick count')
      .replace(/\bapples\b/gi, 'items')
      .replace(/\bcookies\b/gi, 'items')
      .replace(/\bGreat!\s*/gi, '')
      .replace(/\bso easy\b/gi, 'straightforward')
      .trim();

  return {
    ...step,
    id: `foundation-${step.id}`,
    tutorPrompt: soften(step.tutorPrompt),
    hint: soften(step.hint),
    explanation: soften(step.explanation),
    skillTag: step.skillTag,
  };
}

export function pickFoundationSteps(
  skillTag: string,
  subject: Subject,
  learnerAge: number,
  maxSteps = 2,
): { steps: LessonStep[]; bridgeLabel: string; foundationLessonId: string } | null {
  const mapping = getFoundationMapping(skillTag);
  const lessonId = mapping?.foundationLessonId ?? SUBJECT_FOUNDATION_FALLBACK[subject];
  const lesson = lessons.find((l) => l.id === lessonId) as Lesson | undefined;
  if (!lesson) return null;

  let pool = lesson.steps;
  if (mapping?.foundationSkillTags?.length) {
    const filtered = pool.filter((s) => mapping.foundationSkillTags.includes(s.skillTag));
    if (filtered.length) pool = filtered;
  }

  const steps = pool
    .slice(0, maxSteps)
    .map((s) => adaptFoundationStepForOlderLearner(s, learnerAge));

  if (!steps.length) return null;

  return {
    steps,
    bridgeLabel: mapping?.bridgeLabel ?? 'the building-block idea behind this topic',
    foundationLessonId: lessonId,
  };
}

export function buildRemediationIntro(
  name: string,
  bridgeLabel: string,
  learnerAge: number,
): string {
  if (learnerAge >= 11) {
    return `${name}, before we push further, let's shore up ${bridgeLabel} — the foundation this topic rests on. Quick checkpoint, then we return to the main problem.`;
  }
  return `${name}, nice effort. Let's pause the harder question and lock in ${bridgeLabel} first — same ideas, clearer building blocks. Then we'll jump right back.`;
}

export function buildRemediationOutro(name: string): string {
  return `Solid review, ${name}. You've strengthened the foundation — now let's return to the original challenge with that in mind.`;
}

export function shouldTriggerFoundationRemediation(opts: {
  consecutiveFailures: number;
  misconceptionDetected?: boolean;
  alreadyInRemediation: boolean;
  learnerAgeBand: string;
}): boolean {
  if (opts.alreadyInRemediation) return false;
  // Only scaffold down for upper elementary / middle — not when already on 5–7 content
  if (opts.learnerAgeBand === '5-7') return false;
  if (opts.misconceptionDetected) return true;
  return opts.consecutiveFailures >= CONSECUTIVE_FAILURE_THRESHOLD;
}
