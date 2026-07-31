import { parseLlmJson } from '../llm/provider.js';

const TRANSCRIBE_MODELS = [
  process.env.GEMINI_MODEL?.trim(),
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
].filter(Boolean) as string[];

export async function transcribeWithGemini(
  audioBase64: string,
  mimeType: string,
  locale = 'en-US',
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const errors: string[] = [];

  for (const model of [...new Set(TRANSCRIBE_MODELS)]) {
    try {
      const text = await transcribeOnce(apiKey, model, audioBase64, mimeType, locale);
      console.log(`[STT] Transcribed with ${model}: "${text.slice(0, 60)}"`);
      return text;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${model}: ${msg.slice(0, 80)}`);
    }
  }

  throw new Error(`Speech transcription failed. ${errors.at(-1) ?? 'Unknown error'}`);
}

async function transcribeOnce(
  apiKey: string,
  model: string,
  audioBase64: string,
  mimeType: string,
  locale: string,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          {
            inline_data: {
              mime_type: mimeType,
              data: audioBase64,
            },
          },
          {
            text:
              `Transcribe the student's spoken answer exactly (${locale}). ` +
              'Short answers only — one word, letter sound, or brief phrase. ' +
              'Return JSON only: {"text":"exact transcription"}',
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    error?: { message?: string };
  };

  if (data.error?.message) throw new Error(data.error.message);

  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error('Empty transcription response');

  const parsed = parseLlmJson<{ text?: string }>(raw);
  const text = parsed.text?.trim();
  if (!text) throw new Error('No speech detected in recording');
  return text;
}
