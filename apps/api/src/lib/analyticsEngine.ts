import type { AgeGroup } from '@prisma/client';
import { prisma } from './prisma.js';
import { GOAL_TEMPLATES, SUBJECT_SEEDS } from '../data/analyticsSeeds.js';

const EWMA_ALPHA = 0.35;

export type SkillBranchStatus = 'mastered' | 'in_progress' | 'locked';

export type AnalyticsSubjectDto = {
  subjectId: string;
  subjectName: string;
  masteryPercentage: number;
  color: string;
  learnRoute: string | null;
  slug: string;
};

export type RadarPointDto = {
  subject: string;
  skill: string;
  score: number;
  value: number;
  fullMark: number;
};

export type SkillBranchNodeDto = {
  id: string;
  name: string;
  status: SkillBranchStatus;
  masteryScore: number;
  parentSkillId: string | null;
  children: SkillBranchNodeDto[];
};

export type GoalDto = {
  id: string;
  title: string;
  isCompleted: boolean;
  dueDate: string | null;
};

export type AnalyticsResponseDto = {
  ageGroup: AgeGroup;
  subjects: AnalyticsSubjectDto[];
  radar: RadarPointDto[];
  skillTree: SkillBranchNodeDto | null;
  goals: GoalDto[];
};

function ewma(previous: number, observation: number, alpha = EWMA_ALPHA): number {
  if (previous <= 0) return observation;
  return alpha * observation + (1 - alpha) * previous;
}

function branchStatus(score: number): SkillBranchStatus {
  if (score >= 80) return 'mastered';
  if (score > 0) return 'in_progress';
  return 'locked';
}

/**
 * Idempotent seed of subject + skill catalog.
 */
export async function ensureAnalyticsCatalogSeeded(): Promise<void> {
  const subjectCount = await prisma.subjectCatalog.count();
  if (subjectCount >= SUBJECT_SEEDS.length) return;

  const keyToId = new Map<string, string>();

  for (const sub of SUBJECT_SEEDS) {
    let subject = await prisma.subjectCatalog.findUnique({
      where: { ageGroup_slug: { ageGroup: sub.ageGroup, slug: sub.slug } },
    });
    if (!subject) {
      subject = await prisma.subjectCatalog.create({
        data: {
          slug: sub.slug,
          name: sub.name,
          ageGroup: sub.ageGroup,
          colorTheme: sub.colorTheme,
          learnRoute: sub.learnRoute ?? null,
          sortOrder: sub.sortOrder,
        },
      });
    }

    // First pass: create skills without parents
    for (const skill of sub.skills) {
      let node = await prisma.skillNode.findFirst({
        where: { subjectId: subject.id, name: skill.name },
      });
      if (!node) {
        node = await prisma.skillNode.create({
          data: {
            subjectId: subject.id,
            name: skill.name,
            radarAxis: skill.radarAxis ?? '',
            skillTags: skill.skillTags ?? [],
            sortOrder: sub.skills.indexOf(skill),
          },
        });
      }
      keyToId.set(`${sub.ageGroup}:${skill.key}`, node.id);
    }

    // Second pass: wire parent links (including cross-subject early-root for early math)
    for (const skill of sub.skills) {
      if (!skill.parentKey) continue;
      const id = keyToId.get(`${sub.ageGroup}:${skill.key}`);
      let parentId = keyToId.get(`${sub.ageGroup}:${skill.parentKey}`);

      // Cross-subject parent: Basic Math's Numbers → Early Reading's Early Skills
      if (!parentId && sub.ageGroup === 'EARLY_4_7' && skill.parentKey === 'early-root') {
        parentId = keyToId.get('EARLY_4_7:early-root');
      }
      if (!parentId && sub.ageGroup === 'UPPER_ELEM_8_10' && skill.parentKey === 'up-root') {
        parentId = keyToId.get('UPPER_ELEM_8_10:up-root');
      }

      if (id && parentId) {
        await prisma.skillNode.update({
          where: { id },
          data: { parentSkillId: parentId },
        });
      }
    }
  }
}

async function ensureUserMasteryRows(userId: string, ageGroup: AgeGroup) {
  const subjects = await prisma.subjectCatalog.findMany({
    where: { ageGroup },
    include: { skills: true },
  });

  for (const sub of subjects) {
    const seed = SUBJECT_SEEDS.find((s) => s.ageGroup === ageGroup && s.slug === sub.slug);
    for (const skill of sub.skills) {
      const existing = await prisma.userSkillMastery.findUnique({
        where: { userId_skillId: { userId, skillId: skill.id } },
      });
      if (existing) continue;

      const skillSeed = seed?.skills.find((sk) => sk.name === skill.name);
      const demo = skillSeed?.demoScore ?? 0;

      await prisma.userSkillMastery.create({
        data: {
          userId,
          skillId: skill.id,
          masteryScore: demo,
          totalAttempts: demo > 0 ? 3 : 0,
          correctAttempts: demo > 0 ? Math.round((demo / 100) * 3) : 0,
          lastEvaluatedAt: demo > 0 ? new Date() : null,
        },
      });
    }
  }
}

