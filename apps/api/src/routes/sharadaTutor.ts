import { Router } from 'express';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { requireRoles, type AuthRequest } from '../middleware/auth.js';
import { rosterActor, tutorSessionScope, writeAudit } from '../lib/rosterAccess.js';
import { respondToStudent } from '../services/sharadaStudentTutor.js';

const router = Router();

const param = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? '';

const LIVE_WINDOW_MS = 5 * 60 * 1000;

function serializeMessage(m: { id: string; sender: string; content: string; flags: string[]; createdAt: Date }) {
  return { id: m.id, sender: m.sender, content: m.content, flags: m.flags, createdAt: m.createdAt.toISOString() };
}

function serializeSession(s: {
  id: string;
  title: string;
  subject: string | null;
  chapter: string | null;
  topic: string | null;
  summary: string;
  messageCount: number;
  flagCount: number;
  startedAt: Date;
  lastMessageAt: Date;
  classBatchId: string | null;
}) {
  return {
    id: s.id,
    title: s.title,
    subject: s.subject,
    chapter: s.chapter,
    topic: s.topic,
    summary: s.summary,
    messageCount: s.messageCount,
    flagCount: s.flagCount,
    classBatchId: s.classBatchId,
    startedAt: s.startedAt.toISOString(),
    lastMessageAt: s.lastMessageAt.toISOString(),
    isLive: Date.now() - s.lastMessageAt.getTime() < LIVE_WINDOW_MS,
  };
}

// ─── Student ─────────────────────────────────────────────────────────

const student = Router();
student.use(requireRoles('student'));

