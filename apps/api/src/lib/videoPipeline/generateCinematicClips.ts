import fs from 'fs/promises';
import type { LessonSlide, VideoScriptManifest } from '@brightpath/shared';
import {
  MIN_VIDEO_BYTES,
  ensurePublicVideoDirs,
  publicClipUrl,
  topicClipPath,
} from './mediaPaths.js';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = 'gemini-omni-1.1-flash';
const CLIP_CONCURRENCY = 2;
const POLL_MS = 5_000;
const CLIP_DEADLINE_MS = 180_000;

type InteractionContent = {
  type?: string;
  mime_type?: string;
  mimeType?: string;
  data?: string;
  uri?: string;
};

type InteractionStep = {
  type?: string;
  content?: InteractionContent[];
};

type InteractionResponse = {
  id?: string;
  status?: string;
  steps?: InteractionStep[];
  output_video?: InteractionContent;
  error?: { message?: string };
};

function geminiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error(
      'GEMINI_API_KEY is required to generate cinematic footage (Gemini Omni). Add it to .env and restart the API.',
    );
  }
  return key;
}

function videoModel(): string {
  return process.env.GEMINI_VIDEO_MODEL?.trim() || DEFAULT_MODEL;
}

export function buildShotPrompt(
  slide: LessonSlide | undefined,
  topicTitle: string,
  subject: string,
  extras?: { beat?: number; beats?: number; filmSec?: number },
): string {
  const subjectName = slide?.visual?.subject || slide?.heading || topicTitle;
  const labels = (slide?.visual?.labels?.length ? slide.visual.labels : slide?.bullets ?? [])
    .slice(0, 4)
    .join(', ');
  const place =
    extras?.beat && extras.beats
      ? `Shot ${extras.beat} of ${extras.beats} in a ${extras.filmSec ?? extras.beats * 10}-second film. New action — do not repeat an earlier shot.`
      : '';
  if (slide?.shotPrompt?.trim()) {
    return [slide.shotPrompt.trim(), place].filter(Boolean).join(' ');
  }
  return [
    `Photoreal cinematic 16:9 shot lasting the full 10 seconds, 24fps, shallow depth of field, natural documentary lighting.`,
    place,
    `Subject: ${subject} — ${subjectName}.`,
    labels ? `Show these ideas happening in the real world or as a living close-up: ${labels}.` : '',
    `Slow motivated camera move (dolly, orbit, or crane). Continuous motion. No jump cuts.`,
    `No on-screen text, no captions, no slide deck, no UI, no cartoon, no infographic, no talking presenter.`,
    `Looks like a premium AI film clip (Runway / Veo style), scientifically honest to the textbook idea.`,
  ]
    .filter(Boolean)
    .join(' ');
}

