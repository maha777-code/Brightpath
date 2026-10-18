// Synthesises the MindVault promo soundtrack and sound effects into public/audio/.
// Music is arranged against the default promo timing (see src/promo/theme.tsx):
// hook 0-4s, problem 4-12s, reveal/drop 12s, features 12-37s, audiences 37-40s, CTA 40-45s.
// Run: node scripts/generate-promo-audio.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SR = 44100;
const OUT_DIR = fileURLToPath(new URL('../public/audio/', import.meta.url));
const TAU = Math.PI * 2;

let seed = 7;
const noise = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return (seed / 4294967296) * 2 - 1;
};
const midi = (m) => 440 * 2 ** ((m - 69) / 12);
const idx = (t) => Math.round(t * SR);

function stereo(seconds) {
  const n = Math.ceil(seconds * SR);
  return [new Float32Array(n), new Float32Array(n)];
}

function put(buf, i, l, r = l) {
  if (i >= 0 && i < buf[0].length) {
    buf[0][i] += l;
    buf[1][i] += r;
  }
}

class Biquad {
  constructor() {
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
  }
  set(type, freq, q = 0.707) {
    const w = (TAU * Math.min(Math.max(freq, 20), SR * 0.45)) / SR;
    const cos = Math.cos(w);
    const a = Math.sin(w) / (2 * q);
    let b0, b1, b2;
    if (type === 'lp') [b0, b1, b2] = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2];
    else if (type === 'hp') [b0, b1, b2] = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2];
    else [b0, b1, b2] = [a, 0, -a];
    const a0 = 1 + a;
    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = (-2 * cos) / a0;
    this.a2 = (1 - a) / a0;
    return this;
  }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

/** Schroeder reverb; returns the wet signal only. */
function reverb([L, R], { size = 1, feedback = 0.84, damp = 0.25 } = {}) {
  const combs = [1557, 1617, 1491, 1422, 1277, 1356];
  const allpasses = [225, 556, 441];
  return [L, R].map((input, ch) => {
    const n = input.length;
    const out = new Float32Array(n);
    for (const base of combs) {
      const d = Math.round((base + ch * 23) * size);
      const line = new Float32Array(d);
      let p = 0;
      let filt = 0;
      for (let i = 0; i < n; i++) {
        const y = line[p];
        filt = y * (1 - damp) + filt * damp;
        line[p] = input[i] + filt * feedback;
        out[i] += y / combs.length;
        p = (p + 1) % d;
      }
    }
    for (const base of allpasses) {
      const d = Math.round((base + ch * 11) * size);
      const line = new Float32Array(d);
      let p = 0;
      for (let i = 0; i < n; i++) {
        const b = line[p];
        const y = -out[i] + b;
        line[p] = out[i] + b * 0.5;
        out[i] = y;
        p = (p + 1) % d;
      }
    }
    return out;
  });
}

function mixInto(dst, src, gain = 1, duck) {
  for (let ch = 0; ch < 2; ch++) {
    const d = dst[ch];
    const s = src[ch];
    for (let i = 0; i < d.length && i < s.length; i++) d[i] += s[i] * gain * (duck ? duck[i] : 1);
  }
}

function writeWav(name, [L, R], { peak = 0.89, saturate = 0 } = {}) {
  const n = L.length;
  if (saturate) {
    for (let i = 0; i < n; i++) {
      L[i] = Math.tanh(L[i] * saturate) / saturate;
      R[i] = Math.tanh(R[i] * saturate) / saturate;
    }
  }
  let max = 0;
  for (let i = 0; i < n; i++) max = Math.max(max, Math.abs(L[i]), Math.abs(R[i]));
  const g = max > 0 ? peak / max : 1;
  const data = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g)) * 32767), i * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i] * g)) * 32767), i * 4 + 2);
  }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(2, 22);
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 4, 28);
  header.writeUInt16LE(4, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  writeFileSync(OUT_DIR + name, Buffer.concat([header, data]));
  console.log(`wrote ${name} (${(n / SR).toFixed(2)}s)`);
}

