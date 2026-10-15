import { prisma } from '../lib/prisma.js';
import { getActiveProvider } from '../lib/llm/provider.js';
import { sendSafetyAlertEmail } from '../lib/mailer.js';

export type SafetyCategory = 'distress' | 'harm' | 'inappropriate' | 'academic_dishonesty';
export type SafetySeverity = 'low' | 'medium' | 'high';
export type SafetyFlag = { category: SafetyCategory; severity: SafetySeverity; reason: string };

const SEVERITY_RANK: Record<SafetySeverity, number> = { low: 1, medium: 2, high: 3 };

const RULES: { category: SafetyCategory; severity: SafetySeverity; reason: string; pattern: RegExp }[] = [
  {
    category: 'distress',
    severity: 'high',
    reason: 'Mentions self-harm or suicide',
    pattern:
      /\b(kill(ing)? myself|want to die|wanna die|end (it all|my life)|suicid\w*|hurt(ing)? myself|cut(ting)? myself|no reason to live|better off dead|khudkushi|aatmahatya|marna chahta|marna chahti|mar jaana chahta|mar jaana chahti)\b/i,
  },
  {
    category: 'harm',
    severity: 'high',
    reason: 'Mentions hurting someone else or a weapon',
    pattern: /\b(kill (him|her|them|you|my \w+)|bring a (gun|knife)|shoot (up|them|him|her)|stab (him|her|them)|make a bomb|build a bomb)\b/i,
  },
  {
    category: 'distress',
    severity: 'medium',
    reason: 'Signs of distress, bullying or abuse',
    pattern:
      /\b(nobody (cares|loves) (about )?me|i hate my life|so depressed|i feel worthless|being bullied|they bully me|bullying me|(he|she|they) (hit|beat|touch(ed)?) me|abus(e|ed|ing) me|scared to go home)\b/i,
  },
  {
    category: 'inappropriate',
    severity: 'medium',
    reason: 'Sexual or explicit content',
    pattern: /\b(porn\w*|nudes?|naked (pic|photo)s?|sex (video|chat)|xxx)\b/i,
  },
  {
    category: 'academic_dishonesty',
    severity: 'medium',
    reason: 'Asked for finished answers to homework or a test',
    pattern:
      /\b(do my (homework|assignment|project)|write my (essay|assignment)|give me (all )?the answers|answer key|solve (this|my) (exam|test|paper)|just give (me )?the answer)\b/i,
  },
];

const EXAM_MARKERS =
  /(\bQ\.?\s*\d+|\bquestion\s*\d+|\b\d+\s*marks?\b|\banswer (all|any)\b|\bsection [A-E]\b|\bchoose the correct\b|\bfill in the blanks?\b|\([a-d]\)\s)/gi;

/** Rule checks run on every student message, with or without an AI provider. */
export function moderateStudentMessage(text: string): SafetyFlag[] {
  const flags: SafetyFlag[] = [];
  for (const rule of RULES) {
    if (rule.pattern.test(text) && !flags.some((f) => f.category === rule.category)) {
      flags.push({ category: rule.category, severity: rule.severity, reason: rule.reason });
    }
  }
  const markers = text.match(EXAM_MARKERS)?.length ?? 0;
  if (text.length > 280 && markers >= 2 && !flags.some((f) => f.category === 'academic_dishonesty')) {
    flags.push({ category: 'academic_dishonesty', severity: 'low', reason: 'Pasted what looks like exam or homework questions' });
  }
  return flags;
}

function mergeFlags(rules: SafetyFlag[], ai: SafetyFlag | null): SafetyFlag[] {
  if (!ai) return rules;
  const existing = rules.find((f) => f.category === ai.category);
  if (!existing) return [...rules, ai];
  if (SEVERITY_RANK[ai.severity] > SEVERITY_RANK[existing.severity]) {
    return rules.map((f) => (f.category === ai.category ? ai : f));
  }
  return rules;
}

const LANGUAGE_LABEL: Record<string, string> = {
  'en-IN': 'English',
  'en-US': 'English',
  hi: 'Hindi',
  'hi-IN': 'Hindi',
  ar: 'Arabic',
};

