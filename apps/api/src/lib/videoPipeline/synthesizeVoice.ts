import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import type { VideoScriptManifest } from '@brightpath/shared';
import {
  getElevenLabsApiKey,
  getElevenLabsVoiceId,
  isBillingOrAuthError,
  synthesizeWithElevenLabs,
  synthesizeWithGoogleTts,
  estimateWordTimings,
} from '../speech/elevenlabs.js';
import type { VoiceSynthesisResult } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIO_DIR = path.resolve(__dirname, '../../../uploads/videos/audio');

/**
 * Step 3 — voiceover TTS.
 * Prefer ElevenLabs (free premade Sarah/Rachel); on 401/402 fall back to Google TTS
 * so the Remotion pipeline never hard-fails on billing.
 */
export async function synthesizeVoiceover(
  topicId: string,
  manifest: VideoScriptManifest,
): Promise<VoiceSynthesisResult> {
  await fs.mkdir(AUDIO_DIR, { recursive: true });
  const fullText = manifest.scenes.map((s) => s.voiceoverText).join(' ');

  const mp3Path = path.join(AUDIO_DIR, `topic_${topicId}.mp3`);
  const apiKey = getElevenLabsApiKey();

  try {
    if (!apiKey) {
      console.warn('[TTS] No ELEVENLABS_API_KEY — using free Google TTS fallback');
      const g = await synthesizeWithGoogleTts(fullText);
      await fs.writeFile(mp3Path, g.audio);
      return {
        audioPath: mp3Path,
        audioPublicUrl: `/uploads/videos/audio/topic_${topicId}.mp3`,
        wordTimings: g.wordTimings.length ? g.wordTimings : estimateWordTimings(fullText, g.durationSec),
        durationSec: g.durationSec,
      };
    }

    const voiceId = getElevenLabsVoiceId();
    const result = await synthesizeWithElevenLabs(fullText, apiKey, voiceId);
    await fs.writeFile(mp3Path, result.audio);
    console.log(`[TTS] provider=${result.provider} voice=${voiceId}`);

    return {
      audioPath: mp3Path,
      audioPublicUrl: `/uploads/videos/audio/topic_${topicId}.mp3`,
      wordTimings:
        result.wordTimings.length > 0
          ? result.wordTimings
          : estimateWordTimings(fullText, result.durationSec),
      durationSec: result.durationSec,
    };
  } catch (err) {
    if (isBillingOrAuthError(err) || !apiKey) {
      console.warn(
        '[TTS] ElevenLabs payment required / auth failed. Falling back to free Google TTS…',
        err instanceof Error ? err.message : err,
      );
      const g = await synthesizeWithGoogleTts(fullText);
      await fs.writeFile(mp3Path, g.audio);
      return {
        audioPath: mp3Path,
        audioPublicUrl: `/uploads/videos/audio/topic_${topicId}.mp3`,
        wordTimings: g.wordTimings.length ? g.wordTimings : estimateWordTimings(fullText, g.durationSec),
        durationSec: g.durationSec,
      };
    }
    throw err;
  }
}
