// Renders demos/mindvault-product-demo.html to demos/mindvault-product-demo.mp4, frame by frame.
//
// Video: headless Chrome seeks the GSAP timeline to each frame (and steps CSS animations to match),
//        then screenshots the 1920×1080 stage. Nothing is screen-recorded, so frames are exact.
// Audio: the demo's own Web Audio music + sound effects are rendered offline (OfflineAudioContext),
//        and each narration cue is voiced with ElevenLabs and placed at its cue time.
//
// Env: CHROME_PATH, FFMPEG, FFPROBE, ELEVENLABS_API_KEY (ELEVENLABS_VOICE_ID optional),
//      MV_DEPS (folder whose node_modules has puppeteer-core), FPS (default 30),
//      REUSE_VIDEO=1 to remix audio onto the previously rendered frames.
// Run: bash demos/render/render-in-wsl.sh (WSL), or on Windows point FFMPEG/FFPROBE at
//      node_modules/@remotion/compositor-win32-x64-msvc, CHROME_PATH at chrome.exe, then
//      node demos/render/render-demo-video.mjs
import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(process.env.MV_DEPS ? path.join(process.env.MV_DEPS, 'index.js') : import.meta.url);

const FPS = Number(process.env.FPS ?? 30);
const FFMPEG = process.env.FFMPEG ?? 'ffmpeg';
const FFPROBE = process.env.FFPROBE ?? 'ffprobe';
const SRC = path.resolve(process.env.DEMO_SRC || path.join(here, '../mindvault-product-demo.html'));
const OUT = path.resolve(process.env.DEMO_OUT || path.join(here, '../mindvault-product-demo.mp4'));
const WORK = path.join(here, '.work', path.basename(OUT, path.extname(OUT)));
const VO_DIR = path.join(here, 'voiceover');
const VOICES = [process.env.ELEVENLABS_VOICE_ID, 'EXAVITQu4vr4xnSDxMaL', '21m00Tcm4TlvDq8ikWAM'].filter(
  (v, i, all) => v && v.length > 8 && all.indexOf(v) === i,
);
const VOICE_SETTINGS = { stability: 0.45, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true, speed: 1.0 };

mkdirSync(WORK, { recursive: true });
mkdirSync(VO_DIR, { recursive: true });

/** Exposes the demo's private audio engine and SFX list so they can be rendered offline. */
function writePatchedHtml() {
  let html = readFileSync(SRC, 'utf8');
  const patch = (from, to, all = false) => {
    if (!html.includes(from)) throw new Error(`Patch target not found: ${from}`);
    html = all ? html.split(from).join(to) : html.replace(from, to);
  };
  patch('const AudioEngine = (() => {', 'const AudioEngine = window.__mvAudio = (() => {');
  patch('ctx = new AC();', 'ctx = window.__mvCtx || new AC();');
  patch('const t = ctx.currentTime;', 'const t = window.__mvAt ?? ctx.currentTime;', true);
  patch('const SFX = [];', 'const SFX = window.__mvSFX = [];');
  const file = path.join(WORK, 'demo-render.html');
  writeFileSync(file, html);
  const brand = path.join(path.dirname(SRC), 'brand-assets.js');
  if (existsSync(brand)) copyFileSync(brand, path.join(WORK, 'brand-assets.js'));
  return pathToFileURL(file).href;
}

function loadEnvFile() {
  const file = process.env.ENV_FILE;
  if (!file || !existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = /^(ELEVENLABS_API_KEY|ELEVENLABS_VOICE_ID)=(.*)$/.exec(line.trim());
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, '').trim();
  }
}

async function openDemo(browser, url) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  page.on('pageerror', (err) => console.error('[page error]', err.message));
  await page.goto(`${url}?record`, { waitUntil: 'networkidle0', timeout: 120_000 });
  await page.waitForFunction(() => window.MindVaultDemo, { timeout: 60_000 });
  await page.addStyleTag({ content: '#startOverlay{display:none!important}' });
  return page;
}

