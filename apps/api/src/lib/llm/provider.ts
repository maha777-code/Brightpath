export type LlmProviderName = 'gemini' | 'openai';

export interface LlmJsonRequest {
  system: string;
  user: string;
}

export interface LlmProvider {
  name: LlmProviderName;
  completeJson<T>(req: LlmJsonRequest): Promise<T>;
}

/**
 * Preferred Gemini cycle for capacity / 503 ("high demand") recovery.
 * Env GEMINI_MODEL is tried first when set.
 */
const GEMINI_FALLBACK_SEQUENCE = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-1.5-flash',
] as const;

/** Broader defaults — 3.x often works for newer API keys. */
const GEMINI_MODEL_DEFAULTS = [
  ...GEMINI_FALLBACK_SEQUENCE,
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-2.5-flash-lite',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro',
] as const;

let cachedDiscoveredModels: string[] | null = null;

export function getActiveProvider(): LlmProvider | null {
  if (process.env.GEMINI_API_KEY?.trim()) {
    return createGeminiProvider(process.env.GEMINI_API_KEY.trim());
  }
  if (process.env.OPENAI_API_KEY?.trim()) {
    return createOpenAiProvider(process.env.OPENAI_API_KEY.trim());
  }
  return null;
}

export function getActiveProviderName(): LlmProviderName | null {
  if (process.env.GEMINI_API_KEY?.trim()) return 'gemini';
  if (process.env.OPENAI_API_KEY?.trim()) return 'openai';
  return null;
}

/** Parse JSON from LLM output (handles markdown fences). */
export function parseLlmJson<T>(text: string): T {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(raw) as T;
}

/** Fetch models that support generateContent from Google's API. */
export async function discoverGeminiModels(apiKey: string): Promise<string[]> {
  if (cachedDiscoveredModels) return cachedDiscoveredModels;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`,
    );
    if (!res.ok) return [];

    const data = (await res.json()) as {
      models?: { name?: string; supportedGenerationMethods?: string[] }[];
    };

    const names =
      data.models
        ?.filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m) => (m.name ?? '').replace(/^models\//, ''))
        .filter((n) => n.length > 0)
        .filter((n) => !n.includes('embedding') && !n.includes('aqa'))
        .filter((n) => !n.includes('image') && !n.includes('live') && !n.includes('tts')) ?? [];

    cachedDiscoveredModels = names;
    console.log(
      '[LLM] Discovered Gemini models:',
      names.slice(0, 8).join(', '),
      names.length > 8 ? '...' : '',
    );
    return names;
  } catch {
    return [];
  }
}

function geminiModels(): string[] {
  const preferred = process.env.GEMINI_MODEL?.trim();
  const ordered: string[] = [];
  const pushUnique = (m: string) => {
    if (m && !ordered.includes(m)) ordered.push(m);
  };

  if (preferred) pushUnique(preferred);
  for (const m of GEMINI_FALLBACK_SEQUENCE) pushUnique(m);
  for (const m of GEMINI_MODEL_DEFAULTS) pushUnique(m);
  return ordered;
}

function isRetryableGeminiError(msg: string): boolean {
  return (
    /\b503\b/.test(msg) ||
    /high demand/i.test(msg) ||
    /unavailable/i.test(msg) ||
    /resource.?exhausted/i.test(msg) ||
    /overloaded/i.test(msg) ||
    /\b429\b/.test(msg) ||
    /quota/i.test(msg) ||
    /\b404\b/.test(msg) ||
    /not found/i.test(msg) ||
    /not supported/i.test(msg)
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createGeminiProvider(apiKey: string): LlmProvider {
  return {
    name: 'gemini',
    async completeJson<T>(req: LlmJsonRequest): Promise<T> {
      const tried: string[] = [];
      const errors: string[] = [];

      const candidates = [...geminiModels()];
      const discovered = await discoverGeminiModels(apiKey);
      for (const m of discovered) {
        if (!candidates.includes(m)) candidates.push(m);
      }

      console.log(
        `[LLM] Gemini model cycle (503-aware): ${candidates.slice(0, 6).join(' → ')}${candidates.length > 6 ? ' → …' : ''}`,
      );

      for (const model of candidates) {
        tried.push(model);
        try {
          const result = await callGemini<T>(apiKey, model, req);
          console.log(`[LLM] Using Gemini model: ${model}`);
          return result;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`${model}: ${msg.slice(0, 120)}`);
          const retryable = isRetryableGeminiError(msg);
          console.warn(
            `[LLM] Gemini model ${model} failed${retryable ? ' (retryable → next model)' : ''}:`,
            msg,
          );
          if (/\b503\b|high demand/i.test(msg)) {
            await sleep(400);
          }
        }
      }

      throw new Error(
        `All Gemini models failed (incl. 503 high-demand fallbacks: ${GEMINI_FALLBACK_SEQUENCE.join(', ')}). ` +
          `Tried: ${tried.slice(0, 8).join(', ')}${tried.length > 8 ? '...' : ''}. ` +
          `Last: ${errors.at(-1) ?? 'unknown'}`,
      );
    },
  };
}

async function callGemini<T>(apiKey: string, model: string, req: LlmJsonRequest): Promise<T> {
  try {
    return await callGeminiOnce<T>(apiKey, model, req, true);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('404') || msg.includes('not found') || msg.includes('responseMimeType')) {
      return callGeminiOnce<T>(apiKey, model, req, false);
    }
    throw err;
  }
}

async function callGeminiOnce<T>(
  apiKey: string,
  model: string,
  req: LlmJsonRequest,
  jsonMode: boolean,
): Promise<T> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const generationConfig: Record<string, unknown> = { temperature: 0.5 };
  if (jsonMode) {
    generationConfig.responseMimeType = 'application/json';
  }

  const body = {
    systemInstruction: { parts: [{ text: req.system }] },
    contents: [{ role: 'user', parts: [{ text: req.user }] }],
    generationConfig,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    let detail = err.slice(0, 200);
    try {
      const parsed = JSON.parse(err) as { error?: { message?: string; status?: string } };
      if (parsed.error?.message) detail = parsed.error.message;
    } catch {
      /* use raw */
    }
    throw new Error(`HTTP ${res.status}: ${detail}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    error?: { message?: string; code?: number; status?: string };
  };

  if (data.error?.message) {
    const code = data.error.code ? `HTTP ${data.error.code}: ` : '';
    throw new Error(`${code}${data.error.message}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('empty response');
  }

  return parseLlmJson<T>(text);
}

function createOpenAiProvider(apiKey: string): LlmProvider {
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

  return {
    name: 'openai',
    async completeJson<T>(req: LlmJsonRequest): Promise<T> {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.5,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: req.system },
            { role: 'user', content: req.user },
          ],
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenAI HTTP ${res.status}: ${err.slice(0, 300)}`);
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error('Empty OpenAI response');
      return parseLlmJson<T>(text);
    },
  };
}
