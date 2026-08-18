import { prisma } from '../prisma.js';
import { retrieveTextbookContext } from './retrieveContext.js';
import {
  cuesFromManifest,
  flattenVoiceover,
  generateStructuredVideoScript,
} from './generateScript.js';
import { synthesizeVoiceover } from './synthesizeVoice.js';
import { renderWithRemotion } from './remotionRender.js';
import { STAGE_PROGRESS, type PipelineStage } from './types.js';

const running = new Set<string>();

async function setStage(
  topicId: string,
  stage: PipelineStage,
  extra?: Record<string, unknown>,
) {
  await prisma.teacherSubtopic.update({
    where: { id: topicId },
    data: {
      videoJobStage: stage,
      videoProgress: STAGE_PROGRESS[stage],
      videoStatus: stage === 'done' ? 'pending_review' : stage === 'error' ? 'none' : 'generating',
      ...(extra ?? {}),
    },
  });
}

/** Background hybrid pipeline: RAG → LLM script → TTS → Remotion. */
export async function runHybridVideoPipeline(
  topicId: string,
  teacherPrompt?: string,
): Promise<void> {
  if (running.has(topicId)) return;
  running.add(topicId);

  try {
    await setStage(topicId, 'queued');

    await setStage(topicId, 'retrieving');
    const ctx = await retrieveTextbookContext(topicId, teacherPrompt);

    await setStage(topicId, 'scripting');
    const manifest = await generateStructuredVideoScript(ctx);
    const flatScript = flattenVoiceover(manifest);
    const cues = cuesFromManifest(manifest);
    await prisma.teacherSubtopic.update({
      where: { id: topicId },
      data: {
        videoScript: flatScript,
        animationCuesJson: cues,
        videoManifestJson: manifest,
        videoTitle: `${ctx.code} Video Explainer`,
        videoProgress: STAGE_PROGRESS.scripting,
        videoJobStage: 'scripting',
      },
    });

    await setStage(topicId, 'tts');
    const voice = await synthesizeVoiceover(topicId, {
      ...manifest,
      wordTimings: undefined,
    });
    manifest.wordTimings = voice.wordTimings;
    await prisma.teacherSubtopic.update({
      where: { id: topicId },
      data: {
        videoAudioUrl: voice.audioPublicUrl,
        videoManifestJson: manifest,
        videoProgress: STAGE_PROGRESS.tts,
        videoJobStage: 'tts',
      },
    });

    await setStage(topicId, 'rendering');
    const rendered = await renderWithRemotion({ topicId, manifest, voice });

    await prisma.teacherSubtopic.update({
      where: { id: topicId },
      data: {
        videoStatus: 'pending_review',
        videoJobStage: 'done',
        videoProgress: 100,
        generatedVideoUrl: rendered.videoPublicUrl,
        videoAudioUrl: voice.audioPublicUrl,
        videoScript: flatScript,
        animationCuesJson: cues,
        videoManifestJson: {
          ...manifest,
          wordTimings: voice.wordTimings,
          renderFallback: rendered.usedFallback,
        },
        videoError: null,
        hasVideoExplainer: false,
        videoTitle: `${ctx.code} Video Explainer`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Video pipeline failed';
    console.error('[videoPipeline]', topicId, message);
    await prisma.teacherSubtopic.update({
      where: { id: topicId },
      data: {
        videoStatus: 'none',
        videoJobStage: 'error',
        videoProgress: 0,
        videoError: message,
      },
    }).catch(() => undefined);
  } finally {
    running.delete(topicId);
  }
}

export function enqueueHybridVideoJob(topicId: string, teacherPrompt?: string): void {
  // Fire-and-forget async worker (in-process queue)
  setImmediate(() => {
    void runHybridVideoPipeline(topicId, teacherPrompt);
  });
}

export function isPipelineRunning(topicId: string): boolean {
  return running.has(topicId);
}
