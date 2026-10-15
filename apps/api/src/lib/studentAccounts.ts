import bcrypt from 'bcryptjs';
import type { PlanType, SubscriptionStatus } from '@prisma/client';
import { prisma } from './prisma.js';
import { randomPassword } from './platformSerializers.js';
import { initialCurriculumFromDob, parseDobInput } from './ageCurriculum.js';

/** Creates a student login with its learner profile, matching the bulk-import account shape. */
export async function createStudentAccount(input: {
  name: string;
  email: string;
  organizationId: string | null;
  planType: PlanType;
  subscriptionStatus?: SubscriptionStatus;
}) {
  const tempPassword = randomPassword(12);
  const passwordHash = await bcrypt.hash(tempPassword, 10);
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
  return { user, tempPassword };
}
