import type { PlanType, SubscriptionStatus } from '@prisma/client';
import { prisma } from './prisma.js';
import { initialCurriculumFromDob, parseDobInput } from './ageCurriculum.js';

/** Creates an invited student's login with its learner profile. */
export async function createStudentAccount(input: {
  name: string;
  email: string;
  organizationId: string | null;
  planType: PlanType;
  subscriptionStatus?: SubscriptionStatus;
  passwordHash: string;
}) {
  const { passwordHash } = input;
  const dob = parseDobInput('2012-06-15');
  const curriculum = initialCurriculumFromDob(dob);
  const parentProfile = await prisma.parent.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name,
      locale: 'en-IN',
      dateOfBirth: dob,
      calculatedAgeGroup: curriculum.calculatedAgeGroup,
      unlockedSubjects: curriculum.unlockedSubjects,
    },
  });
  const user = await prisma.platformUser.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name,
      role: 'student',
      planType: input.planType,
      organizationId: input.organizationId,
      parentProfileId: parentProfile.id,
      subscriptionStatus: input.subscriptionStatus ?? 'active',
    },
  });
  return { user };
}

/** Creates an organization teacher login with its Teacher profile. */
export async function createTeacherAccount(input: {
  name: string;
  email: string;
  passwordHash: string;
  organizationId: string;
  organizationName: string;
  planType: PlanType;
  subscriptionStatus?: SubscriptionStatus;
}) {
  const teacher = await prisma.teacher.create({
    data: {
      email: input.email,
      passwordHash: input.passwordHash,
      name: input.name,
      schoolName: input.organizationName,
      subjectFocus: 'Science',
      organizationId: input.organizationId,
      planType: input.planType,
    },
  });
  const user = await prisma.platformUser.create({
    data: {
      email: input.email,
      passwordHash: input.passwordHash,
      name: input.name,
      role: 'teacher',
      planType: input.planType,
      organizationId: input.organizationId,
      teacherId: teacher.id,
      subscriptionStatus: input.subscriptionStatus ?? 'active',
    },
  });
  return { user, teacher };
}
