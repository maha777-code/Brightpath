import { Router, type NextFunction, type Response } from 'express';
import { z } from 'zod';
import type { ArcadeAssignmentLookup, GameArcadeDocument } from '@brightpath/shared';
import { prisma } from '../lib/prisma.js';
import { routeParam } from '../lib/routeParam.js';
import { classScope, findManagedClass, rosterActor } from '../lib/rosterAccess.js';
import { requireSignedIn, type AuthRequest } from '../middleware/auth.js';
import {
  ArcadeAttemptLimitError,
  arcadeLeaderboard,
  assignmentDetail,
  assignmentPlayerCount,
  createArcadeAssignment,
  findArcadeAssignment,
  isEnrolled,
  listAssignmentsForClasses,
  listStudentAssignments,
  recordArcadeAttempt,
  removeArcadeAssignment,
  type ArcadeAssignmentRecord,
} from '../services/arcadeAssignments.js';

const router = Router();
router.use(requireSignedIn);

const MANAGER_ROLES = new Set(['teacher', 'org_admin', 'center_admin']);

const questionSchema = z.object({
  id: z.string().min(1).max(40),
  prompt: z.string().min(1).max(500),
  answer: z.string().min(1).max(200),
  distractors: z.array(z.string().min(1).max(200)).min(1).max(6),
  hint: z.string().max(500).default(''),
  explanation: z.string().max(1000).default(''),
  misconception: z.string().max(500).default(''),
});

const documentSchema = z.object({
  kind: z.literal('game_arcade'),
  title: z.string().trim().min(1).max(200),
  subject: z.string().max(120).default(''),
  gradeLabel: z.string().max(80).default(''),
  missionIntro: z.string().max(1000).default(''),
  questions: z.array(questionSchema).min(1).max(40),
});

const assignSchema = z.object({
  classBatchId: z.string().min(1),
  gameId: z.string().regex(/^[a-z][a-z0-9_-]{1,31}$/),
  document: documentSchema,
});

const attemptSchema = z.object({
  score: z.number().finite().min(0).max(100_000_000),
  correct: z.number().int().min(0).max(1000),
  total: z.number().int().min(0).max(1000),
  bestStreak: z.number().int().min(0).max(1000),
  missedQuestionIds: z.array(z.string().max(40)).max(200),
});

/** Express 4 does not catch rejected promises; hand them to the error middleware instead. */
function handle(fn: (req: AuthRequest, res: Response) => Promise<void>) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

function isManager(req: AuthRequest): boolean {
  return MANAGER_ROLES.has(req.auth?.role ?? req.user?.role ?? '');
}

function isStudent(req: AuthRequest): boolean {
  return (req.auth?.role ?? req.user?.role) === 'student' && Boolean(req.platformUserId);
}

/** "teacher" when the caller manages the assignment's class, "student" when enrolled in it. */
async function accessFor(req: AuthRequest, record: ArcadeAssignmentRecord): Promise<'teacher' | 'student' | null> {
  if (isManager(req) && (await findManagedClass(rosterActor(req), record.meta.classBatchId))) return 'teacher';
  if (isStudent(req) && (await isEnrolled(req.platformUserId!, record.meta.classBatchId))) return 'student';
  return null;
}

const REMOVED_MESSAGE = 'Your teacher has removed this activity, so it is no longer available.';

async function loadAccessible(req: AuthRequest, res: Response, options: { allowRemoved?: boolean } = {}) {
  const record = await findArcadeAssignment(routeParam(req.params.id));
  const access = record ? await accessFor(req, record) : null;
  if (!record || !access) {
    res.status(404).json({ error: 'This arcade activity was not found, or it is not assigned to your class.' });
    return null;
  }
  if (record.removedAt && !options.allowRemoved) {
    res.status(410).json({ error: REMOVED_MESSAGE, code: 'arcade_assignment_removed' });
    return null;
  }
  return { record, access };
}

/** Only the teacher who owns the class, or whoever created the assignment, may unassign it. */
async function canRemove(req: AuthRequest, record: ArcadeAssignmentRecord): Promise<boolean> {
  if (!isManager(req)) return false;
  const actor = rosterActor(req);
  if (actor.userId && record.createdBy === actor.userId) return true;
  if (!actor.teacherId) return false;
  if (record.meta.teacherId === actor.teacherId) return true;
  const cls = await prisma.classBatch.findUnique({
    where: { id: record.meta.classBatchId },
    select: { teacherId: true },
  });
  return cls?.teacherId === actor.teacherId;
}

