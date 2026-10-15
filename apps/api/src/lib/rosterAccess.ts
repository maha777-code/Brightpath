import type { Prisma } from '@prisma/client';
import { prisma } from './prisma.js';
import type { AuthRequest } from '../middleware/auth.js';

export type RosterActor = {
  role: string;
  userId: string;
  platformUserId: string | null;
  teacherId: string | null;
  organizationId: string | null;
  isOrgAdmin: boolean;
};

export function rosterActor(req: AuthRequest): RosterActor {
  const role = req.auth?.role ?? req.user?.role ?? '';
  return {
    role,
    userId: req.platformUserId ?? req.teacherId ?? req.user?.id ?? '',
    platformUserId: req.platformUserId ?? null,
    teacherId: req.teacherId ?? null,
    organizationId: req.organizationId ?? null,
    isOrgAdmin: (role === 'org_admin' || role === 'center_admin') && Boolean(req.organizationId),
  };
}

/** Classes the actor manages: every class in the org for admins, their own classes for teachers. */
export function classScope(actor: RosterActor): Prisma.ClassBatchWhereInput {
  if (actor.isOrgAdmin) return { organizationId: actor.organizationId };
  if (actor.teacherId) return { teacherId: actor.teacherId };
  return { id: '__none__' };
}

export async function findManagedClass(actor: RosterActor, classId: string) {
  return prisma.classBatch.findFirst({ where: { AND: [{ id: classId }, classScope(actor)] } });
}

/** Students the actor may see: enrolled in a managed class, or (admins) members of the org. */
export function studentScope(actor: RosterActor): Prisma.PlatformUserWhereInput {
  const enrolled: Prisma.PlatformUserWhereInput = {
    enrollments: { some: { classBatch: classScope(actor) } },
  };
  if (actor.isOrgAdmin) {
    return { role: 'student', OR: [{ organizationId: actor.organizationId }, enrolled] };
  }
  return { role: 'student', ...enrolled };
}

export async function canSeeStudent(actor: RosterActor, studentUserId: string): Promise<boolean> {
  const found = await prisma.platformUser.findFirst({
    where: { AND: [{ id: studentUserId }, studentScope(actor)] },
    select: { id: true },
  });
  return Boolean(found);
}

/**
 * Sharada sessions the actor may read. Teachers see sessions tied to their class, plus untagged
 * sessions from students enrolled with them; admins see every session from their org's students.
 */
export function tutorSessionScope(actor: RosterActor): Prisma.TutorSessionWhereInput {
  if (actor.isOrgAdmin) {
    return {
      OR: [
        { organizationId: actor.organizationId },
        { classBatch: { organizationId: actor.organizationId } },
        { studentUser: studentScope(actor) },
      ],
    };
  }
  if (!actor.teacherId) return { id: '__none__' };
  return {
    OR: [
      { classBatch: { teacherId: actor.teacherId } },
      {
        classBatchId: null,
        studentUser: { enrollments: { some: { classBatch: { teacherId: actor.teacherId } } } },
      },
    ],
  };
}

export async function writeAudit(
  actor: RosterActor,
  action: string,
  targetType: string,
  targetId: string | null,
  metadata?: Prisma.InputJsonValue,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: actor.organizationId,
        actorUserId: actor.userId,
        actorRole: actor.role,
        action,
        targetType,
        targetId,
        metadata,
      },
    });
  } catch (err) {
    console.warn('[audit] write failed', action, err instanceof Error ? err.message : err);
  }
}
