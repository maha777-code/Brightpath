import fs from 'fs/promises';
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
import {
  MIN_AUDIO_BYTES,
  assertFileMinSize,
  ensurePublicVideoDirs,
  publicAudioUrl,
  topicAudioPath,
} from './mediaPaths.js';

/**
 * Step 3 — voiceover TTS saved under public/videos/audio.
 * Prefer ElevenLabs; on 401/402 fall back to Google TTS.
 */
export async function synthesizeVoiceover(
  topicId: string,
  manifest: VideoScriptManifest,
): Promise<VoiceSynthesisResult> {
  await ensurePublicVideoDirs();
  const fullText = manifest.scenes.map((s) => s.voiceoverText).join(' ');
  const mp3Path = topicAudioPath(topicId);
  const apiKey = getElevenLabsApiKey();

  const writeAndValidate = async (
    audio: Buffer,
    durationSec: number,
    wordTimings: { word: string; start: number; end: number }[],
  ): Promise<VoiceSynthesisResult> => {
    if (!audio.length) {
      throw new Error('TTS produced empty audio buffer');
    }
    await fs.writeFile(mp3Path, audio);
    await assertFileMinSize(mp3Path, MIN_AUDIO_BYTES, 'TTS audio');
    const dur = durationSec > 0 ? durationSec : Math.max(8, (fullText.split(/\s+/).length / 150) * 60);
    return {
      audioPath: mp3Path,
      audioPublicUrl: publicAudioUrl(topicId),
      wordTimings: wordTimings.length ? wordTimings : estimateWordTimings(fullText, dur),
      durationSec: dur,
    };
  };

  try {
    if (!apiKey) {
      console.warn('[TTS] No ELEVENLABS_API_KEY — using free Google TTS fallback');
      const g = await synthesizeWithGoogleTts(fullText);
      return writeAndValidate(g.audio, g.durationSec, g.wordTimings);
    }

    const voiceId = getElevenLabsVoiceId();
    const result = await synthesizeWithElevenLabs(fullText, apiKey, voiceId);
    console.log(`[TTS] provider=${result.provider} voice=${voiceId}`);
    return writeAndValidate(result.audio, result.durationSec, result.wordTimings);
  } catch (err) {
    if (isBillingOrAuthError(err) || !apiKey) {
      console.warn(
        '[TTS] ElevenLabs payment/auth issue — Google TTS fallback',
        err instanceof Error ? err.message : err,
      );
      const g = await synthesizeWithGoogleTts(fullText);
      return writeAndValidate(g.audio, g.durationSec, g.wordTimings);
    }
    throw err;
  }
}
