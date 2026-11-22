import type { Prisma } from '@prisma/client';
import {
  arcadeAccuracy,
  arcadeAttemptXp,
  type ArcadeAssignmentDetail,
  type ArcadeAssignmentSummary,
  type ArcadeAttempt,
  type ArcadeAttemptInput,
  type ArcadeLeaderboardEntry,
  type ArcadeLeaderboardResponse,
  type GameArcadeDocument,
  type StudentArcadeAssignment,
} from '@brightpath/shared';
import { prisma } from '../lib/prisma.js';
import type { RosterActor } from '../lib/rosterAccess.js';

/**
 * Arcade assignments and runs are stored as typed rows in the existing AuditLog table
 * (JSONB metadata), so the feature ships without a schema migration:
 *   action "arcade.assignment"  targetType "ClassBatch"        targetId = class id   id = assignment id
 *   action "arcade.attempt"     targetType "ArcadeAssignment"  targetId = assignment id
 *   action "arcade.assignment.removed"  targetType "ArcadeAssignment"  targetId = assignment id
 * Unassigning appends a "removed" marker instead of deleting, so past runs stay auditable.
 */
const ASSIGNMENT_ACTION = 'arcade.assignment';
const ATTEMPT_ACTION = 'arcade.attempt';
const REMOVED_ACTION = 'arcade.assignment.removed';
const MAX_ATTEMPTS_PER_STUDENT = 300;

interface AssignmentMeta {
  teacherId: string | null;
  classBatchId: string;
  className: string;
  gameId: string;
  title: string;
  document: GameArcadeDocument;
}

interface AttemptMeta {
  classBatchId: string;
  gameId: string;
  score: number;
  correct: number;
  total: number;
  accuracy: number;
  bestStreak: number;
  missedQuestionIds: string[];
  xp: number;
}

type AssignmentRow = { id: string; createdAt: Date; actorUserId: string; metadata: Prisma.JsonValue | null };

const ASSIGNMENT_SELECT = { id: true, createdAt: true, actorUserId: true, metadata: true } as const;

export interface ArcadeAssignmentRecord {
  id: string;
  createdAt: Date;
  /** Who created the assignment (platform user or teacher id). */
  createdBy: string;
  meta: AssignmentMeta;
  removedAt: Date | null;
}

function toRecord(row: AssignmentRow, removedAt: Date | null = null): ArcadeAssignmentRecord | null {
  const meta = row.metadata as unknown as AssignmentMeta | null;
  if (!meta || typeof meta !== 'object' || !meta.classBatchId || !meta.document) return null;
  return { id: row.id, createdAt: row.createdAt, createdBy: row.actorUserId, meta, removedAt };
}

async function removedIds(assignmentIds: string[]): Promise<Set<string>> {
  if (!assignmentIds.length) return new Set();
  const rows = await prisma.auditLog.findMany({
    where: { action: REMOVED_ACTION, targetId: { in: assignmentIds } },
    select: { targetId: true },
  });
  return new Set(rows.map((row) => row.targetId).filter((id): id is string => Boolean(id)));
}

function summary(record: ArcadeAssignmentRecord, playerCount: number): ArcadeAssignmentSummary {
  return {
    id: record.id,
    title: record.meta.title,
    gameId: record.meta.gameId,
    classBatchId: record.meta.classBatchId,
    className: record.meta.className,
    questionCount: record.meta.document.questions.length,
    createdAt: record.createdAt.toISOString(),
    playerCount,
  };
}

async function playerCounts(assignmentIds: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (!assignmentIds.length) return counts;
  const groups = await prisma.auditLog.groupBy({
    by: ['targetId', 'actorUserId'],
    where: { action: ATTEMPT_ACTION, targetId: { in: assignmentIds } },
  });
  for (const group of groups) {
    if (!group.targetId) continue;
    counts.set(group.targetId, (counts.get(group.targetId) ?? 0) + 1);
  }
  return counts;
}

