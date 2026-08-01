import { parseLlmJson } from '../llm/provider.js';

export interface TranscribeOptions {
  locale?: string;
}

const TRANSCRIBE_MODELS = [
  process.env.GEMINI_MODEL?.trim(),
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
].filter(Boolean) as string[];

/** Pure verbatim STT — no tutor question context (that caused "buh" hallucinations). */
export async function transcribeWithGemini(
  audioBase64: string,
  mimeType: string,
  options: TranscribeOptions = {},
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const locale = options.locale ?? 'en-US';
  const errors: string[] = [];

  for (const model of [...new Set(TRANSCRIBE_MODELS)]) {
    try {
      const text = await transcribeOnce(apiKey, model, audioBase64, mimeType, locale);
      console.log(`[STT] Transcribed with ${model}: "${text.slice(0, 100)}"`);
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
              `Speech-to-text task (${locale}). Write EXACTLY what the person says in the audio — every word, in order.\n\n` +
              `Examples of correct output:\n` +
              `- Speaker says "yes ms bright i am ready for question" → {"text":"yes ms bright i am ready for question"}\n` +
              `- Speaker says "hello how are you" → {"text":"hello how are you"}\n` +
              `- Speaker says "buh" → {"text":"buh"}\n\n` +
              `Rules:\n` +
              `- Verbatim only — do NOT answer questions, do NOT guess lesson answers\n` +
              `- Do NOT replace speech with a single phoneme unless they only said one phoneme\n` +
              `- Include names like "Ms Bright" if spoken\n` +
              `- Lowercase is fine\n\n` +
              `Return JSON only: {"text":"exact words spoken"}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
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
