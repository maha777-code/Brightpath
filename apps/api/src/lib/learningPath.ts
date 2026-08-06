import type { AgeGroup } from '@prisma/client';
import { prisma } from './prisma.js';
import { DEMO_STARTER_SCORES, MODULE_SEEDS } from '../data/moduleSeeds.js';

export type ModuleStatusDto = 'COMPLETED' | 'IN_PROGRESS' | 'UNLOCKED' | 'LOCKED';

export type PathNodeDto = {
  id: string;
  title: string;
  status: ModuleStatusDto;
  masteryScore: number;
  sequenceOrder: number;
  subjectCategory: string;
  learnRoute: string | null;
  isReview: boolean;
  reviewOfNodeId: string | null;
  unlockHint?: string;
};

/**
 * Ensure curriculum ModuleNodes exist (idempotent upsert by ageGroup+title+sequence).
 */
export async function ensureModuleCatalogSeeded(): Promise<void> {
  const count = await prisma.moduleNode.count({ where: { isReview: false } });
  if (count >= MODULE_SEEDS.length) return;

  const keyToId = new Map<string, string>();

  for (const seed of MODULE_SEEDS) {
    const existing = await prisma.moduleNode.findFirst({
      where: {
        ageGroup: seed.ageGroup,
        title: seed.title,
        sequenceOrder: seed.sequenceOrder,
        isReview: false,
      },
    });

    const node =
      existing ??
      (await prisma.moduleNode.create({
        data: {
          title: seed.title,
          ageGroup: seed.ageGroup,
          sequenceOrder: seed.sequenceOrder,
          subjectCategory: seed.subjectCategory,
          learnRoute: seed.learnRoute ?? null,
          prerequisiteNodeIds: [],
          isReview: false,
        },
      }));

    keyToId.set(seed.key, node.id);
  }

  // Second pass: resolve prerequisite IDs
  for (const seed of MODULE_SEEDS) {
    const id = keyToId.get(seed.key);
    if (!id) continue;
    const prereqIds = seed.prerequisiteKeys
      .map((k) => keyToId.get(k))
      .filter((x): x is string => Boolean(x));
    await prisma.moduleNode.update({
      where: { id },
      data: { prerequisiteNodeIds: prereqIds },
    });
  }
}

async function ensureUserProgressRows(userId: string, ageGroup: AgeGroup) {
  const nodes = await prisma.moduleNode.findMany({
    where: { ageGroup, isReview: false },
    orderBy: { sequenceOrder: 'asc' },
  });

  for (const node of nodes) {
    const existing = await prisma.userModuleProgress.findUnique({
      where: { userId_nodeId: { userId, nodeId: node.id } },
    });
    if (existing) continue;

    const seedKey = MODULE_SEEDS.find(
      (s) =>
        s.ageGroup === ageGroup &&
        s.title === node.title &&
        s.sequenceOrder === node.sequenceOrder,
    )?.key;
    const starter = seedKey ? DEMO_STARTER_SCORES[seedKey] : undefined;

    await prisma.userModuleProgress.create({
      data: {
        userId,
        nodeId: node.id,
        masteryScore: starter ?? 0,
        status: 'LOCKED',
        lastAttemptedAt: starter != null ? new Date() : null,
      },
    });
  }
}

function computeStatuses(
  nodes: { id: string; title: string; prerequisiteNodeIds: string[]; sequenceOrder: number }[],
  progressByNode: Map<
    string,
    { masteryScore: number; needsRemediation: boolean; status: ModuleStatusDto }
  >,
): Map<string, ModuleStatusDto> {
  const result = new Map<string, ModuleStatusDto>();
  const completed = new Set<string>();

  for (const node of nodes) {
    const prog = progressByNode.get(node.id);
    const score = prog?.masteryScore ?? 0;
    if (score >= 80) {
      result.set(node.id, 'COMPLETED');
      completed.add(node.id);
    }
  }

  let foundActive = false;
  for (const node of nodes) {
    if (result.get(node.id) === 'COMPLETED') continue;

    const prereqsMet = node.prerequisiteNodeIds.every((pid) => completed.has(pid));

    if (!prereqsMet) {
      result.set(node.id, 'LOCKED');
      continue;
    }

    if (!foundActive) {
      result.set(node.id, 'IN_PROGRESS');
      foundActive = true;
    } else {
      const anyUnlocked = [...result.values()].includes('UNLOCKED');
      result.set(node.id, anyUnlocked ? 'LOCKED' : 'UNLOCKED');
    }
  }

  return result;
}

async function ensureReviewNode(
  userId: string,
  ageGroup: AgeGroup,
  target: {
    id: string;
    title: string;
    subjectCategory: string;
    learnRoute: string | null;
    sequenceOrder: number;
  },
): Promise<{ id: string; title: string } | null> {
  const seed = MODULE_SEEDS.find((s) => s.ageGroup === ageGroup && s.title === target.title);
  const reviewTitle = seed?.reviewTitle ?? `Review: ${target.title}`;
  const reviewSequence = target.sequenceOrder * 100 - 50;

  let review = await prisma.moduleNode.findFirst({
    where: {
      ageGroup,
      isReview: true,
      reviewOfNodeId: target.id,
    },
  });

  if (!review) {
    review = await prisma.moduleNode.create({
      data: {
        title: reviewTitle,
        ageGroup,
        sequenceOrder: reviewSequence,
        subjectCategory: target.subjectCategory,
        learnRoute: target.learnRoute,
        prerequisiteNodeIds: [],
        isReview: true,
        reviewOfNodeId: target.id,
      },
    });
  }

  await prisma.userModuleProgress.upsert({
    where: { userId_nodeId: { userId, nodeId: review.id } },
    create: {
      userId,
      nodeId: review.id,
      status: 'IN_PROGRESS',
      masteryScore: 0,
      needsRemediation: false,
      lastAttemptedAt: new Date(),
    },
    update: {
      status: 'IN_PROGRESS',
      lastAttemptedAt: new Date(),
    },
  });

  return { id: review.id, title: review.title };
}

