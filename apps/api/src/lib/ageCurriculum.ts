import {
  getAgeFromDOB,
  getAgeGroupFromDOB,
  getAgeGroupFromAge,
  mergeUnlockedSubjects,
  ageGroupToLegacyBand,
  AGE_GROUP_LEVEL_NAMES,
  type AgeGroup,
  type CurriculumUpgradeEvent,
  type ParentUser,
} from '@brightpath/shared';

type ParentRow = {
  id: string;
  email: string;
  name: string | null;
  locale: string;
  createdAt: Date;
  dateOfBirth: Date | null;
  calculatedAgeGroup: AgeGroup | null;
  unlockedSubjects: string[];
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

export { getAgeGroupFromAge };