function extractVideo(interaction: InteractionResponse): InteractionContent | null {
  if (interaction.output_video?.data || interaction.output_video?.uri) return interaction.output_video;
  for (const step of interaction.steps ?? []) {
    if (step.type !== 'model_output') continue;
    for (const part of step.content ?? []) {
      const mime = part.mime_type || part.mimeType || '';
      if (part.type === 'video' || mime.startsWith('video/')) return part;
    }
  }
  return null;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      out[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return out;
}

async function geminiFetch(path: string, init?: RequestInit): Promise<Response> {
  const key = geminiKey();
  const url = path.startsWith('http') ? path : `${GEMINI_BASE}/${path.replace(/^\//, '')}`;
  const sep = url.includes('?') ? '&' : '?';
  return fetch(`${url}${sep}key=${encodeURIComponent(key)}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': key,
      ...(init?.headers ?? {}),
    },
  });
}

async function pollInteraction(id: string, started: number): Promise<InteractionResponse> {
  while (Date.now() - started < CLIP_DEADLINE_MS) {
    const res = await geminiFetch(`interactions/${id}`);
    const json = (await res.json()) as InteractionResponse;
    if (!res.ok) {
      throw new Error(`Gemini footage poll HTTP ${res.status}: ${json.error?.message || res.statusText}`);
    }
    if (json.status === 'completed' || extractVideo(json)) return json;
    if (json.status === 'failed' || json.error?.message) {
      throw new Error(json.error?.message || 'Gemini footage generation failed');
    }
    await sleep(POLL_MS);
  }
  throw new Error('Gemini footage timed out');
}

async function downloadUri(uri: string): Promise<Buffer> {
  const key = geminiKey();
  const fileMatch = uri.match(/files\/([a-zA-Z0-9_-]+)/);
  const downloadUrl = fileMatch
    ? `${GEMINI_BASE}/files/${fileMatch[1]}:download?alt=media&key=${encodeURIComponent(key)}`
    : `${uri}${uri.includes('?') ? '&' : '?'}key=${encodeURIComponent(key)}`;

  const started = Date.now();
  while (Date.now() - started < CLIP_DEADLINE_MS) {
    const res = await fetch(downloadUrl, { headers: { 'x-goog-api-key': key } });
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length >= MIN_VIDEO_BYTES) return buf;
    }
    const state = res.headers.get('x-goog-stored-content-length') || res.status;
    if (res.status === 404 || res.status === 400) {
      await sleep(POLL_MS);
      continue;
    }
    if (!res.ok && res.status !== 202) {
      const err = await res.text();
      throw new Error(`Gemini clip download HTTP ${res.status}: ${err.slice(0, 240)} (${state})`);
    }
    await sleep(POLL_MS);
  }
  throw new Error('Gemini clip download timed out');
}

async function requestClip(prompt: string, delivery: 'uri' | 'inline'): Promise<InteractionResponse> {
  const started = Date.now();
  const res = await geminiFetch('interactions', {
    method: 'POST',
    body: JSON.stringify({
      model: videoModel(),
      input: prompt,
      store: delivery === 'uri',
      background: false,
      stream: false,
      response_format: {
        type: 'video',
        aspect_ratio: '16:9',
        resolution: '720p',
        duration: '10s',
        ...(delivery === 'uri' ? { delivery: 'uri' } : {}),
      },
    }),
  });
  const json = (await res.json()) as InteractionResponse;
  if (!res.ok) {
    throw new Error(json.error?.message || `Gemini Omni HTTP ${res.status}`);
  }
  return json.status === 'completed' || extractVideo(json)
    ? json
    : json.id
      ? await pollInteraction(json.id, started)
      : json;
}

async function generateOneClip(prompt: string): Promise<Buffer> {
  let video = extractVideo(await requestClip(prompt, 'uri'));
  if (!video) video = extractVideo(await requestClip(prompt, 'inline'));
  if (!video) {
    throw new Error('Gemini Omni returned no video. This API key may not have video generation enabled.');
  }
  if (video.data) {
    const buf = Buffer.from(video.data, 'base64');
    if (buf.length < MIN_VIDEO_BYTES) throw new Error('Gemini Omni returned an empty clip');
    return buf;
  }
  if (video.uri) return downloadUri(video.uri);
  throw new Error('Gemini Omni video had neither data nor uri');
}

/**
 * Generate one cinematic MP4 per slide and stamp clipUrl onto the scene.
 */
export async function generateCinematicClips(
  topicId: string,
  manifest: VideoScriptManifest,
  meta: { topicTitle: string; subject: string },
): Promise<VideoScriptManifest> {
  await ensurePublicVideoDirs();
  const scenes = manifest.scenes ?? [];
  if (!scenes.length) return manifest;

  console.log(
    `[videoPipeline/footage] Gemini Omni ${videoModel()} clips=${scenes.length} film=${manifest.totalDurationSeconds}s topic="${meta.topicTitle}"`,
  );

  await mapPool(scenes, CLIP_CONCURRENCY, async (scene, index) => {
    const slide = scene.lesson;
    const prompt = buildShotPrompt(slide, meta.topicTitle, meta.subject, {
      beat: index + 1,
      beats: scenes.length,
      filmSec: Math.round(manifest.totalDurationSeconds || scenes.length * 10),
    });
    const dest = topicClipPath(topicId, scene.sceneId || index + 1);
    try {
      await fs.unlink(dest);
    } catch {
      /* none */
    }
    const buf = await generateOneClip(prompt);
    await fs.writeFile(dest, buf);
    const url = publicClipUrl(topicId, scene.sceneId || index + 1);
    scene.visualConfig = { ...(scene.visualConfig ?? {}), clipUrl: url, shotPrompt: prompt };
    scene.visualProps = { ...(scene.visualProps ?? {}), clipUrl: url };
    scene.parameters = { ...(scene.parameters ?? {}), clipUrl: url };
    scene.props = { ...(scene.props ?? {}), clipUrl: url };
    if (slide) slide.shotPrompt = prompt;
    console.log(`[videoPipeline/footage] clip scene=${scene.sceneId} bytes=${buf.length} url=${url}`);
  });

  return manifest;
}
