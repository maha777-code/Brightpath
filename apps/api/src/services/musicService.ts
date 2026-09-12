/**
 * Educational song audio via music-generation models (not TTS).
 * Primary: Google Lyria 3.5 (Gemini API). Fallback: ElevenLabs Music.
 */

const GEMINI_INTERACTIONS = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const GEMINI_MODELS = 'https://generativelanguage.googleapis.com/v1beta/models';
const ELEVENLABS_MUSIC = 'https://api.elevenlabs.io/v1/music';
const API_REVISION = '2026-05-20';
const DEFAULT_DURATION_SEC = 90;
const MUSIC_TIMEOUT_MS = 180_000;
const POLL_INTERVAL_MS = 4_000;

const LYRIA_FULL_MODELS = ['lyria-3.5', 'lyria-3-pro-preview'] as const;
const LYRIA_CLIP_MODELS = ['lyria-3-clip-preview'] as const;

export interface EducationalSongParams {
  topic: string;
  lyrics: string;
  style: string;
  gradeLevel: string;
  voiceId?: string;
}

export interface MusicGenRequest {
  prompt: string;
  durationSeconds: number;
  audioFormat: 'mp3' | 'wav';
  stylePreset: string;
}

export interface MusicGenResult {
  audio: Buffer;
  mimeType: string;
  provider: string;
}

type StylePreset = {
  bpm: number;
  description: string;
  instruments: string;
  groove: string;
};

const STYLE_PRESETS: Record<string, StylePreset> = {
  'Classic Schoolhouse Rock': {
    bpm: 124,
    description: '1970s Schoolhouse Rock educational cartoon jazz-rock with a singable hook',
    instruments: 'walking electric bass, punchy kit drums, bright brass stabs, electric piano, catchy lead vocal melody',
    groove: 'strong backbeat, lightly swung eighths, verse-chorus form',
  },
  'Modern Pop': {
    bpm: 118,
    description: 'contemporary radio pop with a bright, catchy chorus',
    instruments: 'synth bass, four-on-the-floor and clap drums, layered synth pads, electric guitar, pop lead vocal',
    groove: 'steady 4/4 pop groove, pre-chorus lift into a big chorus',
  },
  'Hip Hop': {
    bpm: 92,
    description: 'upbeat educational hip hop with rhythmic cadence and a memorable hook',
    instruments: '808/sub bassline, boom-bap drums, vinyl-style keys, rhythmic sung-rap vocals',
    groove: 'head-nodding drum pocket, verse flow into sung chorus',
  },
  'Acoustic Folk': {
    bpm: 102,
    description: 'warm acoustic folk classroom singalong',
    instruments: 'acoustic guitar strumming, light shaker and kick, upright-style bass, harmonica fills, intimate lead vocal',
    groove: 'gentle 4/4 folk strum, verse-chorus campfire structure',
  },
};

const VOICE_DIRECTION: Record<string, string> = {
  'bright-kids': 'sung by a bright children\'s choir with clear diction and unison melody',
  'warm-alto': 'sung by a warm adult female alto with classroom-friendly tone',
  'upbeat-tenor': 'sung by an upbeat adult male tenor',
  classroom: 'sung by a clear, encouraging teacher with a melodic singing voice (not spoken narration)',
};

function geminiApiKey(): string | null {
  return process.env.GEMINI_API_KEY?.trim() || null;
}

function lyriaModels(): string[] {
  const preferred = process.env.LYRIA_MODEL?.trim();
  const ordered: string[] = [];
  const push = (id: string) => {
    if (id && !ordered.includes(id)) ordered.push(id);
  };
  if (preferred) push(preferred);
  for (const id of LYRIA_FULL_MODELS) push(id);
  for (const id of LYRIA_CLIP_MODELS) push(id);
  return ordered;
}

function stylePreset(style: string): StylePreset {
  return (
    STYLE_PRESETS[style] ?? {
      bpm: 120,
      description: `${style} educational song`,
      instruments: 'drums, bassline, backing instruments, catchy sung melody',
      groove: 'strong rhythmic beat, verse-chorus structure',
    }
  );
}

