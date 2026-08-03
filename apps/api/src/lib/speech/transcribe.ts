import { transcribeWithDeepgram } from './deepgram.js';
import { looksLikeBadTranscript, pickBestTranscript } from './validate.js';
import { parseLlmJson } from '../llm/provider.js';

export interface TranscribeOptions {
  locale?: string;
  browserTranscript?: string;
}

const TRANSCRIBE_MODELS = [
  process.env.GEMINI_MODEL?.trim(),
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
].filter(Boolean) as string[];

export type SttSource = 'deepgram' | 'browser' | 'gemini';

export function getSttEngine(): SttSource | null {
  if (process.env.DEEPGRAM_API_KEY?.trim()) return 'deepgram';
  if (process.env.GEMINI_API_KEY?.trim()) return 'gemini';
  return null;
}

/** Transcribe audio — Deepgram (best) → validated browser text → Gemini (last resort). */
export async function transcribeSpeech(
  audioBase64: string,
  mimeType: string,
  options: TranscribeOptions = {},
): Promise<{ text: string; source: SttSource }> {
  const audio = Buffer.from(audioBase64, 'base64');
  const candidates: { text: string; source: SttSource }[] = [];
  const errors: string[] = [];

  const browser = options.browserTranscript?.trim();
  if (browser && browser.length >= 2) {
    candidates.push({ text: browser, source: 'browser' });
  }

  if (process.env.DEEPGRAM_API_KEY?.trim()) {
    try {
      const text = await transcribeWithDeepgram(audio, mimeType);
      candidates.push({ text, source: 'deepgram' });
      console.log(`[STT] Deepgram: "${text.slice(0, 100)}"`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`deepgram: ${msg.slice(0, 80)}`);
    }
  }

  const pickedEarly = pickBestTranscript(candidates);
  if (pickedEarly?.source === 'deepgram') {
    return pickedEarly;
  }

  if (process.env.GEMINI_API_KEY?.trim()) {
    try {
      const text = await transcribeWithGemini(
        audioBase64,
        mimeType,
        options.locale ?? 'en-US',
      );
      candidates.push({ text, source: 'gemini' });
      console.log(`[STT] Gemini: "${text.slice(0, 100)}"`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`gemini: ${msg.slice(0, 80)}`);
    }
  }

  const picked = pickBestTranscript(candidates);
  if (picked) return picked;

  throw new Error(
    `Could not transcribe speech clearly. ${errors.at(-1) ?? 'Try again — mute Ms. Bright (🔇), use headphones, speak close to the mic.'}`,
  );
}

async function transcribeWithGemini(
  audioBase64: string,
  mimeType: string,
  locale: string,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const errors: string[] = [];

  for (const model of [...new Set(TRANSCRIBE_MODELS)]) {
    try {
      return await transcribeGeminiOnce(apiKey, model, audioBase64, mimeType, locale);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  throw new Error(errors.at(-1) ?? 'Gemini transcription failed');
}

async function transcribeGeminiOnce(
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
          { inline_data: { mime_type: mimeType, data: audioBase64 } },
          {
            text:
              `Verbatim speech-to-text (${locale}). Write ONLY the words the human speaker said.\n` +
              `Return JSON: {"text":"exact words"}. Do not invent text.`,
          },
        ],
      },
    ],
    generationConfig: { temperature: 0, responseMimeType: 'application/json' },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 150)}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error('Empty Gemini response');

  const parsed = parseLlmJson<{ text?: string }>(raw);
  const text = parsed.text?.trim();
  if (!text) throw new Error('No speech in audio');

  if (looksLikeBadTranscript(text)) {
    throw new Error(`Rejected hallucinated transcript: "${text.slice(0, 40)}"`);
  }

  return text;
}

// Re-export for tests
export { looksLikeBadTranscript };
