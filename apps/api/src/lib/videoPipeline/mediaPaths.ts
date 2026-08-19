import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** apps/api */
export const API_ROOT = path.resolve(__dirname, '../../..');

/** Public static root served at /public */
export const PUBLIC_DIR = path.resolve(API_ROOT, 'public');
export const PUBLIC_VIDEOS_DIR = path.resolve(PUBLIC_DIR, 'videos');
export const PUBLIC_AUDIO_DIR = path.resolve(PUBLIC_VIDEOS_DIR, 'audio');
export const PUBLIC_PROPS_DIR = path.resolve(PUBLIC_VIDEOS_DIR, 'props');

export const MIN_VIDEO_BYTES = 100 * 1024; // 100KB
export const MIN_AUDIO_BYTES = 1024; // 1KB

/** Express origin used for absolute /public media URLs (never Vite :5173). */
export function apiPublicOrigin(): string {
  return (
    process.env.API_BASE_URL ||
    process.env.API_PUBLIC_URL ||
    process.env.APP_API_URL ||
    `http://localhost:${process.env.API_PORT ?? 3001}`
  ).replace(/\/$/, '');
}

/** Browser-facing absolute URL for a public video asset */
export function publicVideoUrl(topicId: string): string {
  return `${apiPublicOrigin()}/public/videos/topic_${topicId}.mp4`;
}

export function publicAudioUrl(topicId: string): string {
  return `${apiPublicOrigin()}/public/videos/audio/topic_${topicId}.mp3`;
}

export function topicVideoPath(topicId: string): string {
  return path.join(PUBLIC_VIDEOS_DIR, `topic_${topicId}.mp4`);
}

export function topicAudioPath(topicId: string): string {
  return path.join(PUBLIC_AUDIO_DIR, `topic_${topicId}.mp3`);
}

/**
 * Normalize any stored media path to an absolute Express URL.
 * Rewrites Vite (:5173) or relative /public paths to API_BASE_URL.
 * Returns null when raw is empty (does not invent URLs).
 */
export function toAbsolutePublicMediaUrl(
  raw: string | null | undefined,
  topicId?: string,
): string | null {
  if (!raw || !String(raw).trim()) {
    return null;
  }
  const value = String(raw).trim();
  const origin = apiPublicOrigin();

  try {
    if (/^https?:\/\//i.test(value)) {
      const u = new URL(value);
      // Wrong host (Vite) but correct public path → rewrite to API
      if (u.pathname.startsWith('/public/') || u.pathname.startsWith('/uploads/')) {
        return `${origin}${u.pathname}${u.search}`;
      }
      return value;
    }
  } catch {
    /* fall through */
  }

  if (value.startsWith('/public/') || value.startsWith('/uploads/')) {
    return `${origin}${value}`;
  }
  if (value.startsWith('public/') || value.startsWith('uploads/')) {
    return `${origin}/${value}`;
  }
  if (topicId && (value.endsWith('.mp4') || value.includes(`topic_${topicId}`))) {
    return publicVideoUrl(topicId);
  }
  if (value.startsWith('/')) {
    return `${origin}${value}`;
  }
  return topicId ? publicVideoUrl(topicId) : `${origin}/public/videos/${value}`;
}

/** Sync check: MP4 exists and is ≥100KB. */
export function isValidRenderedVideo(filePath: string): { ok: boolean; size: number } {
  try {
    if (!fs.existsSync(filePath)) return { ok: false, size: 0 };
    const size = fs.statSync(filePath).size;
    return { ok: size >= MIN_VIDEO_BYTES, size };
  } catch {
    return { ok: false, size: 0 };
  }
}

export async function ensurePublicVideoDirs(): Promise<void> {
  await fsPromises.mkdir(PUBLIC_VIDEOS_DIR, { recursive: true });
  await fsPromises.mkdir(PUBLIC_AUDIO_DIR, { recursive: true });
  await fsPromises.mkdir(PUBLIC_PROPS_DIR, { recursive: true });
}

export async function assertFileMinSize(
  filePath: string,
  minBytes: number,
  label: string,
): Promise<{ size: number }> {
  let stat;
  try {
    stat = await fsPromises.stat(filePath);
  } catch {
    throw new Error(`${label} missing at ${filePath}`);
  }
  if (!stat.isFile() || stat.size < minBytes) {
    throw new Error(
      `${label} invalid (size=${stat.size} bytes, required≥${minBytes}). File may be empty or corrupt.`,
    );
  }
  return { size: stat.size };
}