function taggedLyrics(lyrics: string): string {
  const trimmed = lyrics.trim();
  if (/^\s*\[(verse|chorus|bridge|intro|outro)/im.test(trimmed)) return trimmed;
  const lines = trimmed.split(/\r?\n/);
  const tagged: string[] = ['[Verse 1]'];
  let chorusInserted = false;
  for (const line of lines) {
    const heading = line.trim();
    if (/^(verse|chorus|bridge|intro|outro)\b/i.test(heading) && !heading.startsWith('[')) {
      tagged.push(`[${heading}]`);
      continue;
    }
    tagged.push(line);
    if (!chorusInserted && tagged.length > 8 && heading.length === 0) {
      tagged.push('[Chorus]');
      chorusInserted = true;
    }
  }
  if (!chorusInserted) tagged.splice(Math.min(6, tagged.length), 0, '[Chorus]');
  return tagged.join('\n');
}

export function buildMusicPrompt(params: EducationalSongParams, durationSeconds: number): string {
  const preset = stylePreset(params.style);
  const voice = VOICE_DIRECTION[params.voiceId ?? ''] ?? 'sung lead vocals (not spoken text-to-speech)';
  const lyrics = taggedLyrics(params.lyrics);
  const durationHint =
    durationSeconds <= 35
      ? 'Create a tight 30-second highlight that still feels like a full hook with drums, bass, and melody.'
      : `Create a complete ${durationSeconds}-second song with intro, verses, chorus, and a short outro.`;

  return `An upbeat, catchy educational song for grade level ${params.gradeLevel}.
Topic: ${params.topic}.
Genre and Style: ${params.style} (e.g. Nursery Rhyme / Schoolhouse Rock with strong rhythmic beat, drums, bassline, and catchy melody).
Musical attributes:
- Tempo: ${preset.bpm} BPM
- Groove: ${preset.groove}
- Instrumentation: ${preset.instruments}
- Arrangement: ${preset.description}
- Vocals: ${voice}. The lyrics must be SUNG on pitch with rhythm — never read as speech, never spoken TTS.
- Structure: intro → verse → chorus → verse → chorus → short outro. Use rhythmic cadence so classroom students can clap along.
${durationHint}
Full mix: stereo, 44.1 kHz, vocals sitting on top of backing instruments, drums, and bass.

Lyrics (sing these exact words; keep section tags):
${lyrics}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isMp3(buf: Buffer): boolean {
  return buf.length > 4 && (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0 || buf.subarray(0, 3).toString() === 'ID3');
}

function isWav(buf: Buffer): boolean {
  return buf.length > 12 && buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WAVE';
}

function decodeBase64Audio(raw: string): Buffer | null {
  const cleaned = raw.replace(/^data:audio\/[a-z0-9+.-]+;base64,/i, '').replace(/\s+/g, '');
  if (cleaned.length < 80) return null;
  try {
    const buf = Buffer.from(cleaned, 'base64');
    return buf.length > 400 ? buf : null;
  } catch {
    return null;
  }
}

function pcmToWav(pcm: Buffer, sampleRate = 44100, channels = 2): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * 2, 28);
  header.writeUInt16LE(channels * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

function mimeForAudio(buf: Buffer, hinted?: string): string {
  if (hinted?.includes('wav') || isWav(buf)) return 'audio/wav';
  if (hinted?.includes('mpeg') || hinted?.includes('mp3') || isMp3(buf)) return 'audio/mpeg';
  if (hinted?.includes('pcm') || hinted?.includes('l16')) return 'audio/wav';
  return isWav(buf) ? 'audio/wav' : 'audio/mpeg';
}

function extractAudioFromUnknown(value: unknown, depth = 0): { audio: Buffer; mime?: string } | null {
  if (depth > 12 || value == null) return null;
  if (Buffer.isBuffer(value) && value.length > 400) return { audio: value };

  if (typeof value === 'string') {
    const decoded = decodeBase64Audio(value);
    if (decoded && (isMp3(decoded) || isWav(decoded))) {
      return { audio: decoded };
    }
    return null;
  }

  if (Array.isArray(value)) {
    let best: { audio: Buffer; mime?: string } | null = null;
    for (const item of value) {
      const found = extractAudioFromUnknown(item, depth + 1);
      if (found && (!best || found.audio.length > best.audio.length)) best = found;
    }
    return best;
  }

  if (typeof value !== 'object') return null;
  const rec = value as Record<string, unknown>;
  const type = String(rec.type ?? rec.kind ?? '').toLowerCase();
  const mime = String(rec.mime_type ?? rec.mimeType ?? rec.mime ?? rec.output_format ?? '');
  const looksAudio =
    type === 'audio' ||
    type.includes('audio') ||
    /audio\//i.test(mime) ||
    rec.output_audio != null ||
    rec.inlineData != null ||
    rec.inline_data != null;

  const inline = rec.inlineData ?? rec.inline_data;
  if (inline && typeof inline === 'object') {
    const blob = inline as Record<string, unknown>;
    const data = blob.data ?? blob.bytes;
    if (typeof data === 'string') {
      const decoded = decodeBase64Audio(data);
      if (decoded) {
        const hinted = String(blob.mimeType ?? blob.mime_type ?? mime);
        if (/pcm|l16/i.test(hinted) && !isWav(decoded) && !isMp3(decoded)) {
          return { audio: pcmToWav(decoded), mime: 'audio/wav' };
        }
        return { audio: decoded, mime: hinted || undefined };
      }
    }
    if (Buffer.isBuffer(data) && data.length > 400) return { audio: data, mime };
  }

  if (looksAudio && typeof rec.data === 'string') {
    const decoded = decodeBase64Audio(rec.data);
    if (decoded) {
      if (/pcm|l16/i.test(mime) && !isWav(decoded) && !isMp3(decoded)) {
        return { audio: pcmToWav(decoded), mime: 'audio/wav' };
      }
      return { audio: decoded, mime: mime || undefined };
    }
  }

  if (rec.output_audio) {
    const found = extractAudioFromUnknown(rec.output_audio, depth + 1);
    if (found) return found;
  }

  let best: { audio: Buffer; mime?: string } | null = null;
  for (const key of ['steps', 'outputs', 'content', 'candidates', 'parts', 'model_output']) {
    if (rec[key] == null) continue;
    const found = extractAudioFromUnknown(rec[key], depth + 1);
    if (found && (!best || found.audio.length > best.audio.length)) best = found;
  }
  return best;
}

async function geminiFetch(url: string, init: RequestInit, timeoutMs = MUSIC_TIMEOUT_MS): Promise<Response> {
  const key = geminiApiKey();
  if (!key) throw new Error('GEMINI_API_KEY is not set');
  const res = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': key,
      'Api-Revision': API_REVISION,
      ...(init.headers ?? {}),
    },
  });
  return res;
}

async function pollInteraction(id: string): Promise<unknown> {
  const deadline = Date.now() + MUSIC_TIMEOUT_MS;
  let last: unknown = null;
  while (Date.now() < deadline) {
    const res = await geminiFetch(`${GEMINI_INTERACTIONS}/${encodeURIComponent(id)}`, { method: 'GET' }, 30_000);
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      throw new Error(`Lyria poll HTTP ${res.status}: ${JSON.stringify(json).slice(0, 240)}`);
    }
    last = json;
    const status = String(json.status ?? '').toLowerCase();
    const audio = extractAudioFromUnknown(json);
    if (audio) return json;
    if (status === 'completed' || status === 'failed' || status === 'cancelled' || status === 'incomplete' || status === 'budget_exceeded') {
      return json;
    }
    await sleep(POLL_INTERVAL_MS);
  }
  return last;
}

async function generateWithLyriaInteractions(model: string, prompt: string, background: boolean): Promise<MusicGenResult> {
  const body: Record<string, unknown> = {
    model,
    input: prompt,
    response_format: { type: 'audio' },
    response_modalities: ['AUDIO', 'TEXT'],
  };
  if (background) body.background = true;

  const res = await geminiFetch(GEMINI_INTERACTIONS, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(`Lyria interactions HTTP ${res.status} (${model}): ${JSON.stringify(json).slice(0, 280)}`);
  }

  const status = String(json.status ?? '').toLowerCase();
  const id = typeof json.id === 'string' ? json.id : typeof json.name === 'string' ? json.name : '';
  let payload: unknown = json;
  if (background || status === 'in_progress' || status === 'queued' || (id && !extractAudioFromUnknown(json))) {
    if (!id) throw new Error(`Lyria ${model} returned no interaction id`);
    payload = await pollInteraction(id);
  }

  const found = extractAudioFromUnknown(payload);
  if (!found) {
    throw new Error(`Lyria ${model} completed without audio`);
  }
  return {
    audio: found.audio,
    mimeType: mimeForAudio(found.audio, found.mime),
    provider: `lyria:${model}`,
  };
}

async function generateWithLyriaContent(model: string, prompt: string): Promise<MusicGenResult> {
  const res = await geminiFetch(`${GEMINI_MODELS}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['AUDIO', 'TEXT'],
        response_format: { type: 'audio' },
      },
    }),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new Error(`Lyria generateContent HTTP ${res.status} (${model}): ${JSON.stringify(json).slice(0, 280)}`);
  }
  const found = extractAudioFromUnknown(json);
  if (!found) throw new Error(`Lyria generateContent ${model} returned no audio`);
  return {
    audio: found.audio,
    mimeType: mimeForAudio(found.audio, found.mime),
    provider: `lyria-content:${model}`,
  };
}