function buildTree(
  nodes: {
    id: string;
    name: string;
    parentSkillId: string | null;
    sortOrder: number;
  }[],
  scores: Map<string, number>,
  rootId: string | null,
): SkillBranchNodeDto | null {
  if (!rootId) return null;

  const byParent = new Map<string | null, typeof nodes>();
  for (const n of nodes) {
    const key = n.parentSkillId;
    const list = byParent.get(key) ?? [];
    list.push(n);
    byParent.set(key, list);
  }

  const walk = (id: string): SkillBranchNodeDto => {
    const node = nodes.find((n) => n.id === id)!;
    const score = scores.get(id) ?? 0;
    const kids = (byParent.get(id) ?? [])
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((c) => walk(c.id));
    return {
      id: node.id,
      name: node.name,
      status: branchStatus(score),
      masteryScore: Math.round(score),
      parentSkillId: node.parentSkillId,
      children: kids,
    };
  };

  return walk(rootId);
}

async function ensureGoals(userId: string, ageGroup: AgeGroup): Promise<GoalDto[]> {
  const now = new Date();
  const pending = await prisma.userGoal.findMany({
    where: {
      userId,
      isCompleted: false,
      OR: [{ dueDate: null }, { dueDate: { gte: now } }],
    },
    orderBy: { createdAt: 'asc' },
    take: 5,
  });

  if (pending.length > 0) {
    return pending.map((g) => ({
      id: g.id,
      title: g.title,
      isCompleted: g.isCompleted,
      dueDate: g.dueDate?.toISOString() ?? null,
    }));
  }

  // Generate from lowest-scoring skill
  const mastery = await prisma.userSkillMastery.findMany({
    where: {
      userId,
      skill: { subject: { ageGroup } },
    },
    include: { skill: true },
    orderBy: { masteryScore: 'asc' },
    take: 5,
  });

  const lowest = mastery[0];
  const label = lowest?.skill.radarAxis || lowest?.skill.name || 'practice';
  const template =
    GOAL_TEMPLATES.find((t) => t.match.test(label)) ??
    GOAL_TEMPLATES.find((t) => t.match.test(lowest?.skill.name ?? '')) ??
    null;

  const titles = template?.goals.slice(0, 2) ?? [
    `Practice ${label} for 10 minutes`,
    `Improve ${label} with one more lesson`,
  ];

  const due = new Date();
  due.setDate(due.getDate() + 7);

  const created = [];
  for (const title of titles) {
    const g = await prisma.userGoal.create({
      data: {
        userId,
        title,
        isCompleted: false,
        dueDate: due,
        skillId: lowest?.skillId ?? null,
      },
    });
    created.push(g);
  }

  return created.map((g) => ({
    id: g.id,
    title: g.title,
    isCompleted: g.isCompleted,
    dueDate: g.dueDate?.toISOString() ?? null,
  }));
}

/**
 * Aggregate My Subjects + radar + skill tree + goals for a user.
 */