/* ───────────── instruments ───────────── */

function kick(buf, t, gain = 1) {
  const s = idx(t);
  let phase = 0;
  for (let i = 0; i < idx(0.45); i++) {
    const tt = i / SR;
    phase += (TAU * (44 + 110 * Math.exp(-tt * 32))) / SR;
    const v = (Math.sin(phase) * Math.exp(-tt * 8) + noise() * Math.exp(-tt * 400) * 0.25) * gain;
    put(buf, s + i, v);
  }
}

function clap(buf, t, gain = 1) {
  const s = idx(t);
  const bp = new Biquad().set('bp', 1600, 0.9);
  for (let i = 0; i < idx(0.3); i++) {
    const tt = i / SR;
    const burst = tt < 0.03 ? 0.6 + 0.4 * Math.sin(tt * 900) : 1;
    const v = bp.run(noise()) * Math.exp(-tt * 18) * burst * 2.2 + Math.sin(TAU * 190 * tt) * Math.exp(-tt * 35) * 0.3;
    put(buf, s + i, v * gain * 0.95, v * gain);
  }
}

function hat(buf, t, gain = 1, open = false) {
  const s = idx(t);
  const hp = new Biquad().set('hp', 7500, 0.8);
  for (let i = 0; i < idx(open ? 0.25 : 0.06); i++) {
    const tt = i / SR;
    const v = hp.run(noise()) * Math.exp(-tt * (open ? 14 : 70)) * gain;
    put(buf, s + i, v * 0.8, v);
  }
}

function crash(buf, t, gain = 1) {
  const s = idx(t);
  const hp = new Biquad().set('hp', 4000, 0.6);
  for (let i = 0; i < idx(2.4); i++) {
    const tt = i / SR;
    const v = hp.run(noise()) * Math.exp(-tt * 1.8) * gain;
    put(buf, s + i, v, hp.run(noise()) * Math.exp(-tt * 1.8) * gain);
  }
}

function bass(buf, t, dur, note, gain = 1) {
  const s = idx(t);
  const f = midi(note);
  const lp = new Biquad();
  let phase = 0;
  for (let i = 0; i < idx(dur + 0.03); i++) {
    const tt = i / SR;
    phase = (phase + f / SR) % 1;
    const saw = phase * 2 - 1;
    const sub = Math.sin(TAU * phase);
    lp.set('lp', 220 + 1300 * Math.exp(-tt * 14), 1.1);
    const env = Math.min(1, tt / 0.004) * (tt > dur ? Math.max(0, 1 - (tt - dur) / 0.03) : 1);
    put(buf, s + i, (lp.run(saw) * 0.7 + sub * 0.5) * env * gain);
  }
}

function pad(buf, t, dur, notes, gain = 1, { attack = 0.35, release = 0.8, cutoff = 1500 } = {}) {
  const s = idx(t);
  for (const note of notes) {
    for (const cents of [-9, 0, 9]) {
      const f = midi(note) * 2 ** (cents / 1200);
      const lp = new Biquad().set('lp', cutoff, 0.6);
      let phase = noise() * 0.5 + 0.5;
      const panL = cents < 0 ? 1 : cents > 0 ? 0.55 : 0.8;
      const panR = cents > 0 ? 1 : cents < 0 ? 0.55 : 0.8;
      for (let i = 0; i < idx(dur + release); i++) {
        const tt = i / SR;
        phase = (phase + f / SR) % 1;
        const env = Math.min(1, tt / attack) * (tt > dur ? Math.exp(-(tt - dur) * (5 / release)) : 1);
        const v = lp.run(phase * 2 - 1) * env * gain;
        put(buf, s + i, v * panL, v * panR);
      }
    }
  }
}