/** POST /arcade/assignments — teacher assigns a question pack + game to one of their classes. */
router.post('/assignments', handle(async (req, res) => {
  if (!isManager(req)) {
    res.status(403).json({ error: 'Only teachers can assign arcade activities.' });
    return;
  }
  const parsed = assignSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'A class, a game, and a valid question pack are required.' });
    return;
  }
  const actor = rosterActor(req);
  const cls = await findManagedClass(actor, parsed.data.classBatchId);
  if (!cls) {
    res.status(404).json({ error: 'Class not found' });
    return;
  }
  const assignment = await createArcadeAssignment(
    actor,
    cls,
    parsed.data.gameId,
    parsed.data.document as GameArcadeDocument,
  );
  res.status(201).json({ assignment });
}));

/** GET /arcade/assignments — assignments in the classes the caller manages (optional ?classBatchId=). */
router.get('/assignments', handle(async (req, res) => {
  if (!isManager(req)) {
    res.status(403).json({ error: 'Teacher access required' });
    return;
  }
  const classBatchId = typeof req.query.classBatchId === 'string' ? req.query.classBatchId : undefined;
  const classes = await prisma.classBatch.findMany({
    where: { AND: [classScope(rosterActor(req)), classBatchId ? { id: classBatchId } : {}] },
    select: { id: true },
  });
  res.json({ assignments: await listAssignmentsForClasses(classes.map((cls) => cls.id)) });
}));

/** GET /arcade/assignments/mine — the signed-in student's assigned games with their best run. */
router.get('/assignments/mine', handle(async (req, res) => {
  if (!isStudent(req)) {
    res.json({ assignments: [] });
    return;
  }
  res.json({ assignments: await listStudentAssignments(req.platformUserId!) });
}));

/** GET /arcade/assignments/:id — question pack + game for the class's teacher or its students. */
router.get('/assignments/:id', handle(async (req, res) => {
  const found = await loadAccessible(req, res, { allowRemoved: true });
  if (!found) return;
  const { record, access } = found;
  if (record.removedAt) {
    const body: ArcadeAssignmentLookup = {
      status: 'removed',
      removed: {
        id: record.id,
        title: record.meta.title,
        className: record.meta.className,
        removedAt: record.removedAt.toISOString(),
      },
      access,
    };
    res.json(body);
    return;
  }
  const body: ArcadeAssignmentLookup = {
    status: 'active',
    assignment: assignmentDetail(record, await assignmentPlayerCount(record.id)),
    access,
  };
  res.json(body);
}));

/** DELETE /arcade/assignments/:id — unassign (soft delete); students lose access, runs are kept. */
router.delete('/assignments/:id', handle(async (req, res) => {
  const record = await findArcadeAssignment(routeParam(req.params.id));
  if (!record || !isManager(req)) {
    res.status(404).json({ error: 'This arcade activity was not found.' });
    return;
  }
  if (!(await canRemove(req, record))) {
    const visible = Boolean(await findManagedClass(rosterActor(req), record.meta.classBatchId));
    res.status(visible ? 403 : 404).json({
      error: visible ? 'Only the class teacher can unassign this activity.' : 'This arcade activity was not found.',
    });
    return;
  }
  const removedAt = await removeArcadeAssignment(record, rosterActor(req), req.organizationId ?? null);
  res.json({ id: record.id, removedAt: removedAt.toISOString() });
}));

/** POST /arcade/assignments/:id/attempts — save a student's finished run and return the class board. */
router.post('/assignments/:id/attempts', handle(async (req, res) => {
  const found = await loadAccessible(req, res);
  if (!found) return;
  if (found.access !== 'student') {
    res.status(403).json({ error: 'Teacher preview runs are not saved.' });
    return;
  }
  const parsed = attemptSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid run result' });
    return;
  }
  try {
    const attempt = await recordArcadeAttempt(
      found.record,
      { id: req.platformUserId!, organizationId: req.organizationId ?? null },
      parsed.data,
    );
    const leaderboard = await arcadeLeaderboard(found.record.id, req.platformUserId!);
    res.status(201).json({ attempt, leaderboard });
  } catch (err) {
    if (err instanceof ArcadeAttemptLimitError) {
      res.status(429).json({ error: err.message });
      return;
    }
    throw err;
  }
}));

/** GET /arcade/assignments/:id/leaderboard — top runs per student in the class. */
router.get('/assignments/:id/leaderboard', handle(async (req, res) => {
  const found = await loadAccessible(req, res);
  if (!found) return;
  const limit = found.access === 'teacher' ? 50 : 10;
  res.json(await arcadeLeaderboard(found.record.id, req.platformUserId ?? null, limit));
}));

export default router;
