import bcrypt from 'bcryptjs';
import { prisma } from './prisma.js';

/** Ensures demo teacher exists after schema is pushed. Safe no-op if table missing. */
export async function ensureDemoTeacher() {
  try {
    const email = 'teacher@brightpath.ai';
    const passwordHash = await bcrypt.hash('teacher123', 10);
    const teacher = await prisma.teacher.upsert({
      where: { email },
      update: {
        passwordHash,
        name: 'Prof. Ananya',
        schoolName: 'Brightpath Academy',
        subjectFocus: 'Science',
        planType: 'teacher_pro',
      },
      create: {
        email,
        passwordHash,
        name: 'Prof. Ananya',
        schoolName: 'Brightpath Academy',
        subjectFocus: 'Science',
        planType: 'teacher_pro',
      },
    });

    try {
      await prisma.platformUser.upsert({
        where: { email },
        update: {
          passwordHash,
          name: 'Prof. Ananya',
          role: 'teacher',
          planType: 'teacher_pro',
          teacherId: teacher.id,
        },
        create: {
          email,
          passwordHash,
          name: 'Prof. Ananya',
          role: 'teacher',
          planType: 'teacher_pro',
          teacherId: teacher.id,
        },
      });
    } catch (platformErr) {
      const msg = platformErr instanceof Error ? platformErr.message : String(platformErr);
      if (/PlatformUser|does not exist|P2021|Unknown arg/i.test(msg)) {
        console.warn('PlatformUser not ready yet — demo Teacher row is available for legacy login');
      } else {
        console.warn('Could not sync demo PlatformUser:', msg);
      }
    }

    console.log('Demo teacher ready: teacher@brightpath.ai / teacher123 (role=teacher, planType=teacher_pro)');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/Teacher|does not exist|P2021|Unknown arg|planType/i.test(message)) {
      console.warn(
        'Teacher schema outdated/missing — run: cd apps/api && npx prisma db push && npx tsx src/scripts/seedTeacher.ts',
      );
      console.error(err);
      return;
    }
    console.warn('Could not ensure demo teacher:', message);
    console.error(err);
  }
}
