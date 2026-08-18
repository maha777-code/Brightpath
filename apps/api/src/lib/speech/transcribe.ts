import { validateTranscript, type SttSource } from './validate.js';
import { getElevenLabsApiKey, transcribeWithElevenLabs } from './elevenlabs.js';

export interface TranscribeOptions {
  locale?: string;
  browserTranscript?: string;
  /** Recording length hint in seconds (for validation) */
  durationSec?: number;
}

export function getSttEngine(): SttSource | null {
  if (getElevenLabsApiKey()) return 'elevenlabs';
  return null;
}

function maxWordsForDuration(durationSec?: number): number {
  if (!durationSec || durationSec <= 0) return 24;
  return Math.min(24, Math.max(6, Math.ceil(durationSec * 3.5)));
}

/**
 * Speech-to-text pipeline — ElevenLabs Scribe only.
 * Validated browser transcript is a last-resort fallback if ElevenLabs rejects empty audio.
 */
export async function transcribeSpeech(
  audioBase64: string,
  mimeType: string,
  options: TranscribeOptions = {},
): Promise<{ text: string; source: SttSource }> {
  const audio = Buffer.from(audioBase64, 'base64');
  const maxWords = maxWordsForDuration(options.durationSec);

  console.log(
    `[STT] Audio ${audio.length} bytes, mime=${mimeType}, browser="${(options.browserTranscript ?? '').slice(0, 60)}"`,
  );

  const apiKey = getElevenLabsApiKey();
  if (!apiKey) {
    throw new Error(
      'Speech recognition requires ELEVENLABS_API_KEY in .env (repo root or apps/api/.env). Get a key at https://elevenlabs.io/',
    );
  }

  try {
    const { text: raw } = await transcribeWithElevenLabs(audio, mimeType, apiKey, options.locale);
    const text = validateTranscript(raw, 'elevenlabs');
    if (text && !tooManyWords(text, maxWords)) {
      console.log(`[STT] ✓ ElevenLabs: "${text}"`);
      return { text, source: 'elevenlabs' };
    }
    console.warn(`[STT] ElevenLabs rejected: "${raw.slice(0, 80)}"`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[STT] ElevenLabs error:', msg);

    const browser = options.browserTranscript?.trim();
    if (browser) {
      const text = validateTranscript(browser, 'browser');
      if (text && !tooManyWords(text, maxWords)) {
        console.log(`[STT] ✓ Browser fallback after ElevenLabs error: "${text}"`);
        return { text, source: 'browser' };
      }
    }

    throw new Error(
      `ElevenLabs STT failed: ${msg}. Check ELEVENLABS_API_KEY and restart the API.`,
    );
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
    'ElevenLabs could not understand the audio. Mute the tutor, use headphones, and speak closer to the mic.',
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