type StudentContext = {
  name: string;
  organizationId: string | null;
  gradeLevel: string | null;
  board: string | null;
  language: string;
  readingLevel: string | null;
  accommodations: string[];
  learningPreferences: string[];
  classLabel: string | null;
  teacherIds: string[];
};

async function loadStudentContext(studentUserId: string, classBatchId: string | null): Promise<StudentContext> {
  const student = await prisma.platformUser.findUniqueOrThrow({
    where: { id: studentUserId },
    select: {
      name: true,
      organizationId: true,
      studentProfile: true,
      parentProfile: { select: { locale: true } },
      enrollments: { select: { classBatch: { select: { id: true, name: true, subject: true, gradeLevel: true, teacherId: true } } } },
    },
  });
  const classes = student.enrollments.map((e) => e.classBatch);
  const current = classes.find((c) => c.id === classBatchId) ?? null;
  const profile = student.studentProfile;
  const languageKey = profile?.preferredLanguage || student.parentProfile?.locale || 'en-IN';
  return {
    name: student.name?.split(' ')[0] || 'there',
    organizationId: student.organizationId,
    gradeLevel: profile?.gradeLevel || current?.gradeLevel || null,
    board: profile?.board ?? null,
    language: LANGUAGE_LABEL[languageKey] ?? languageKey,
    readingLevel: profile?.readingLevel ?? null,
    accommodations: profile?.accommodations ?? [],
    learningPreferences: profile?.learningPreferences ?? [],
    classLabel: current ? [current.name, current.subject].filter(Boolean).join(' · ') : null,
    teacherIds: [...new Set(classes.map((c) => c.teacherId))],
  };
}

