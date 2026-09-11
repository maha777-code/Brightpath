import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  ELEVENLABS_FREE_VOICE_RACHEL,
  ELEVENLABS_FREE_VOICE_SARAH,
  getElevenLabsApiKey,
  synthesizeWithElevenLabs,
  synthesizeWithGoogleTts,
} from './speech/elevenlabs.js';
import { apiPublicOrigin } from './videoPipeline/mediaPaths.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SONGS_DIR = path.resolve(__dirname, '../../public/teacher-songs');

const VOICE_MAP: Record<string, string> = {
  'bright-kids': ELEVENLABS_FREE_VOICE_SARAH,
  'warm-alto': ELEVENLABS_FREE_VOICE_RACHEL,
  'upbeat-tenor': ELEVENLABS_FREE_VOICE_SARAH,
  classroom: ELEVENLABS_FREE_VOICE_RACHEL,
};

export function songPublicUrl(id: string): string {
  return `${apiPublicOrigin()}/public/teacher-songs/${id}.mp3`;
}

export function songFilePath(id: string): string {
  return path.join(SONGS_DIR, `${id}.mp3`);
}

function writeWavTone(seconds = 6): Buffer {
  const sampleRate = 22050;
  const numSamples = sampleRate * seconds;
  const notes = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63, 261.63, 196.0];
  const samples = Buffer.alloc(numSamples * 2);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const note = notes[Math.floor((t / seconds) * notes.length) % notes.length];
    const envelope = Math.max(0, 1 - (i % Math.floor(sampleRate / 2)) / (sampleRate / 2));
    const value = Math.sin(2 * Math.PI * note * t) * 0.28 * envelope;
    samples.writeInt16LE(Math.round(value * 32767), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + samples.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(samples.length, 40);
  return Buffer.concat([header, samples]);
}

export async function renderSongAudio(id: string, lyrics: string, voiceId: string): Promise<{
  audioUrl: string;
  audioPath: string;
}> {
  fs.mkdirSync(SONGS_DIR, { recursive: true });
  const dest = songFilePath(id);
  const spoken = [lyrics.split('\n').slice(0, 16).join('. ')].join(' ').slice(0, 900);
  let audio: Buffer | null = null;

  try {
    const key = getElevenLabsApiKey();
    if (key) {
      const result = await synthesizeWithElevenLabs(spoken, key, VOICE_MAP[voiceId] ?? ELEVENLABS_FREE_VOICE_SARAH);
      audio = result.audio;
    } else {
      const result = await synthesizeWithGoogleTts(spoken);
      audio = result.audio;
    }
  } catch (err) {
    console.warn('[songAudio] TTS failed, using melody fallback', err);
  }

  fs.writeFileSync(dest, audio && audio.length > 400 ? audio : writeWavTone());
  return { audioUrl: songPublicUrl(id), audioPath: dest };
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
