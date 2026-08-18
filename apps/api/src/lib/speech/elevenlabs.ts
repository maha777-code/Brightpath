/** ElevenLabs — primary STT (Scribe) + TTS with free-tier voice defaults */

/** Free-tier premade voices (do not use Instant Voice Clones / paid library IDs). */
export const ELEVENLABS_FREE_VOICE_SARAH = 'EXAVITQu4vr4xnSDxMaL';
export const ELEVENLABS_FREE_VOICE_RACHEL = '21m00Tcm4TlvDq8ikWAM';

export class ElevenLabsHttpError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string, kind: 'STT' | 'TTS' = 'TTS') {
    super(`ElevenLabs ${kind} HTTP ${status}: ${body.slice(0, 240)}`);
    this.name = 'ElevenLabsHttpError';
    this.status = status;
    this.body = body;
  }
}

export function getElevenLabsApiKey(): string | null {
  const key = process.env.ELEVENLABS_API_KEY?.trim().replace(/^["']|["']$/g, '');
  return key || null;
}

/**
 * Prefer env voice only if set; otherwise Sarah (free premade).
 * Never default to Instant Voice Clone / custom library IDs.
 */
export function getElevenLabsVoiceId(): string {
  const fromEnv = process.env.ELEVENLABS_VOICE_ID?.trim();
  if (fromEnv && fromEnv.length > 8) return fromEnv;
  return ELEVENLABS_FREE_VOICE_SARAH;
}

export function isBillingOrAuthError(err: unknown): boolean {
  if (err instanceof ElevenLabsHttpError) {
    return err.status === 401 || err.status === 402 || err.status === 403;
  }
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /\b402\b/.test(msg) ||
    /\b401\b/.test(msg) ||
    /payment_required/i.test(msg) ||
    /quota_exceeded/i.test(msg) ||
    /free_user.*voice/i.test(msg) ||
    /missing_permissions/i.test(msg)
  );
}

function extForMime(mimeType: string): string {
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('webm')) return 'webm';
  return 'webm';
}

/**
 * Speech-to-text via ElevenLabs Scribe (`POST /v1/speech-to-text`).
 */
export async function transcribeWithElevenLabs(
  audio: Buffer,
  mimeType: string,
  apiKey: string,
  locale?: string,
): Promise<{ text: string; words: { word: string; start: number; end: number }[] }> {
  const form = new FormData();
  const bytes = new Uint8Array(audio);
  const blob = new Blob([bytes], { type: mimeType || 'audio/webm' });
  form.append('file', blob, `speech.${extForMime(mimeType)}`);
  form.append('model_id', process.env.ELEVENLABS_STT_MODEL?.trim() || 'scribe_v2');
  form.append('timestamps_granularity', 'word');
  if (locale) {
    const lang = locale.split('-')[0]?.toLowerCase();
    if (lang) form.append('language_code', lang);
  }

  const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
    },
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new ElevenLabsHttpError(res.status, errText, 'STT');
  }

  const data = (await res.json()) as {
    text?: string;
    words?: { text?: string; word?: string; start?: number; end?: number; type?: string }[];
  };

  const text = (data.text ?? '').trim();
  if (!text) throw new Error('ElevenLabs returned empty transcript — speak louder or check mic');

  const words =
    data.words
      ?.filter((w) => (w.type ? w.type === 'word' : true) && (w.text || w.word))
      .map((w) => ({
        word: String(w.text || w.word || '').trim(),
        start: Number(w.start ?? 0),
        end: Number(w.end ?? w.start ?? 0),
      }))
      .filter((w) => w.word.length > 0) ?? [];

  console.log(`[STT] ElevenLabs words=${words.length} text="${text.slice(0, 80)}"`);
  return { text, words };
}

export type ElevenLabsTtsResult = {
  audio: Buffer;
  durationSec: number;
  wordTimings: { word: string; start: number; end: number }[];
  provider: 'elevenlabs' | 'google_tts';
};

const TTS_MODEL =
  process.env.ELEVENLABS_TTS_MODEL?.trim() || 'eleven_turbo_v2_5';

