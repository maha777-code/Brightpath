import {
  getAgeFromDOB,
  getAgeGroupFromDOB,
  getAgeGroupFromAge,
  mergeUnlockedSubjects,
  ageGroupToLegacyBand,
  AGE_GROUP_LEVEL_NAMES,
  formatStudyTime,
  startOfWeekMonday,
  daysBetween,
  type AgeGroup,
  type CurriculumUpgradeEvent,
  type ParentUser,
} from '@brightpath/shared';

export type ParentRow = {
  id: string;
  email: string;
  name: string | null;
  locale: string;
  createdAt: Date;
  dateOfBirth: Date | null;
  calculatedAgeGroup: AgeGroup | null;
  unlockedSubjects: string[];
  currentStreak?: number | null;
  longestStreak?: number | null;
  lastActiveDate?: Date | null;
  timeStudiedThisWeek?: number | null;
  lastWeekResetTimestamp?: Date | null;
};

export function toParentUser(p: ParentRow, asOf: Date = new Date()): ParentUser {
  const currentAge = p.dateOfBirth ? getAgeFromDOB(p.dateOfBirth, asOf) : null;
  return {
    id: p.id,
    email: p.email,
    name: p.name,
    locale: p.locale as ParentUser['locale'],
    createdAt: p.createdAt.toISOString(),
    dateOfBirth: p.dateOfBirth ? p.dateOfBirth.toISOString().slice(0, 10) : null,
    calculatedAgeGroup: p.calculatedAgeGroup,
    unlockedSubjects: p.unlockedSubjects ?? [],
    currentAge,
    currentStreak: p.currentStreak ?? 0,
    longestStreak: p.longestStreak ?? 0,
    lastActiveDate: p.lastActiveDate ? p.lastActiveDate.toISOString().slice(0, 10) : null,
    timeStudiedThisWeek: p.timeStudiedThisWeek ?? 0,
    lastWeekResetTimestamp: p.lastWeekResetTimestamp
      ? p.lastWeekResetTimestamp.toISOString()
      : null,
  };
}

/**
 * Recompute age group from DOB. If the tier changed, merge new subjects.
 * Returns patch data + upgrade event (upgraded=false when unchanged).
 */
export function computeAgeUpgrade(
  existing: {
    dateOfBirth: Date | null;
    calculatedAgeGroup: AgeGroup | null;
    unlockedSubjects: string[];
  },
  options: { dateOfBirth?: Date; forceGroup?: AgeGroup } = {},
  asOf: Date = new Date(),
): {
  dateOfBirth: Date | null;
  calculatedAgeGroup: AgeGroup;
  unlockedSubjects: string[];
  age: number;
  ageBand: string;
  event: CurriculumUpgradeEvent;
} {
  const dob = options.dateOfBirth ?? existing.dateOfBirth;
  if (!dob && !options.forceGroup) {
    throw new Error('dateOfBirth is required for age-based curriculum');
  }

  const age = dob ? getAgeFromDOB(dob, asOf) : 0;
  const newGroup = options.forceGroup ?? getAgeGroupFromDOB(dob!, asOf);
  const previousGroup = existing.calculatedAgeGroup;
  const upgraded = previousGroup !== null && previousGroup !== newGroup;
  const unlockedSubjects = mergeUnlockedSubjects(existing.unlockedSubjects, newGroup);

  const event: CurriculumUpgradeEvent = {
    upgraded,
    previousGroup,
    newGroup,
    unlockedSubjects,
    currentAge: age || (options.forceGroup ? approximateAgeForGroup(options.forceGroup) : age),
    message: upgraded
      ? `Congratulations! You've unlocked ${AGE_GROUP_LEVEL_NAMES[newGroup]} Subjects & Features!`
      : undefined,
  };

  return {
    dateOfBirth: dob,
    calculatedAgeGroup: newGroup,
    unlockedSubjects,
    age: event.currentAge,
    ageBand: ageGroupToLegacyBand(newGroup),
    event,
  };
}

export function initialCurriculumFromDob(dob: Date, asOf: Date = new Date()) {
  const age = getAgeFromDOB(dob, asOf);
  const group = getAgeGroupFromDOB(dob, asOf);
  return {
    age,
    calculatedAgeGroup: group,
    unlockedSubjects: mergeUnlockedSubjects([], group),
    ageBand: ageGroupToLegacyBand(group),
  };
}

function approximateAgeForGroup(group: AgeGroup): number {
  switch (group) {
    case 'TODDLER_1_3':
      return 2;
    case 'EARLY_4_7':
      return 6;
    case 'UPPER_ELEM_8_10':
      return 9;
    case 'MIDDLE_11_14':
      return 12;
  }
}

export function parseDobInput(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) throw new Error('dateOfBirth must be YYYY-MM-DD');
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const dob = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  if (Number.isNaN(dob.getTime())) throw new Error('Invalid dateOfBirth');
  const age = getAgeFromDOB(dob);
  if (age < 1 || age > 18) throw new Error('Learner age must be between 1 and 18');
  return dob;
}

export { getAgeGroupFromAge, formatStudyTime };

export interface ActivityPatch {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: Date;
  timeStudiedThisWeek: number;
  lastWeekResetTimestamp: Date;
}

/**
 * Apply a duration heartbeat against existing progress fields.
 * Uses the client's local calendar date (YYYY-MM-DD) for streak + week boundaries.
 */
export function applyActivityHeartbeat(
  existing: {
    currentStreak: number;
    longestStreak: number;
    lastActiveDate: Date | null;
    timeStudiedThisWeek: number;
    lastWeekResetTimestamp: Date | null;
  },
  opts: {
    durationInSeconds: number;
    localDate: string;
    now?: Date;
  },
): ActivityPatch {
  const duration = Math.max(0, Math.min(Math.floor(opts.durationInSeconds), 600));
  const today = opts.localDate;
  const now = opts.now ?? new Date();

  // ── Weekly study time ──
  const weekStart = startOfWeekMonday(today);
  const lastReset = existing.lastWeekResetTimestamp
    ? existing.lastWeekResetTimestamp.toISOString().slice(0, 10)
    : null;
  const lastResetWeek = lastReset ? startOfWeekMonday(lastReset) : null;

  let timeStudiedThisWeek = existing.timeStudiedThisWeek ?? 0;
  let lastWeekResetTimestamp = existing.lastWeekResetTimestamp ?? now;

  if (!lastResetWeek || lastResetWeek !== weekStart) {
    timeStudiedThisWeek = duration;
    lastWeekResetTimestamp = now;
  } else {
    timeStudiedThisWeek += duration;
  }

  // ── Streak ──
  const lastActive = existing.lastActiveDate
    ? existing.lastActiveDate.toISOString().slice(0, 10)
    : null;

  let currentStreak = existing.currentStreak ?? 0;
  let longestStreak = existing.longestStreak ?? 0;

  if (!lastActive) {
    currentStreak = 1;
  } else if (lastActive === today) {
    // same day — streak unchanged (ensure at least 1 if somehow 0)
    if (currentStreak < 1) currentStreak = 1;
  } else {
    const gap = daysBetween(lastActive, today);
    if (gap === 1) {
      currentStreak += 1;
    } else if (gap > 1) {
      currentStreak = 1;
    }
    // gap < 0 (clock skew) — leave streak as-is
  }

  if (currentStreak > longestStreak) longestStreak = currentStreak;

  const [y, m, d] = today.split('-').map(Number);
  const lastActiveDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));

  return {
    currentStreak,
    longestStreak,
    lastActiveDate,
    timeStudiedThisWeek,
    lastWeekResetTimestamp,
  };
}
