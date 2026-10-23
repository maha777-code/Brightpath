import { Router, type Request, type Response } from 'express';
import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import {
  AGE_GROUPS,
  LOCALES,
  DEFAULT_PLAN_FOR_ROLE,
  passwordMeetsPolicy,
  type AppRole,
  type PlanType,
} from '@brightpath/shared';
import { prisma } from '../lib/prisma.js';
import { signPasswordResetToken, signPlatformToken, verifyPasswordResetToken } from '../lib/jwt.js';
import { requireAuth, requireRoles, type AuthRequest } from '../middleware/auth.js';
import {
  computeAgeUpgrade,
  initialCurriculumFromDob,
  parseDobInput,
  toParentUser,
} from '../lib/ageCurriculum.js';
import { toTeacherUser } from '../lib/teacherSerializers.js';
import { isMailConfigured, sendPasswordResetEmail, sendVerificationCodeEmail } from '../lib/mailer.js';
import {
  DB_UNREACHABLE_MESSAGE,
  SCHEMA_OUTDATED_MESSAGE,
  isDatabaseUnreachable,
  isSchemaOutOfDate,
} from '../lib/dbErrors.js';
import {
  randomCode,
  toOrganization,
  toPlatformUser,
  uniqueInviteCode,
} from '../lib/platformSerializers.js';

const router = Router();

const localeSchema = z.enum(['en-IN', 'en-US', 'hi-IN', 'ar-AE', 'ar-KW']);
const ageGroupSchema = z.enum(AGE_GROUPS);
const appRoleSchema = z.enum(['org_admin', 'center_admin', 'teacher', 'parent', 'student']);
const planTypeSchema = z.enum([
  'free',
  'teacher_free',
  'teacher_pro',
  'tutor_center_pro',
  'school_enterprise',
  'family_plan',
  'parent_free',
  'student_free',
  'student_pro',
]);

const registerSchema = z
  .object({
    email: z.string().email(),
    password: z.string().refine(passwordMeetsPolicy, {
      message:
        'Password must include a letter, a capital letter, a number, a special character, and be at least 8 characters.',
    }),
    name: z.string().min(1).optional(),
    locale: localeSchema.optional(),
    role: appRoleSchema,
    dateOfBirth: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'dateOfBirth must be YYYY-MM-DD')
      .optional(),
    schoolName: z.string().optional(),
    subjectFocus: z.string().optional(),
    organizationName: z.string().min(2).optional(),
    orgType: z.enum(['school', 'tutor_center']).optional(),
    planType: planTypeSchema.optional(),
    classCode: z.string().min(4).max(12).optional(),
    parentCode: z.string().min(4).max(12).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'student' && !data.dateOfBirth) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'dateOfBirth is required for student signup',
        path: ['dateOfBirth'],
      });
    }
    if ((data.role === 'org_admin' || data.role === 'center_admin') && !data.organizationName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'organizationName is required',
        path: ['organizationName'],
      });
    }
  });

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const ageSettingsSchema = z
  .object({
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    ageGroup: ageGroupSchema.optional(),
  })
  .refine((d) => Boolean(d.dateOfBirth || d.ageGroup), {
    message: 'Provide dateOfBirth and/or ageGroup',
  });

async function emailTaken(email: string): Promise<string | null> {
  const match = { email: { equals: email, mode: 'insensitive' as const } };
  if (await prisma.platformUser.findFirst({ where: match })) return 'Email already registered';
  if (await prisma.teacher.findFirst({ where: match })) return 'Email already registered';
  if (await prisma.parent.findFirst({ where: match })) return 'Email already registered';
  return null;
}

type RegisterData = Omit<z.infer<typeof registerSchema>, 'password'>;
type PendingPayload = { data: RegisterData; passwordHash: string };

const CODE_TTL_MS = 15 * 60_000;
const RESEND_COOLDOWN_MS = 60_000;
const MAX_CODE_ATTEMPTS = 5;
const MAX_CODE_SENDS = 6;

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const newVerificationCode = () => randomInt(0, 1_000_000).toString().padStart(6, '0');
const hashVerificationCode = (email: string, code: string) =>
  createHash('sha256').update(`${email}:${code}`).digest('hex');