function pluck(buf, t, note, gain = 1, pan = 0) {
  const s = idx(t);
  const f = midi(note);
  for (let i = 0; i < idx(0.45); i++) {
    const tt = i / SR;
    const v = (Math.sin(TAU * f * tt) + 0.35 * Math.sin(TAU * 2 * f * tt) * Math.exp(-tt * 20)) * Math.exp(-tt * 9) * gain;
    put(buf, s + i, v * (1 - pan * 0.5), v * (1 + pan * 0.5));
  }
}

function riser(buf, t, dur, gain = 1) {
  const s = idx(t);
  const lp = new Biquad();
  for (let i = 0; i < idx(dur); i++) {
    const tt = i / SR;
    const k = tt / dur;
    lp.set('lp', 300 * 2 ** (k * 5), 1.4);
    const v = (lp.run(noise()) * 0.9 + Math.sin(TAU * (180 + 900 * k * k) * tt) * 0.12) * k * k * gain;
    put(buf, s + i, v * (1 - k * 0.3), v);
  }
}

function impact(buf, t, gain = 1) {
  const s = idx(t);
  const lp = new Biquad().set('lp', 900, 0.7);
  let phase = 0;
  for (let i = 0; i < idx(2.2); i++) {
    const tt = i / SR;
    phase += (TAU * (30 + 50 * Math.exp(-tt * 6))) / SR;
    const v = (Math.sin(phase) * Math.exp(-tt * 2.2) + lp.run(noise()) * Math.exp(-tt * 7) * 0.8) * gain;
    put(buf, s + i, v);
  }
}

/* ───────────── music ───────────── */

