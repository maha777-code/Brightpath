const EMBED_DIM = 256;

function l2Normalize(vec: number[]): number[] {
  const mag = Math.sqrt(vec.reduce((sum, n) => sum + n * n, 0)) || 1;
  return vec.map((n) => n / mag);
}

function hashEmbedding(text: string): number[] {
  const vec = new Array<number>(EMBED_DIM).fill(0);
  const tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2);
  for (const token of tokens) {
    let h = 2166136261;
    for (let i = 0; i < token.length; i++) {
      h ^= token.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    const idx = Math.abs(h) % EMBED_DIM;
    vec[idx] += 1;
    vec[(idx + 13) % EMBED_DIM] += 0.35;
  }
  return l2Normalize(vec);
}

async function embedOpenAi(texts: string[]): Promise<number[][] | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_EMBED_MODEL ?? 'text-embedding-3-small',
        input: texts,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: { embedding?: number[] }[] };
    const rows = data.data ?? [];
    if (rows.length !== texts.length) return null;
    return rows.map((row) => l2Normalize((row.embedding ?? []).slice(0, EMBED_DIM)));
  } catch {
    return null;
  }
}

async function embedGemini(texts: string[]): Promise<number[][] | null> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return null;
  const model = process.env.GEMINI_EMBED_MODEL?.trim() || 'text-embedding-004';
  const out: number[][] = [];
  try {
    for (const text of texts) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: { parts: [{ text: text.slice(0, 8000) }] },
          }),
        },
      );
      if (!res.ok) return null;
      const data = (await res.json()) as { embedding?: { values?: number[] } };
      const values = data.embedding?.values ?? [];
      if (!values.length) return null;
      out.push(l2Normalize(values.slice(0, EMBED_DIM)));
    }
    return out;
  } catch {
    return null;
  }
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];
  const fromOpenAi = await embedOpenAi(texts);
  if (fromOpenAi) return fromOpenAi;
  const fromGemini = await embedGemini(texts);
  if (fromGemini) return fromGemini;
  return texts.map(hashEmbedding);
}

export function toPgVectorLiteral(vec: number[]): string {
  return `[${vec.map((n) => (Number.isFinite(n) ? n.toFixed(6) : '0')).join(',')}]`;
}
