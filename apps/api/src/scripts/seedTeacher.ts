/**
 * Seed a demo teacher account.
 * Run: npx tsx src/scripts/seedTeacher.ts
 * Login: teacher@brightpath.ai / teacher123
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function main() {
  const email = 'teacher@brightpath.ai';
  const password = 'teacher123';
  const passwordHash = await bcrypt.hash(password, 10);

  const teacher = await prisma.teacher.upsert({
    where: { email },
    update: {
      passwordHash,
      name: 'Prof. Ananya',
      schoolName: 'Brightpath Academy',
      subjectFocus: 'Science',
    },
    create: {
      email,
      passwordHash,
      name: 'Prof. Ananya',
      schoolName: 'Brightpath Academy',
      subjectFocus: 'Science',
    },
  });

  console.log('Teacher ready:');
  console.log(`  email: ${email}`);
  console.log(`  password: ${password}`);
  console.log(`  id: ${teacher.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
