import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';

const router = Router();

/** Keyword RAG over org-shared + global textbook chunks */
export async function searchOrgRag(input: {
  query: string;
  organizationId?: string | null;
  limit?: number;
}) {
  const limit = input.limit ?? 6;
  const tokens = input.query
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 2)
    .slice(0, 12);

  const textbooks = await prisma.textbook.findMany({
    where: {
      status: 'INDEXED',
      OR: [
        { isGlobal: true },
        ...(input.organizationId ? [{ organizationId: input.organizationId }] : []),
      ],
    },
    include: { ragChunks: { orderBy: { sequence: 'asc' } } },
    take: 40,
  });

  const scored: {
    content: string;
    textbookTitle: string;
    textbookId: string;
    pageHint: string | null;
    score: number;
  }[] = [];

  for (const book of textbooks) {
    for (const chunk of book.ragChunks) {
      const hay = chunk.content.toLowerCase();
      let score = 0;
      for (const t of tokens) {
        if (hay.includes(t)) score += 1;
      }
      if (score > 0) {
        scored.push({
          content: chunk.content,
          textbookTitle: book.title,
          textbookId: book.id,
          pageHint: chunk.pageHint,
          score,
        });
      }
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

router.get('/doubt-assistant', requireAuth, async (req: AuthRequest, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    if (!q.trim()) {
      res.status(400).json({ error: 'Query parameter q is required' });
      return;
    }

    const hits = await searchOrgRag({
      query: q,
      organizationId: req.organizationId,
      limit: 6,
    });

    const answer =
      hits.length === 0
        ? 'No matching passages found in your school library yet. Ask a teacher to upload and verify textbooks.'
        : `Based on your shared school library:\n\n${hits
            .map(
              (h, i) =>
                `${i + 1}. (${h.textbookTitle}${h.pageHint ? `, ${h.pageHint}` : ''})\n${h.content.slice(0, 400)}`,
            )
            .join('\n\n')}`;

    res.json({
      query: q,
      answer,
      sources: hits.map((h) => ({
        textbookId: h.textbookId,
        title: h.textbookTitle,
        pageHint: h.pageHint,
        excerpt: h.content.slice(0, 280),
        score: h.score,
      })),
      organizationId: req.organizationId ?? null,
    });
  } catch (err) {
    console.error('doubt-assistant failed:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'RAG query failed' });
  }
});

router.post('/doubt-assistant', requireAuth, async (req: AuthRequest, res) => {
  const schema = z.object({ question: z.string().min(3) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  req.query.q = parsed.data.question;
  // reuse GET handler logic
  const hits = await searchOrgRag({
    query: parsed.data.question,
    organizationId: req.organizationId,
  });
  res.json({
    query: parsed.data.question,
    answer:
      hits.length === 0
        ? 'No matching passages found in your school library yet.'
        : hits.map((h) => h.content).join('\n\n---\n\n'),
    sources: hits,
  });
});

export default router;
