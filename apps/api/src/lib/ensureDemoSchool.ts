import bcrypt from 'bcryptjs';
import { prisma } from './prisma.js';

/** Local-only school and tutor-center admins for Classroom. Production skips this. */
export async function ensureDemoSchool() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_TEACHER !== 'true') return;
  try {
    await upsertOrgAdmin({
      email: 'school@brightpath.ai',
      password: 'school123',
      name: 'School Admin',
      role: 'org_admin',
      planType: 'school_enterprise',
      orgName: 'Brightpath School',
      orgType: 'school',
    });
    await upsertOrgAdmin({
      email: 'center@brightpath.ai',
      password: 'center123',
      name: 'Center Admin',
      role: 'center_admin',
      planType: 'tutor_center_pro',
      orgName: 'Brightpath Tutor Center',
      orgType: 'tutor_center',
    });
    console.log('Demo school and tutor-center admins ready for local Classroom');
  } catch (err) {
    console.warn('Could not ensure demo school/center admins:', err instanceof Error ? err.message : err);
  }
}

async function upsertOrgAdmin(input: {
  email: string;
  password: string;
  name: string;
  role: 'org_admin' | 'center_admin';
  planType: 'school_enterprise' | 'tutor_center_pro';
  orgName: string;
  orgType: 'school' | 'tutor_center';
}) {
  const passwordHash = await bcrypt.hash(input.password, 10);
  const existing = await prisma.platformUser.findUnique({ where: { email: input.email } });
  if (existing) {
    await prisma.platformUser.update({
      where: { id: existing.id },
      data: { passwordHash, role: input.role, planType: input.planType, subscriptionStatus: 'active' },
    });
    if (existing.organizationId) {
      await prisma.organization.update({
        where: { id: existing.organizationId },
        data: { planType: input.planType, subscriptionStatus: 'active' },
      });
    }
    return;
  }
  const user = await prisma.platformUser.create({
    data: {
      email: input.email,
      passwordHash,
      name: input.name,
      role: input.role,
      planType: input.planType,
      subscriptionStatus: 'active',
    },
  });
  const org = await prisma.organization.create({
    data: {
      name: input.orgName,
      type: input.orgType,
      planType: input.planType,
      maxLicenses: input.role === 'org_admin' ? 200 : 50,
      adminUserId: user.id,
      subscriptionStatus: 'active',
    },
  });
  await prisma.platformUser.update({
    where: { id: user.id },
    data: { organizationId: org.id },
  });
}