async function renderMusicAndSfx(browser, url, duration) {
  const page = await openDemo(browser, url);
  const base64 = await page.evaluate(async (dur) => {
    const sr = 48000;
    const ctx = new OfflineAudioContext(2, Math.ceil(sr * dur), sr);
    window.__mvCtx = ctx;
    const audio = window.__mvAudio;
    audio.ensure();
    audio.applyLevels();
    audio.startMusic(0);
    let lastTickFrame = -1;
    for (const e of [...window.__mvSFX].sort((a, b) => a.t - b.t)) {
      if (e.type === 'tick') {
        const frame = Math.floor(e.t * 60);
        if (frame === lastTickFrame) continue;
        lastTickFrame = frame;
      }
      window.__mvAt = e.t;
      audio.fire(e.type);
    }
    window.__mvAt = undefined;
    const buf = await ctx.startRendering();

    const ch = [buf.getChannelData(0), buf.getChannelData(1)];
    const n = buf.length;
    const out = new DataView(new ArrayBuffer(44 + n * 4));
    const str = (o, s) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
    str(0, 'RIFF'); out.setUint32(4, 36 + n * 4, true); str(8, 'WAVE'); str(12, 'fmt ');
    out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 2, true);
    out.setUint32(24, sr, true); out.setUint32(28, sr * 4, true); out.setUint16(32, 4, true); out.setUint16(34, 16, true);
    str(36, 'data'); out.setUint32(40, n * 4, true);
    for (let i = 0, o = 44; i < n; i++) {
      for (let c = 0; c < 2; c++, o += 2) out.setInt16(o, Math.max(-1, Math.min(1, ch[c][i])) * 0x7fff, true);
    }
    const bytes = new Uint8Array(out.buffer);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  }, duration);
  await page.close();
  const file = path.join(WORK, 'music-sfx.wav');
  writeFileSync(file, Buffer.from(base64, 'base64'));
  return file;
}

function probeDuration(file) {
  return Number(
    execFileSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString().trim(),
  );
}

/** One ElevenLabs clip per cue, cached by text so re-renders don't spend credits. */
async function voiceCue(index, text) {
  const key = createHash('sha1').update(`${text}|${JSON.stringify(VOICE_SETTINGS)}`).digest('hex').slice(0, 10);
  const file = path.join(VO_DIR, `cue-${String(index + 1).padStart(2, '0')}-${key}.mp3`);
  if (existsSync(file)) return file;
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY is not set.');
  const voices = [process.env.ELEVENLABS_VOICE_ID, ...VOICES].filter((v, i, all) => v && v.length > 8 && all.indexOf(v) === i);
  let lastError = '';
  for (const voiceId of voices) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
      body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2', voice_settings: VOICE_SETTINGS }),
    });
    if (res.ok) {
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      return file;
    }
    lastError = `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`;
    if (![401, 402, 403].includes(res.status)) break;
  }
  throw new Error(`ElevenLabs TTS failed for cue ${index + 1} (${lastError})`);
}