async function generateWithElevenLabsMusic(prompt: string, durationSeconds: number): Promise<MusicGenResult> {
  const key = process.env.ELEVENLABS_API_KEY?.trim().replace(/^["']|["']$/g, '');
  if (!key) throw new Error('ELEVENLABS_API_KEY is not set');

  const lengthMs = Math.min(600_000, Math.max(10_000, Math.round(durationSeconds * 1000)));
  const res = await fetch(`${ELEVENLABS_MUSIC}?output_format=mp3_44100_128`, {
    method: 'POST',
    signal: AbortSignal.timeout(MUSIC_TIMEOUT_MS),
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': key,
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      prompt,
      music_length_ms: lengthMs,
      model_id: process.env.ELEVENLABS_MUSIC_MODEL?.trim() || 'music_v2',
      force_instrumental: false,
    }),
  });

  const contentType = res.headers.get('content-type') ?? '';
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`ElevenLabs Music HTTP ${res.status}: ${body.slice(0, 280)}`);
  }

  const bytes = Buffer.from(await res.arrayBuffer());
  if (contentType.includes('json')) {
    const json = JSON.parse(bytes.toString('utf8')) as unknown;
    const found = extractAudioFromUnknown(json);
    if (!found) throw new Error('ElevenLabs Music JSON response had no audio');
    return { audio: found.audio, mimeType: mimeForAudio(found.audio, found.mime), provider: 'elevenlabs-music' };
  }
  if (bytes.length < 800) throw new Error('ElevenLabs Music returned empty audio');
  return { audio: bytes, mimeType: mimeForAudio(bytes, contentType), provider: 'elevenlabs-music' };
}