export async function buildUserAnalytics(
  userId: string,
  ageGroup: AgeGroup,
): Promise<AnalyticsResponseDto> {
  await ensureAnalyticsCatalogSeeded();
  await ensureUserMasteryRows(userId, ageGroup);

  const subjects = await prisma.subjectCatalog.findMany({
    where: { ageGroup },
    include: { skills: true },
    orderBy: { sortOrder: 'asc' },
  });

  const allSkillIds = subjects.flatMap((s) => s.skills.map((sk) => sk.id));
  const masteryRows = await prisma.userSkillMastery.findMany({
    where: { userId, skillId: { in: allSkillIds } },
  });
  const scoreBySkill = new Map(masteryRows.map((m) => [m.skillId, m.masteryScore]));

  const subjectDtos: AnalyticsSubjectDto[] = subjects.map((sub) => {
    const scores = sub.skills.map((sk) => scoreBySkill.get(sk.id) ?? 0);
    const avg =
      scores.length === 0 ? 0 : scores.reduce((a, b) => a + b, 0) / scores.length;
    return {
      subjectId: sub.id,
      subjectName: sub.name,
      masteryPercentage: Math.round(avg),
      color: sub.colorTheme,
      learnRoute: sub.learnRoute,
      slug: sub.slug,
    };
  });

  // Radar: unique axes for this age group (prefer skills with radarAxis set)
  const axisMap = new Map<string, number[]>();
  for (const sub of subjects) {
    for (const sk of sub.skills) {
      if (!sk.radarAxis) continue;
      const list = axisMap.get(sk.radarAxis) ?? [];
      list.push(scoreBySkill.get(sk.id) ?? 0);
      axisMap.set(sk.radarAxis, list);
    }
  }

  const RADAR_ORDER: Record<string, string[]> = {
    TODDLER_1_3: ['Sounds', 'Colors', 'Shapes', 'Motor Skills'],
    EARLY_4_7: ['Phonics', 'Counting', 'Writing', 'Curiosity'],
    UPPER_ELEM_8_10: ['Multiply', 'Fractions', 'Grammar', 'Logic'],
    MIDDLE_11_14: ['Algebra', 'Geometry', 'Proofs', 'Equations'],
  };

  const preferred = RADAR_ORDER[ageGroup] ?? [];
  const radar: RadarPointDto[] = preferred
    .filter((axis) => axisMap.has(axis))
    .concat([...axisMap.keys()].filter((a) => !preferred.includes(a)))
    .slice(0, 4)
    .map((axis) => {
      const vals = axisMap.get(axis) ?? [0];
      const score = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      return {
        subject: axis,
        skill: axis,
        score,
        value: score,
        fullMark: 100,
      };
    });

  // Skill tree: prefer first subject's root, then attach any orphans from other subjects with shared parent
  const flatSkills = subjects.flatMap((s) =>
    s.skills.map((sk) => ({
      id: sk.id,
      name: sk.name,
      parentSkillId: sk.parentSkillId,
      sortOrder: sk.sortOrder,
    })),
  );
  const roots = flatSkills.filter((n) => !n.parentSkillId);
  const primaryRoot =
    roots.find((r) =>
      ['Early Skills', 'Play Skills', 'Core Skills', 'Core Math'].includes(r.name),
    ) ?? roots[0];

  // Include children that belong to other subjects but parent into this tree
  const skillTree = buildTree(flatSkills, scoreBySkill, primaryRoot?.id ?? null);

  const goals = await ensureGoals(userId, ageGroup);

  return { ageGroup, subjects: subjectDtos, radar, skillTree, goals };
}

/**
 * EWMA update for one or more skills (by id or by tag / subject category).
 */
export async function applySkillObservation(opts: {
  userId: string;
  scorePercent: number;
  skillId?: string;
  skillTags?: string[];
  ageGroup?: AgeGroup;
  correct?: boolean;
}): Promise<void> {
  const score = Math.max(0, Math.min(100, opts.scorePercent));
  let skillIds: string[] = [];

  if (opts.skillId) {
    skillIds = [opts.skillId];
  } else if (opts.skillTags?.length) {
    const skills = await prisma.skillNode.findMany({
      where: {
        skillTags: { hasSome: opts.skillTags },
        ...(opts.ageGroup ? { subject: { ageGroup: opts.ageGroup } } : {}),
      },
      take: 4,
    });
    skillIds = skills.map((s) => s.id);
  }

  if (skillIds.length === 0) return;

  for (const skillId of skillIds) {
    const existing = await prisma.userSkillMastery.findUnique({
      where: { userId_skillId: { userId: opts.userId, skillId } },
    });
    const prev = existing?.masteryScore ?? 0;
    const next = ewma(prev, score);
    const correctInc = opts.correct === false ? 0 : score >= 60 ? 1 : 0;

    await prisma.userSkillMastery.upsert({
      where: { userId_skillId: { userId: opts.userId, skillId } },
      create: {
        userId: opts.userId,
        skillId,
        masteryScore: next,
        totalAttempts: 1,
        correctAttempts: correctInc,
        lastEvaluatedAt: new Date(),
      },
      update: {
        masteryScore: next,
        totalAttempts: { increment: 1 },
        correctAttempts: { increment: correctInc },
        lastEvaluatedAt: new Date(),
      },
    });
  }
}

export async function completeUserGoal(userId: string, goalId: string): Promise<GoalDto | null> {
  const goal = await prisma.userGoal.findFirst({ where: { id: goalId, userId } });
  if (!goal) return null;
  const updated = await prisma.userGoal.update({
    where: { id: goalId },
    data: { isCompleted: true },
  });
  return {
    id: updated.id,
    title: updated.title,
    isCompleted: updated.isCompleted,
    dueDate: updated.dueDate?.toISOString() ?? null,
  };
}
