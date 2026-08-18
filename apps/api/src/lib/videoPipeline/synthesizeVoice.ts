import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { VideoScriptManifest } from '@brightpath/shared';
import type { VoiceSynthesisResult } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = path.resolve(__dirname, '../../../uploads/videos/audio');

function estimateWordTimings(text: string, durationSec: number) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [] as { word: string; start: number; end: number }[];
  const slot = durationSec / words.length;
  return words.map((word, i) => ({
    word,
    start: Number((i * slot).toFixed(3)),
    end: Number(((i + 1) * slot).toFixed(3)),
  }));
}

/** Minimal valid silent-ish WAV (mono 16-bit) for fallback playback length. */
function buildSilentWav(durationSec: number, sampleRate = 22050): Buffer {
  const numSamples = Math.max(1, Math.floor(durationSec * sampleRate));
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  // leave PCM zeros = silence
  return buffer;
}

async function elevenLabsTts(
  text: string,
  outPath: string,
): Promise<{ ok: boolean; durationHint?: number }> {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key) return { ok: false };
  const voiceId = process.env.ELEVENLABS_VOICE_ID?.trim() || '21m00Tcm4TlvDq8ikWAM';
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': key,
          Accept: 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
        }),
      },
    );
    if (!res.ok) {
      console.warn('[tts] ElevenLabs HTTP', res.status, await res.text().catch(() => ''));
      return { ok: false };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(outPath, buf);
    // rough duration estimate ~ 150 wpm
    const words = text.split(/\s+/).filter(Boolean).length;
    return { ok: true, durationHint: Math.max(8, (words / 150) * 60) };
  } catch (err) {
    console.warn('[tts] ElevenLabs failed', err);
    return { ok: false };
  }
}

async function openAiTts(text: string, outPath: string): Promise<{ ok: boolean; durationHint?: number }> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return { ok: false };
  try {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        voice: 'coral',
        input: text,
        response_format: 'mp3',
      }),
    });
    if (!res.ok) {
      console.warn('[tts] OpenAI HTTP', res.status);
      return { ok: false };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(outPath, buf);
    const words = text.split(/\s+/).filter(Boolean).length;
    return { ok: true, durationHint: Math.max(8, (words / 150) * 60) };
  } catch (err) {
    console.warn('[tts] OpenAI failed', err);
    return { ok: false };
  }
}

/** Step 3 — synthesize voiceover + word timings (ElevenLabs → OpenAI → silent WAV). */
export async function synthesizeVoiceover(
  topicId: string,
  manifest: VideoScriptManifest,
): Promise<VoiceSynthesisResult> {
  await fs.mkdir(AUDIO_DIR, { recursive: true });
  const fullText = manifest.scenes.map((s) => s.voiceoverText).join(' ');
  const baseDuration = Math.max(
    manifest.totalDurationSeconds,
    manifest.scenes.reduce((a, s) => a + s.duration, 0),
  );

  const mp3Path = path.join(AUDIO_DIR, `topic_${topicId}.mp3`);
  const wavPath = path.join(AUDIO_DIR, `topic_${topicId}.wav`);

  const eleven = await elevenLabsTts(fullText, mp3Path);
  if (eleven.ok) {
    const durationSec = eleven.durationHint ?? baseDuration;
    return {
      audioPath: mp3Path,
      audioPublicUrl: `/uploads/videos/audio/topic_${topicId}.mp3`,
      wordTimings: estimateWordTimings(fullText, durationSec),
      durationSec,
    };
  }

  const openai = await openAiTts(fullText, mp3Path);
  if (openai.ok) {
    const durationSec = openai.durationHint ?? baseDuration;
    return {
      audioPath: mp3Path,
      audioPublicUrl: `/uploads/videos/audio/topic_${topicId}.mp3`,
      wordTimings: estimateWordTimings(fullText, durationSec),
      durationSec,
    };
  }

  await fs.writeFile(wavPath, buildSilentWav(baseDuration));
  return {
    audioPath: wavPath,
    audioPublicUrl: `/uploads/videos/audio/topic_${topicId}.wav`,
    wordTimings: estimateWordTimings(fullText, baseDuration),
    durationSec: baseDuration,
  };
}
