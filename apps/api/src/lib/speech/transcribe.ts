import { parseLlmJson } from '../llm/provider.js';

export interface TranscribeOptions {
  locale?: string;
  /** Current tutor question — reference only, must NOT be used as the answer */
  contextHint?: string;
}

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
  options: TranscribeOptions = {},
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const locale = options.locale ?? 'en-US';
  const errors: string[] = [];

  for (const model of [...new Set(TRANSCRIBE_MODELS)]) {
    try {
      const text = await transcribeOnce(apiKey, model, audioBase64, mimeType, locale, options.contextHint);
      console.log(`[STT] Transcribed with ${model}: "${text.slice(0, 80)}"`);
      return text;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${model}: ${msg.slice(0, 80)}`);
    }
  }

  throw new Error(`Speech transcription failed. ${errors.at(-1) ?? 'Unknown error'}`);
}

function buildTranscribePrompt(locale: string, contextHint?: string): string {
  const contextBlock = contextHint?.trim()
    ? `\nThe tutor's current question (FOR CONTEXT ONLY — do NOT answer it, do NOT substitute its expected answer):\n"${contextHint.trim()}"\n`
    : '';

  return (
    `You are a verbatim speech-to-text engine for a children's tutoring app (${locale}).\n` +
    `Listen to the audio and write EXACTLY what the student said — word for word, in order.\n` +
    contextBlock +
    `\nRules:\n` +
    `- Transcribe every word spoken, including greetings ("hello how are you"), questions, and full sentences\n` +
    `- Do NOT guess a "lesson answer" (e.g. do NOT output "buh", "zero", or "five" unless the student actually said that)\n` +
    `- Do NOT answer the tutor's question — only transcribe the student's speech\n` +
    `- Do NOT summarize, shorten, or "correct" the student\n` +
    `- Preserve natural casing (e.g. "hello how are you" not "Zero")\n` +
    `- If audio is unclear, transcribe your best literal guess of what was spoken\n` +
    `\nReturn JSON only: {"text":"verbatim transcription here"}`
  );
}

async function transcribeOnce(
  apiKey: string,
  model: string,
  audioBase64: string,
  mimeType: string,
  locale: string,
  contextHint?: string,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const body = {
    systemInstruction: {
      parts: [
        {
          text:
            'You only perform verbatim speech transcription. Never invent answers to tutor questions.',
        },
      ],
    },
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
            text: buildTranscribePrompt(locale, contextHint),
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
