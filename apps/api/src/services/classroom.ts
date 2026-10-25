import { randomUUID } from 'node:crypto';
import {
  CLASSROOM_BANNER_THEMES,
  classroomCode,
  classroomMeetLink,
  emptyClassroomWorkspace,
  type ClassroomAction,
  type ClassroomActionResponse,
  type ClassroomActor,
  type ClassroomClass,
  type ClassroomMemberRole,
  type ClassroomPerson,
  type ClassroomPost,
  type ClassroomRubricCriterion,
  type ClassroomStateResponse,
  type ClassroomSubmission,
  type ClassroomWorkspace,
} from '@brightpath/shared';
import { prisma } from '../lib/prisma.js';
import { getActiveProvider } from '../lib/llm/provider.js';

let tableReady = false;



async function ensureTable() {
  if (tableReady) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ClassroomWorkspace" (
      "id" TEXT NOT NULL,
      "ownerKey" TEXT NOT NULL,
      "payload" JSONB NOT NULL,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ClassroomWorkspace_pkey" PRIMARY KEY ("id")
    )
  `);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "ClassroomWorkspace_ownerKey_key" ON "ClassroomWorkspace"("ownerKey")`,
  );
  tableReady = true;
}

function nowIso() {
  return new Date().toISOString();
}

function uid() {
  return randomUUID().replace(/-/g, '').slice(0, 16);
}

function asWorkspace(value: unknown): ClassroomWorkspace {
  const rec = value && typeof value === 'object' ? (value as ClassroomWorkspace) : emptyClassroomWorkspace();
  return {
    people: Array.isArray(rec.people) ? rec.people : [],
    classes: Array.isArray(rec.classes) ? rec.classes : [],
    members: Array.isArray(rec.members) ? rec.members : [],
    topics: Array.isArray(rec.topics) ? rec.topics : [],
    posts: Array.isArray(rec.posts) ? rec.posts : [],
    comments: Array.isArray(rec.comments) ? rec.comments : [],
    submissions: Array.isArray(rec.submissions) ? rec.submissions : [],
    guardianEmails: Array.isArray(rec.guardianEmails) ? rec.guardianEmails : [],
  };
}

