import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireRoles, type AuthRequest } from '../middleware/auth.js';
import { uniqueInviteCode } from '../lib/platformSerializers.js';
import { isMailConfigured } from '../lib/mailer.js';
import {
  INVITE_RESEND_COOLDOWN_MS,
  emailInvite,
  pendingInviteEmails,
  refreshInviteToken,
  serializeInvite,
  upsertInvite,
} from '../lib/accountInvites.js';
import {
  canSeeStudent,
  classScope,
  findManagedClass,
  rosterActor,
  studentScope,
  writeAudit,
  type RosterActor,
} from '../lib/rosterAccess.js';

const router = Router();

const param = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? '';

/** Public: lets the join page show which class a code belongs to before the student signs in. */
router.get('/join/:code', async (req, res) => {
  const code = param(req.params.code).trim().toUpperCase();
  if (!/^[A-Z0-9]{4,12}$/.test(code)) {
    res.status(404).json({ error: 'Invalid class code' });
    return;
  }
  const batch = await prisma.classBatch.findUnique({
    where: { inviteCode: code },
    include: {
      teacher: { select: { name: true } },
      organization: { select: { name: true } },
    },
  });
  if (!batch) {
    res.status(404).json({ error: 'Invalid class code' });
    return;
  }
  res.json({
    code: batch.inviteCode,
    className: batch.name,
    subject: batch.subject,
    teacherName: batch.teacher.name,
    organizationName: batch.organization?.name ?? null,
  });
});

router.use(requireRoles('teacher', 'org_admin', 'center_admin'));

const unitKinds = ['grade', 'department', 'course'] as const;

function serializeClass(batch: {
  id: string;
  name: string;
  subject: string | null;
  gradeLevel: string | null;
  orgUnitId: string | null;
  inviteCode: string;
  createdAt: Date;
  teacher: { id: string; name: string | null; email: string };
  _count: { enrollments: number };
}) {
  return {
    id: batch.id,
    name: batch.name,
    subject: batch.subject,
    gradeLevel: batch.gradeLevel,
    orgUnitId: batch.orgUnitId,
    inviteCode: batch.inviteCode,
    teacher: { id: batch.teacher.id, name: batch.teacher.name, email: batch.teacher.email },
    studentCount: batch._count.enrollments,
    createdAt: batch.createdAt.toISOString(),
  };
}

const classInclude = {
  teacher: { select: { id: true, name: true, email: true } },
  _count: { select: { enrollments: true } },
} as const;

async function orgTeachers(organizationId: string) {
  return prisma.teacher.findMany({
    where: {
      OR: [
        { organizationId },
        { platformUsers: { some: { organizationId, role: 'teacher' } } },
      ],
    },
    select: { id: true, name: true, email: true, subjectFocus: true },
    orderBy: { name: 'asc' },
  });
}

function requireOrgAdmin(actor: RosterActor, res: import('express').Response): boolean {
  if (actor.isOrgAdmin) return true;
  res.status(403).json({ error: 'Only school or academy admins can change the organization structure.' });
  return false;
}

router.get('/overview', async (req: AuthRequest, res) => {
  try {
    const actor = rosterActor(req);
    const [org, units, classes, teachers] = await Promise.all([
      actor.organizationId
        ? prisma.organization.findUnique({
            where: { id: actor.organizationId },
            select: { id: true, name: true, type: true, maxLicenses: true },
          })
        : null,
      actor.organizationId
        ? prisma.orgUnit.findMany({
            where: { organizationId: actor.organizationId },
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          })
        : [],
      prisma.classBatch.findMany({
        where: classScope(actor),
        include: classInclude,
        orderBy: { createdAt: 'desc' },
      }),
      actor.isOrgAdmin && actor.organizationId ? orgTeachers(actor.organizationId) : [],
    ]);
    const memberCount = org ? await prisma.platformUser.count({ where: { organizationId: org.id } }) : null;
    res.json({
      organization: org
        ? { id: org.id, name: org.name, type: org.type, maxLicenses: org.maxLicenses, seatsUsed: memberCount }
        : null,
      canManageOrg: actor.isOrgAdmin,
      units: units.map((u) => ({ id: u.id, name: u.name, kind: u.kind, sortOrder: u.sortOrder })),
      classes: classes.map(serializeClass),
      teachers,
    });
  } catch (err) {
    console.error('GET /roster/overview failed', err);
    res.status(500).json({ error: 'Could not load classes' });
  }
});

const unitBody = z.object({
  name: z.string().trim().min(1).max(80),
  kind: z.enum(unitKinds).optional(),
  sortOrder: z.number().int().min(0).max(999).optional(),
});

