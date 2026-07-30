export type LlmProviderName = 'gemini' | 'openai';

export interface LlmJsonRequest {
  system: string;
  user: string;
}

export interface LlmProvider {
  name: LlmProviderName;
  completeJson<T>(req: LlmJsonRequest): Promise<T>;
}

export function getActiveProvider(): LlmProvider | null {
  if (process.env.GEMINI_API_KEY) {
    return createGeminiProvider(process.env.GEMINI_API_KEY);
  }
  if (process.env.OPENAI_API_KEY) {
    return createOpenAiProvider(process.env.OPENAI_API_KEY);
  }
  return null;
}

export function getActiveProviderName(): LlmProviderName | null {
  if (process.env.GEMINI_API_KEY) return 'gemini';
  if (process.env.OPENAI_API_KEY) return 'openai';
  return null;
}

function createGeminiProvider(apiKey: string): LlmProvider {
  const model = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';

  return {
    name: 'gemini',
    async completeJson<T>(req: LlmJsonRequest): Promise<T> {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: req.system }] },
          contents: [{ role: 'user', parts: [{ text: req.user }] }],
          generationConfig: {
            temperature: 0.4,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gemini error ${res.status}: ${err}`);
      }

      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Empty Gemini response');
      return JSON.parse(text) as T;
    },
  };
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
          temperature: 0.4,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: req.system },
            { role: 'user', content: req.user },
          ],
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenAI error ${res.status}: ${err}`);
      }

      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error('Empty OpenAI response');
      return JSON.parse(text) as T;
    },
  };
}
