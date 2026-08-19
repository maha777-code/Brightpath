import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import type { VideoScriptManifest } from '@brightpath/shared';
import type { RenderResult, VoiceSynthesisResult } from './types.js';
import {
  API_ROOT,
  MIN_AUDIO_BYTES,
  MIN_VIDEO_BYTES,
  PUBLIC_PROPS_DIR,
  assertFileMinSize,
  ensurePublicVideoDirs,
  publicVideoUrl,
  topicVideoPath,
} from './mediaPaths.js';

const REMOTION_ROOT = path.resolve(API_ROOT, '../remotion');
const remotionRequire = createRequire(path.join(REMOTION_ROOT, 'package.json'));

/**
 * Remotion's openBrowser already launches with:
 *   --no-sandbox, --disable-setuid-sandbox, --disable-dev-shm-usage
 * We still request the supported Linux mitigations (multiprocess + software GL)
 * and forward sandbox args when the renderer honors extra `args`.
 */
const SANDBOX_CHROMIUM_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
] as const;

const CHROMIUM_OPTIONS = {
  enableMultiProcessOnLinux: true,
  gl: 'swiftshader' as const,
  disableWebSecurity: true,
  args: [...SANDBOX_CHROMIUM_ARGS],
};

async function remotionPackageReady(): Promise<boolean> {
  try {
    await fsPromises.access(path.join(REMOTION_ROOT, 'package.json'));
    await fsPromises.access(path.join(REMOTION_ROOT, 'src', 'index.ts'));
    return true;
  } catch {
    return false;
  }
}

async function importRemotion<T extends Record<string, unknown>>(pkg: string): Promise<T> {
  const resolved = remotionRequire.resolve(pkg);
  return (await import(pathToFileURL(resolved).href)) as T;
}

/** Require a real MP4 (≥100KB). Throws so the job becomes `failed`, not empty pending_review. */
function assertRemotionOutputOrThrow(outFile: string): number {
  const exists = fs.existsSync(outFile);
  const size = exists ? fs.statSync(outFile).size : 0;
  if (!exists || size < 100_000) {
    throw new Error(
      `Video rendering produced an empty or corrupted file (${size} bytes).`,
    );
  }
  return size;
}

/**
 * Step 4 — Remotion headless render via bundle + selectComposition + renderMedia.
 * Validates TTS audio first; requires Remotion MP4 ≥100KB or throws (failed status).
 */
export async function renderWithRemotion(opts: {
  topicId: string;
  manifest: VideoScriptManifest;
  voice: VoiceSynthesisResult;
}): Promise<RenderResult> {
  await ensurePublicVideoDirs();

  await assertFileMinSize(opts.voice.audioPath, MIN_AUDIO_BYTES, 'TTS audio');
  if (!opts.voice.durationSec || opts.voice.durationSec <= 0) {
    throw new Error('TTS audio duration is 0 — cannot stitch video without voiceover length');
  }

  const outFile = topicVideoPath(opts.topicId);
  try {
    await fsPromises.unlink(outFile);
  } catch {
    /* none */
  }

  const propsPath = path.join(PUBLIC_PROPS_DIR, `topic_${opts.topicId}.json`);
  const inputProps = {
    topicId: opts.topicId,
    topicTitle: opts.manifest.topicTitle,
    scenes: opts.manifest.scenes,
    wordTimings: opts.voice.wordTimings,
    // Absolute path — Remotion <Audio> resolves local files during headless render
    audioUrl: opts.voice.audioPath,
    totalDurationSeconds: Math.max(
      opts.voice.durationSec,
      opts.manifest.totalDurationSeconds,
      8,
    ),
  };
  await fsPromises.writeFile(propsPath, JSON.stringify(inputProps, null, 2), 'utf8');

  const ready = await remotionPackageReady();
  if (!ready) {
    throw new Error(
      `Remotion package not ready at ${REMOTION_ROOT}. Run: cd apps/remotion && npm install && npx remotion browser ensure`,
    );
  }

  try {
    const { bundle } = await importRemotion<{
      bundle: (opts: { entryPoint: string; rootDir?: string }) => Promise<string>;
    }>('@remotion/bundler');

    const { selectComposition, renderMedia } = await importRemotion<{
      selectComposition: (opts: {
        serveUrl: string;
        id: string;
        inputProps?: Record<string, unknown>;
        chromiumOptions?: typeof CHROMIUM_OPTIONS;
      }) => Promise<{
        id: string;
        width: number;
        height: number;
        fps: number;
        durationInFrames: number;
      }>;
      renderMedia: (opts: {
        composition: unknown;
        serveUrl: string;
        outputLocation: string;
        codec: 'h264';
        inputProps?: Record<string, unknown>;
        chromiumOptions?: typeof CHROMIUM_OPTIONS;
        timeoutInMilliseconds?: number;
      }) => Promise<unknown>;
    }>('@remotion/renderer');

    console.log(
      `[remotion] bundling GamifiedLesson (chromium: multiprocess + swiftshader; args=${SANDBOX_CHROMIUM_ARGS.join(' ')})`,
    );

    const serveUrl = await bundle({
      entryPoint: path.join(REMOTION_ROOT, 'src', 'index.ts'),
      rootDir: REMOTION_ROOT,
    });

    const composition = await selectComposition({
      serveUrl,
      id: 'GamifiedLesson',
      inputProps,
      chromiumOptions: CHROMIUM_OPTIONS,
    });

    await renderMedia({
      composition,
      serveUrl,
      outputLocation: outFile,
      codec: 'h264',
      inputProps,
      chromiumOptions: CHROMIUM_OPTIONS,
      timeoutInMilliseconds: 120_000,
    });
  } catch (err) {
    throw new Error(
      `Failed during Remotion/FFmpeg render: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const size = assertRemotionOutputOrThrow(outFile);
  await assertFileMinSize(outFile, MIN_VIDEO_BYTES, 'Remotion output MP4');
  console.log(`[remotion] OK ${outFile} (${size} bytes)`);

  return {
    videoPath: outFile,
    videoPublicUrl: publicVideoUrl(opts.topicId),
    usedFallback: false,
  };
}
