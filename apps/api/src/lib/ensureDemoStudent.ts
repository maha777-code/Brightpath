import bcrypt from 'bcryptjs';
import { prisma } from './prisma.js';
import { initialCurriculumFromDob } from './ageCurriculum.js';

/** Local-only demo account. Production never creates or resets this password. */
export async function ensureDemoStudent() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_TEACHER !== 'true') return;
  try {
    const email = 'student@brightpath.ai';
    const passwordHash = await bcrypt.hash('student123', 10);
    const dob = new Date(Date.UTC(2012, 7, 15));
    const curriculum = initialCurriculumFromDob(dob);

    const parent = await prisma.parent.upsert({
      where: { email },
      update: {
        passwordHash,
        dateOfBirth: dob,
        calculatedAgeGroup: curriculum.calculatedAgeGroup,
        unlockedSubjects: curriculum.unlockedSubjects,
      },
      create: {
        email,
        passwordHash,
        name: 'Aisha',
        locale: 'en-IN',
        dateOfBirth: dob,
        calculatedAgeGroup: curriculum.calculatedAgeGroup,
        unlockedSubjects: curriculum.unlockedSubjects,
      },
    });

    const user = await prisma.platformUser.upsert({
      where: { email },
      update: {
        passwordHash,
        name: 'Aisha',
        role: 'student',
        planType: 'student_pro',
        parentProfileId: parent.id,
      },
      create: {
        email,
        passwordHash,
        name: 'Aisha',
        role: 'student',
        planType: 'student_pro',
        parentProfileId: parent.id,
      },
    });

    await prisma.studentProfile.upsert({
      where: { studentUserId: user.id },
      update: { gradeLevel: '8th grade' },
      create: {
        studentUserId: user.id,
        gradeLevel: '8th grade',
        board: 'CBSE',
        preferredLanguage: 'en-IN',
      },
    });

    console.log('Demo student ready for local use (role=student, planType=student_pro)');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/PlatformUser|Parent|StudentProfile|does not exist|P2021|Unknown arg/i.test(message)) {
      console.warn('Student schema outdated/missing — demo student skipped');
      return;
    }
    console.warn('Could not ensure demo student:', message);
  }
}
