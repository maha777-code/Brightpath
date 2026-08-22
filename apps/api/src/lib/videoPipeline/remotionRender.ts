import fs from 'fs';
import fsPromises from 'fs/promises';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';
import type { VideoScriptManifest } from '@brightpath/shared';
import type { RenderResult, VoiceSynthesisResult } from './types.js';
import {
  API_ROOT,
  MIN_AUDIO_BYTES,
  MIN_VIDEO_BYTES,
  PUBLIC_PROPS_DIR,
  assertFileMinSize,
  ensurePublicVideoDirs,
  publicAudioUrl,
  publicVideoUrl,
  topicVideoPath,
} from './mediaPaths.js';

const execFileAsync = promisify(execFile);
const REMOTION_ROOT = path.resolve(API_ROOT, '../remotion');
const remotionRequire = createRequire(path.join(REMOTION_ROOT, 'package.json'));

/** Per renderMedia call — 10 minutes (slow VMs / first Chromium launch). */
const REMOTION_TIMEOUT_MS = Number(process.env.REMOTION_TIMEOUT_MS ?? 600_000);
/** Cap workers so virtualized hosts don't thrash. */
const REMOTION_CONCURRENCY = Math.max(1, Math.floor(os.cpus().length / 2));

/**
 * Chromium inside Remotion cannot fetch raw OS paths like /home/.../topic_x.mp3
 * (treated as http://localhost:serveUrl/home/... → 404 / Target closed).
 * Prefer file:// URI; optional HTTP static URL when REMOTION_AUDIO_VIA_HTTP=1.
 */
function resolveRemotionAudioSrc(absoluteAudioPath: string, topicId: string): string {
  const resolved = path.resolve(absoluteAudioPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(
      `[remotionRender] Cannot start render: Audio file missing at ${resolved}`,
    );
  }

  const viaHttp =
    process.env.REMOTION_AUDIO_VIA_HTTP === '1' ||
    process.env.REMOTION_AUDIO_VIA_HTTP === 'true';

  if (viaHttp) {
    const httpUrl = publicAudioUrl(topicId);
    console.log(`[remotion] audioUrl via HTTP static: ${httpUrl}`);
    return httpUrl;
  }

  // pathToFileURL → file:///home/... on Linux, file:///C:/... on Windows
  const fileUrl = pathToFileURL(resolved).href;
  console.log(`[remotion] audioUrl via file:// : ${fileUrl}`);
  return fileUrl;
}

type GlRenderer = 'swangle' | 'swiftshader' | 'angle' | 'vulkan' | 'egl';

type ChromiumLaunchOptions = {
  enableMultiProcessOnLinux?: boolean;
  gl?: GlRenderer;
  disableWebSecurity?: boolean;
  args?: string[];
};

const STRICT_CHROMIUM_ARGS = [
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--disable-software-rasterizer',
  '--mute-audio',
] as const;

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

/** Prefer env override, then common system Chrome/Chromium paths (avoids broken headless-shell .so deps). */
async function resolveSystemChromeExecutable(): Promise<string | null> {
  const fromEnv = (
    process.env.REMOTION_BROWSER_EXECUTABLE ||
    process.env.CHROME_PATH ||
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    ''
  ).trim();
  if (fromEnv) {
    try {
      await fsPromises.access(fromEnv);
      return fromEnv;
    } catch {
      console.warn(`[remotion] CHROME path from env not found: ${fromEnv}`);
    }
  }

  const candidates =
    process.platform === 'win32'
      ? [
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
          path.join(
            process.env.LOCALAPPDATA ?? '',
            'Google',
            'Chrome',
            'Application',
            'chrome.exe',
          ),
        ]
      : process.platform === 'darwin'
        ? [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Chromium.app/Contents/MacOS/Chromium',
          ]
        : [
            '/usr/bin/google-chrome-stable',
            '/usr/bin/google-chrome',
            '/usr/bin/chromium-browser',
            '/usr/bin/chromium',
            '/snap/bin/chromium',
          ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      await fsPromises.access(candidate);
      return candidate;
    } catch {
      /* try next */
    }
  }

  // Last resort: `which` on Linux/macOS
  if (process.platform !== 'win32') {
    for (const bin of ['google-chrome-stable', 'google-chrome', 'chromium-browser', 'chromium']) {
      try {
        const { stdout } = await execFileAsync('which', [bin]);
        const found = stdout.trim().split('\n')[0];
        if (found) {
          await fsPromises.access(found);
          return found;
        }
      } catch {
        /* continue */
      }
    }
  }

  return null;
}

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

type RenderAttempt = {
  label: string;
  gl: GlRenderer;
  enableMultiProcessOnLinux: boolean;
  args: string[];
  browserExecutable: string | null;
};

/**
 * Step 4 — Remotion headless render via bundle + selectComposition + renderMedia.
 * Tries system Chrome first (when present), then Remotion shell with swangle/swiftshader.
 */