router.post('/units', async (req: AuthRequest, res) => {
  const actor = rosterActor(req);
  if (!requireOrgAdmin(actor, res)) return;
  const parsed = unitBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const org = await prisma.organization.findUnique({ where: { id: actor.organizationId! } });
  const unit = await prisma.orgUnit.create({
    data: {
      organizationId: actor.organizationId!,
      name: parsed.data.name,
      kind: parsed.data.kind ?? (org?.type === 'tutor_center' ? 'course' : 'grade'),
      sortOrder: parsed.data.sortOrder ?? 0,
    },
  });
  await writeAudit(actor, 'org_unit.create', 'OrgUnit', unit.id, { name: unit.name, kind: unit.kind });
  res.status(201).json({ unit: { id: unit.id, name: unit.name, kind: unit.kind, sortOrder: unit.sortOrder } });
});

router.patch('/units/:id', async (req: AuthRequest, res) => {
  const actor = rosterActor(req);
  if (!requireOrgAdmin(actor, res)) return;
  const parsed = unitBody.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const unit = await prisma.orgUnit.findFirst({ where: { id: param(req.params.id), organizationId: actor.organizationId! } });
  if (!unit) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const updated = await prisma.orgUnit.update({ where: { id: unit.id }, data: parsed.data });
  await writeAudit(actor, 'org_unit.update', 'OrgUnit', unit.id, parsed.data);
  res.json({ unit: { id: updated.id, name: updated.name, kind: updated.kind, sortOrder: updated.sortOrder } });
});

router.delete('/units/:id', async (req: AuthRequest, res) => {
  const actor = rosterActor(req);
  if (!requireOrgAdmin(actor, res)) return;
  const unit = await prisma.orgUnit.findFirst({ where: { id: param(req.params.id), organizationId: actor.organizationId! } });
  if (!unit) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  await prisma.orgUnit.delete({ where: { id: unit.id } });
  await writeAudit(actor, 'org_unit.delete', 'OrgUnit', unit.id, { name: unit.name });
  res.json({ ok: true });
});

const classBody = z.object({
  name: z.string().trim().min(2).max(120),
  subject: z.string().trim().max(80).optional().nullable(),
  gradeLevel: z.string().trim().max(40).optional().nullable(),
  orgUnitId: z.string().optional().nullable(),
  teacherId: z.string().optional(),
});

async function resolveClassFields(actor: RosterActor, data: Partial<z.infer<typeof classBody>>) {
  if (data.orgUnitId) {
    const unit = actor.organizationId
      ? await prisma.orgUnit.findFirst({ where: { id: data.orgUnitId, organizationId: actor.organizationId } })
      : null;
    if (!unit) return { error: 'That grade, department or course does not belong to your organization.' };
  }
  if (data.teacherId !== undefined) {
    if (!actor.isOrgAdmin) {
      if (data.teacherId !== actor.teacherId) return { error: 'Teachers can only create classes for themselves.' };
    } else {
      const teachers = await orgTeachers(actor.organizationId!);
      if (!teachers.some((t) => t.id === data.teacherId)) {
        return { error: 'Choose a teacher or tutor from your organization.' };
      }
    }
  }
  return { error: null };
}

router.post('/classes', async (req: AuthRequest, res) => {
  const actor = rosterActor(req);
  const parsed = classBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const teacherId = parsed.data.teacherId ?? actor.teacherId ?? undefined;
  if (!teacherId) {
    res.status(400).json({ error: 'Choose the teacher or tutor for this class.' });
    return;
  }
  const check = await resolveClassFields(actor, { ...parsed.data, teacherId });
  if (check.error) {
    res.status(400).json({ error: check.error });
    return;
  }
  const inviteCode = await uniqueInviteCode(async (c) =>
    Boolean(await prisma.classBatch.findUnique({ where: { inviteCode: c } })),
  );
  const batch = await prisma.classBatch.create({
    data: {
      name: parsed.data.name,
      subject: parsed.data.subject || null,
      gradeLevel: parsed.data.gradeLevel || null,
      orgUnitId: parsed.data.orgUnitId || null,
      teacherId,
      organizationId: actor.organizationId,
      inviteCode,
    },
    include: classInclude,
  });
  await writeAudit(actor, 'class.create', 'ClassBatch', batch.id, { name: batch.name, teacherId });
  res.status(201).json({ classBatch: serializeClass(batch) });
});