async function callElevenLabsTts(
  text: string,
  apiKey: string,
  voiceId: string,
): Promise<ElevenLabsTtsResult> {
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: TTS_MODEL,
      }),
    },
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    // Plain TTS fallback (same voice) when with-timestamps isn't available
    if (res.status !== 401 && res.status !== 402 && res.status !== 403) {
      const plain = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
            Accept: 'audio/mpeg',
          },
          body: JSON.stringify({
            text,
            model_id: TTS_MODEL,
          }),
        },
      );
      if (plain.ok) {
        const audio = Buffer.from(await plain.arrayBuffer());
        return {
          audio,
          durationSec: estimateDurationSec(text),
          wordTimings: estimateWordTimings(text, estimateDurationSec(text)),
          provider: 'elevenlabs',
        };
      }
      const plainErr = await plain.text().catch(() => plain.statusText);
      throw new ElevenLabsHttpError(plain.status, plainErr || errText, 'TTS');
    }
    throw new ElevenLabsHttpError(res.status, errText, 'TTS');
  }

  const data = (await res.json()) as {
    audio_base64?: string;
    alignment?: {
      characters?: string[];
      character_start_times_seconds?: number[];
      character_end_times_seconds?: number[];
    };
    normalized_alignment?: {
      characters?: string[];
      character_start_times_seconds?: number[];
      character_end_times_seconds?: number[];
    };
  };

  if (!data.audio_base64) {
    throw new Error('ElevenLabs TTS returned no audio');
  }

  const audio = Buffer.from(data.audio_base64, 'base64');
  const align = data.normalized_alignment ?? data.alignment;
  const wordTimings = alignmentToWords(align);
  const durationSec =
    wordTimings.length > 0
      ? Math.max(wordTimings[wordTimings.length - 1].end, 1)
      : estimateDurationSec(text);

  return { audio, durationSec, wordTimings, provider: 'elevenlabs' };
}

/**
 * Text-to-speech: try free premade voice(s), then Google TTS on 401/402.
 */
export async function synthesizeWithElevenLabs(
  text: string,
  apiKey: string,
  voiceId: string,
): Promise<ElevenLabsTtsResult> {
  const voicesToTry = Array.from(
    new Set([voiceId, ELEVENLABS_FREE_VOICE_SARAH, ELEVENLABS_FREE_VOICE_RACHEL]),
  );

  let lastErr: unknown;
  for (const id of voicesToTry) {
    try {
      return await callElevenLabsTts(text, apiKey, id);
    } catch (err) {
      lastErr = err;
      if (isBillingOrAuthError(err)) {
        console.warn(
          `[TTS] ElevenLabs voice ${id} blocked (${err instanceof ElevenLabsHttpError ? err.status : '?'}). Trying next…`,
        );
        continue;
      }
      throw err;
    }
  }

  if (isBillingOrAuthError(lastErr)) {
    console.warn(
      '[TTS] ElevenLabs payment required / free tier voice blocked. Falling back to free Google TTS…',
    );
    return synthesizeWithGoogleTts(text);
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/** Chunked Google Translate TTS (no API key; free fallback for video pipeline). */
export async function synthesizeWithGoogleTts(text: string): Promise<ElevenLabsTtsResult> {
  const chunks = chunkText(text, 180);
  const buffers: Buffer[] = [];

  for (const chunk of chunks) {
    const url =
      `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=` +
      encodeURIComponent(chunk);
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; BrightPathVideoPipeline/1.0; +https://localhost)',
        Accept: 'audio/mpeg',
      },
    });
    if (!res.ok) {
      throw new Error(`Google TTS HTTP ${res.status} — could not synthesize fallback audio`);
    }
    buffers.push(Buffer.from(await res.arrayBuffer()));
  }

  const audio = Buffer.concat(buffers);
  const durationSec = estimateDurationSec(text);
  return {
    audio,
    durationSec,
    wordTimings: estimateWordTimings(text, durationSec),
    provider: 'google_tts',
  };
}

function chunkText(text: string, maxLen: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return ['.'];
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxLen && cur) {
      out.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) out.push(cur);
  return out;
}

function estimateDurationSec(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(8, (words / 150) * 60);
}

export function estimateWordTimings(text: string, durationSec: number) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [] as { word: string; start: number; end: number }[];
  const slot = durationSec / words.length;
  return words.map((word, i) => ({
    word,
    start: Number((i * slot).toFixed(3)),
    end: Number(((i + 1) * slot).toFixed(3)),
  }));
}

function alignmentToWords(align?: {
  characters?: string[];
  character_start_times_seconds?: number[];
  character_end_times_seconds?: number[];
}): { word: string; start: number; end: number }[] {
  if (!align?.characters?.length) return [];
  const chars = align.characters;
  const starts = align.character_start_times_seconds ?? [];
  const ends = align.character_end_times_seconds ?? [];

  const words: { word: string; start: number; end: number }[] = [];
  let current = '';
  let wordStart = 0;
  let wordEnd = 0;

  const flush = () => {
    const w = current.trim();
    if (w) words.push({ word: w, start: Number(wordStart.toFixed(3)), end: Number(wordEnd.toFixed(3)) });
    current = '';
  };

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const s = starts[i] ?? wordEnd;
    const e = ends[i] ?? s;
    if (/\s/.test(ch)) {
      flush();
      continue;
    }
    if (!current) wordStart = s;
    current += ch;
    wordEnd = e;
  }
  flush();
  return words;
}