function seedWorkspace(actor: ClassroomActor): ClassroomWorkspace {
  const classId = uid();
  const topic1 = uid();
  const topic2 = uid();
  const assignId = uid();
  const quizId = uid();
  const annId = uid();
  const aisha = { id: uid(), name: 'Aisha Khan', email: 'aisha@student.local', role: 'student' as const };
  const rohan = { id: uid(), name: 'Rohan Mehta', email: 'rohan@student.local', role: 'student' as const };
  const meera = { id: uid(), name: 'Meera Iyer', email: 'meera@student.local', role: 'student' as const };
  const guardian = { id: uid(), name: 'Priya Khan', email: 'priya.khan@guardian.local', role: 'guardian' as const };
  const coteacher = { id: uid(), name: 'Prof. Kabir', email: 'kabir@school.local', role: 'teacher' as const };
  const code = classroomCode();
  const due = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString();
  const pastDue = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

  const people: ClassroomPerson[] = [actorPerson(actor, 'teacher'), coteacher, aisha, rohan, meera, guardian];
  const cls: ClassroomClass = {
    id: classId,
    title: '9th Science · Matter',
    section: 'Section A',
    subject: 'Science',
    room: 'Lab 2',
    code,
    inviteToken: uid(),
    bannerTheme: 'blue',
    meetLink: classroomMeetLink(code),
    archived: false,
    ownerId: actor.id,
    gradingMode: 'weighted',
    weights: [
      { category: 'Homework', percent: 30 },
      { category: 'Exams', percent: 70 },
    ],
    guardianDigest: 'weekly',
    createdAt: nowIso(),
  };

  const assignment: ClassroomPost = {
    id: assignId,
    classId,
    authorId: actor.id,
    type: 'assignment',
    title: 'Particle nature of matter — lab notes',
    body: 'Write a short explanation of how particles of matter are continuously moving. Attach your observation from Activity 1.1.',
    topicId: topic1,
    points: 20,
    dueAt: due,
    category: 'Homework',
    fileName: 'Activity-1.1-template.docx',
    makeCopyForEachStudent: true,
    rubric: fallbackRubric('Particle nature of matter'),
    createdAt: nowIso(),
  };
  const quiz: ClassroomPost = {
    id: quizId,
    classId,
    authorId: actor.id,
    type: 'quiz',
    title: 'States of matter check',
    body: 'Google Form style quiz. Choose the best answer for each item.',
    topicId: topic2,
    points: 10,
    dueAt: pastDue,
    category: 'Exams',
    webUrl: 'https://docs.google.com/forms',
    questionKind: 'multiple',
    choices: ['Solid particles vibrate in place', 'Gases have a fixed volume', 'Liquids cannot flow'],
    createdAt: nowIso(),
  };
  const announcement: ClassroomPost = {
    id: annId,
    classId,
    authorId: actor.id,
    type: 'announcement',
    title: 'Welcome to Science class',
    body: 'Meet is pinned at the top. We start with Matter in Our Surroundings. Watch the intro clip and reply with one question.',
    youtubeUrl: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    driveUrl: 'https://drive.google.com',
    createdAt: nowIso(),
  };

  const submissions: ClassroomSubmission[] = [aisha, rohan, meera].map((student, index) => ({
    id: uid(),
    assignmentId: assignId,
    studentId: student.id,
    status: index === 0 ? 'turned_in' : index === 1 ? 'missing' : 'assigned',
    workText: index === 0 ? 'Particles of matter have space between them and are constantly moving. In Activity 1.1 the incense smoke spread through the room.' : '',
    fileName: index === 0 ? `${student.name} - Activity-1.1-template.docx` : `${student.name} - Activity-1.1-template.docx`,
    turnedInAt: index === 0 ? nowIso() : undefined,
    originality:
      index === 0
        ? { score: 92, note: 'Mostly original compared with class files and common web phrases.' }
        : undefined,
  }));
  submissions.push(
    ...[aisha, rohan, meera].map((student, index) => ({
      id: uid(),
      assignmentId: quizId,
      studentId: student.id,
      status: (index === 2 ? 'returned' : 'assigned') as ClassroomSubmission['status'],
      workText: index === 2 ? 'Solid particles vibrate in place' : '',
      grade: index === 2 ? 9 : undefined,
      returnedAt: index === 2 ? nowIso() : undefined,
    })),
  );

  return {
    people,
    classes: [cls],
    members: people.map((person) => ({
      id: uid(),
      classId,
      userId: person.id,
      role: person.role,
      muted: false,
    })),
    topics: [
      { id: topic1, classId, name: 'Unit 1 · Matter in Our Surroundings' },
      { id: topic2, classId, name: 'Unit 2 · States of Matter' },
    ],
    posts: [announcement, assignment, quiz],
    comments: [
      {
        id: uid(),
        postId: annId,
        authorId: aisha.id,
        body: 'Does incense smoke prove that particles have space between them?',
        createdAt: nowIso(),
      },
    ],
    submissions,
    guardianEmails: [],
  };
}

function actorPerson(actor: ClassroomActor, role: ClassroomMemberRole): ClassroomPerson {
  return { id: actor.id, name: actor.name, email: actor.email, role };
}

function ensureActor(ws: ClassroomWorkspace, actor: ClassroomActor) {
  if (!ws.people.some((person) => person.id === actor.id)) {
    ws.people.unshift(actorPerson(actor, 'teacher'));
  }
}

function classStudents(ws: ClassroomWorkspace, classId: string) {
  return ws.members
    .filter((member) => member.classId === classId && member.role === 'student')
    .map((member) => ws.people.find((person) => person.id === member.userId))
    .filter((person): person is ClassroomPerson => Boolean(person));
}

function ensureSubmissions(ws: ClassroomWorkspace, post: ClassroomPost) {
  if (!['assignment', 'quiz', 'question'].includes(post.type)) return;
  for (const student of classStudents(ws, post.classId)) {
    if (ws.submissions.some((item) => item.assignmentId === post.id && item.studentId === student.id)) continue;
    ws.submissions.push({
      id: uid(),
      assignmentId: post.id,
      studentId: student.id,
      status: 'assigned',
      workText: '',
      fileName: post.makeCopyForEachStudent && post.fileName ? `${student.name} - ${post.fileName}` : post.fileName,
    });
  }
}

function markMissing(ws: ClassroomWorkspace) {
  const now = Date.now();
  for (const post of ws.posts) {
    if (!post.dueAt || !['assignment', 'quiz', 'question'].includes(post.type)) continue;
    if (new Date(post.dueAt).getTime() > now) continue;
    for (const sub of ws.submissions.filter((item) => item.assignmentId === post.id)) {
      if (sub.status === 'assigned') sub.status = 'missing';
    }
  }
}