router.patch('/classes/:id', async (req: AuthRequest, res) => {
  const actor = rosterActor(req);
  const batch = await findManagedClass(actor, param(req.params.id));
  if (!batch) {
    res.status(404).json({ error: 'Class not found' });
    return;
  }
  const parsed = classBody.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const check = await resolveClassFields(actor, parsed.data);
  if (check.error) {
    res.status(400).json({ error: check.error });
    return;
  }
  const updated = await prisma.classBatch.update({
    where: { id: batch.id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
      ...(parsed.data.subject !== undefined ? { subject: parsed.data.subject || null } : {}),
      ...(parsed.data.gradeLevel !== undefined ? { gradeLevel: parsed.data.gradeLevel || null } : {}),
      ...(parsed.data.orgUnitId !== undefined ? { orgUnitId: parsed.data.orgUnitId || null } : {}),
      ...(parsed.data.teacherId !== undefined ? { teacherId: parsed.data.teacherId } : {}),
    },
    include: classInclude,
  });
  await writeAudit(actor, 'class.update', 'ClassBatch', batch.id, parsed.data);
  res.json({ classBatch: serializeClass(updated) });
});

router.post('/classes/:id/rotate-code', async (req: AuthRequest, res) => {
  const actor = rosterActor(req);
  const batch = await findManagedClass(actor, param(req.params.id));
  if (!batch) {
    res.status(404).json({ error: 'Class not found' });
    return;
  }
  const inviteCode = await uniqueInviteCode(async (c) =>
    Boolean(await prisma.classBatch.findUnique({ where: { inviteCode: c } })),
  );
  const updated = await prisma.classBatch.update({ where: { id: batch.id }, data: { inviteCode }, include: classInclude });
  await writeAudit(actor, 'class.rotate_code', 'ClassBatch', batch.id);
  res.json({ classBatch: serializeClass(updated) });
});

router.delete('/classes/:id', async (req: AuthRequest, res) => {
  const actor = rosterActor(req);
  const batch = await findManagedClass(actor, param(req.params.id));
  if (!batch) {
    res.status(404).json({ error: 'Class not found' });
    return;
  }
  await prisma.classBatch.delete({ where: { id: batch.id } });
  await writeAudit(actor, 'class.delete', 'ClassBatch', batch.id, { name: batch.name });
  res.json({ ok: true });
});

function serializeProfile(profile: {
  gradeLevel: string | null;
  board: string | null;
  preferredLanguage: string | null;
  readingLevel: string | null;
  accommodations: string[];
  learningPreferences: string[];
  notes: string;
} | null) {
  return {
    gradeLevel: profile?.gradeLevel ?? null,
    board: profile?.board ?? null,
    preferredLanguage: profile?.preferredLanguage ?? null,
    readingLevel: profile?.readingLevel ?? null,
    accommodations: profile?.accommodations ?? [],
    learningPreferences: profile?.learningPreferences ?? [],
    notes: profile?.notes ?? '',
  };
}

