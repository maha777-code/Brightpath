import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { VideoScriptManifest } from '@brightpath/shared';
import {
  getElevenLabsApiKey,
  getElevenLabsVoiceId,
  synthesizeWithElevenLabs,
} from '../speech/elevenlabs.js';
import type { VoiceSynthesisResult } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = path.resolve(__dirname, '../../../uploads/videos/audio');

/** Step 3 — synthesize voiceover via ElevenLabs TTS only. */
export async function synthesizeVoiceover(
  topicId: string,
  manifest: VideoScriptManifest,
): Promise<VoiceSynthesisResult> {
  await fs.mkdir(AUDIO_DIR, { recursive: true });
  const fullText = manifest.scenes.map((s) => s.voiceoverText).join(' ');

  const apiKey = getElevenLabsApiKey();
  if (!apiKey) {
    throw new Error(
      'ELEVENLABS_API_KEY is required for video voiceover. Add it to .env and restart the API.',
    );
  }

  const voiceId = getElevenLabsVoiceId();
  const result = await synthesizeWithElevenLabs(fullText, apiKey, voiceId);

  const mp3Path = path.join(AUDIO_DIR, `topic_${topicId}.mp3`);
  await fs.writeFile(mp3Path, result.audio);

  return {
    audioPath: mp3Path,
    audioPublicUrl: `/uploads/videos/audio/topic_${topicId}.mp3`,
    wordTimings:
      result.wordTimings.length > 0
        ? result.wordTimings
        : estimateWordTimings(fullText, result.durationSec),
    durationSec: result.durationSec,
  };
}

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