function overlapScore(text: string, others: string[]): { score: number; note: string } {
  const words = new Set(text.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3));
  if (!words.size) return { score: 100, note: 'No written work to compare yet.' };
  let best = 0;
  for (const other of others) {
    const next = new Set(other.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 3));
    if (!next.size) continue;
    let hit = 0;
    for (const word of words) if (next.has(word)) hit += 1;
    best = Math.max(best, hit / words.size);
  }
  const web = /according to wikipedia|copied from|lorem ipsum|all rights reserved/i.test(text) ? 0.35 : 0;
  const overlap = Math.max(best, web);
  const score = Math.max(12, Math.round((1 - overlap) * 100));
  return {
    score,
    note:
      score >= 85
        ? 'Mostly original compared with class files and common web phrases.'
        : score >= 60
          ? 'Some overlap with other student files or stock phrases. Review before returning.'
          : 'High overlap with another submission or a common web phrase.',
  };
}

function fallbackRubric(topic: string): ClassroomRubricCriterion[] {
  return [
    {
      name: 'Accuracy',
      points: 4,
      levels: [
        { label: 'Exceeds', points: 4, descriptor: `Uses precise ${topic} vocabulary from the lesson.` },
        { label: 'Meets', points: 3, descriptor: `Explains the core idea of ${topic} correctly.` },
        { label: 'Approaching', points: 2, descriptor: 'Partly correct with a missing condition.' },
        { label: 'Beginning', points: 1, descriptor: 'Does not match the textbook model.' },
      ],
    },
    {
      name: 'Evidence',
      points: 3,
      levels: [
        { label: 'Exceeds', points: 3, descriptor: 'Cites a class activity or example.' },
        { label: 'Meets', points: 2, descriptor: 'Gives one relevant example.' },
        { label: 'Beginning', points: 1, descriptor: 'No supporting example.' },
      ],
    },
    {
      name: 'Clarity',
      points: 3,
      levels: [
        { label: 'Exceeds', points: 3, descriptor: 'Organized, complete sentences.' },
        { label: 'Meets', points: 2, descriptor: 'Understandable with minor gaps.' },
        { label: 'Beginning', points: 1, descriptor: 'Hard to follow.' },
      ],
    },
  ];
}

async function generateRubric(topic: string): Promise<{ instructions: string; rubric: ClassroomRubricCriterion[] }> {
  const provider = getActiveProvider();
  if (!provider) {
    return {
      instructions: `Students will explain ${topic} using the class notes, then support the claim with one activity or example.`,
      rubric: fallbackRubric(topic),
    };
  }
  try {
    const raw = await provider.completeJson<{ instructions?: string; rubric?: ClassroomRubricCriterion[] }>({
      temperature: 0.3,
      system: 'Write a classroom assignment brief and analytic rubric. JSON only. No publisher or copyright text.',
      user: `Topic: ${topic}
Return {"instructions":"...", "rubric":[{"name":"","points":4,"levels":[{"label":"Exceeds","points":4,"descriptor":""}]}]}`,
    });
    const rubric = Array.isArray(raw.rubric) && raw.rubric.length ? raw.rubric : fallbackRubric(topic);
    return {
      instructions: String(raw.instructions || '').trim() || `Explain ${topic} with one class example.`,
      rubric,
    };
  } catch {
    return {
      instructions: `Students will explain ${topic} using the class notes, then support the claim with one activity or example.`,
      rubric: fallbackRubric(topic),
    };
  }
}

async function loadWorkspace(ownerKey: string, actor: ClassroomActor): Promise<ClassroomWorkspace> {
  await ensureTable();
  const rows = await prisma.$queryRaw<Array<{ payload: ClassroomWorkspace }>>`
    SELECT payload FROM "ClassroomWorkspace" WHERE "ownerKey" = ${ownerKey} LIMIT 1
  `;
  if (!rows[0]) {
    const seeded = seedWorkspace(actor);
    await saveWorkspace(ownerKey, seeded);
    return seeded;
  }
  const ws = asWorkspace(rows[0].payload);
  ensureActor(ws, actor);
  markMissing(ws);
  return ws;
}

async function saveWorkspace(ownerKey: string, workspace: ClassroomWorkspace) {
  await ensureTable();
  const id = uid();
  const payload = JSON.stringify(workspace);
  await prisma.$executeRawUnsafe(
    `INSERT INTO "ClassroomWorkspace" ("id", "ownerKey", "payload", "updatedAt")
     VALUES ($1, $2, $3::jsonb, CURRENT_TIMESTAMP)
     ON CONFLICT ("ownerKey") DO UPDATE SET "payload" = EXCLUDED."payload", "updatedAt" = CURRENT_TIMESTAMP`,
    id,
    ownerKey,
    payload,
  );
}

