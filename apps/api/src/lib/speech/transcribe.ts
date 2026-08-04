import { transcribeWithDeepgram } from './deepgram.js';
import { validateTranscript, type SttSource } from './validate.js';

export interface TranscribeOptions {
  locale?: string;
  browserTranscript?: string;
  /** Recording length hint in seconds (for validation) */
  durationSec?: number;
}

export function getSttEngine(): SttSource | null {
  if (process.env.DEEPGRAM_API_KEY?.trim()) return 'deepgram';
  return null;
}

function maxWordsForDuration(durationSec?: number): number {
  if (!durationSec || durationSec <= 0) return 24;
  // ~3 words per second upper bound for natural speech
  return Math.min(24, Math.max(6, Math.ceil(durationSec * 3.5)));
}

/**
 * Speech-to-text pipeline:
 * 1. Deepgram ONLY when DEEPGRAM_API_KEY is set (never Gemini for audio — it hallucinates)
 * 2. Validated browser transcript as fallback if Deepgram fails
 */
export async function transcribeSpeech(
  audioBase64: string,
  mimeType: string,
  options: TranscribeOptions = {},
): Promise<{ text: string; source: SttSource }> {
  const audio = Buffer.from(audioBase64, 'base64');
  const maxWords = maxWordsForDuration(options.durationSec);

  console.log(`[STT] Audio ${audio.length} bytes, mime=${mimeType}, browser="${(options.browserTranscript ?? '').slice(0, 60)}"`);

  const deepgramKey = process.env.DEEPGRAM_API_KEY?.trim().replace(/^["']|["']$/g, '');

  if (deepgramKey) {
    try {
      const raw = await transcribeWithDeepgram(audio, mimeType, deepgramKey);
      const text = validateTranscript(raw, 'deepgram');
      if (text && !tooManyWords(text, maxWords)) {
        console.log(`[STT] ✓ Deepgram: "${text}"`);
        return { text, source: 'deepgram' };
      }
      console.warn(`[STT] Deepgram rejected: "${raw.slice(0, 80)}"`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[STT] Deepgram error:', msg);
      throw new Error(
        `Deepgram failed: ${msg}. Check DEEPGRAM_API_KEY in apps/api/.env and restart the API.`,
      );
    }
    throw new Error('Deepgram could not understand the audio. Mute 🔇 Ms. Bright, use headphones, speak closer to the mic.');
  }

  const browser = options.browserTranscript?.trim();
  if (browser) {
    const text = validateTranscript(browser, 'browser');
    if (text && !tooManyWords(text, maxWords)) {
      console.log(`[STT] ✓ Browser fallback: "${text}"`);
      return { text, source: 'browser' };
    }
  }

  throw new Error(
    'Speech recognition requires DEEPGRAM_API_KEY in .env and apps/api/.env. Get a free key at https://console.deepgram.com/',
  );
}

function tooManyWords(text: string, maxWords: number): boolean {
  const n = text.trim().split(/\s+/).filter(Boolean).length;
  if (n > maxWords) {
    console.warn(`[STT] Rejected ${n} words (max ${maxWords}): "${text.slice(0, 60)}..."`);
    return true;
  }
  return false;
}