export async function createArcadeAssignment(
  actor: RosterActor,
  cls: { id: string; name: string; organizationId: string | null },
  gameId: string,
  document: GameArcadeDocument,
): Promise<ArcadeAssignmentDetail> {
  const meta: AssignmentMeta = {
    teacherId: actor.teacherId,
    classBatchId: cls.id,
    className: cls.name,
    gameId,
    title: document.title,
    document,
  };
  const row = await prisma.auditLog.create({
    data: {
      organizationId: cls.organizationId,
      actorUserId: actor.userId,
      actorRole: actor.role,
      action: ASSIGNMENT_ACTION,
      targetType: 'ClassBatch',
      targetId: cls.id,
      metadata: meta as unknown as Prisma.InputJsonValue,
    },
    select: ASSIGNMENT_SELECT,
  });
  const record = toRecord(row)!;
  return { ...summary(record, 0), document };
}

/** Finds an assignment, including removed ones (check `removedAt`). */
export async function findArcadeAssignment(id: string): Promise<ArcadeAssignmentRecord | null> {
  if (!id) return null;
  const row = await prisma.auditLog.findFirst({
    where: { id, action: ASSIGNMENT_ACTION },
    select: ASSIGNMENT_SELECT,
  });
  if (!row) return null;
  const marker = await prisma.auditLog.findFirst({
    where: { action: REMOVED_ACTION, targetId: id },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true },
  });
  return toRecord(row, marker?.createdAt ?? null);
}

/** Unassigns by appending a removal marker; idempotent. */
export async function removeArcadeAssignment(
  record: ArcadeAssignmentRecord,
  actor: RosterActor,
  organizationId: string | null,
): Promise<Date> {
  if (record.removedAt) return record.removedAt;
  const row = await prisma.auditLog.create({
    data: {
      organizationId,
      actorUserId: actor.userId,
      actorRole: actor.role,
      action: REMOVED_ACTION,
      targetType: 'ArcadeAssignment',
      targetId: record.id,
      metadata: { classBatchId: record.meta.classBatchId, gameId: record.meta.gameId } as Prisma.InputJsonValue,
    },
    select: { createdAt: true },
  });
  return row.createdAt;
}

export function assignmentDetail(record: ArcadeAssignmentRecord, playerCount: number): ArcadeAssignmentDetail {
  return { ...summary(record, playerCount), document: record.meta.document };
}

export async function assignmentPlayerCount(id: string): Promise<number> {
  return (await playerCounts([id])).get(id) ?? 0;
}

export async function listAssignmentsForClasses(classBatchIds: string[]): Promise<ArcadeAssignmentSummary[]> {
  if (!classBatchIds.length) return [];
  const rows = await prisma.auditLog.findMany({
    where: { action: ASSIGNMENT_ACTION, targetType: 'ClassBatch', targetId: { in: classBatchIds } },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: ASSIGNMENT_SELECT,
  });
  const removed = await removedIds(rows.map((row) => row.id));
  const records = rows
    .filter((row) => !removed.has(row.id))
    .map((row) => toRecord(row))
    .filter((item): item is ArcadeAssignmentRecord => Boolean(item));
  const counts = await playerCounts(records.map((record) => record.id));
  return records.map((record) => summary(record, counts.get(record.id) ?? 0));
}

export async function listStudentAssignments(studentUserId: string): Promise<StudentArcadeAssignment[]> {
  const enrollments = await prisma.classEnrollment.findMany({
    where: { studentUserId },
    select: { classBatchId: true },
  });
  const assignments = await listAssignmentsForClasses(enrollments.map((item) => item.classBatchId));
  if (!assignments.length) return [];
  const attempts = await prisma.auditLog.findMany({
    where: { action: ATTEMPT_ACTION, actorUserId: studentUserId, targetId: { in: assignments.map((item) => item.id) } },
    select: { targetId: true, metadata: true },
  });
  const best = new Map<string, { score: number; xp: number }>();
  for (const attempt of attempts) {
    const meta = attempt.metadata as unknown as AttemptMeta | null;
    if (!attempt.targetId || !meta) continue;
    const prev = best.get(attempt.targetId) ?? { score: 0, xp: 0 };
    best.set(attempt.targetId, { score: Math.max(prev.score, meta.score), xp: Math.max(prev.xp, meta.xp) });
  }
  return assignments.map((item) => ({
    ...item,
    myBestScore: best.get(item.id)?.score ?? null,
    myXp: best.get(item.id)?.xp ?? 0,
  }));
}