function writeWav(samples: Int16Array, sampleRate: number, channels: number): Buffer {
  const data = Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * 2, 28);
  header.writeUInt16LE(channels * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

/** Last-resort stereo arrangement (drums + bass + chords + melody). Never TTS. */
function composeLocalArrangement(params: EducationalSongParams, durationSeconds: number): MusicGenResult {
  const preset = stylePreset(params.style);
  const sampleRate = 22050;
  const channels = 2;
  const seconds = Math.min(90, Math.max(28, durationSeconds));
  const total = sampleRate * seconds;
  const samples = new Int16Array(total * channels);
  const bpm = preset.bpm;
  const beat = 60 / bpm;
  const bar = beat * 4;
  const seed = [...params.topic].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const scale = [0, 2, 4, 5, 7, 9, 11, 12];
  const roots = [48, 53, 45, 50];
  const twoPi = Math.PI * 2;

  const midiHz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
  const env = (t: number, attack: number, dur: number) => {
    if (t < 0 || t > dur) return 0;
    if (t < attack) return t / attack;
    const rel = (dur - t) / Math.max(0.04, dur * 0.35);
    return Math.max(0, Math.min(1, rel));
  };

  for (let i = 0; i < total; i++) {
    const t = i / sampleRate;
    const barIndex = Math.floor(t / bar);
    const inBar = t - barIndex * bar;
    const beatIndex = Math.floor(inBar / beat);
    const inBeat = inBar - beatIndex * beat;
    const chord = roots[(barIndex + Math.floor(seed / 7)) % roots.length];
    const chorus = barIndex % 8 >= 4;

    let kick = 0;
    if (beatIndex === 0 || beatIndex === 2) {
      kick = Math.sin(twoPi * (90 + inBeat * 40) * inBeat) * env(inBeat, 0.004, 0.18) * 0.55;
    }
    const snare =
      beatIndex === 1 || beatIndex === 3
        ? ((Math.random() * 2 - 1) * 0.22 + Math.sin(twoPi * 180 * inBeat) * 0.08) * env(inBeat, 0.002, 0.14)
        : 0;
    const hat = (Math.random() * 2 - 1) * 0.06 * env(inBeat, 0.001, beat * 0.45);

    const bassMidi = chord + (beatIndex === 1 ? 7 : beatIndex === 2 ? 3 : beatIndex === 3 ? 10 : 0) - 12;
    const bass =
      Math.sin(twoPi * midiHz(bassMidi) * t) * 0.22 * (0.7 + 0.3 * Math.sin(twoPi * (2 / beat) * t));

    let pad = 0;
    for (const off of [0, 4, 7]) {
      pad += Math.sin(twoPi * midiHz(chord + off) * t) * 0.045;
    }
    pad *= chorus ? 1.25 : 0.9;

    const step = Math.floor((t / (beat / 2)) % scale.length);
    const melodyMidi = chord + 12 + scale[(step + (chorus ? 2 : 0) + (seed % 3)) % scale.length];
    const melody =
      Math.sin(twoPi * midiHz(melodyMidi) * t) *
      0.16 *
      env(inBeat % (beat / 2), 0.01, beat / 2) *
      (chorus ? 1.15 : 1);

    const fifth = Math.sin(twoPi * midiHz(melodyMidi + 7) * t) * 0.05 * (chorus ? 1 : 0.4);
    const mixL = kick + snare * 0.85 + hat + bass + pad + melody + fifth;
    const mixR = kick + snare + hat * 1.1 + bass * 0.9 + pad + melody * 0.85 + fifth;
    const fade = t < 0.4 ? t / 0.4 : t > seconds - 1.2 ? Math.max(0, (seconds - t) / 1.2) : 1;
    samples[i * 2] = Math.max(-32767, Math.min(32767, mixL * fade * 32767));
    samples[i * 2 + 1] = Math.max(-32767, Math.min(32767, mixR * fade * 32767));
  }

  return {
    audio: writeWav(samples, sampleRate, channels),
    mimeType: 'audio/wav',
    provider: 'local-arrangement',
  };
}

function isAuthOrBillingError(message: string): boolean {
  return /\b401\b|\b402\b|\b403\b|api[_ ]key|permission_denied|quota|billing/i.test(message);
}

async function callLyria(prompt: string, durationSeconds: number): Promise<MusicGenResult> {
  const errors: string[] = [];
  for (const model of lyriaModels()) {
    const isFullSong = (LYRIA_FULL_MODELS as readonly string[]).includes(model);
    const background = isFullSong && durationSeconds > 35;
    try {
      const result = await generateWithLyriaInteractions(model, prompt, background);
      console.log(`[musicService] Lyria interactions ${model} produced ${result.audio.length} bytes`);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`interactions:${model}: ${msg.slice(0, 160)}`);
      console.warn(`[musicService] Lyria interactions ${model} failed:`, msg);
      if (isAuthOrBillingError(msg)) break;
    }
    try {
      const result = await generateWithLyriaContent(model, prompt);
      console.log(`[musicService] Lyria generateContent ${model} produced ${result.audio.length} bytes`);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`content:${model}: ${msg.slice(0, 160)}`);
      console.warn(`[musicService] Lyria generateContent ${model} failed:`, msg);
      if (isAuthOrBillingError(msg)) break;
    }
  }
  throw new Error(`Lyria failed: ${errors.join(' | ') || 'no models tried'}`);
}