async function renderFrames(browser, url, duration) {
  const page = await openDemo(browser, url);
  const frames = Math.round(duration * FPS);
  const file = path.join(WORK, 'video.mp4');
  const ff = spawn(FFMPEG, [
    '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((resolve, reject) => ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg video exited ${code}`)))));

  await page.evaluate(() => { window.__animStart = new WeakMap(); });
  const started = Date.now();
  for (let i = 0; i < frames; i++) {
    const t = i / FPS;
    await page.evaluate((time) => {
      window.MindVaultDemo.seek(time);
      // CSS animations and transitions run on wall-clock time; pin them to video time instead.
      for (const anim of document.getAnimations()) {
        if (!window.__animStart.has(anim)) window.__animStart.set(anim, time);
        anim.pause();
        anim.currentTime = Math.max(0, (time - window.__animStart.get(anim)) * 1000);
      }
      return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    }, t);
    const shot = await page.screenshot({ type: 'jpeg', quality: 93, optimizeForSpeed: true });
    if (!ff.stdin.write(shot)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % (FPS * 5) === 0) {
      const rate = (i + 1) / ((Date.now() - started) / 1000);
      console.log(`  frame ${i}/${frames} (${t.toFixed(1)}s) · ${rate.toFixed(1)} fps`);
    }
  }
  ff.stdin.end();
  await done;
  await page.close();
  return file;
}

async function main() {
  loadEnvFile();
  const url = writePatchedHtml();
  const cachedVideo = path.join(WORK, 'video.mp4');
  const cachedBed = path.join(WORK, 'music-sfx.wav');
  const cachedMeta = path.join(WORK, 'meta.json');
  const reuse = Boolean(process.env.REUSE_VIDEO) && [cachedVideo, cachedBed, cachedMeta].every((f) => existsSync(f));

  let browser = null;
  const getBrowser = async () => {
    browser ??= await require('puppeteer-core').launch({
      executablePath: process.env.CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--hide-scrollbars', '--autoplay-policy=no-user-gesture-required', '--force-color-profile=srgb'],
    });
    return browser;
  };
  try {
    let duration, cues;
    if (reuse) {
      ({ duration, cues } = JSON.parse(readFileSync(cachedMeta, 'utf8')));
    } else {
      const meta = await openDemo(await getBrowser(), url);
      ({ duration, cues } = await meta.evaluate(() => ({
        duration: window.MindVaultDemo.duration,
        cues: window.MindVaultDemo.cues.map(({ t0, t1, text, spoken }) => ({ t0, t1, text, spoken })),
      })));
      await meta.close();
      writeFileSync(cachedMeta, JSON.stringify({ duration, cues }, null, 2));
    }

    console.log('Narration (ElevenLabs)…');
    const voice = [];
    let prevEnd = 0;
    for (const [i, cue] of cues.entries()) {
      const file = await voiceCue(i, cue.spoken || cue.text);
      const len = probeDuration(file);
      // A long line may push the next one slightly late, but never past its own slot.
      const start = Math.max(cue.t0, prevEnd + 0.1);
      const slot = (cues[i + 1]?.t0 ?? duration) - start - 0.12;
      const tempo = len > slot ? Math.min(1.2, len / slot) : 1;
      prevEnd = start + len / tempo;
      voice.push({ file, start, tempo });
      const late = start > cue.t0 ? ` (starts ${(start - cue.t0).toFixed(2)}s late)` : '';
      console.log(`  cue ${i + 1}: ${len.toFixed(2)}s in a ${slot.toFixed(2)}s slot${tempo > 1 ? ` → ${tempo.toFixed(2)}× tempo` : ''}${late}`);
    }
    if (prevEnd > duration) console.warn(`  narration overruns the video by ${(prevEnd - duration).toFixed(2)}s`);

    let bed = cachedBed;
    let video = cachedVideo;
    if (!reuse) {
      console.log('Music + sound effects (offline Web Audio)…');
      bed = await renderMusicAndSfx(await getBrowser(), url, duration);
      console.log(`Frames (${FPS} fps)…`);
      video = await renderFrames(await getBrowser(), url, duration);
    }

    // Remotion's bundled ffmpeg has no limiter/compressor, so mix to float, measure the peak here,
    // and apply a single gain that keeps it below clipping.
    console.log('Mixing…');
    const voiceChains = voice.map((v, i) => {
      const ms = Math.round(v.start * 1000);
      return `[${i + 1}:a]aresample=48000,aformat=channel_layouts=stereo,${v.tempo > 1 ? `atempo=${v.tempo.toFixed(3)},` : ''}adelay=${ms}|${ms},volume=1.2[v${i}]`;
    });
    const mixFile = path.join(WORK, 'mix.wav');
    execFileSync(FFMPEG, [
      '-y', '-loglevel', 'error', '-i', bed, ...voice.flatMap((v) => ['-i', v.file]),
      '-filter_complex', [
        ...voiceChains,
        `[0:a]${voice.map((_, i) => `[v${i}]`).join('')}amix=inputs=${voice.length + 1}:normalize=0,volume=0.5,apad,atrim=0:${duration}[aout]`,
      ].join(';'),
      '-map', '[aout]', '-c:a', 'pcm_s16le', '-ar', '48000', '-ac', '2', mixFile,
    ], { stdio: 'inherit' });
    const wav = readFileSync(mixFile);
    let dataAt = 12;
    while (wav.toString('ascii', dataAt, dataAt + 4) !== 'data') dataAt += 8 + wav.readUInt32LE(dataAt + 4);
    let peak = 0;
    for (let o = dataAt + 8; o + 2 <= wav.length; o += 2) peak = Math.max(peak, Math.abs(wav.readInt16LE(o)) / 32768);
    if (peak > 0.99) console.warn('  mix clipped even with 6 dB headroom');
    const gain = Math.min(3, 0.89 / Math.max(peak, 1e-6));
    console.log(`  mix peak ${(20 * Math.log10(peak)).toFixed(1)} dBFS → gain ${(20 * Math.log10(gain)).toFixed(1)} dB`);
    execFileSync(FFMPEG, [
      '-y', '-loglevel', 'error', '-i', video, '-i', mixFile,
      '-map', '0:v', '-map', '1:a', '-af', `volume=${gain.toFixed(4)}`,
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', OUT,
    ], { stdio: 'inherit' });
    console.log(`Done: ${OUT} (${probeDuration(OUT).toFixed(2)}s)`);
  } finally {
    await browser?.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
