import { KNOWLEDGE_CHUNKS, type KnowledgeChunk } from '../../data/knowledge.js';

export function retrieveContext(
  subject: string,
  skillTag: string,
  ageBand: string,
  query: string,
  limit = 4,
): string[] {
  const q = query.toLowerCase();
  const scored = KNOWLEDGE_CHUNKS.map((chunk) => ({
    chunk,
    score: scoreChunk(chunk, subject, skillTag, ageBand, q),
  }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  const top = scored.slice(0, limit).map(({ chunk }) => chunk.content);
  if (top.length === 0) {
    return KNOWLEDGE_CHUNKS.filter(
      (c) => c.subject === subject && c.ageBands.includes(ageBand),
    )
      .slice(0, 2)
      .map((c) => c.content);
  }
  return top;
}

function scoreChunk(
  chunk: KnowledgeChunk,
  subject: string,
  skillTag: string,
  ageBand: string,
  query: string,
): number {
  let score = 0;
  if (chunk.subject === subject) score += 3;
  if (chunk.ageBands.includes(ageBand)) score += 2;
  if (skillTag && chunk.skillTags.includes(skillTag)) score += 5;
  if (chunk.skillTags.length === 0) score += 1;

  const words = query.split(/\s+/).filter((w) => w.length > 3);
  for (const word of words) {
    if (chunk.content.toLowerCase().includes(word)) score += 1;
  }
  return score;
}
