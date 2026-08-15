/**
 * Migrate legacy Parent + Teacher rows into PlatformUser.
 * Run: npx tsx src/scripts/migrateLegacyUsers.ts
 * Also invoked automatically on API startup.
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from '../lib/prisma.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export async function migrateLegacyUsers(): Promise<{
  teachers: number;
  parents: number;
  students: number;
}> {
  let teachers = 0;
  let parents = 0;
  let students = 0;

  const teacherRows = await prisma.teacher.findMany();
  for (const t of teacherRows) {
    const existing = await prisma.platformUser.findUnique({ where: { email: t.email } });
    if (existing) {
      if (!existing.teacherId) {
        await prisma.platformUser.update({
          where: { id: existing.id },
          data: {
            teacherId: t.id,
            role: existing.role === 'teacher' ? existing.role : 'teacher',
            planType: existing.planType === 'free' ? t.planType : existing.planType,
            organizationId: existing.organizationId ?? t.organizationId,
          },
        });
      }
      continue;
    }
    await prisma.platformUser.create({
      data: {
        email: t.email,
        passwordHash: t.passwordHash,
        name: t.name,
        role: 'teacher',
        planType: t.planType ?? 'teacher_pro',
        teacherId: t.id,
        organizationId: t.organizationId,
        subscriptionStatus: 'active',
      },
    });
    teachers += 1;
  }

  const parentRows = await prisma.parent.findMany();
  for (const p of parentRows) {
    const existing = await prisma.platformUser.findUnique({ where: { email: p.email } });
    if (existing) {
      if (!existing.parentProfileId) {
        await prisma.platformUser.update({
          where: { id: existing.id },
          data: { parentProfileId: p.id },
        });
      }
      continue;
    }
    const isStudent = Boolean(p.dateOfBirth);
    await prisma.platformUser.create({
      data: {
        email: p.email,
        passwordHash: p.passwordHash,
        name: p.name,
        role: isStudent ? 'student' : 'parent',
        planType: isStudent ? 'student_free' : 'parent_free',
        parentProfileId: p.id,
        subscriptionStatus: 'active',
      },
    });
    if (isStudent) students += 1;
    else parents += 1;
  }

  return { teachers, parents, students };
}

async function main() {
  const result = await migrateLegacyUsers();
  console.log('Legacy migration complete:', result);
}

const isDirect = process.argv[1]?.includes('migrateLegacyUsers');
if (isDirect) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