export async function renderWithRemotion(opts: {
  topicId: string;
  manifest: VideoScriptManifest;
  voice: VoiceSynthesisResult;
}): Promise<RenderResult> {
  await ensurePublicVideoDirs();

  const absoluteAudioPath = path.resolve(opts.voice.audioPath);
  if (!fs.existsSync(absoluteAudioPath)) {
    throw new Error(
      `[remotionRender] Cannot start render: Audio file missing at ${absoluteAudioPath}`,
    );
  }

  await assertFileMinSize(absoluteAudioPath, MIN_AUDIO_BYTES, 'TTS audio');
  if (!opts.voice.durationSec || opts.voice.durationSec <= 0) {
    throw new Error('TTS audio duration is 0 — cannot stitch video without voiceover length');
  }

  const outFile = topicVideoPath(opts.topicId);
  try {
    await fsPromises.unlink(outFile);
  } catch {
    /* none */
  }

  const audioUrlForRemotion = resolveRemotionAudioSrc(absoluteAudioPath, opts.topicId);

  const propsPath = path.join(PUBLIC_PROPS_DIR, `topic_${opts.topicId}.json`);
  const inputProps = {
    topicId: opts.topicId,
    topicTitle: opts.manifest.topicTitle,
    scenes: opts.manifest.scenes,
    wordTimings: opts.voice.wordTimings,
    // Never pass a bare filesystem path — Chromium 404s / closes the target
    audioUrl: audioUrlForRemotion,
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

  const systemChrome = await resolveSystemChromeExecutable();
  if (systemChrome) {
    console.log(`[remotion] System Chrome found: ${systemChrome}`);
  } else {
    console.warn(
      '[remotion] No system Chrome found — using Remotion chrome-headless-shell (needs libnspr4/libnss3 on Linux)',
    );
  }

  const attempts: RenderAttempt[] = [];

  if (systemChrome) {
    attempts.push({
      label: 'system-chrome + swiftshader',
      gl: 'swiftshader',
      enableMultiProcessOnLinux: true,
      args: [...STRICT_CHROMIUM_ARGS],
      browserExecutable: systemChrome,
    });
    attempts.push({
      label: 'system-chrome + swangle',
      gl: 'swangle',
      enableMultiProcessOnLinux: true,
      args: [...STRICT_CHROMIUM_ARGS],
      browserExecutable: systemChrome,
    });
  }

  attempts.push({
    label: 'remotion-shell + swangle',
    gl: 'swangle',
    enableMultiProcessOnLinux: true,
    args: [...STRICT_CHROMIUM_ARGS],
    browserExecutable: null,
  });
  attempts.push({
    label: 'remotion-shell + swiftshader',
    gl: 'swiftshader',
    enableMultiProcessOnLinux: true,
    args: [...STRICT_CHROMIUM_ARGS],
    browserExecutable: null,
  });

  const errors: string[] = [];

  try {
    const { bundle } = await importRemotion<{
      bundle: (opts: { entryPoint: string; rootDir?: string }) => Promise<string>;
    }>('@remotion/bundler');

    const { selectComposition, renderMedia } = await importRemotion<{
      selectComposition: (opts: {
        serveUrl: string;
        id: string;
        inputProps?: Record<string, unknown>;
        chromiumOptions?: ChromiumLaunchOptions;
        browserExecutable?: string | null;
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
        chromiumOptions?: ChromiumLaunchOptions;
        browserExecutable?: string | null;
        timeoutInMilliseconds?: number;
        concurrency?: number | string | null;
      }) => Promise<unknown>;
    }>('@remotion/renderer');

    console.log(
      `[remotion] bundling GamifiedLesson… (timeout=${Math.round(REMOTION_TIMEOUT_MS / 1000)}s, concurrency=${REMOTION_CONCURRENCY})`,
    );
    const serveUrl = await bundle({
      entryPoint: path.join(REMOTION_ROOT, 'src', 'index.ts'),
      rootDir: REMOTION_ROOT,
    });

    // Full 10-minute budget per attempt (outer STAGE_TIMEOUTS.rendering also 10 min)
    const perAttemptMs = REMOTION_TIMEOUT_MS;

    for (const attempt of attempts) {
      try {
        // Clear any partial output from a previous failed attempt
        try {
          await fsPromises.unlink(outFile);
        } catch {
          /* none */
        }

        const chromiumOptions: ChromiumLaunchOptions = {
          enableMultiProcessOnLinux: attempt.enableMultiProcessOnLinux,
          gl: attempt.gl,
          disableWebSecurity: true,
          args: attempt.args,
        };

        console.log(
          `[remotion] render attempt: ${attempt.label} (gl=${attempt.gl}, browser=${attempt.browserExecutable ?? 'remotion-default'}, timeout=${Math.round(perAttemptMs / 1000)}s)`,
        );

        const composition = await selectComposition({
          serveUrl,
          id: 'GamifiedLesson',
          inputProps,
          chromiumOptions,
          browserExecutable: attempt.browserExecutable,
        });

        await renderMedia({
          composition,
          serveUrl,
          outputLocation: outFile,
          codec: 'h264',
          inputProps,
          chromiumOptions,
          browserExecutable: attempt.browserExecutable,
          concurrency: REMOTION_CONCURRENCY,
          timeoutInMilliseconds: perAttemptMs,
        });

        const size = assertRemotionOutputOrThrow(outFile);
        await assertFileMinSize(outFile, MIN_VIDEO_BYTES, 'Remotion output MP4');
        console.log(`[remotion] OK via ${attempt.label} → ${outFile} (${size} bytes)`);

        return {
          videoPath: outFile,
          videoPublicUrl: publicVideoUrl(opts.topicId),
          usedFallback: Boolean(attempt.browserExecutable),
        };
      } catch (attemptErr) {
        const msg = attemptErr instanceof Error ? attemptErr.message : String(attemptErr);
        errors.push(`${attempt.label}: ${msg.slice(0, 400)}`);
        console.warn(`[remotion] attempt failed (${attempt.label}):`, msg);
      }
    }
  } catch (err) {
    throw new Error(
      `Failed during Remotion/FFmpeg render: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  throw new Error(
    `Failed during Remotion/FFmpeg render after ${attempts.length} attempts. ` +
      `Install Linux deps (bash scripts/install-remotion-linux-deps.sh) or set CHROME_PATH to system Chrome. ` +
      `Last errors: ${errors.slice(-2).join(' | ')}`,
  );
}
