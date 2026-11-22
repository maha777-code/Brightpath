import type { ArcadeQuestion } from '@brightpath/shared';

export interface ArcadeResult {
  score: number;
  correct: number;
  total: number;
  bestCombo: number;
  missed: ArcadeQuestion[];
}

export interface ArcadeGameProps {
  questions: ArcadeQuestion[];
  muted: boolean;
  onFinish: (result: ArcadeResult) => void;
}

export function shuffle<T>(items: readonly T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

/** The correct answer plus `count - 1` distractors, in random order. */
export function answerOptions(question: ArcadeQuestion, count: number): string[] {
  return shuffle([question.answer, ...shuffle(question.distractors).slice(0, count - 1)]);
}

type SoundName =
  | 'correct'
  | 'wrong'
  | 'coin'
  | 'pop'
  | 'boost'
  | 'bump'
  | 'win'
  | 'tick'
  | 'laser'
  | 'boom'
  | 'shield'
  | 'unlock'
  | 'storm'
  | 'paper';

let audioCtx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  }
  if (audioCtx.state === 'suspended') void audioCtx.resume();
  return audioCtx;
}

function tone(freq: number, duration: number, type: OscillatorType, volume: number, delay = 0, slideTo?: number) {
  const ctx = audio();
  if (!ctx) return;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function playSound(name: SoundName, muted: boolean) {
  if (muted) return;
  switch (name) {
    case 'correct':
      tone(660, 0.12, 'triangle', 0.09);
      tone(880, 0.12, 'triangle', 0.09, 0.09);
      tone(1320, 0.22, 'triangle', 0.08, 0.18);
      break;
    case 'wrong':
      tone(220, 0.3, 'sawtooth', 0.05, 0, 110);
      break;
    case 'coin':
      tone(1245, 0.05, 'square', 0.025);
      tone(1660, 0.09, 'square', 0.025, 0.05);
      break;
    case 'pop':
      tone(500 + Math.random() * 300, 0.08, 'triangle', 0.06, 0, 900);
      break;
    case 'boost':
      tone(300, 0.4, 'sawtooth', 0.04, 0, 1200);
      tone(1500, 0.3, 'triangle', 0.06, 0.25);
      break;
    case 'bump':
      tone(120, 0.18, 'square', 0.05, 0, 60);
      break;
    case 'win':
      [523, 659, 784, 1047].forEach((freq, index) => tone(freq, 0.2, 'triangle', 0.08, index * 0.12));
      break;
    case 'tick':
      tone(880, 0.06, 'sine', 0.05);
      break;
    case 'laser':
      tone(1400, 0.09, 'square', 0.025, 0, 380);
      break;
    case 'boom':
      noise(0.45, 0.12, 900);
      tone(140, 0.4, 'sine', 0.09, 0, 40);
      break;
    case 'shield':
      tone(440, 0.25, 'sine', 0.06, 0, 880);
      tone(660, 0.3, 'triangle', 0.05, 0.12, 1320);
      break;
    case 'unlock':
      tone(980, 0.05, 'square', 0.03);
      tone(740, 0.08, 'triangle', 0.06, 0.06);
      tone(1180, 0.18, 'triangle', 0.06, 0.14);
      break;
    case 'storm':
      noise(0.35, 0.03, 500);
      break;
    case 'paper':
      noise(0.12, 0.05, 3000);
      break;
  }
}

/** Short filtered white-noise burst (explosions, wind, paper). */
function noise(duration: number, volume: number, cutoff: number) {
  const ctx = audio();
  if (!ctx) return;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = cutoff;
  const gain = ctx.createGain();
  gain.gain.value = volume;
  source.connect(filter).connect(gain).connect(ctx.destination);
  source.start();
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}
