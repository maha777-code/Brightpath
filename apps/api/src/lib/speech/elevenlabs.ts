/** ElevenLabs — primary STT (Scribe) and shared API key helpers */

export function getElevenLabsApiKey(): string | null {
  const key = process.env.ELEVENLABS_API_KEY?.trim().replace(/^["']|["']$/g, '');
  return key || null;
}

export function getElevenLabsVoiceId(): string {
  return process.env.ELEVENLABS_VOICE_ID?.trim() || '21m00Tcm4TlvDq8ikWAM';
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
    throw new Error(`ElevenLabs STT HTTP ${res.status}: ${errText.slice(0, 240)}`);
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
};

/**
 * Text-to-speech with character/word alignment when available.
 * `POST /v1/text-to-speech/{voice_id}/with-timestamps`
 */
export async function synthesizeWithElevenLabs(
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
        model_id: process.env.ELEVENLABS_TTS_MODEL?.trim() || 'eleven_multilingual_v2',
      }),
    },
  );

  if (!res.ok) {
    // Fallback to plain TTS if with-timestamps is unavailable on the plan
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
          model_id: process.env.ELEVENLABS_TTS_MODEL?.trim() || 'eleven_multilingual_v2',
        }),
      },
    );
    if (!plain.ok) {
      const errText = await plain.text().catch(() => plain.statusText);
      throw new Error(`ElevenLabs TTS HTTP ${plain.status}: ${errText.slice(0, 240)}`);
    }
    const audio = Buffer.from(await plain.arrayBuffer());
    const words = text.split(/\s+/).filter(Boolean);
    const durationSec = Math.max(8, (words.length / 150) * 60);
    const slot = durationSec / Math.max(words.length, 1);
    return {
      audio,
      durationSec,
      wordTimings: words.map((word, i) => ({
        word,
        start: Number((i * slot).toFixed(3)),
        end: Number(((i + 1) * slot).toFixed(3)),
      })),
    };
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
      : Math.max(8, (text.split(/\s+/).filter(Boolean).length / 150) * 60);

  return { audio, durationSec, wordTimings };
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
