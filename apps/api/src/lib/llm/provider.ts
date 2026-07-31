export type LlmProviderName = 'gemini' | 'openai';

export interface LlmJsonRequest {
  system: string;
  user: string;
}

export interface LlmProvider {
  name: LlmProviderName;
  completeJson<T>(req: LlmJsonRequest): Promise<T>;
}

/** Active Gemini models — new API keys need 3.x (2.5 blocked for new users, Jul 2026). */
const GEMINI_MODEL_DEFAULTS = [
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-2.5-flash-lite',
  'gemini-2.5-pro',
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
    console.log('[LLM] Discovered Gemini models:', names.slice(0, 8).join(', '), names.length > 8 ? '...' : '');
    return names;
  } catch {
    return [];
  }
}

function geminiModels(): string[] {
  const preferred = process.env.GEMINI_MODEL?.trim();
  const base = preferred
    ? [preferred, ...GEMINI_MODEL_DEFAULTS.filter((m) => m !== preferred)]
    : [...GEMINI_MODEL_DEFAULTS];
  return base;
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

      for (const model of candidates) {
        tried.push(model);
        try {
          const result = await callGemini<T>(apiKey, model, req);
          console.log(`[LLM] Using Gemini model: ${model}`);
          return result;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          errors.push(`${model}: ${msg.slice(0, 100)}`);
          console.warn(`[LLM] Gemini model ${model} failed:`, msg);
        }
      }

      throw new Error(
        `All Gemini models failed. Set GEMINI_MODEL=gemini-3.1-flash-lite in apps/api/.env ` +
          `(new API keys cannot use gemini-2.5-flash). Tried: ${tried.slice(0, 6).join(', ')}${tried.length > 6 ? '...' : ''}. ` +
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
      const parsed = JSON.parse(err) as { error?: { message?: string } };
      if (parsed.error?.message) detail = parsed.error.message;
    } catch {
      /* use raw */
    }
    throw new Error(`HTTP ${res.status}: ${detail}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    error?: { message?: string };
  };

  if (data.error?.message) {
    throw new Error(data.error.message);
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
