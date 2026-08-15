import { Router, type Request, type Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import {
  AGE_GROUPS,
  LOCALES,
  DEFAULT_PLAN_FOR_ROLE,
  type AppRole,
  type PlanType,
} from '@brightpath/shared';
import { prisma } from '../lib/prisma.js';
import { signPlatformToken } from '../lib/jwt.js';
import { requireAuth, requireRoles, type AuthRequest } from '../middleware/auth.js';
import {
  computeAgeUpgrade,
  initialCurriculumFromDob,
  parseDobInput,
  toParentUser,
} from '../lib/ageCurriculum.js';
import { toTeacherUser } from '../lib/teacherSerializers.js';
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
    password: z.string().min(8),
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
  if (await prisma.platformUser.findUnique({ where: { email } })) return 'Email already registered';
  if (await prisma.teacher.findUnique({ where: { email } })) return 'Email already registered';
  if (await prisma.parent.findUnique({ where: { email } })) return 'Email already registered';
  return null;
}

async function registerUnified(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const data = parsed.data;
  const taken = await emailTaken(data.email);
  if (taken) {
    res.status(409).json({ error: taken });
    return;
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
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
        },
      });

      const org = await prisma.organization.create({
        data: {
          name: data.organizationName!,
          type: orgType,
          planType,
          maxLicenses: role === 'org_admin' ? 200 : 50,
          adminUserId: user.id,
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
      return;
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
      return;
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
      return;
    }

    // student
    planType = (data.planType ?? 'student_free') as PlanType;
    let dob: Date;
    try {
      dob = parseDobInput(data.dateOfBirth!);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid dateOfBirth' });
      return;
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
  } catch (err) {
    console.error('Register failed:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
}

router.post('/register', registerUnified);
router.post('/signup', registerUnified);

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, password } = parsed.data;

  try {
    let platform = await prisma.platformUser.findUnique({ where: { email } });

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
    const message = err instanceof Error ? err.message : String(err);
    if (/does not exist|P2021|Unknown column|planType|PlatformUser/i.test(message)) {
      res.status(503).json({
        error:
          'Database schema is out of date. From apps/api run: npx prisma db push && npx tsx src/scripts/seedTeacher.ts && npx tsx src/scripts/migrateLegacyUsers.ts — then restart the API.',
      });
      return;
    }
    res.status(500).json({ error: 'Login failed. Check API logs for details.' });
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
    if (/does not exist|P2021|Teacher|PlatformUser/i.test(message)) {
      res.status(503).json({
        error:
          'Teacher database tables are missing. From apps/api run: npx prisma db push && npx tsx src/scripts/seedTeacher.ts && npx tsx src/scripts/migrateLegacyUsers.ts — then restart the API.',
      });
      return;
    }
    res.status(500).json({ error: 'Teacher login failed. Check API logs and that the database is running.' });
  }
});

router.post('/teacher/register', async (req, res) => {
  req.body = { ...req.body, role: 'teacher' };
  return registerUnified(req, res);
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

router.get('/org/me', requireRoles('org_admin', 'center_admin'), async (req: AuthRequest, res) => {
  if (!req.organizationId) {
    res.status(404).json({ error: 'No organization linked' });
    return;
  }
  const org = await prisma.organization.findUnique({ where: { id: req.organizationId } });
  if (!org) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  const memberCount = await prisma.platformUser.count({ where: { organizationId: org.id } });
  const batchCount = await prisma.classBatch.count({ where: { organizationId: org.id } });
  res.json({
    organization: toOrganization(org),
    stats: { memberCount, batchCount, maxLicenses: org.maxLicenses },
  });
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
