import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import type { VideoScriptManifest } from '@brightpath/shared';
import { SAMPLE_VIDEOS } from '../../data/chapterSeeds.js';
import type { RenderResult, VoiceSynthesisResult } from './types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_ROOT = path.resolve(__dirname, '../../..');
const OUT_DIR = path.resolve(API_ROOT, 'uploads/videos');
const PROPS_DIR = path.resolve(API_ROOT, 'uploads/videos/props');
const REMOTION_ROOT = path.resolve(API_ROOT, '../remotion');

function run(cmd: string, args: string[], cwd: string, timeoutMs = 180_000): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd,
      shell: process.platform === 'win32',
      env: process.env,
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      resolve({ code: 1, stdout, stderr: stderr + '\n[timeout]' });
    }, timeoutMs);
    child.stdout?.on('data', (d) => {
      stdout += String(d);
    });
    child.stderr?.on('data', (d) => {
      stderr += String(d);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ code: 1, stdout, stderr: String(err) });
    });
  });
}

async function remotionPackageReady(): Promise<boolean> {
  try {
    await fs.access(path.join(REMOTION_ROOT, 'package.json'));
    await fs.access(path.join(REMOTION_ROOT, 'src', 'index.ts'));
    return true;
  } catch {
    return false;
  }
}

/**
 * Step 4 — Remotion headless render.
 * Falls back to a sample MP4 when Chromium/Remotion is unavailable so the
 * review modal still works with real script/audio artifacts.
 */
export async function renderWithRemotion(opts: {
  topicId: string;
  manifest: VideoScriptManifest;
  voice: VoiceSynthesisResult;
}): Promise<RenderResult> {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(PROPS_DIR, { recursive: true });

  const outFile = path.join(OUT_DIR, `topic_${opts.topicId}.mp4`);
  const propsPath = path.join(PROPS_DIR, `topic_${opts.topicId}.json`);
  const props = {
    topicId: opts.topicId,
    topicTitle: opts.manifest.topicTitle,
    scenes: opts.manifest.scenes,
    wordTimings: opts.voice.wordTimings,
    audioUrl: opts.voice.audioPath,
    totalDurationSeconds: opts.voice.durationSec || opts.manifest.totalDurationSeconds,
  };
  await fs.writeFile(propsPath, JSON.stringify(props, null, 2), 'utf8');

  const ready = await remotionPackageReady();
  if (ready) {
    const result = await run(
      'npx',
      [
        'remotion',
        'render',
        'src/index.ts',
        'GamifiedLesson',
        outFile,
        `--props=${propsPath}`,
      ],
      REMOTION_ROOT,
      240_000,
    );
    if (result.code === 0) {
      try {
        await fs.access(outFile);
        return {
          videoPath: outFile,
          videoPublicUrl: `/uploads/videos/topic_${opts.topicId}.mp4`,
          usedFallback: false,
        };
      } catch {
        /* fall through */
      }
    } else {
      console.warn('[remotion] render failed:', result.stderr.slice(0, 500) || result.stdout.slice(0, 500));
    }
  } else {
    console.warn('[remotion] package missing at', REMOTION_ROOT, '— using hybrid fallback video');
  }

  // Hybrid fallback: copy a CDN sample into uploads so local /uploads URL works,
  // or point at the remote sample directly.
  const sample = SAMPLE_VIDEOS[3]?.url ?? SAMPLE_VIDEOS[0].url;
  try {
    const res = await fetch(sample);
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      await fs.writeFile(outFile, buf);
      return {
        videoPath: outFile,
        videoPublicUrl: `/uploads/videos/topic_${opts.topicId}.mp4`,
        usedFallback: true,
      };
    }
  } catch (err) {
    console.warn('[remotion] fallback download failed', err);
  }

  return {
    videoPath: outFile,
    videoPublicUrl: sample,
    usedFallback: true,
  };
}