export async function isEnrolled(studentUserId: string, classBatchId: string): Promise<boolean> {
  const row = await prisma.classEnrollment.findUnique({
    where: { studentUserId_classBatchId: { studentUserId, classBatchId } },
    select: { id: true },
  });
  return Boolean(row);
}

export class ArcadeAttemptLimitError extends Error {}

export async function recordArcadeAttempt(
  record: ArcadeAssignmentRecord,
  student: { id: string; organizationId: string | null },
  input: ArcadeAttemptInput,
): Promise<ArcadeAttempt> {
  const previous = await prisma.auditLog.count({
    where: { action: ATTEMPT_ACTION, targetId: record.id, actorUserId: student.id },
  });
  if (previous >= MAX_ATTEMPTS_PER_STUDENT) {
    throw new ArcadeAttemptLimitError('You have reached the run limit for this activity.');
  }

  const questionIds = new Set(record.meta.document.questions.map((question) => question.id));
  const missedQuestionIds = [...new Set(input.missedQuestionIds)].filter((id) => questionIds.has(id));
  const total = Math.max(input.total, 0);
  const correct = Math.min(Math.max(input.correct, 0), total || input.correct);
  const accuracy = arcadeAccuracy(correct, missedQuestionIds.length);
  const bestStreak = Math.max(0, input.bestStreak);
  const meta: AttemptMeta = {
    classBatchId: record.meta.classBatchId,
    gameId: record.meta.gameId,
    score: Math.max(0, Math.round(input.score)),
    correct,
    total,
    accuracy,
    bestStreak,
    missedQuestionIds,
    xp: arcadeAttemptXp({ correct, accuracy, bestStreak }),
  };
  const row = await prisma.auditLog.create({
    data: {
      organizationId: student.organizationId,
      actorUserId: student.id,
      actorRole: 'student',
      action: ATTEMPT_ACTION,
      targetType: 'ArcadeAssignment',
      targetId: record.id,
      metadata: meta as unknown as Prisma.InputJsonValue,
    },
    select: { id: true, createdAt: true },
  });
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    score: meta.score,
    correct: meta.correct,
    total: meta.total,
    bestStreak: meta.bestStreak,
    missedQuestionIds: meta.missedQuestionIds,
    accuracy: meta.accuracy,
    xp: meta.xp,
  };
}

export async function arcadeLeaderboard(
  assignmentId: string,
  viewerId: string | null,
  limit = 10,
): Promise<ArcadeLeaderboardResponse> {
  const attempts = await prisma.auditLog.findMany({
    where: { action: ATTEMPT_ACTION, targetId: assignmentId },
    orderBy: { createdAt: 'asc' },
    select: { actorUserId: true, metadata: true },
  });

  const byStudent = new Map<string, { best: AttemptMeta; xp: number; attempts: number }>();
  for (const attempt of attempts) {
    const meta = attempt.metadata as unknown as AttemptMeta | null;
    if (!meta) continue;
    const prev = byStudent.get(attempt.actorUserId);
    if (!prev) {
      byStudent.set(attempt.actorUserId, { best: meta, xp: meta.xp, attempts: 1 });
      continue;
    }
    prev.attempts += 1;
    prev.xp = Math.max(prev.xp, meta.xp);
    if (meta.score > prev.best.score || (meta.score === prev.best.score && meta.accuracy > prev.best.accuracy)) {
      prev.best = meta;
    }
  }

  const users = await prisma.platformUser.findMany({
    where: { id: { in: [...byStudent.keys()] } },
    select: { id: true, name: true },
  });
  const names = new Map(users.map((user) => [user.id, user.name?.trim() || 'Student']));

  const ranked: ArcadeLeaderboardEntry[] = [...byStudent.entries()]
    .sort(([, a], [, b]) => b.best.score - a.best.score || b.best.accuracy - a.best.accuracy || b.xp - a.xp)
    .map(([studentId, row], index) => ({
      rank: index + 1,
      studentId,
      name: names.get(studentId) ?? 'Student',
      score: row.best.score,
      accuracy: row.best.accuracy,
      bestStreak: row.best.bestStreak,
      xp: row.xp,
      attempts: row.attempts,
      isMe: studentId === viewerId,
    }));

  const entries = ranked.slice(0, limit);
  const me = ranked.find((entry) => entry.isMe && entry.rank > limit) ?? null;
  return { assignmentId, entries, me, playerCount: ranked.length };
}