export async function callMusicGenModel(params: MusicGenRequest): Promise<MusicGenResult> {
  const durationSeconds = params.durationSeconds || DEFAULT_DURATION_SEC;
  const errors: string[] = [];

  if (geminiApiKey()) {
    try {
      return await callLyria(params.prompt, durationSeconds);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(msg);
      console.warn('[musicService] Google Lyria unavailable, trying next music model');
    }
  }

  if (process.env.ELEVENLABS_API_KEY?.trim()) {
    try {
      const result = await generateWithElevenLabsMusic(params.prompt, durationSeconds);
      console.log(`[musicService] ElevenLabs Music produced ${result.audio.length} bytes`);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(msg);
      console.warn('[musicService] ElevenLabs Music failed:', msg);
    }
  }

  throw new Error(
    `Music generation models failed (${errors.join(' | ') || 'no API keys'}). ` +
      'Set GEMINI_API_KEY for Lyria or ELEVENLABS_API_KEY for ElevenLabs Music.',
  );
}

export async function generateEducationalSong(params: EducationalSongParams): Promise<MusicGenResult> {
  const durationSeconds = DEFAULT_DURATION_SEC;
  const prompt = buildMusicPrompt(params, durationSeconds);

  try {
    return await callMusicGenModel({
      prompt,
      durationSeconds,
      audioFormat: 'mp3',
      stylePreset: params.style,
    });
  } catch (err) {
    console.warn('[musicService] Remote music models failed; composing local instrumental arrangement', err);
    return composeLocalArrangement(params, durationSeconds);
  }
}