function requireClass(ws: ClassroomWorkspace, classId: string) {
  const cls = ws.classes.find((item) => item.id === classId);
  if (!cls) throw new Error('Class not found');
  if (cls.archived) throw new Error('This class is archived. Restore it to make changes.');
  return cls;
}

export async function getClassroomState(ownerKey: string, actor: ClassroomActor): Promise<ClassroomStateResponse> {
  return { actor, workspace: await loadWorkspace(ownerKey, actor) };
}

export async function applyClassroomAction(
  ownerKey: string,
  actor: ClassroomActor,
  action: ClassroomAction,
): Promise<ClassroomActionResponse> {
  const ws = await loadWorkspace(ownerKey, actor);
  ensureActor(ws, actor);
  let generated: ClassroomActionResponse['generated'];

  switch (action.type) {
    case 'create_class': {
      const code = classroomCode();
      const theme = CLASSROOM_BANNER_THEMES.includes(action.bannerTheme as (typeof CLASSROOM_BANNER_THEMES)[number])
        ? (action.bannerTheme as ClassroomClass['bannerTheme'])
        : CLASSROOM_BANNER_THEMES[ws.classes.length % CLASSROOM_BANNER_THEMES.length];
      const cls: ClassroomClass = {
        id: uid(),
        title: action.title.trim(),
        section: (action.section || '').trim(),
        subject: (action.subject || '').trim(),
        room: (action.room || '').trim(),
        code,
        inviteToken: uid(),
        bannerTheme: theme,
        meetLink: classroomMeetLink(code),
        archived: false,
        ownerId: actor.id,
        gradingMode: 'points',
        weights: [
          { category: 'Homework', percent: 30 },
          { category: 'Exams', percent: 70 },
        ],
        guardianDigest: 'off',
        createdAt: nowIso(),
      };
      ws.classes.unshift(cls);
      ws.members.push({ id: uid(), classId: cls.id, userId: actor.id, role: 'teacher', muted: false });
      ws.topics.push({ id: uid(), classId: cls.id, name: 'Getting started' });
      break;
    }
    case 'update_class': {
      const cls = ws.classes.find((item) => item.id === action.classId);
      if (!cls) throw new Error('Class not found');
      Object.assign(cls, action.patch, { id: cls.id, ownerId: cls.ownerId, createdAt: cls.createdAt });
      break;
    }
    case 'archive_class': {
      const cls = ws.classes.find((item) => item.id === action.classId);
      if (!cls) throw new Error('Class not found');
      cls.archived = true;
      break;
    }
    case 'restore_class': {
      const cls = ws.classes.find((item) => item.id === action.classId);
      if (!cls) throw new Error('Class not found');
      cls.archived = false;
      break;
    }
    case 'join_class': {
      const cls = ws.classes.find(
        (item) =>
          item.code.toLowerCase() === String(action.code || '').trim().toLowerCase() ||
          item.inviteToken === action.inviteToken,
      );
      if (!cls || cls.archived) throw new Error('That class code or invite link is not valid.');
      if (!ws.members.some((member) => member.classId === cls.id && member.userId === actor.id)) {
        ws.members.push({ id: uid(), classId: cls.id, userId: actor.id, role: 'teacher', muted: false });
      }
      break;
    }
    case 'invite_member': {
      requireClass(ws, action.classId);
      let person = ws.people.find((item) => item.email.toLowerCase() === action.email.trim().toLowerCase());
      if (!person) {
        person = {
          id: uid(),
          name: action.name.trim() || action.email.split('@')[0],
          email: action.email.trim(),
          role: action.role,
        };
        ws.people.push(person);
      } else {
        person.role = action.role;
      }
      if (!ws.members.some((member) => member.classId === action.classId && member.userId === person.id)) {
        ws.members.push({ id: uid(), classId: action.classId, userId: person.id, role: action.role, muted: false });
      }
      for (const post of ws.posts.filter((item) => item.classId === action.classId)) ensureSubmissions(ws, post);
      break;
    }
    case 'mute_member': {
      const member = ws.members.find((item) => item.id === action.memberId);
      if (!member) throw new Error('Member not found');
      member.muted = action.muted;
      break;
    }
    case 'remove_member': {
      ws.members = ws.members.filter((item) => item.id !== action.memberId);
      break;
    }
    case 'create_topic': {
      requireClass(ws, action.classId);
      ws.topics.push({ id: uid(), classId: action.classId, name: action.name.trim() });
      break;
    }
    case 'create_post': {
      requireClass(ws, action.classId);
      const post: ClassroomPost = {
        id: uid(),
        classId: action.classId,
        authorId: actor.id,
        type: action.postType,
        title: action.title.trim(),
        body: action.body.trim(),
        topicId: action.topicId,
        points: action.points,
        dueAt: action.dueAt,
        category: action.category,
        youtubeUrl: action.youtubeUrl,
        driveUrl: action.driveUrl,
        webUrl: action.webUrl,
        fileName: action.fileName,
        makeCopyForEachStudent: action.makeCopyForEachStudent,
        questionKind: action.questionKind,
        choices: action.choices,
        rubric: action.rubric,
        createdAt: nowIso(),
      };
      ws.posts.unshift(post);
      ensureSubmissions(ws, post);
      break;
    }
    case 'add_comment': {
      const post = ws.posts.find((item) => item.id === action.postId);
      if (!post) throw new Error('Post not found');
      const member = ws.members.find((item) => item.classId === post.classId && item.userId === actor.id);
      if (member?.muted) throw new Error('This student is muted and cannot comment.');
      ws.comments.push({
        id: uid(),
        postId: action.postId,
        authorId: actor.id,
        body: action.body.trim(),
        createdAt: nowIso(),
      });
      break;
    }
    case 'delete_comment': {
      ws.comments = ws.comments.filter((item) => item.id !== action.commentId);
      break;
    }
    case 'submit_work': {
      const studentId = action.studentId || actor.id;
      const sub = ws.submissions.find((item) => item.assignmentId === action.assignmentId && item.studentId === studentId);
      if (!sub) throw new Error('Assignment not found for this student.');
      const others = ws.submissions
        .filter((item) => item.assignmentId === action.assignmentId && item.studentId !== studentId)
        .map((item) => item.workText);
      sub.workText = action.workText;
      if (action.fileName) sub.fileName = action.fileName;
      sub.status = 'turned_in';
      sub.turnedInAt = nowIso();
      sub.originality = overlapScore(action.workText, others);
      break;
    }
    case 'grade_submission': {
      const sub = ws.submissions.find((item) => item.id === action.submissionId);
      if (!sub) throw new Error('Submission not found');
      sub.grade = action.grade;
      if (action.privateComment !== undefined) sub.privateComment = action.privateComment;
      if (action.returnWork) {
        sub.status = 'returned';
        sub.returnedAt = nowIso();
      }
      break;
    }
    case 'generate_rubric': {
      generated = await generateRubric(action.topic.trim());
      break;
    }
    case 'send_guardian_digest': {
      const cls = ws.classes.find((item) => item.id === action.classId);
      if (!cls) throw new Error('Class not found');
      const guardians = ws.members
        .filter((member) => member.classId === cls.id && member.role === 'guardian')
        .map((member) => ws.people.find((person) => person.id === member.userId))
        .filter((person): person is ClassroomPerson => Boolean(person));
      const work = ws.posts.filter((post) => post.classId === cls.id && ['assignment', 'quiz', 'question'].includes(post.type));
      const missing = ws.submissions.filter((item) => item.status === 'missing' && work.some((post) => post.id === item.assignmentId));
      const upcoming = work.filter((post) => post.dueAt && new Date(post.dueAt).getTime() > Date.now());
      const body = [
        `${cls.title} · ${cls.section}`,
        `Missing work: ${missing.length}`,
        `Upcoming: ${upcoming.map((post) => post.title).join(', ') || 'none'}`,
        `Stream activity: ${ws.posts.filter((post) => post.classId === cls.id).length} posts`,
      ].join('\n');
      const targets = guardians.length
        ? guardians
        : [{ id: 'office', name: 'Office copy', email: actor.email, role: 'guardian' as const }];
      for (const person of targets) {
        ws.guardianEmails.unshift({
          id: uid(),
          classId: cls.id,
          to: person.email,
          subject: `${cls.guardianDigest === 'daily' ? 'Daily' : 'Weekly'} summary · ${cls.title}`,
          body,
          at: nowIso(),
        });
      }
      break;
    }
    default:
      throw new Error('Unknown classroom action');
  }

  markMissing(ws);
  await saveWorkspace(ownerKey, ws);
  return { actor, workspace: ws, generated };
}

export function classroomOwnerKey(input: { organizationId?: string | null; actorId: string }) {
  return input.organizationId || input.actorId;
}

export function canAccessClassroom(role?: string | null) {
  return role === 'org_admin' || role === 'center_admin';
}