router.get('/classes/:id/students', async (req: AuthRequest, res) => {
  const actor = rosterActor(req);
  const batch = await findManagedClass(actor, param(req.params.id));
  if (!batch) {
    res.status(404).json({ error: 'Class not found' });
    return;
  }
  const enrollments = await prisma.classEnrollment.findMany({
    where: { classBatchId: batch.id },
    include: {
      studentUser: {
        select: {
          id: true,
          name: true,
          email: true,
          studentProfile: true,
          tutorSessions: { select: { lastMessageAt: true }, orderBy: { lastMessageAt: 'desc' }, take: 1 },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
  const ids = enrollments.map((e) => e.studentUserId);
  const openAlerts = ids.length
    ? await prisma.safetyAlert.groupBy({
        by: ['studentUserId'],
        where: { studentUserId: { in: ids }, status: 'open' },
        _count: { _all: true },
      })
    : [];
  const alertMap = new Map(openAlerts.map((row) => [row.studentUserId, row._count._all]));
  const invites = await prisma.accountInvite.findMany({
    where: { classBatchId: batch.id, status: 'pending' },
    orderBy: { createdAt: 'desc' },
  });
  res.json({
    invites: invites.map(serializeInvite),
    students: enrollments.map((e) => ({
      id: e.studentUser.id,
      name: e.studentUser.name,
      email: e.studentUser.email,
      joinedAt: e.createdAt.toISOString(),
      profile: serializeProfile(e.studentUser.studentProfile),
      lastSharadaAt: e.studentUser.tutorSessions[0]?.lastMessageAt.toISOString() ?? null,
      openAlerts: alertMap.get(e.studentUser.id) ?? 0,
    })),
  });
});

const profileBody = z.object({
  gradeLevel: z.string().trim().max(40).optional().nullable(),
  board: z.string().trim().max(40).optional().nullable(),
  preferredLanguage: z.string().trim().max(40).optional().nullable(),
  readingLevel: z.enum(['below_grade', 'at_grade', 'above_grade']).optional().nullable(),
  accommodations: z.array(z.string().trim().max(40)).max(12).optional(),
  learningPreferences: z.array(z.string().trim().max(40)).max(8).optional(),
  notes: z.string().max(2000).optional(),
});

const importRow = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  gradeLevel: z.string().trim().max(40).optional(),
  board: z.string().trim().max(40).optional(),
  preferredLanguage: z.string().trim().max(40).optional(),
});

router.post('/classes/:id/students/import', async (req: AuthRequest, res) => {
  try {
    const actor = rosterActor(req);
    const batch = await findManagedClass(actor, param(req.params.id));
    if (!batch) {
      res.status(404).json({ error: 'Class not found' });
      return;
    }
    const parsed = z
      .object({ rows: z.array(importRow).min(1).max(500) })
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const org = batch.organizationId
      ? await prisma.organization.findUnique({ where: { id: batch.organizationId } })
      : null;

    const emails = [...new Set(parsed.data.rows.map((r) => r.email.toLowerCase()))];
    const existing = await prisma.platformUser.findMany({
      where: { OR: emails.map((email) => ({ email: { equals: email, mode: 'insensitive' as const } })) },
    });
    const existingByEmail = new Map(existing.map((u) => [u.email.toLowerCase(), u]));
    const newEmails = emails.filter((e) => !existingByEmail.has(e));
    if (newEmails.length && !isMailConfigured()) {
      res.status(503).json({
        error: 'Email is not set up on the server, so invites cannot be sent. Students who already have an account can still be added.',
      });
      return;
    }
    if (org) {
      const memberCount = await prisma.platformUser.count({ where: { organizationId: org.id } });
      const pending = await pendingInviteEmails(org.id);
      const extra = newEmails.filter((e) => !pending.has(e)).length;
      const used = memberCount + pending.size;
      if (used + extra > org.maxLicenses) {
        res.status(400).json({
          error: `This import needs ${extra} new seat(s), but only ${Math.max(0, org.maxLicenses - used)} of ${org.maxLicenses} are free (pending invites hold a seat).`,
        });
        return;
      }
    }

    const invited: { name: string; email: string; inviteSent: boolean }[] = [];
    const enrolledExisting: { name: string; email: string }[] = [];
    const skipped: { email: string; reason: string }[] = [];
    const seen = new Set<string>();

    for (const row of parsed.data.rows) {
      const email = row.email.toLowerCase();
      if (seen.has(email)) continue;
      seen.add(email);
      const profileData = {
        ...(row.gradeLevel ? { gradeLevel: row.gradeLevel } : {}),
        ...(row.board ? { board: row.board } : {}),
        ...(row.preferredLanguage ? { preferredLanguage: row.preferredLanguage } : {}),
      };
      const prior = existingByEmail.get(email);
      try {
        if (!prior) {
          const { invite, token } = await upsertInvite({
            email,
            name: row.name,
            role: 'student',
            organizationId: batch.organizationId,
            classBatchId: batch.id,
            invitedByUserId: actor.userId,
            profile: profileData,
          });
          invited.push({ name: row.name, email, inviteSent: await emailInvite(invite, token) });
          continue;
        }
        if (prior.role !== 'student') {
          skipped.push({ email, reason: `Already registered as ${prior.role}` });
          continue;
        }
        if (!prior.organizationId && batch.organizationId) {
          await prisma.platformUser.update({ where: { id: prior.id }, data: { organizationId: batch.organizationId } });
        }
        await prisma.classEnrollment.upsert({
          where: { studentUserId_classBatchId: { studentUserId: prior.id, classBatchId: batch.id } },
          create: { studentUserId: prior.id, classBatchId: batch.id },
          update: {},
        });
        if (Object.keys(profileData).length) {
          await prisma.studentProfile.upsert({
            where: { studentUserId: prior.id },
            create: { studentUserId: prior.id, ...profileData },
            update: profileData,
          });
        }
        enrolledExisting.push({ name: prior.name ?? row.name, email });
      } catch (err) {
        console.error('Roster import row failed', email, err);
        skipped.push({ email, reason: 'Could not add this student' });
      }
    }

    await writeAudit(actor, 'class.import_students', 'ClassBatch', batch.id, {
      invited: invited.length,
      enrolledExisting: enrolledExisting.length,
      skipped: skipped.length,
    });
    res.status(201).json({ invited, enrolledExisting, skipped });
  } catch (err) {
    console.error('Roster import failed', err);
    res.status(500).json({ error: 'Import failed' });
  }
});

/** Invites the actor may manage: for a class they manage, or (admins) anywhere in their organization. */
async function findManagedInvite(actor: RosterActor, inviteId: string) {
  const invite = await prisma.accountInvite.findUnique({ where: { id: inviteId } });
  if (!invite || invite.status !== 'pending') return null;
  if (actor.isOrgAdmin && invite.organizationId === actor.organizationId) return invite;
  if (invite.classBatchId && (await findManagedClass(actor, invite.classBatchId))) return invite;
  return null;
}

router.post('/invites/:id/resend', async (req: AuthRequest, res) => {
  const actor = rosterActor(req);
  const existing = await findManagedInvite(actor, param(req.params.id));
  if (!existing) {
    res.status(404).json({ error: 'Invite not found' });
    return;
  }
  if (Date.now() - existing.lastSentAt.getTime() < INVITE_RESEND_COOLDOWN_MS) {
    res.status(429).json({ error: 'This invite was just sent. Please wait a minute before resending.' });
    return;
  }
  const { invite, token } = await refreshInviteToken(existing.id);
  const sent = await emailInvite(invite, token);
  if (!sent) {
    res.status(502).json({ error: 'The invite email could not be sent. Check the address or try again later.' });
    return;
  }
  await writeAudit(actor, 'invite.resend', 'AccountInvite', invite.id, { email: invite.email });
  res.json({ invite: serializeInvite(invite) });
});

router.delete('/invites/:id', async (req: AuthRequest, res) => {
  const actor = rosterActor(req);
  const invite = await findManagedInvite(actor, param(req.params.id));
  if (!invite) {
    res.status(404).json({ error: 'Invite not found' });
    return;
  }
  await prisma.accountInvite.update({ where: { id: invite.id }, data: { status: 'revoked' } });
  await writeAudit(actor, 'invite.revoke', 'AccountInvite', invite.id, { email: invite.email });
  res.json({ ok: true });
});

router.delete('/classes/:id/students/:studentId', async (req: AuthRequest, res) => {
  const actor = rosterActor(req);
  const batch = await findManagedClass(actor, param(req.params.id));
  if (!batch) {
    res.status(404).json({ error: 'Class not found' });
    return;
  }
  await prisma.classEnrollment.deleteMany({
    where: { classBatchId: batch.id, studentUserId: param(req.params.studentId) },
  });
  await writeAudit(actor, 'class.remove_student', 'PlatformUser', param(req.params.studentId), { classBatchId: batch.id });
  res.json({ ok: true });
});

router.get('/students/:id/profile', async (req: AuthRequest, res) => {
  const actor = rosterActor(req);
  if (!(await canSeeStudent(actor, param(req.params.id)))) {
    res.status(404).json({ error: 'Student not found' });
    return;
  }
  const student = await prisma.platformUser.findUnique({
    where: { id: param(req.params.id) },
    select: {
      id: true,
      name: true,
      email: true,
      studentProfile: true,
      enrollments: { select: { classBatch: { select: { id: true, name: true } } } },
    },
  });
  if (!student) {
    res.status(404).json({ error: 'Student not found' });
    return;
  }
  res.json({
    student: {
      id: student.id,
      name: student.name,
      email: student.email,
      classes: student.enrollments.map((e) => e.classBatch),
      profile: serializeProfile(student.studentProfile),
    },
  });
});

router.put('/students/:id/profile', async (req: AuthRequest, res) => {
  const actor = rosterActor(req);
  if (!(await canSeeStudent(actor, param(req.params.id)))) {
    res.status(404).json({ error: 'Student not found' });
    return;
  }
  const parsed = profileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const profile = await prisma.studentProfile.upsert({
    where: { studentUserId: param(req.params.id) },
    create: { studentUserId: param(req.params.id), ...parsed.data },
    update: parsed.data,
  });
  await writeAudit(actor, 'student.profile_update', 'PlatformUser', param(req.params.id), {
    fields: Object.keys(parsed.data),
  });
  res.json({ profile: serializeProfile(profile) });
});

router.get('/students', async (req: AuthRequest, res) => {
  const actor = rosterActor(req);
  const students = await prisma.platformUser.findMany({
    where: studentScope(actor),
    select: {
      id: true,
      name: true,
      email: true,
      enrollments: { select: { classBatch: { select: { id: true, name: true } } } },
    },
    orderBy: { name: 'asc' },
    take: 1000,
  });
  res.json({
    students: students.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      classes: s.enrollments.map((e) => e.classBatch),
    })),
  });
});

export default router;