student.get('/context', async (req: AuthRequest, res) => {
  const enrollments = await prisma.classEnrollment.findMany({
    where: { studentUserId: req.platformUserId! },
    select: { classBatch: { select: { id: true, name: true, subject: true } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ classes: enrollments.map((e) => e.classBatch) });
});

student.get('/sessions', async (req: AuthRequest, res) => {
  const sessions = await prisma.tutorSession.findMany({
    where: { studentUserId: req.platformUserId! },
    orderBy: { lastMessageAt: 'desc' },
    take: 50,
  });
  res.json({ sessions: sessions.map(serializeSession) });
});

student.post('/sessions', async (req: AuthRequest, res) => {
  const parsed = z.object({ classBatchId: z.string().optional().nullable() }).safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const studentUserId = req.platformUserId!;
  let classBatchId = parsed.data.classBatchId ?? null;
  const enrollments = await prisma.classEnrollment.findMany({
    where: { studentUserId },
    select: { classBatchId: true, classBatch: { select: { organizationId: true } } },
  });
  if (classBatchId && !enrollments.some((e) => e.classBatchId === classBatchId)) {
    res.status(400).json({ error: 'You are not enrolled in that class.' });
    return;
  }
  if (!classBatchId && enrollments.length === 1) classBatchId = enrollments[0].classBatchId;
  const classOrg = enrollments.find((e) => e.classBatchId === classBatchId)?.classBatch.organizationId ?? null;
  const session = await prisma.tutorSession.create({
    data: { studentUserId, classBatchId, organizationId: classOrg ?? req.organizationId ?? null },
  });
  res.status(201).json({ session: serializeSession(session) });
});

student.get('/sessions/:id', async (req: AuthRequest, res) => {
  const session = await prisma.tutorSession.findFirst({
    where: { id: param(req.params.id), studentUserId: req.platformUserId! },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (!session) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }
  res.json({ session: serializeSession(session), messages: session.messages.map(serializeMessage) });
});

student.post('/sessions/:id/messages', async (req: AuthRequest, res) => {
  const parsed = z.object({ content: z.string().trim().min(1).max(4000) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Type a question for Sharada.' });
    return;
  }
  const owned = await prisma.tutorSession.findFirst({
    where: { id: param(req.params.id), studentUserId: req.platformUserId! },
    select: { id: true },
  });
  if (!owned) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }
  try {
    const result = await respondToStudent({
      sessionId: owned.id,
      studentUserId: req.platformUserId!,
      content: parsed.data.content,
    });
    res.json({
      studentMessage: serializeMessage(result.studentMessage),
      sharadaMessage: serializeMessage(result.sharadaMessage),
      session: serializeSession(result.session),
    });
  } catch (err) {
    console.error('POST /sharada/student/sessions/:id/messages failed', err);
    res.status(500).json({ error: 'Sharada could not reply. Please try again.' });
  }
});

// ─── Teacher / admin oversight ───────────────────────────────────────

const oversight = Router();
oversight.use(requireRoles('teacher', 'org_admin', 'center_admin'));

const sessionInclude = {
  studentUser: { select: { id: true, name: true, email: true } },
  classBatch: { select: { id: true, name: true } },
} as const;

oversight.get('/summary', async (req: AuthRequest, res) => {
  const actor = rosterActor(req);
  const scope = tutorSessionScope(actor);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [activeNow, sessionsThisWeek, openAlerts, highAlerts] = await Promise.all([
    prisma.tutorSession.count({ where: { AND: [scope, { lastMessageAt: { gte: new Date(Date.now() - LIVE_WINDOW_MS) } }] } }),
    prisma.tutorSession.count({ where: { AND: [scope, { lastMessageAt: { gte: weekAgo } }] } }),
    prisma.safetyAlert.count({ where: { status: 'open', session: scope } }),
    prisma.safetyAlert.count({ where: { status: 'open', severity: 'high', session: scope } }),
  ]);
  res.json({ activeNow, sessionsThisWeek, openAlerts, highAlerts });
});

oversight.get('/sessions', async (req: AuthRequest, res) => {
  const actor = rosterActor(req);
  const q = z
    .object({
      classId: z.string().optional(),
      studentId: z.string().optional(),
      flagged: z.enum(['1', 'true']).optional(),
      live: z.enum(['1', 'true']).optional(),
    })
    .safeParse(req.query);
  const filters: Prisma.TutorSessionWhereInput[] = [tutorSessionScope(actor)];
  if (q.success) {
    if (q.data.classId) filters.push({ classBatchId: q.data.classId });
    if (q.data.studentId) filters.push({ studentUserId: q.data.studentId });
    if (q.data.flagged) filters.push({ flagCount: { gt: 0 } });
    if (q.data.live) filters.push({ lastMessageAt: { gte: new Date(Date.now() - LIVE_WINDOW_MS) } });
  }
  const sessions = await prisma.tutorSession.findMany({
    where: { AND: filters },
    include: sessionInclude,
    orderBy: { lastMessageAt: 'desc' },
    take: 100,
  });
  res.json({
    sessions: sessions.map((s) => ({
      ...serializeSession(s),
      student: { id: s.studentUser.id, name: s.studentUser.name, email: s.studentUser.email },
      className: s.classBatch?.name ?? null,
    })),
  });
});

oversight.get('/sessions/:id', async (req: AuthRequest, res) => {
  const actor = rosterActor(req);
  const after = typeof req.query.after === 'string' && !Number.isNaN(Date.parse(req.query.after)) ? new Date(req.query.after) : null;
  const session = await prisma.tutorSession.findFirst({
    where: { AND: [{ id: param(req.params.id) }, tutorSessionScope(actor)] },
    include: {
      ...sessionInclude,
      messages: { where: after ? { createdAt: { gt: after } } : undefined, orderBy: { createdAt: 'asc' } },
      alerts: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!session) {
    res.status(404).json({ error: 'Conversation not found' });
    return;
  }
  if (!after) {
    await writeAudit(actor, 'sharada.transcript_view', 'TutorSession', session.id, {
      studentUserId: session.studentUserId,
    });
  }
  res.json({
    session: {
      ...serializeSession(session),
      student: { id: session.studentUser.id, name: session.studentUser.name, email: session.studentUser.email },
      className: session.classBatch?.name ?? null,
    },
    messages: session.messages.map(serializeMessage),
    alerts: session.alerts.map(serializeAlert),
  });
});

function serializeAlert(a: {
  id: string;
  sessionId: string;
  messageId: string | null;
  studentUserId: string;
  category: string;
  severity: string;
  excerpt: string;
  reason: string;
  status: string;
  notifiedAt: Date | null;
  reviewedAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: a.id,
    sessionId: a.sessionId,
    messageId: a.messageId,
    studentUserId: a.studentUserId,
    category: a.category,
    severity: a.severity,
    excerpt: a.excerpt,
    reason: a.reason,
    status: a.status,
    notifiedAt: a.notifiedAt?.toISOString() ?? null,
    reviewedAt: a.reviewedAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
  };
}

oversight.get('/alerts', async (req: AuthRequest, res) => {
  const actor = rosterActor(req);
  const status = typeof req.query.status === 'string' && ['open', 'reviewed', 'dismissed'].includes(req.query.status)
    ? req.query.status
    : undefined;
  const alerts = await prisma.safetyAlert.findMany({
    where: { ...(status ? { status } : {}), session: tutorSessionScope(actor) },
    include: { session: { select: { title: true, studentUser: { select: { name: true, email: true } }, classBatch: { select: { name: true } } } } },
    orderBy: [{ createdAt: 'desc' }],
    take: 200,
  });
  res.json({
    alerts: alerts.map((a) => ({
      ...serializeAlert(a),
      sessionTitle: a.session.title,
      studentName: a.session.studentUser.name || a.session.studentUser.email,
      className: a.session.classBatch?.name ?? null,
    })),
  });
});

oversight.patch('/alerts/:id', async (req: AuthRequest, res) => {
  const actor = rosterActor(req);
  const parsed = z.object({ status: z.enum(['open', 'reviewed', 'dismissed']) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const alert = await prisma.safetyAlert.findFirst({
    where: { id: param(req.params.id), session: tutorSessionScope(actor) },
  });
  if (!alert) {
    res.status(404).json({ error: 'Alert not found' });
    return;
  }
  const updated = await prisma.safetyAlert.update({
    where: { id: alert.id },
    data: {
      status: parsed.data.status,
      reviewedByUserId: parsed.data.status === 'open' ? null : actor.userId,
      reviewedAt: parsed.data.status === 'open' ? null : new Date(),
    },
  });
  await writeAudit(actor, `safety_alert.${parsed.data.status}`, 'SafetyAlert', alert.id, { category: alert.category });
  res.json({ alert: serializeAlert(updated) });
});

router.use('/student', student);
router.use('/oversight', oversight);

export default router;
