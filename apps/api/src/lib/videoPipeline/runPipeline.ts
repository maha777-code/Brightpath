import { prisma } from '../prisma.js';
import { retrieveTextbookContext } from './retrieveContext.js';
import {
  cuesFromManifest,
  flattenVoiceover,
  generateStructuredVideoScript,
} from './generateScript.js';
import { synthesizeVoiceover } from './synthesizeVoice.js';
import { renderWithRemotion } from './remotionRender.js';
import {
  MIN_VIDEO_BYTES,
  isValidRenderedVideo,
  publicVideoUrl,
  topicVideoPath,
  toAbsolutePublicMediaUrl,
} from './mediaPaths.js';
import { STAGE_PROGRESS, type PipelineStage } from './types.js';

const running = new Set<string>();
const jobEpoch = new Map<string, number>();
const JOB_TIMEOUT_MS = Number(process.env.VIDEO_JOB_TIMEOUT_MS ?? 360_000); // 6 min (bundle + render)
const STALE_MS = Number(process.env.VIDEO_JOB_STALE_MS ?? 90_000); // 90s without progress → fail on poll

type QueueItem = { topicId: string; teacherPrompt?: string; epoch: number };

const queue: QueueItem[] = [];
let draining = false;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`));
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export async function markVideoJobFailed(topicId: string, error: string) {
  console.error('[videoPipeline] FAILED', topicId, error);
  return prisma.teacherSubtopic.update({
    where: { id: topicId },
    data: {
      videoStatus: 'failed',
      videoJobStage: 'error',
      videoProgress: 0,
      videoError: error.slice(0, 2000),
    },
  });
}

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
      videoStatus: stage === 'done' ? 'pending_review' : stage === 'error' ? 'failed' : 'generating',
      videoJobStartedAt: new Date(), // heartbeat so stale detection resets per stage
      ...(extra ?? {}),
    },
  });
}

/** Background hybrid pipeline: RAG → LLM script → TTS → Remotion. */
export async function runHybridVideoPipeline(
  topicId: string,
  teacherPrompt?: string,
  epoch?: number,
): Promise<void> {
  const myEpoch = epoch ?? jobEpoch.get(topicId) ?? 1;
  if (running.has(topicId)) return;
  running.add(topicId);

  const isCurrent = () => (jobEpoch.get(topicId) ?? 0) === myEpoch;

  try {
    await withTimeout(
      (async () => {
        if (!isCurrent()) return;
        await setStage(topicId, 'queued');

        await setStage(topicId, 'retrieving');
        const ctx = await withTimeout(
          retrieveTextbookContext(topicId, teacherPrompt),
          20_000,
          'Context retrieval',
        );
        if (!isCurrent()) return;

        await setStage(topicId, 'scripting');
        const manifest = await withTimeout(
          generateStructuredVideoScript(ctx),
          90_000,
          'Script generation (LLM)',
        );
        if (!isCurrent()) return;
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
            videoJobStartedAt: new Date(),
          },
        });

        await setStage(topicId, 'tts');
        const voice = await withTimeout(
          synthesizeVoiceover(topicId, { ...manifest, wordTimings: undefined }),
          60_000,
          'ElevenLabs TTS',
        );
        if (!isCurrent()) return;
        manifest.wordTimings = voice.wordTimings;
        await prisma.teacherSubtopic.update({
          where: { id: topicId },
          data: {
            videoAudioUrl: voice.audioPublicUrl,
            videoManifestJson: manifest,
            videoProgress: STAGE_PROGRESS.tts,
            videoJobStage: 'tts',
            videoJobStartedAt: new Date(),
          },
        });

        await setStage(topicId, 'rendering');
        let rendered;
        try {
          rendered = await withTimeout(
            renderWithRemotion({ topicId, manifest, voice }),
            180_000,
            'Remotion / FFmpeg render',
          );
        } catch (renderErr) {
          const msg =
            renderErr instanceof Error
              ? `Failed during Remotion/FFmpeg render: ${renderErr.message}`
              : 'Failed during Remotion/FFmpeg render';
          throw new Error(msg);
        }
        if (!isCurrent()) return;

        // Hard block: never set pending_review on missing/empty MP4
        const absoluteMp4Path = rendered.videoPath || topicVideoPath(topicId);
        const check = isValidRenderedVideo(absoluteMp4Path);
        if (!check.ok) {
          console.error(
            `[videoPipeline] Rendered file missing or under 100KB! path=${absoluteMp4Path} size=${check.size}`,
          );
          throw new Error(
            `Video rendering produced an empty or corrupted file (${check.size} bytes).`,
          );
        }

        const absoluteVideoUrl =
          toAbsolutePublicMediaUrl(rendered.videoPublicUrl, topicId) || publicVideoUrl(topicId);

        await prisma.teacherSubtopic.update({
          where: { id: topicId },
          data: {
            videoStatus: 'pending_review',
            videoJobStage: 'done',
            videoProgress: 100,
            generatedVideoUrl: absoluteVideoUrl,
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
      })(),
      JOB_TIMEOUT_MS,
      'Video generation job',
    );
  } catch (err) {
    if (!isCurrent()) return;
    const message = err instanceof Error ? err.message : 'Video pipeline failed';
    await markVideoJobFailed(topicId, message).catch(() => undefined);
  } finally {
    if (isCurrent()) running.delete(topicId);
    else running.delete(topicId);
  }
}

async function drainQueue() {
  if (draining) return;
  draining = true;
  try {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      await runHybridVideoPipeline(item.topicId, item.teacherPrompt, item.epoch);
    }
  } finally {
    draining = false;
  }
}

/** Enqueue async background worker job (in-process queue; one job at a time). */
export function enqueueHybridVideoJob(topicId: string, teacherPrompt?: string): void {
  const epoch = (jobEpoch.get(topicId) ?? 0) + 1;
  jobEpoch.set(topicId, epoch);
  running.delete(topicId);
  for (let i = queue.length - 1; i >= 0; i--) {
    if (queue[i].topicId === topicId) queue.splice(i, 1);
  }
  queue.push({ topicId, teacherPrompt, epoch });
  setImmediate(() => {
    void drainQueue();
  });
}

export function isPipelineRunning(topicId: string): boolean {
  return running.has(topicId) || queue.some((q) => q.topicId === topicId);
}

/**
 * On status poll:
 * - generating stuck past STALE_MS → failed
 * - pending_review / published draft with missing/empty MP4 → failed (no 0:00 review modal)
 */
export async function reconcileVideoJobStatus(topicId: string) {
  const sub = await prisma.teacherSubtopic.findUnique({ where: { id: topicId } });
  if (!sub) return null;

  if (sub.videoStatus === 'pending_review') {
    const mp4 = topicVideoPath(topicId);
    const check = isValidRenderedVideo(mp4);
    if (!check.ok) {
      console.error(
        `[videoPipeline] pending_review but MP4 invalid (${check.size} bytes < ${MIN_VIDEO_BYTES})`,
      );
      return markVideoJobFailed(
        topicId,
        `Rendered video file is empty or missing (${check.size} bytes).`,
      );
    }
    // Keep absolute URL fresh for the review modal
    const absolute = publicVideoUrl(topicId);
    if (sub.generatedVideoUrl !== absolute) {
      return prisma.teacherSubtopic.update({
        where: { id: topicId },
        data: { generatedVideoUrl: absolute },
      });
    }
    return sub;
  }

  if (sub.videoStatus !== 'generating') return sub;

  const started = sub.videoJobStartedAt?.getTime() ?? 0;
  const age = Date.now() - started;

  if (!isPipelineRunning(topicId)) {
    if (age > STALE_MS || !sub.videoJobStartedAt) {
      return markVideoJobFailed(
        topicId,
        sub.videoError ||
          `Generation stalled at ${sub.videoJobStage ?? 'unknown'} (${sub.videoProgress ?? 0}%). Worker not running — click Retry.`,
      );
    }
  } else if (age > JOB_TIMEOUT_MS) {
    return markVideoJobFailed(
      topicId,
      `Generation timed out after ${Math.round(JOB_TIMEOUT_MS / 1000)}s at stage ${sub.videoJobStage ?? 'unknown'}`,
    );
  }

  return sub;
}