function renderMusic() {
  const LENGTH = 45;
  const drums = stereo(LENGTH + 3);
  const music = stereo(LENGTH + 3);
  const fx = stereo(LENGTH + 3);
  const kicks = [];
  const k = (t, g = 1) => {
    kick(drums, t, g);
    kicks.push(t);
  };

  // Hook 0-4s: clock-like ticks, a tense swell and two punchy stabs on the headline pops.
  pad(music, 0, 4, [57, 60, 64, 69], 0.05, { attack: 2.5, release: 0.4, cutoff: 900 });
  bass(music, 0, 4, 33, 0.25);
  for (let t = 0; t < 4; t += 0.5) hat(drums, t, 0.18);
  for (const t of [0.2, 0.53]) {
    k(t, 0.65);
    clap(drums, t, 0.25);
    for (const n of [57, 64, 69, 72]) pluck(music, t, n, 0.09);
  }
  riser(fx, 2.4, 1.6, 0.25);

  // Problem 4-12s: minor, half-time groove, build into the reveal.
  const problem = [
    { t: 4, notes: [57, 60, 64], root: 45 },
    { t: 6, notes: [57, 60, 65], root: 41 },
    { t: 8, notes: [57, 62, 65], root: 38 },
    { t: 10, notes: [56, 59, 64], root: 40 },
  ];
  for (const c of problem) {
    pad(music, c.t, 2, c.notes, 0.05, { attack: 0.2, release: 0.5, cutoff: 1200 });
    for (let b = 0; b < 2; b += 0.25) bass(music, c.t + b, 0.2, c.root, b % 0.5 === 0 ? 0.32 : 0.2);
    k(c.t);
    k(c.t + 1.25, 0.8);
    clap(drums, c.t + 1, 0.4);
    for (let h = 0; h < 2; h += 0.25) hat(drums, c.t + h, h % 0.5 === 0 ? 0.12 : 0.07);
  }
  for (let i = 0; i < 16; i++) clap(drums, 11 + i / 16, 0.1 + (i / 16) * 0.3);
  riser(fx, 10, 2, 0.45);

  // Drop at 12s: bright C-G-Am-F groove until the CTA.
  impact(fx, 12, 0.7);
  crash(drums, 12, 0.22);
  const prog = [
    { notes: [60, 64, 67, 71], root: 36 },
    { notes: [62, 67, 71, 74], root: 43 },
    { notes: [60, 64, 69, 72], root: 45 },
    { notes: [60, 65, 69, 72], root: 41 },
  ];
  for (let bar = 0; bar < 14; bar++) {
    const t0 = 12 + bar * 2;
    const c = prog[bar % 4];
    pad(music, t0, 2, c.notes, 0.04, { attack: 0.08, release: 0.4, cutoff: 2200 });
    for (let e = 0; e < 4; e++) {
      const beat = t0 + e * 0.5;
      const breakdown = beat >= 39.5;
      if (!breakdown) k(beat);
      if (e % 2 === 1 && !breakdown) clap(drums, beat, 0.42);
      hat(drums, beat + 0.25, 0.13, true);
      bass(music, beat, 0.22, c.root, 0.36);
      bass(music, beat + 0.25, 0.2, c.root + 12, 0.22);
    }
    for (let s16 = 0; s16 < 16; s16++) {
      const t = t0 + s16 * 0.125;
      hat(drums, t, s16 % 2 ? 0.05 : 0.08);
      const order = [0, 1, 2, 3, 2, 1, 3, 2];
      pluck(music, t, c.notes[order[s16 % 8]] + 12, 0.07, s16 % 2 ? 0.6 : -0.6);
    }
    if (bar % 4 === 3 && t0 + 2 < 38) crash(drums, t0 + 2, 0.12);
  }
  riser(fx, 38, 2, 0.4);
  for (let i = 0; i < 8; i++) clap(drums, 39.5 + i / 16, 0.15 + i * 0.04);

  // CTA 40-45s: final hit and a held C major chord.
  impact(fx, 40, 0.8);
  crash(drums, 40, 0.25);
  k(40, 1);
  pad(music, 40, 3.2, [48, 55, 60, 64, 67, 71], 0.045, { attack: 0.05, release: 1.6, cutoff: 2600 });
  bass(music, 40, 2.5, 36, 0.4);
  [60, 64, 67, 71, 72, 76].forEach((n, i) => pluck(music, 40 + i * 0.06, n + 12, 0.1, (i % 2 ? 1 : -1) * 0.5));
  for (let i = 0; i < 12; i++) pluck(music, 40.5 + i * 0.25, [72, 76, 79, 83][i % 4], 0.06 * (1 - i / 12), i % 2 ? 0.6 : -0.6);

  // Sidechain the tonal bus to the kick so the groove pumps.
  const n = music[0].length;
  const duck = new Float32Array(n).fill(1);
  for (const t of kicks) {
    const s = idx(t);
    for (let i = 0; i < idx(0.4) && s + i < n; i++) duck[s + i] = Math.min(duck[s + i], 1 - 0.55 * Math.exp(-(i / SR) * 9));
  }

  const mix = stereo(LENGTH);
  mixInto(mix, drums, 1);
  mixInto(mix, music, 1, duck);
  mixInto(mix, fx, 1);
  const send = stereo(LENGTH);
  mixInto(send, music, 0.6, duck);
  mixInto(send, fx, 0.5);
  mixInto(send, drums, 0.12);
  mixInto(mix, reverb(send, { size: 1.1 }), 0.35);

  const fadeOut = idx(43.2);
  for (let i = 0; i < mix[0].length; i++) {
    const fin = Math.min(1, i / idx(0.05));
    const fout = i > fadeOut ? Math.max(0, 1 - (i - fadeOut) / (mix[0].length - fadeOut)) : 1;
    mix[0][i] *= fin * fout;
    mix[1][i] *= fin * fout;
  }
  writeWav('promo-music.wav', mix, { saturate: 1.3 });
}

/* ───────────── sound effects ───────────── */

function withVerb(buf, wet = 0.25, size = 0.8) {
  mixInto(buf, reverb(buf, { size, feedback: 0.78 }), wet);
  return buf;
}

function sfxPop() {
  const b = stereo(0.25);
  let phase = 0;
  for (let i = 0; i < idx(0.18); i++) {
    const tt = i / SR;
    phase += (TAU * (480 + 620 * Math.min(1, tt / 0.04))) / SR;
    put(b, i, Math.sin(phase) * Math.exp(-tt * 32) + noise() * Math.exp(-tt * 600) * 0.15);
  }
  writeWav('sfx-pop.wav', withVerb(b, 0.15), { peak: 0.7 });
}

