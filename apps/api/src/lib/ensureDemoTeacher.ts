import bcrypt from 'bcryptjs';
import { prisma } from './prisma.js';

/** Ensures demo teacher exists after schema is pushed. Safe no-op if table missing. */
export async function ensureDemoTeacher() {
  try {
    const email = 'teacher@brightpath.ai';
    const passwordHash = await bcrypt.hash('teacher123', 10);
    await prisma.teacher.upsert({
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
    console.log('Demo teacher ready: teacher@brightpath.ai / teacher123');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/Teacher|does not exist|P2021/i.test(message)) {
      console.warn(
        'Teacher table missing — run: cd apps/api && npx prisma db push && npx tsx src/scripts/seedTeacher.ts',
      );
      return;
    }
    console.warn('Could not ensure demo teacher:', message);
  }
}
