import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateEducationalSong } from '../services/musicService.js';
import { apiPublicOrigin } from './videoPipeline/mediaPaths.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SONGS_DIR = path.resolve(__dirname, '../../public/teacher-songs');

function extForMime(mimeType: string): 'mp3' | 'wav' {
  return /wav/i.test(mimeType) ? 'wav' : 'mp3';
}

export function songPublicUrl(id: string, ext: 'mp3' | 'wav' = 'mp3'): string {
  return `${apiPublicOrigin()}/public/teacher-songs/${id}.${ext}`;
}

export function songFilePath(id: string, ext: 'mp3' | 'wav' = 'mp3'): string {
  return path.join(SONGS_DIR, `${id}.${ext}`);
}

export async function renderSongAudio(
  id: string,
  params: {
    topic: string;
    lyrics: string;
    style: string;
    gradeLevel: string;
    voiceId?: string;
  },
): Promise<{
  audioUrl: string;
  audioPath: string;
  provider: string;
}> {
  fs.mkdirSync(SONGS_DIR, { recursive: true });
  const result = await generateEducationalSong({
    topic: params.topic,
    lyrics: params.lyrics,
    style: params.style,
    gradeLevel: params.gradeLevel,
    voiceId: params.voiceId,
  });
  const ext = extForMime(result.mimeType);
  const dest = songFilePath(id, ext);
  fs.writeFileSync(dest, result.audio);
  console.log(`[songAudio] wrote ${result.provider} mix (${result.audio.length} bytes) → ${dest}`);
  return {
    audioUrl: songPublicUrl(id, ext),
    audioPath: dest,
    provider: result.provider,
  };
}

export function albumArtDataUrl(topic: string): string {
  const seed = [...topic].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const hue = seed % 360;
  const hue2 = (hue + 48) % 360;
  const initials = topic
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="hsl(${hue},70%,58%)"/>
        <stop offset="1" stop-color="hsl(${hue2},72%,42%)"/>
      </linearGradient>
    </defs>
    <rect width="160" height="160" rx="18" fill="url(#g)"/>
    <circle cx="80" cy="78" r="28" fill="rgba(255,255,255,0.18)"/>
    <path d="M72 58v44l36-10V64z" fill="#fff"/>
    <text x="80" y="148" text-anchor="middle" font-size="18" font-family="Georgia, serif" fill="#fff">${initials}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