function sfxClick(variant) {
  const b = stereo(0.08);
  const hp = new Biquad().set('hp', 2200 + variant * 500, 0.9);
  const f = 1800 + variant * 350;
  for (let i = 0; i < idx(0.05); i++) {
    const tt = i / SR;
    put(b, i, hp.run(noise()) * Math.exp(-tt * 260) + Math.sin(TAU * f * tt) * Math.exp(-tt * 500) * 0.4);
  }
  writeWav(`sfx-click${variant}.wav`, b, { peak: 0.6 });
}

function sfxTick() {
  const b = stereo(0.08);
  for (let i = 0; i < idx(0.05); i++) {
    const tt = i / SR;
    put(b, i, (Math.sin(TAU * 2600 * tt) + 0.4 * Math.sin(TAU * 5200 * tt)) * Math.exp(-tt * 180));
  }
  writeWav('sfx-tick.wav', withVerb(b, 0.12, 0.5), { peak: 0.55 });
}

function sfxWhoosh() {
  const dur = 0.6;
  const b = stereo(dur + 0.3);
  const bpL = new Biquad();
  const bpR = new Biquad();
  for (let i = 0; i < idx(dur); i++) {
    const k = i / idx(dur);
    const f = 350 + 2600 * Math.sin(Math.PI * k) ** 2;
    bpL.set('bp', f, 1.2);
    bpR.set('bp', f * 1.06, 1.2);
    const amp = Math.sin(Math.PI * k) ** 1.6;
    put(b, i, bpL.run(noise()) * amp * (1.2 - k), bpR.run(noise()) * amp * (0.2 + k));
  }
  writeWav('sfx-whoosh.wav', withVerb(b, 0.2), { peak: 0.7 });
}

function sfxDing() {
  const b = stereo(1.4);
  for (const [f, delay] of [
    [1318.5, 0],
    [1975.5, 0.08],
  ]) {
    const s = idx(delay);
    for (let i = 0; i < idx(1.1); i++) {
      const tt = i / SR;
      const v = (Math.sin(TAU * f * tt) + 0.25 * Math.sin(TAU * f * 2.01 * tt) * Math.exp(-tt * 6)) * Math.exp(-tt * 4.5);
      put(b, s + i, v * (delay ? 0.8 : 1), v * (delay ? 1 : 0.8));
    }
  }
  writeWav('sfx-ding.wav', withVerb(b, 0.3), { peak: 0.6 });
}

function sfxError() {
  const b = stereo(0.4);
  const lp = new Biquad().set('lp', 1400, 0.8);
  for (let i = 0; i < idx(0.3); i++) {
    const tt = i / SR;
    const sq = Math.sign(Math.sin(TAU * 138 * tt)) + Math.sign(Math.sin(TAU * 146 * tt));
    const env = Math.min(1, tt / 0.005) * Math.exp(-tt * 9);
    put(b, i, lp.run(sq) * env * 0.5);
  }
  writeWav('sfx-error.wav', b, { peak: 0.6 });
}

function sfxShimmer() {
  const b = stereo(2);
  [84, 88, 91, 96, 100].forEach((n, j) => {
    const s = idx(j * 0.045);
    const f = midi(n);
    for (let i = 0; i < idx(1.2); i++) {
      const tt = i / SR;
      const v = Math.sin(TAU * f * tt) * Math.exp(-tt * 5);
      put(b, s + i, v * (j % 2 ? 0.6 : 1), v * (j % 2 ? 1 : 0.6));
    }
  });
  writeWav('sfx-shimmer.wav', withVerb(b, 0.5, 1), { peak: 0.55 });
}

mkdirSync(OUT_DIR, { recursive: true });
renderMusic();
sfxPop();
[1, 2, 3].forEach(sfxClick);
sfxTick();
sfxWhoosh();
sfxDing();
sfxError();
sfxShimmer();