/**
 * Build the adaptive personalized path for a user + age group.
 */
export async function buildLearningPath(
  userId: string,
  ageGroup: AgeGroup,
): Promise<PathNodeDto[]> {
  await ensureModuleCatalogSeeded();
  await ensureUserProgressRows(userId, ageGroup);

  const nodes = await prisma.moduleNode.findMany({
    where: { ageGroup, isReview: false },
    orderBy: { sequenceOrder: 'asc' },
  });

  const progressRows = await prisma.userModuleProgress.findMany({
    where: { userId, nodeId: { in: nodes.map((n) => n.id) } },
  });
  const progressByNode = new Map(
    progressRows.map((p) => [
      p.nodeId,
      {
        masteryScore: p.masteryScore,
        needsRemediation: p.needsRemediation,
        status: p.status as ModuleStatusDto,
      },
    ]),
  );

  const statusMap = computeStatuses(nodes, progressByNode);

  // Persist computed statuses
  for (const node of nodes) {
    const status = statusMap.get(node.id) ?? 'LOCKED';
    const score = progressByNode.get(node.id)?.masteryScore ?? 0;
    await prisma.userModuleProgress.update({
      where: { userId_nodeId: { userId, nodeId: node.id } },
      data: { status },
    });
    progressByNode.set(node.id, {
      masteryScore: score,
      needsRemediation: progressByNode.get(node.id)?.needsRemediation ?? false,
      status,
    });
  }

  const path: PathNodeDto[] = [];

  // Previous sequential module title for locked-node toast
  function unlockHintFor(node: (typeof nodes)[number]): string | undefined {
    const idx = nodes.findIndex((n) => n.id === node.id);
    if (idx > 0) return nodes[idx - 1]?.title;
    return undefined;
  }

  for (const node of nodes) {
    const status = statusMap.get(node.id) ?? 'LOCKED';
    const prog = progressByNode.get(node.id);
    const score = prog?.masteryScore ?? 0;

    // Adaptive remediation: insert review before IN_PROGRESS if mastery < 50 and flagged / scored low
    if (status === 'IN_PROGRESS' && ((score > 0 && score < 50) || prog?.needsRemediation)) {
      const review = await ensureReviewNode(userId, ageGroup, node);
      if (review) {
        const reviewProg = await prisma.userModuleProgress.findUnique({
          where: { userId_nodeId: { userId, nodeId: review.id } },
        });
        path.push({
          id: review.id,
          title: review.title,
          status: (reviewProg?.masteryScore ?? 0) >= 80 ? 'COMPLETED' : 'IN_PROGRESS',
          masteryScore: reviewProg?.masteryScore ?? 0,
          sequenceOrder: node.sequenceOrder - 0.5,
          subjectCategory: node.subjectCategory,
          learnRoute: node.learnRoute,
          isReview: true,
          reviewOfNodeId: node.id,
        });
      }
    }

    path.push({
      id: node.id,
      title: node.title,
      status,
      masteryScore: score,
      sequenceOrder: node.sequenceOrder,
      subjectCategory: node.subjectCategory,
      learnRoute: node.learnRoute,
      isReview: false,
      reviewOfNodeId: null,
      unlockHint: status === 'LOCKED' ? unlockHintFor(node) : undefined,
    });
  }

  return path;
}

/**
 * Update mastery after an assessment / lesson / chat practice.
 */
export async function submitModuleAssessment(opts: {
  userId: string;
  nodeId: string;
  scorePercent: number;
}): Promise<{ path: PathNodeDto[]; node: PathNodeDto | null }> {
  const score = Math.max(0, Math.min(100, Math.round(opts.scorePercent)));
  const node = await prisma.moduleNode.findUnique({ where: { id: opts.nodeId } });
  if (!node) throw new Error('Module node not found');

  const needsRemediation = score < 50;

  await prisma.userModuleProgress.upsert({
    where: { userId_nodeId: { userId: opts.userId, nodeId: opts.nodeId } },
    create: {
      userId: opts.userId,
      nodeId: opts.nodeId,
      masteryScore: score,
      needsRemediation,
      lastAttemptedAt: new Date(),
      status: score >= 80 ? 'COMPLETED' : 'IN_PROGRESS',
    },
    update: {
      masteryScore: score,
      needsRemediation,
      lastAttemptedAt: new Date(),
    },
  });

  // Completing a review clears remediation on the parent node
  if (node.isReview && node.reviewOfNodeId && score >= 80) {
    await prisma.userModuleProgress.updateMany({
      where: { userId: opts.userId, nodeId: node.reviewOfNodeId },
      data: { needsRemediation: false },
    });
  }

  const path = await buildLearningPath(opts.userId, node.ageGroup);
  const updated = path.find((n) => n.id === opts.nodeId) ?? null;
  return { path, node: updated };
}