/** Keyword search over textbooks the student's school or teachers have indexed. */
async function textbookExcerpts(query: string, ctx: StudentContext): Promise<string[]> {
  const tokens = query.toLowerCase().split(/\W+/).filter((t) => t.length > 3).slice(0, 10);
  if (!tokens.length) return [];
  const scopes = [
    ...(ctx.organizationId ? [{ organizationId: ctx.organizationId }] : []),
    ...(ctx.teacherIds.length ? [{ teacherId: { in: ctx.teacherIds } }] : []),
  ];
  if (!scopes.length) return [];
  const chunks = await prisma.ragChunk.findMany({
    where: {
      textbook: { status: 'INDEXED', OR: scopes },
      OR: tokens.map((t) => ({ content: { contains: t, mode: 'insensitive' as const } })),
    },
    select: { content: true, pageHint: true, textbook: { select: { title: true } } },
    take: 60,
  });
  return chunks
    .map((c) => ({
      text: `(${c.textbook.title}${c.pageHint ? `, ${c.pageHint}` : ''}) ${c.content.slice(0, 700)}`,
      score: tokens.filter((t) => c.content.toLowerCase().includes(t)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((c) => c.text);
}

function systemPrompt(ctx: StudentContext): string {
  const learner = [
    ctx.gradeLevel ? `Grade: ${ctx.gradeLevel}` : null,
    ctx.board ? `Curriculum board: ${ctx.board}` : null,
    ctx.classLabel ? `Class: ${ctx.classLabel}` : null,
    ctx.readingLevel ? `Reading level: ${ctx.readingLevel.replace('_', ' ')}` : null,
    ctx.accommodations.length ? `Accommodations: ${ctx.accommodations.join(', ')}` : null,
    ctx.learningPreferences.length ? `Learns best with: ${ctx.learningPreferences.join(', ')}` : null,
  ]
    .filter(Boolean)
    .join('\n');
  return `You are Sharada, a warm, patient AI tutor for a school student. Reply in ${ctx.language}.

${learner || 'No learner profile yet; pitch explanations at the level the student writes at.'}

How to tutor:
- Teach, don't hand over answers. For homework, test or exam questions, explain the idea, work a similar example, and ask the student to try the next step. Never write a complete graded answer for them.
- Keep replies short (under 180 words), friendly and age-appropriate. Use simple Markdown: short paragraphs, bullet points, bold key terms. Never use LaTeX or $ signs; write formulas in plain text with Unicode (H₂O, CO₂, x², ½).
- Simplify vocabulary when the reading level is below grade or simplified language is listed. Use step-by-step structure when extra time or IEP/504 accommodations are listed.
- When textbook excerpts are given, base the explanation on them and name the book.
- End with one short check-for-understanding question.
- If the student mentions self-harm, wanting to die, abuse, or being in danger: respond with care, say you are glad they told you, encourage them to talk to a trusted adult or teacher right now, and mention they can call Tele-MANAS on 14416 (India, free, 24x7) or local emergency services. Do not continue the lesson in that reply.
- Never ask for personal details such as address, phone number or passwords.

Return JSON only:
{
  "reply": "your Markdown reply to the student",
  "title": "3-6 word title for this conversation",
  "subject": "school subject, e.g. Science",
  "chapter": "chapter or unit name, or empty string",
  "topic": "specific topic, e.g. Changes of state",
  "summary": "one or two sentences summarising the whole conversation so far for the teacher",
  "safety": { "category": "none | distress | harm | inappropriate | academic_dishonesty", "severity": "none | low | medium | high", "reason": "short reason, or empty" }
}`;
}

type TutorJson = {
  reply?: string;
  title?: string;
  subject?: string;
  chapter?: string;
  topic?: string;
  summary?: string;
  safety?: { category?: string; severity?: string; reason?: string };
};

const SAFE_REPLY =
  "I'm really glad you told me. You don't have to handle this alone. Please talk to a trusted adult, a parent or your teacher right now. In India you can also call **Tele-MANAS on 14416** (free, 24x7), or your local emergency number if you're in danger. I've let your teacher know so they can check in with you.";

const OFFLINE_REPLY =
  "I can't reach my AI service right now, so I can't answer properly yet. Please try again in a little while, or ask your teacher. Your question has been saved.";

function aiFlag(raw: TutorJson['safety']): SafetyFlag | null {
  const category = raw?.category as SafetyCategory | undefined;
  const severity = raw?.severity as SafetySeverity | undefined;
  if (!category || !severity || !['distress', 'harm', 'inappropriate', 'academic_dishonesty'].includes(category)) return null;
  if (!['low', 'medium', 'high'].includes(severity)) return null;
  return { category, severity, reason: String(raw?.reason ?? '').slice(0, 200) || 'Flagged by Sharada' };
}

function clean(value: unknown, max: number): string | null {
  const text = String(value ?? '').trim();
  return text ? text.slice(0, max) : null;
}

export async function respondToStudent(input: { sessionId: string; studentUserId: string; content: string }) {
  const session = await prisma.tutorSession.findFirstOrThrow({
    where: { id: input.sessionId, studentUserId: input.studentUserId },
  });
  const ruleFlags = moderateStudentMessage(input.content);
  const ctx = await loadStudentContext(input.studentUserId, session.classBatchId);
  const history = await prisma.tutorMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: 'desc' },
    take: 12,
  });

  let parsed: TutorJson | null = null;
  const llm = getActiveProvider();
  if (llm) {
    try {
      const excerpts = await textbookExcerpts(input.content, ctx);
      const transcript = history
        .reverse()
        .map((m) => `${m.sender === 'student' ? 'Student' : 'Sharada'}: ${m.content}`)
        .join('\n\n');
      parsed = await llm.completeJson<TutorJson>({
        system: systemPrompt(ctx),
        temperature: 0.4,
        user: [
          excerpts.length ? `Textbook excerpts:\n${excerpts.join('\n\n')}` : '',
          transcript ? `Conversation so far:\n${transcript}` : '',
          `Student (${ctx.name}): ${input.content}`,
        ]
          .filter(Boolean)
          .join('\n\n'),
      });
    } catch (err) {
      console.error('[sharada-student] generation failed', err instanceof Error ? err.message : err);
    }
  }

  const flags = mergeFlags(ruleFlags, aiFlag(parsed?.safety));
  const urgent = flags.some((f) => (f.category === 'distress' || f.category === 'harm') && f.severity === 'high');
  const replyText = urgent ? SAFE_REPLY : clean(parsed?.reply, 6000) ?? OFFLINE_REPLY;

  const studentMessage = await prisma.tutorMessage.create({
    data: {
      sessionId: session.id,
      sender: 'student',
      content: input.content,
      flags: flags.map((f) => `${f.category}:${f.severity}`),
    },
  });
  const sharadaMessage = await prisma.tutorMessage.create({
    data: { sessionId: session.id, sender: 'sharada', content: replyText },
  });

  const updated = await prisma.tutorSession.update({
    where: { id: session.id },
    data: {
      lastMessageAt: new Date(),
      messageCount: { increment: 2 },
      flagCount: { increment: flags.length },
      ...(parsed && session.messageCount < 2 && clean(parsed.title, 80) ? { title: clean(parsed.title, 80)! } : {}),
      ...(parsed && clean(parsed.subject, 60) ? { subject: clean(parsed.subject, 60) } : {}),
      ...(parsed && clean(parsed.chapter, 120) ? { chapter: clean(parsed.chapter, 120) } : {}),
      ...(parsed && clean(parsed.topic, 120) ? { topic: clean(parsed.topic, 120) } : {}),
      ...(parsed && clean(parsed.summary, 600) ? { summary: clean(parsed.summary, 600)! } : {}),
    },
  });

  const alertable = flags.filter((f) => f.severity !== 'low');
  if (alertable.length) {
    await raiseAlerts({
      sessionId: session.id,
      messageId: studentMessage.id,
      studentUserId: input.studentUserId,
      organizationId: session.organizationId,
      classBatchId: session.classBatchId,
      excerpt: input.content,
      flags: alertable,
    });
  }

  return { studentMessage, sharadaMessage, session: updated, flagged: flags.length > 0 };
}

async function raiseAlerts(input: {
  sessionId: string;
  messageId: string;
  studentUserId: string;
  organizationId: string | null;
  classBatchId: string | null;
  excerpt: string;
  flags: SafetyFlag[];
}) {
  const excerpt = input.excerpt.slice(0, 280);
  const alerts = await Promise.all(
    input.flags.map((flag) =>
      prisma.safetyAlert.create({
        data: {
          sessionId: input.sessionId,
          messageId: input.messageId,
          studentUserId: input.studentUserId,
          organizationId: input.organizationId,
          classBatchId: input.classBatchId,
          category: flag.category,
          severity: flag.severity,
          reason: flag.reason,
          excerpt,
        },
      }),
    ),
  );

  const severe = alerts.filter((a) => a.severity === 'high');
  if (!severe.length) return;
  const recipients = await alertRecipients(input.studentUserId, input.organizationId, input.classBatchId);
  if (!recipients.length) return;
  const student = await prisma.platformUser.findUnique({ where: { id: input.studentUserId }, select: { name: true, email: true } });
  try {
    const sent = await sendSafetyAlertEmail({
      to: recipients,
      studentName: student?.name || student?.email || 'A student',
      category: severe[0].category,
      reason: severe[0].reason,
      excerpt,
    });
    if (sent) {
      await prisma.safetyAlert.updateMany({ where: { id: { in: severe.map((a) => a.id) } }, data: { notifiedAt: new Date() } });
    }
  } catch (err) {
    console.error('[sharada-student] alert email failed', err instanceof Error ? err.message : err);
  }
}

async function alertRecipients(studentUserId: string, organizationId: string | null, classBatchId: string | null) {
  const enrollments = await prisma.classEnrollment.findMany({
    where: { studentUserId, ...(classBatchId ? { classBatchId } : {}) },
    select: { classBatch: { select: { teacher: { select: { email: true } } } } },
  });
  const admins = organizationId
    ? await prisma.platformUser.findMany({
        where: { organizationId, role: { in: ['org_admin', 'center_admin'] } },
        select: { email: true },
      })
    : [];
  return [...new Set([...enrollments.map((e) => e.classBatch.teacher.email), ...admins.map((a) => a.email)])];
}