function codesMatch(expectedHash: string, email: string, code: string) {
  const a = Buffer.from(expectedHash, 'hex');
  const b = Buffer.from(hashVerificationCode(email, code), 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Step 1: validate the signup, hold it, and email a code. No account exists until the code is verified. */
async function startRegistration(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { password, ...rest } = parsed.data;
  const data: RegisterData = { ...rest, email: normalizeEmail(rest.email) };
  if (data.role === 'student') {
    try {
      parseDobInput(data.dateOfBirth!);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid dateOfBirth' });
      return;
    }
  }

  try {
    const taken = await emailTaken(data.email);
    if (taken) {
      res.status(409).json({ error: taken });
      return;
    }
    if (!isMailConfigured()) {
      res.status(503).json({ error: 'Email verification is not available right now, so new accounts cannot be created. Please try again later.' });
      return;
    }

    const existing = await prisma.pendingRegistration.findUnique({ where: { email: data.email } });
    if (existing && Date.now() - existing.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
      res.status(429).json({ error: 'A code was just sent to this email. Please wait a minute before asking for another.' });
      return;
    }

    const code = newVerificationCode();
    const payload: PendingPayload = { data, passwordHash: await bcrypt.hash(password, 12) };
    const fields = {
      payload: payload as unknown as Prisma.InputJsonValue,
      codeHash: hashVerificationCode(data.email, code),
      attempts: 0,
      sendCount: 1,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
      lastSentAt: new Date(),
    };
    await prisma.pendingRegistration.upsert({
      where: { email: data.email },
      create: { email: data.email, ...fields },
      update: fields,
    });

    try {
      await sendVerificationCodeEmail({ to: data.email, name: data.name, code });
    } catch (err) {
      console.error('Verification email failed:', err instanceof Error ? err.message : err);
      await prisma.pendingRegistration.deleteMany({ where: { email: data.email } });
      res.status(502).json({ error: 'We could not send a code to that email. Check the address and try again.' });
      return;
    }

    res.status(202).json({ verificationRequired: true, email: data.email, expiresInMinutes: CODE_TTL_MS / 60_000 });
  } catch (err) {
    console.error('Register start failed:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
}

router.post('/register/resend', async (req, res) => {
  const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const email = normalizeEmail(parsed.data.email);
  try {
    const pending = await prisma.pendingRegistration.findUnique({ where: { email } });
    if (!pending) {
      res.status(404).json({ error: 'No sign-up is waiting for this email. Please start again.' });
      return;
    }
    if (Date.now() - pending.lastSentAt.getTime() < RESEND_COOLDOWN_MS) {
      res.status(429).json({ error: 'Please wait a minute before asking for another code.' });
      return;
    }
    if (pending.sendCount >= MAX_CODE_SENDS) {
      res.status(429).json({ error: 'Too many codes were requested. Please start sign-up again later.' });
      return;
    }
    const code = newVerificationCode();
    await prisma.pendingRegistration.update({
      where: { email },
      data: {
        codeHash: hashVerificationCode(email, code),
        attempts: 0,
        sendCount: { increment: 1 },
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
        lastSentAt: new Date(),
      },
    });
    const payload = pending.payload as unknown as PendingPayload;
    await sendVerificationCodeEmail({ to: email, name: payload.data.name, code });
    res.json({ ok: true, expiresInMinutes: CODE_TTL_MS / 60_000 });
  } catch (err) {
    console.error('Register resend failed:', err);
    res.status(502).json({ error: 'We could not send a new code. Please try again.' });
  }
});

/** Step 2: the emailed code proves the address, so the account is created now. */
router.post('/register/verify', async (req, res) => {
  const parsed = z
    .object({ email: z.string().email(), code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code from the email.') })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const email = normalizeEmail(parsed.data.email);
  try {
    const pending = await prisma.pendingRegistration.findUnique({ where: { email } });
    if (!pending) {
      res.status(404).json({ error: 'No sign-up is waiting for this email. Please start again.' });
      return;
    }
    if (pending.expiresAt.getTime() < Date.now()) {
      res.status(410).json({ error: 'This code has expired. Ask for a new code.' });
      return;
    }
    if (pending.attempts >= MAX_CODE_ATTEMPTS) {
      res.status(429).json({ error: 'Too many incorrect codes. Ask for a new code.' });
      return;
    }
    if (!codesMatch(pending.codeHash, email, parsed.data.code)) {
      const updated = await prisma.pendingRegistration.update({
        where: { email },
        data: { attempts: { increment: 1 } },
      });
      const left = MAX_CODE_ATTEMPTS - updated.attempts;
      res.status(400).json({
        error: left > 0 ? `That code is not right. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Too many incorrect codes. Ask for a new code.',
      });
      return;
    }

    const taken = await emailTaken(email);
    if (taken) {
      await prisma.pendingRegistration.deleteMany({ where: { email } });
      res.status(409).json({ error: taken });
      return;
    }
    const payload = pending.payload as unknown as PendingPayload;
    const { id: _id, ...restore } = pending;
    await prisma.pendingRegistration.delete({ where: { email } });
    const created = await createRegisteredAccount({ ...payload.data, email }, payload.passwordHash, res);
    if (!created) {
      await prisma.pendingRegistration
        .create({ data: { ...restore, payload: restore.payload as Prisma.InputJsonValue } })
        .catch(() => undefined);
    }
  } catch (err) {
    console.error('Register verify failed:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/** Writes the signup response and returns whether the account was created. */
async function createRegisteredAccount(data: RegisterData, passwordHash: string, res: Response): Promise<boolean> {
  const role = data.role as AppRole;
  let planType = (data.planType ?? DEFAULT_PLAN_FOR_ROLE[role]) as PlanType;

  try {
    if (role === 'org_admin' || role === 'center_admin') {
      planType =
        data.planType ??
        (role === 'org_admin' ? 'school_enterprise' : 'tutor_center_pro');
      const orgType = data.orgType ?? (role === 'org_admin' ? 'school' : 'tutor_center');

      const user = await prisma.platformUser.create({
        data: {
          email: data.email,
          passwordHash,
          name: data.name ?? null,
          role,
          planType,
          subscriptionStatus: 'inactive',
        },
      });

      // Schools and academies get no tool access until their first payment activates the plan.
      const org = await prisma.organization.create({
        data: {
          name: data.organizationName!,
          type: orgType,
          planType,
          maxLicenses: role === 'org_admin' ? 200 : 50,
          adminUserId: user.id,
          subscriptionStatus: 'inactive',
        },
      });

      const updated = await prisma.platformUser.update({
        where: { id: user.id },
        data: { organizationId: org.id },
      });

      res.status(201).json({
        token: signPlatformToken({
          id: updated.id,
          email: updated.email,
          role,
          planType,
          organizationId: org.id,
        }),
        role,
        planType,
        organizationId: org.id,
        user: toPlatformUser(updated),
        organization: toOrganization(org),
      });
      return true;
    }

    if (role === 'teacher') {
      planType = (data.planType ?? 'teacher_free') as PlanType;
      const teacher = await prisma.teacher.create({
        data: {
          email: data.email,
          passwordHash,
          name: data.name ?? null,
          schoolName: data.schoolName ?? null,
          subjectFocus: data.subjectFocus ?? 'Science',
          planType,
        },
      });
      const user = await prisma.platformUser.create({
        data: {
          email: data.email,
          passwordHash,
          name: data.name ?? null,
          role: 'teacher',
          planType,
          teacherId: teacher.id,
        },
      });
      const teacherPublic = toTeacherUser(teacher);
      res.status(201).json({
        token: signPlatformToken({
          id: user.id,
          email: user.email,
          role: 'teacher',
          planType,
          teacherId: teacher.id,
        }),
        role: 'teacher' as const,
        planType,
        user: toPlatformUser(user),
        teacher: teacherPublic,
      });
      return true;
    }

    if (role === 'parent') {
      planType = (data.planType ?? 'parent_free') as PlanType;
      const parentProfile = await prisma.parent.create({
        data: {
          email: data.email,
          passwordHash,
          name: data.name ?? null,
          locale: data.locale ?? 'en-IN',
        },
      });
      const linkCode = await uniqueInviteCode(async (c) =>
        Boolean(await prisma.platformUser.findUnique({ where: { parentLinkCode: c } })),
      );
      const user = await prisma.platformUser.create({
        data: {
          email: data.email,
          passwordHash,
          name: data.name ?? null,
          role: 'parent',
          planType,
          parentProfileId: parentProfile.id,
          parentLinkCode: linkCode,
        },
      });
      res.status(201).json({
        token: signPlatformToken({
          id: user.id,
          email: user.email,
          role: 'parent',
          planType,
          parentProfileId: parentProfile.id,
        }),
        role: 'parent' as const,
        planType,
        user: toPlatformUser(user),
        parent: toParentUser(parentProfile),
      });
      return true;
    }

    // student
    planType = (data.planType ?? 'student_free') as PlanType;
    let dob: Date;
    try {
      dob = parseDobInput(data.dateOfBirth!);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid dateOfBirth' });
      return false;
    }
    const curriculum = initialCurriculumFromDob(dob);
    const parentProfile = await prisma.parent.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name ?? null,
        locale: data.locale ?? 'en-IN',
        dateOfBirth: dob,
        calculatedAgeGroup: curriculum.calculatedAgeGroup,
        unlockedSubjects: curriculum.unlockedSubjects,
      },
    });
    const user = await prisma.platformUser.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name ?? null,
        role: 'student',
        planType,
        parentProfileId: parentProfile.id,
      },
    });

    if (data.parentCode) {
      const parentUser = await prisma.platformUser.findFirst({
        where: { parentLinkCode: data.parentCode.toUpperCase(), role: 'parent' },
      });
      if (parentUser) {
        await prisma.studentParentLink.create({
          data: { parentUserId: parentUser.id, studentUserId: user.id },
        });
      }
    }

    if (data.classCode) {
      const batch = await prisma.classBatch.findUnique({
        where: { inviteCode: data.classCode.toUpperCase() },
      });
      if (batch) {
        await prisma.classEnrollment.create({
          data: { studentUserId: user.id, classBatchId: batch.id },
        });
      }
    }

    res.status(201).json({
      token: signPlatformToken({
        id: user.id,
        email: user.email,
        role: 'student',
        planType,
        parentProfileId: parentProfile.id,
      }),
      role: 'student' as const,
      planType,
      user: toPlatformUser(user),
      parent: toParentUser(parentProfile),
      curriculum: {
        upgraded: false,
        previousGroup: null,
        newGroup: curriculum.calculatedAgeGroup,
        unlockedSubjects: curriculum.unlockedSubjects,
        currentAge: curriculum.age,
      },
    });
    return true;
  } catch (err) {
    console.error('Register failed:', err);
    res.status(500).json({ error: 'Registration failed' });
    return false;
  }
}

router.post('/register', startRegistration);
router.post('/signup', startRegistration);

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, password } = parsed.data;

  try {
    let platform =
      (await prisma.platformUser.findUnique({ where: { email } })) ??
      (await prisma.platformUser.findUnique({ where: { email: normalizeEmail(email) } }));

    // Auto-heal: if legacy Teacher/Parent exists but PlatformUser missing, migrate once
    if (!platform) {
      try {
        const { migrateLegacyUsers } = await import('../scripts/migrateLegacyUsers.js');
        await migrateLegacyUsers();
        platform = await prisma.platformUser.findUnique({ where: { email } });
      } catch (migErr) {
        console.error('On-demand legacy migration failed:', migErr);
      }
    }

    if (!platform || !(await bcrypt.compare(password, platform.passwordHash))) {
      console.warn('Login rejected', normalizeEmail(email));
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const userRole = (platform.role || 'teacher') as AppRole;
    const planType = (platform.planType || 'free') as PlanType;

    let organization = null;
    if (platform.organizationId) {
      organization = await prisma.organization.findUnique({ where: { id: platform.organizationId } });
    }
    let teacher = null;
    if (platform.teacherId) {
      teacher = await prisma.teacher.findUnique({ where: { id: platform.teacherId } });
    }
    let parent = null;
    if (platform.parentProfileId) {
      parent = await prisma.parent.findUnique({ where: { id: platform.parentProfileId } });
    }

    res.json({
      token: signPlatformToken({
        id: platform.id,
        email: platform.email,
        role: userRole,
        planType,
        organizationId: platform.organizationId,
        teacherId: platform.teacherId,
        parentProfileId: platform.parentProfileId,
      }),
      role: userRole,
      planType,
      organizationId: platform.organizationId,
      user: toPlatformUser({ ...platform, role: userRole, planType }),
      organization: organization ? toOrganization(organization) : null,
      teacher: teacher ? toTeacherUser(teacher) : undefined,
      parent: parent ? toParentUser(parent) : undefined,
      subscriptionStatus: platform.subscriptionStatus ?? 'active',
    });
  } catch (err) {
    console.error('POST /auth/login failed:', err);
    if (isDatabaseUnreachable(err)) {
      res.status(503).json({ error: DB_UNREACHABLE_MESSAGE });
      return;
    }
    if (isSchemaOutOfDate(err)) {
      res.status(503).json({ error: SCHEMA_OUTDATED_MESSAGE });
      return;
    }
    res.status(500).json({ error: 'Login failed. Check API logs for details.' });
  }
});

const RESET_TTL_MINUTES = 30;
const lastResetSentAt = new Map<string, number>();
const RESET_SENT_MESSAGE =
  'If an account exists for that email, we have sent a link to reset your password. Check your inbox and spam folder.';

const appUrl = () => (process.env.APP_URL ?? 'http://localhost:5173').replace(/\/+$/, '');

async function currentPasswordHash(userId: string) {
  const user = await prisma.platformUser.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  return user?.passwordHash ?? null;
}

/** Always answers the same way so the form cannot be used to discover which emails have accounts. */
router.post('/password/forgot', async (req, res) => {
  const parsed = z.object({ email: z.string().trim().email() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Enter a valid email address.' });
    return;
  }
  const email = normalizeEmail(parsed.data.email);
  if (!isMailConfigured()) {
    res.status(503).json({ error: 'Password reset email is not available right now. Please contact customersupport@mindvault.academy.' });
    return;
  }

  const last = lastResetSentAt.get(email) ?? 0;
  if (Date.now() - last < RESEND_COOLDOWN_MS) {
    res.json({ ok: true, message: RESET_SENT_MESSAGE });
    return;
  }
  if (lastResetSentAt.size > 5000) {
    for (const [key, at] of lastResetSentAt) if (Date.now() - at >= RESEND_COOLDOWN_MS) lastResetSentAt.delete(key);
  }
  lastResetSentAt.set(email, Date.now());

  try {
    const user = await prisma.platformUser.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
    if (user) {
      const token = signPasswordResetToken(user, RESET_TTL_MINUTES);
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        link: `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`,
        expiresInMinutes: RESET_TTL_MINUTES,
      });
    }
  } catch (err) {
    console.error('Password reset email failed:', err instanceof Error ? err.message : err);
  }
  res.json({ ok: true, message: RESET_SENT_MESSAGE });
});

const resetTokenSchema = z.string().min(20).max(2000);

router.post('/password/reset/check', async (req, res) => {
  const parsed = z.object({ token: resetTokenSchema }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'This reset link is not valid. Ask for a new one.' });
    return;
  }
  const result = await verifyPasswordResetToken(parsed.data.token, currentPasswordHash);
  if (!result.ok) {
    res.status(410).json({
      error: result.expired
        ? 'This reset link has expired. Ask for a new one.'
        : 'This reset link has already been used or is not valid. Ask for a new one.',
    });
    return;
  }
  const user = await prisma.platformUser.findUnique({ where: { id: result.userId }, select: { email: true } });
  res.json({ ok: true, email: user?.email ?? null });
});

router.post('/password/reset', async (req, res) => {
  const parsed = z
    .object({
      token: resetTokenSchema,
      password: z.string().refine(passwordMeetsPolicy, {
        message:
          'Password must include a letter, a capital letter, a number, a special character, and be at least 8 characters.',
      }),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  try {
    const result = await verifyPasswordResetToken(parsed.data.token, currentPasswordHash);
    if (!result.ok) {
      res.status(410).json({
        error: result.expired
          ? 'This reset link has expired. Ask for a new one.'
          : 'This reset link has already been used or is not valid. Ask for a new one.',
      });
      return;
    }
    const user = await prisma.platformUser.findUniqueOrThrow({ where: { id: result.userId } });
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    await prisma.$transaction([
      prisma.platformUser.update({ where: { id: user.id }, data: { passwordHash } }),
      ...(user.teacherId ? [prisma.teacher.update({ where: { id: user.teacherId }, data: { passwordHash } })] : []),
      ...(user.parentProfileId
        ? [prisma.parent.update({ where: { id: user.parentProfileId }, data: { passwordHash } })]
        : []),
    ]);
    lastResetSentAt.delete(normalizeEmail(user.email));
    res.json({ ok: true, email: user.email });
  } catch (err) {
    console.error('Password reset failed:', err);
    res.status(500).json({ error: 'Could not reset your password. Please try again.' });
  }
});

router.post('/teacher/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, password } = parsed.data;
  try {
    let platform = await prisma.platformUser.findFirst({
      where: { email, role: 'teacher' },
    });
    if (!platform) {
      const { migrateLegacyUsers } = await import('../scripts/migrateLegacyUsers.js');
      await migrateLegacyUsers();
      platform = await prisma.platformUser.findFirst({ where: { email, role: 'teacher' } });
    }
    if (!platform || !(await bcrypt.compare(password, platform.passwordHash))) {
      console.warn('Teacher login rejected', normalizeEmail(email));
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }
    const teacher = platform.teacherId
      ? await prisma.teacher.findUnique({ where: { id: platform.teacherId } })
      : null;
    if (!teacher) {
      res.status(401).json({ error: 'Teacher profile missing — re-run migrateLegacyUsers' });
      return;
    }
    res.json({
      token: signPlatformToken({
        id: platform.id,
        email: platform.email,
        role: 'teacher',
        planType: (platform.planType || 'teacher_pro') as PlanType,
        teacherId: teacher.id,
        organizationId: platform.organizationId,
      }),
      teacher: toTeacherUser(teacher),
      role: 'teacher' as const,
      planType: platform.planType || 'teacher_pro',
      user: toPlatformUser(platform),
      subscriptionStatus: platform.subscriptionStatus ?? 'active',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Teacher login failed:', message, err);
    if (isDatabaseUnreachable(err)) {
      res.status(503).json({ error: DB_UNREACHABLE_MESSAGE });
      return;
    }
    if (isSchemaOutOfDate(err)) {
      res.status(503).json({
        error:
          'Teacher database tables are missing. From apps/api run: npm run db:setup — then restart the API.',
      });
      return;
    }
    res.status(500).json({ error: 'Teacher login failed. Check API logs and that the database is running.' });
  }
});

router.post('/teacher/register', async (req, res) => {
  req.body = { ...req.body, role: 'teacher' };
  return startRegistration(req, res);
});

router.get('/teacher/me', requireRoles('teacher'), async (req: AuthRequest, res) => {
  const teacherId = req.teacherId;
  if (!teacherId) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json({
    teacher: toTeacherUser(teacher),
    role: 'teacher' as const,
    planType: teacher.planType,
    user: req.platformUserId
      ? toPlatformUser(await prisma.platformUser.findUniqueOrThrow({ where: { id: req.platformUserId } }))
      : undefined,
  });
});

router.get('/me', requireAuth, async (req: AuthRequest, res) => {
  if (req.platformUserId) {
    const user = await prisma.platformUser.findUnique({ where: { id: req.platformUserId } });
    if (!user) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    const organization = user.organizationId
      ? await prisma.organization.findUnique({ where: { id: user.organizationId } })
      : null;
    const teacher = user.teacherId
      ? await prisma.teacher.findUnique({ where: { id: user.teacherId } })
      : null;
    const parent = user.parentProfileId
      ? await prisma.parent.findUnique({ where: { id: user.parentProfileId } })
      : null;
    res.json({
      role: user.role,
      planType: user.planType,
      organizationId: user.organizationId,
      user: toPlatformUser(user),
      organization: organization ? toOrganization(organization) : null,
      teacher: teacher ? toTeacherUser(teacher) : undefined,
      parent: parent ? toParentUser(parent) : undefined,
    });
    return;
  }

  if (req.auth?.role === 'teacher' || req.teacherId) {
    const teacher = await prisma.teacher.findUnique({ where: { id: req.teacherId! } });
    if (!teacher) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json({ teacher: toTeacherUser(teacher), role: 'teacher' as const, planType: teacher.planType });
    return;
  }

  const parent = await prisma.parent.findUnique({ where: { id: req.parentId! } });
  if (!parent) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  if (parent.dateOfBirth) {
    const result = computeAgeUpgrade({
      dateOfBirth: parent.dateOfBirth,
      calculatedAgeGroup: parent.calculatedAgeGroup,
      unlockedSubjects: parent.unlockedSubjects,
    });
    if (
      result.calculatedAgeGroup !== parent.calculatedAgeGroup ||
      result.unlockedSubjects.some((s) => !parent.unlockedSubjects.includes(s))
    ) {
      const updated = await prisma.parent.update({
        where: { id: parent.id },
        data: {
          calculatedAgeGroup: result.calculatedAgeGroup,
          unlockedSubjects: result.unlockedSubjects,
        },
      });
      res.json({
        parent: toParentUser(updated),
        role: req.auth?.role === 'parent' ? 'parent' : 'student',
        curriculum: result.event,
      });
      return;
    }
  }

  res.json({
    parent: toParentUser(parent),
    role: req.auth?.role === 'parent' ? 'parent' : 'student',
  });
});

router.patch('/age-settings', requireAuth, async (req: AuthRequest, res) => {
  const parsed = ageSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  if (!req.parentId) {
    res.status(403).json({ error: 'Learner profile required' });
    return;
  }

  const parent = await prisma.parent.findUnique({ where: { id: req.parentId } });
  if (!parent) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  let dob: Date | undefined;
  try {
    if (parsed.data.dateOfBirth) dob = parseDobInput(parsed.data.dateOfBirth);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid dateOfBirth' });
    return;
  }

  try {
    const result = computeAgeUpgrade(
      {
        dateOfBirth: parent.dateOfBirth,
        calculatedAgeGroup: parent.calculatedAgeGroup,
        unlockedSubjects: parent.unlockedSubjects,
      },
      { dateOfBirth: dob, forceGroup: parsed.data.ageGroup },
    );

    const updated = await prisma.parent.update({
      where: { id: parent.id },
      data: {
        dateOfBirth: result.dateOfBirth,
        calculatedAgeGroup: result.calculatedAgeGroup,
        unlockedSubjects: result.unlockedSubjects,
      },
    });

    res.json({
      parent: toParentUser(updated),
      curriculum: {
        ...result.event,
        upgraded: true,
        message:
          result.event.message ??
          `Curriculum refreshed for ${result.event.newGroup.replace(/_/g, ' ')}.`,
      },
    });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Update failed' });
  }
});

router.get('/locales', (_req, res) => {
  res.json({ locales: LOCALES });
});

/** Parent link code */
router.get('/parent/link-code', requireRoles('parent'), async (req: AuthRequest, res) => {
  if (!req.platformUserId) {
    res.status(400).json({ error: 'Platform parent account required' });
    return;
  }
  const user = await prisma.platformUser.findUnique({ where: { id: req.platformUserId } });
  if (!user) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  let code = user.parentLinkCode;
  if (!code) {
    code = await uniqueInviteCode(async (c) =>
      Boolean(await prisma.platformUser.findUnique({ where: { parentLinkCode: c } })),
    );
    await prisma.platformUser.update({
      where: { id: user.id },
      data: { parentLinkCode: code },
    });
  }
  res.json({ parentLinkCode: code });
});

router.post('/parent/link-code/rotate', requireRoles('parent'), async (req: AuthRequest, res) => {
  if (!req.platformUserId) {
    res.status(400).json({ error: 'Platform parent account required' });
    return;
  }
  const code = await uniqueInviteCode(async (c) =>
    Boolean(await prisma.platformUser.findUnique({ where: { parentLinkCode: c } })),
  );
  const user = await prisma.platformUser.update({
    where: { id: req.platformUserId },
    data: { parentLinkCode: code },
  });
  res.json({ parentLinkCode: user.parentLinkCode });
});

router.get('/parent/linked-students', requireRoles('parent'), async (req: AuthRequest, res) => {
  if (!req.platformUserId) {
    res.json({ students: [] });
    return;
  }
  const links = await prisma.studentParentLink.findMany({
    where: { parentUserId: req.platformUserId },
    include: { studentUser: true },
  });
  res.json({
    students: links.map((l) => ({
      id: l.studentUser.id,
      email: l.studentUser.email,
      name: l.studentUser.name,
      planType: l.studentUser.planType,
    })),
  });
});

router.post('/student/join-class', requireRoles('student'), async (req: AuthRequest, res) => {
  const schema = z.object({ classCode: z.string().min(4).max(12) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  if (!req.platformUserId) {
    res.status(400).json({ error: 'Platform student account required' });
    return;
  }
  const batch = await prisma.classBatch.findUnique({
    where: { inviteCode: parsed.data.classCode.toUpperCase() },
  });
  if (!batch) {
    res.status(404).json({ error: 'Invalid class code' });
    return;
  }
  await prisma.classEnrollment.upsert({
    where: {
      studentUserId_classBatchId: {
        studentUserId: req.platformUserId,
        classBatchId: batch.id,
      },
    },
    create: { studentUserId: req.platformUserId, classBatchId: batch.id },
    update: {},
  });
  res.json({ ok: true, classBatch: { id: batch.id, name: batch.name, inviteCode: batch.inviteCode } });
});

type AcademyTutor = { id: string; name: string | null; email: string; subjectFocus: string | null };
type AcademyTextbook = {
  subject: string;
  teacher: { name: string | null; email: string };
  chapters: {
    classProgressPct: number;
    subtopics: { hasGamifiedActivity: boolean; activities: { id: string }[] }[];
  }[];
};
type AcademyWorksheet = { teacherId: string; title: string; topicOrText: string };

function personName(person: { name: string | null; email: string }): string {
  return person.name?.trim() || person.email;
}

function buildAcademySubjects(
  tutors: AcademyTutor[],
  textbooks: AcademyTextbook[],
  worksheets: AcademyWorksheet[],
) {
  const rows = new Map<
    string,
    { instructors: Set<string>; progress: number[]; quizzes: number; assignments: number }
  >();
  const bucket = (name: string) => {
    const key = name.trim() || 'General';
    let row = rows.get(key);
    if (!row) {
      row = { instructors: new Set(), progress: [], quizzes: 0, assignments: 0 };
      rows.set(key, row);
    }
    return row;
  };

  for (const book of textbooks) {
    const row = bucket(book.subject || 'General');
    row.instructors.add(personName(book.teacher));
    if (book.chapters.length === 0) row.progress.push(0);
    else {
      const total = book.chapters.reduce((sum, chapter) => sum + chapter.classProgressPct, 0);
      row.progress.push(Math.round(total / book.chapters.length));
    }
    for (const chapter of book.chapters) {
      for (const subtopic of chapter.subtopics) {
        if (subtopic.activities.length > 0) row.quizzes += subtopic.activities.length;
        else if (subtopic.hasGamifiedActivity) row.quizzes += 1;
      }
    }
  }

  for (const tutor of tutors) {
    const focus = tutor.subjectFocus?.trim();
    if (focus) bucket(focus).instructors.add(personName(tutor));
  }

  for (const sheet of worksheets) {
    const hay = `${sheet.title} ${sheet.topicOrText}`.toLowerCase();
    const match = [...rows.keys()].find((subject) => subject !== 'General' && hay.includes(subject.toLowerCase()));
    if (match) {
      rows.get(match)!.assignments += 1;
      continue;
    }
    const tutor = tutors.find((item) => item.id === sheet.teacherId);
    bucket(tutor?.subjectFocus?.trim() || 'General').assignments += 1;
  }

  return [...rows.entries()]
    .map(([subject, row]) => ({
      subject,
      instructor: [...row.instructors].join(', ') || 'Unassigned',
      syllabusProgress: row.progress.length
        ? Math.round(row.progress.reduce((sum, value) => sum + value, 0) / row.progress.length)
        : 0,
      quizzesConducted: row.quizzes,
      assignmentsGiven: row.assignments,
      nextTestDate: null as string | null,
    }))
    .sort((a, b) => b.syllabusProgress - a.syllabusProgress || a.subject.localeCompare(b.subject));
}

router.get('/org/me', requireRoles('org_admin', 'center_admin'), async (req: AuthRequest, res) => {
  try {
  if (!req.organizationId) {
    res.status(404).json({ error: 'No organization linked' });
    return;
  }
  const org = await prisma.organization.findUnique({ where: { id: req.organizationId } });
  if (!org) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const orgScope = {
    OR: [
      { organizationId: org.id },
      { classBatches: { some: { organizationId: org.id } } },
      { platformUsers: { some: { organizationId: org.id, role: 'teacher' as const } } },
    ],
  };
  const [memberCount, batchCount, staffCount, tutors, textbooks, worksheets] = await Promise.all([
    prisma.platformUser.count({ where: { organizationId: org.id } }),
    prisma.classBatch.count({ where: { organizationId: org.id } }),
    prisma.platformUser.count({
      where: { organizationId: org.id, role: { in: ['teacher', 'center_admin', 'org_admin'] } },
    }),
    prisma.teacher.findMany({
      where: orgScope,
      select: { id: true, name: true, email: true, subjectFocus: true },
    }),
    prisma.textbook.findMany({
      where: {
        OR: [{ organizationId: org.id }, { teacher: { organizationId: org.id } }],
      },
      select: {
        subject: true,
        teacher: { select: { name: true, email: true } },
        chapters: {
          select: {
            classProgressPct: true,
            subtopics: {
              select: {
                hasGamifiedActivity: true,
                activities: { select: { id: true } },
              },
            },
          },
        },
      },
    }),
    prisma.$queryRaw<AcademyWorksheet[]>`
      SELECT w."teacherId", w."title", w."topicOrText"
      FROM "TeacherWorksheetHistory" w
      WHERE w."teacherId" IN (
        SELECT t."id" FROM "Teacher" t
        WHERE t."organizationId" = ${org.id}
           OR EXISTS (
             SELECT 1 FROM "ClassBatch" b
             WHERE b."teacherId" = t."id" AND b."organizationId" = ${org.id}
           )
           OR EXISTS (
             SELECT 1 FROM "PlatformUser" p
             WHERE p."teacherId" = t."id"
               AND p."organizationId" = ${org.id}
               AND p."role" = 'teacher'
           )
      )
    `,
  ]);

  const subjects = buildAcademySubjects(tutors, textbooks, worksheets);
  res.json({
    organization: toOrganization(org),
    stats: {
      memberCount,
      tutorCount: Math.max(staffCount, tutors.length),
      batchCount,
      seatsUsed: memberCount,
      maxLicenses: org.maxLicenses,
      subjects,
    },
  });
  } catch (err) {
    console.error('GET /auth/org/me failed', err);
    res.status(500).json({ error: 'Could not load academy stats' });
  }
});

router.post('/teacher/batches', requireRoles('teacher'), async (req: AuthRequest, res) => {
  const schema = z.object({ name: z.string().min(2) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  if (!req.teacherId) {
    res.status(403).json({ error: 'Teacher profile required' });
    return;
  }
  const inviteCode = await uniqueInviteCode(async (c) =>
    Boolean(await prisma.classBatch.findUnique({ where: { inviteCode: c } })),
  );
  const batch = await prisma.classBatch.create({
    data: {
      name: parsed.data.name,
      teacherId: req.teacherId,
      organizationId: req.organizationId ?? null,
      inviteCode,
    },
  });
  res.status(201).json({
    classBatch: {
      id: batch.id,
      name: batch.name,
      inviteCode: batch.inviteCode,
      teacherId: batch.teacherId,
      organizationId: batch.organizationId,
    },
  });
});

// silence unused import if tree-shaken oddly
void randomCode;

export default router;
