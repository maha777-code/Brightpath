import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { ArcadeQuestion } from '@brightpath/shared';
import { Gem, Package, Pause, Shield, Sparkles, Star, Wind } from 'lucide-react';
import { answerOptions, isTypingTarget, playSound, shuffle, type ArcadeGameProps } from './arcadeKit';
import { Countdown, CorrectToast, HeartsPill, PausedModal, QuizModal, ReadyModal, useCanvasStage, type StageSize } from './arcadeUi';
import './arcadeGames.css';

const H = 540;
const WORLD_W = 2400;
const WORLD_H = 1800;
const CX = WORLD_W / 2;
const CY = WORLD_H / 2;
const ISLAND_R = 760;
const STRETCH = 1.3;
const MAX_HEARTS = 3;
const PLAYER_R = 16;
const SPEED = 230;
const BOOST = 1.7;
const SHIELD_TIME = 10;
const SPEED_TIME = 8;
const ROUNDS = [
  { r: 820, hold: 14, shrink: 8 },
  { r: 560, hold: 18, shrink: 8 },
  { r: 370, hold: 18, shrink: 8 },
  { r: 220, hold: 16, shrink: 7 },
  { r: 120, hold: 14, shrink: 7 },
];
const FINAL_HOLD = 25;
const CRATE_COLORS = { shield: '#38bdf8', speed: '#facc15', star: '#c084fc' } as const;

type Phase = 'ready' | 'countdown' | 'playing' | 'question' | 'paused' | 'done';
type CrateKind = keyof typeof CRATE_COLORS;

interface Circle { x: number; y: number; r: number }
interface Crate { x: number; y: number; kind: CrateKind; question: ArcadeQuestion; opened: boolean; born: number }
interface Pickup { x: number; y: number; taken: boolean; kind: 'gem' | 'fruit'; hue: number }
interface Prop { x: number; y: number; r: number; kind: 'palm' | 'tree' | 'rock'; tilt: number }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }

interface World {
  t: number;
  px: number;
  py: number;
  facing: 1 | -1;
  moving: boolean;
  walkT: number;
  hearts: number;
  shield: number;
  boost: number;
  score: number;
  gems: number;
  combo: number;
  bestCombo: number;
  correct: number;
  missed: ArcadeQuestion[];
  answered: number;
  crates: Crate[];
  pickups: Pickup[];
  props: Prop[];
  particles: Particle[];
  zone: Circle;
  from: Circle;
  target: Circle;
  round: number;
  roundT: number;
  shrinking: boolean;
  finalHold: number;
  outside: boolean;
  stormTick: number;
  flash: number;
  flashColor: string;
  batches: ArcadeQuestion[][];
  shape: number[];
}

interface Hud {
  score: number;
  gems: number;
  hearts: number;
  combo: number;
  shield: number;
  boost: number;
  round: number;
  timer: number;
  shrinking: boolean;
  final: boolean;
  outside: boolean;
  opened: number;
}

interface Quiz { crate: Crate; options: string[]; picked: string | null }

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function islandR(shape: number[], theta: number) {
  return ISLAND_R * (1 + 0.07 * Math.sin(3 * theta + shape[0]) + 0.05 * Math.sin(5 * theta + shape[1]) + 0.03 * Math.sin(8 * theta + shape[2]));
}

function landDepth(shape: number[], x: number, y: number) {
  const dx = (x - CX) / STRETCH;
  const dy = y - CY;
  return islandR(shape, Math.atan2(dy, dx)) - Math.hypot(dx, dy);
}

function randomLandPoint(w: Pick<World, 'shape' | 'props'>, inside: Circle, margin: number, avoid: { x: number; y: number }[] = []) {
  for (let i = 0; i < 400; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.sqrt(Math.random()) * inside.r;
    const x = inside.x + Math.cos(a) * d;
    const y = inside.y + Math.sin(a) * d;
    if (landDepth(w.shape, x, y) < margin) continue;
    if (w.props.some((p) => Math.hypot(p.x - x, p.y - y) < p.r + 40)) continue;
    if (avoid.some((p) => Math.hypot(p.x - x, p.y - y) < 130)) continue;
    return { x, y };
  }
  return { x: inside.x, y: inside.y };
}

function splitBatches(questions: ArcadeQuestion[]): ArcadeQuestion[][] {
  const batches: ArcadeQuestion[][] = ROUNDS.map(() => []);
  questions.forEach((question, index) => {
    batches[Math.floor((index * ROUNDS.length) / questions.length)].push(question);
  });
  return batches;
}

function makeWorld(questions: ArcadeQuestion[]): World {
  const shape = [rand(0, 6), rand(0, 6), rand(0, 6)];
  const props: Prop[] = [];
  const base = { shape, props };
  for (let i = 0; i < 70; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.sqrt(Math.random()) * ISLAND_R;
    const x = CX + Math.cos(a) * d * STRETCH;
    const y = CY + Math.sin(a) * d;
    const depth = landDepth(shape, x, y);
    if (depth < 40 || Math.hypot(x - CX, y - CY) < 160) continue;
    if (props.some((p) => Math.hypot(p.x - x, p.y - y) < 90)) continue;
    const kind: Prop['kind'] = depth < 150 ? (Math.random() < 0.7 ? 'palm' : 'rock') : Math.random() < 0.55 ? 'tree' : Math.random() < 0.6 ? 'palm' : 'rock';
    props.push({ x, y, r: kind === 'rock' ? 24 : 16, kind, tilt: rand(-0.5, 0.5) });
  }
  const pickups: Pickup[] = [];
  const everywhere = { x: CX, y: CY, r: ISLAND_R * STRETCH };
  for (let i = 0; i < 34; i += 1) {
    const p = randomLandPoint(base, everywhere, 50);
    pickups.push({ ...p, taken: false, kind: 'gem', hue: Math.random() < 0.5 ? 190 : 320 });
  }
  const start: Circle = { x: CX, y: CY, r: 1350 };
  return {
    t: 0,
    px: CX,
    py: CY,
    facing: 1,
    moving: false,
    walkT: 0,
    hearts: MAX_HEARTS,
    shield: 0,
    boost: 0,
    score: 0,
    gems: 0,
    combo: 0,
    bestCombo: 0,
    correct: 0,
    missed: [],
    answered: 0,
    crates: [],
    pickups,
    props,
    particles: [],
    zone: { ...start },
    from: { ...start },
    target: { ...start },
    round: -1,
    roundT: 0,
    shrinking: false,
    finalHold: 0,
    outside: false,
    stormTick: 0,
    flash: 0,
    flashColor: '#ef4444',
    batches: splitBatches(questions),
    shape,
  };
}

function startRound(w: World) {
  w.round += 1;
  w.roundT = 0;
  w.shrinking = false;
  w.from = { ...w.zone };
  const spec = ROUNDS[w.round];
  let target: Circle = { x: CX, y: CY, r: spec.r };
  for (let i = 0; i < 200; i += 1) {
    const room = Math.max(0, Math.min(w.zone.r - spec.r, w.round === 0 ? 260 : w.zone.r - spec.r) * 0.75);
    const a = Math.random() * Math.PI * 2;
    const d = Math.random() * room;
    const x = w.zone.x + Math.cos(a) * d;
    const y = w.zone.y + Math.sin(a) * d;
    if (landDepth(w.shape, x, y) > Math.min(spec.r * 0.5, 160)) {
      target = { x, y, r: spec.r };
      break;
    }
  }
  w.target = target;
  const kinds = shuffle<CrateKind>(['shield', 'speed', 'star']);
  const avoid = [{ x: w.px, y: w.py }, ...w.crates.filter((c) => !c.opened)];
  w.batches[w.round].forEach((question, index) => {
    const spot = randomLandPoint(w, { x: target.x, y: target.y, r: target.r * 0.8 }, 30, avoid);
    avoid.push(spot);
    w.crates.push({ ...spot, kind: kinds[index % kinds.length], question, opened: false, born: w.t });
  });
  for (let i = 0; i < 2; i += 1) {
    const spot = randomLandPoint(w, { x: target.x, y: target.y, r: target.r * 0.9 }, 30, avoid);
    w.pickups.push({ ...spot, taken: false, kind: 'fruit', hue: 0 });
  }
}

function burst(w: World, x: number, y: number, colors: string[], count: number, power = 220) {
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const s = rand(power * 0.3, power);
    w.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - power * 0.3, life: 0, max: rand(0.5, 1.1), color: colors[i % colors.length], size: rand(2, 5) });
  }
}

/** Pre-renders the static island (beach, grass, flowers) once. */
function renderIsland(shape: number[]): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = WORLD_W;
  canvas.height = WORLD_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const ring = (offset: number) => {
    ctx.beginPath();
    for (let i = 0; i <= 200; i += 1) {
      const a = (i / 200) * Math.PI * 2;
      const r = islandR(shape, a) + offset;
      const x = CX + Math.cos(a) * r * STRETCH;
      const y = CY + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  };
  ring(90);
  ctx.fillStyle = 'rgba(103, 232, 249, 0.28)';
  ctx.fill();
  ring(45);
  ctx.fillStyle = 'rgba(165, 243, 252, 0.35)';
  ctx.fill();
  ring(8);
  ctx.fillStyle = '#f5d9a0';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 6;
  ctx.stroke();
  ring(-70);
  const grass = ctx.createRadialGradient(CX, CY - 200, 100, CX, CY, ISLAND_R * STRETCH);
  grass.addColorStop(0, '#6ee77f');
  grass.addColorStop(0.6, '#3fbf5c');
  grass.addColorStop(1, '#2f9e4c');
  ctx.fillStyle = grass;
  ctx.fill();
  ctx.save();
  ctx.clip();
  for (let i = 0; i < 260; i += 1) {
    ctx.fillStyle = Math.random() < 0.5 ? 'rgba(21, 128, 61, 0.22)' : 'rgba(187, 247, 208, 0.18)';
    ctx.beginPath();
    ctx.ellipse(rand(0, WORLD_W), rand(0, WORLD_H), rand(20, 90), rand(12, 50), rand(0, 3), 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 900; i += 1) {
    ctx.fillStyle = ['#fef08a', '#fda4af', '#ffffff', '#c4b5fd'][i % 4];
    ctx.beginPath();
    ctx.arc(rand(0, WORLD_W), rand(0, WORLD_H), rand(1.5, 3), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(180, 140, 80, 0.45)';
  ctx.lineWidth = 26;
  ctx.lineCap = 'round';
  for (let p = 0; p < 4; p += 1) {
    ctx.beginPath();
    const a0 = (p / 4) * Math.PI * 2 + shape[0];
    ctx.moveTo(CX, CY);
    for (let s = 1; s <= 8; s += 1) {
      const r = (s / 8) * ISLAND_R * 0.95;
      const a = a0 + Math.sin(s * 0.9 + p) * 0.25;
      ctx.lineTo(CX + Math.cos(a) * r * STRETCH, CY + Math.sin(a) * r);
    }
    ctx.stroke();
  }
  ctx.restore();
  return canvas;
}

function drawProp(ctx: CanvasRenderingContext2D, p: Prop, t: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(p.x + 10, p.y + 6, p.kind === 'rock' ? 30 : 34, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  if (p.kind === 'rock') {
    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.moveTo(p.x - 28, p.y + 4);
    ctx.lineTo(p.x - 20, p.y - 22);
    ctx.lineTo(p.x + 4, p.y - 32);
    ctx.lineTo(p.x + 26, p.y - 14);
    ctx.lineTo(p.x + 28, p.y + 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(p.x - 20, p.y - 22);
    ctx.lineTo(p.x + 4, p.y - 32);
    ctx.lineTo(p.x + 2, p.y - 12);
    ctx.lineTo(p.x - 14, p.y - 6);
    ctx.closePath();
    ctx.fill();
    return;
  }
  const sway = Math.sin(t * 1.4 + p.x * 0.01) * 0.06;
  if (p.kind === 'palm') {
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.quadraticCurveTo(p.x + p.tilt * 40, p.y - 40, p.x + p.tilt * 30, p.y - 78);
    ctx.stroke();
    const tx = p.x + p.tilt * 30;
    const ty = p.y - 80;
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2 + sway + p.tilt;
      ctx.fillStyle = i % 2 ? '#15803d' : '#16a34a';
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(tx + Math.cos(a - 0.3) * 40, ty + Math.sin(a - 0.3) * 24 - 10, tx + Math.cos(a) * 58, ty + Math.sin(a) * 34 + 8);
      ctx.quadraticCurveTo(tx + Math.cos(a + 0.3) * 36, ty + Math.sin(a + 0.3) * 22, tx, ty);
      ctx.fill();
    }
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(tx - 5, ty + 4, 5, 0, Math.PI * 2);
    ctx.arc(tx + 5, ty + 5, 5, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.fillStyle = '#7c2d12';
  ctx.fillRect(p.x - 5, p.y - 30, 10, 30);
  const blobs: Array<[number, number, number, string]> = [
    [0, -58, 34, '#166534'],
    [-22, -44, 24, '#15803d'],
    [22, -44, 24, '#15803d'],
    [-8, -66, 20, '#22c55e'],
  ];
  for (const [dx, dy, r, color] of blobs) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p.x + dx + sway * 20, p.y + dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ef4444';
  for (const [dx, dy] of [[-12, -60], [10, -50], [16, -68]]) {
    ctx.beginPath();
    ctx.arc(p.x + dx + sway * 20, p.y + dy, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCrate(ctx: CanvasRenderingContext2D, c: Crate, t: number) {
  const color = CRATE_COLORS[c.kind];
  const bob = Math.sin(t * 3 + c.x) * 3;
  const appear = Math.min(1, (t - c.born) * 2.5);
  const beam = ctx.createLinearGradient(0, c.y - 220, 0, c.y);
  beam.addColorStop(0, `${color}00`);
  beam.addColorStop(1, `${color}88`);
  ctx.fillStyle = beam;
  ctx.globalAlpha = appear * (0.6 + 0.25 * Math.sin(t * 4));
  ctx.fillRect(c.x - 14, c.y - 220, 28, 220);
  ctx.globalAlpha = appear;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(c.x, c.y + 4, 30, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(c.x, c.y - 18 + bob - (1 - appear) * 60);
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#b45309';
  ctx.beginPath();
  ctx.roundRect(-24, -20, 48, 40, 6);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#d97706';
  ctx.fillRect(-24, -20, 48, 10);
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 2;
  for (const y of [-6, 6]) {
    ctx.beginPath();
    ctx.moveTo(-22, y);
    ctx.lineTo(22, y);
    ctx.stroke();
  }
  ctx.fillStyle = color;
  ctx.fillRect(-6, -20, 12, 40);
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 16px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', 0, 1);
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawPickup(ctx: CanvasRenderingContext2D, p: Pickup, t: number) {
  const bob = Math.sin(t * 4 + p.x) * 3;
  if (p.kind === 'fruit') {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 4, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(p.x, p.y - 10 + bob, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fde68a';
    ctx.beginPath();
    ctx.arc(p.x - 4, p.y - 14 + bob, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.ellipse(p.x + 4, p.y - 22 + bob, 6, 3, -0.6, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  const s = 1 + Math.sin(t * 6 + p.y) * 0.12;
  ctx.save();
  ctx.translate(p.x, p.y - 10 + bob);
  ctx.scale(s, s);
  ctx.fillStyle = `hsl(${p.hue} 90% 60%)`;
  ctx.shadowColor = `hsl(${p.hue} 90% 70%)`;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.lineTo(8, 0);
  ctx.lineTo(0, 9);
  ctx.lineTo(-8, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.lineTo(3, -2);
  ctx.lineTo(-3, -2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, w: World) {
  const { px: x, py: y } = w;
  const step = w.moving ? Math.sin(w.walkT * 14) : 0;
  const bounce = w.moving ? Math.abs(Math.sin(w.walkT * 14)) * 3 : 0;
  if (w.boost > 0) {
    ctx.fillStyle = 'rgba(250, 204, 21, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x, y, 30, 12, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + 2, 18, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y - bounce);
  ctx.scale(w.facing, 1);
  ctx.fillStyle = '#1e3a8a';
  ctx.beginPath();
  ctx.roundRect(-9 + step * 3, -16, 7, 16, 3);
  ctx.roundRect(2 - step * 3, -16, 7, 16, 3);
  ctx.fill();
  ctx.fillStyle = '#7c2d12';
  ctx.beginPath();
  ctx.roundRect(-18, -40, 12, 22, 4);
  ctx.fill();
  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.roundRect(-11, -42, 22, 28, 8);
  ctx.fill();
  ctx.fillStyle = '#fdba74';
  ctx.fillRect(-11, -30, 22, 4);
  ctx.fillStyle = '#f1c27d';
  ctx.beginPath();
  ctx.arc(2, -52, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(6, -53, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#a16207';
  ctx.beginPath();
  ctx.ellipse(1, -60, 17, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ca8a04';
  ctx.beginPath();
  ctx.roundRect(-8, -71, 18, 12, 6);
  ctx.fill();
  ctx.fillStyle = '#7f1d1d';
  ctx.fillRect(-8, -63, 18, 3);
  ctx.restore();
  if (w.shield > 0) {
    const pulse = 1 + Math.sin(w.t * 6) * 0.04;
    const grad = ctx.createRadialGradient(x, y - 32, 10, x, y - 32, 46 * pulse);
    grad.addColorStop(0, 'rgba(56,189,248,0)');
    grad.addColorStop(0.75, 'rgba(56,189,248,0.18)');
    grad.addColorStop(1, 'rgba(125,211,252,0.7)');
    ctx.fillStyle = grad;
    ctx.globalAlpha = w.shield < 2 && Math.floor(w.t * 8) % 2 === 0 ? 0.4 : 1;
    ctx.beginPath();
    ctx.arc(x, y - 32, 46 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawStorm(ctx: CanvasRenderingContext2D, w: World, camX: number, camY: number, size: StageSize) {
  const zx = w.zone.x - camX;
  const zy = w.zone.y - camY;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, size.w, size.h);
  ctx.arc(zx, zy, Math.max(1, w.zone.r), 0, Math.PI * 2, true);
  ctx.fillStyle = 'rgba(88, 28, 135, 0.42)';
  ctx.fill('evenodd');
  ctx.clip('evenodd');
  ctx.strokeStyle = 'rgba(216, 180, 254, 0.22)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 26; i += 1) {
    const sx = ((i * 137 + w.t * 160) % (size.w + 200)) - 100;
    const sy = ((i * 71 + w.t * 40) % (size.h + 60)) - 30;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx + 30, sy - 10, sx + 60, sy);
    ctx.stroke();
  }
  ctx.restore();
  ctx.save();
  ctx.shadowColor = '#e9d5ff';
  ctx.shadowBlur = 16;
  ctx.strokeStyle = `rgba(233, 213, 255, ${0.75 + Math.sin(w.t * 5) * 0.2})`;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(zx, zy, Math.max(1, w.zone.r), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
  if (!w.shrinking && w.round >= 0 && w.round < ROUNDS.length) {
    ctx.setLineDash([12, 10]);
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w.target.x - camX, w.target.y - camY, w.target.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawMinimap(ctx: CanvasRenderingContext2D, w: World, island: HTMLCanvasElement, size: StageSize) {
  const mw = 150;
  const mh = (mw * WORLD_H) / WORLD_W;
  const mx = size.w - mw - 14;
  const my = size.h - mh - 14;
  const k = mw / WORLD_W;
  ctx.save();
  ctx.fillStyle = 'rgba(8, 47, 73, 0.85)';
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(mx - 4, my - 4, mw + 8, mh + 8, 10);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.rect(mx, my, mw, mh);
  ctx.clip();
  ctx.drawImage(island, mx, my, mw, mh);
  ctx.strokeStyle = '#e9d5ff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(mx + w.zone.x * k, my + w.zone.y * k, w.zone.r * k, 0, Math.PI * 2);
  ctx.stroke();
  if (!w.shrinking && w.round < ROUNDS.length) {
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(mx + w.target.x * k, my + w.target.y * k, w.target.r * k, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  for (const c of w.crates) {
    if (c.opened) continue;
    ctx.fillStyle = CRATE_COLORS[c.kind];
    ctx.fillRect(mx + c.x * k - 3, my + c.y * k - 3, 6, 6);
  }
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#f97316';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(mx + w.px * k, my + w.py * k, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawPointer(ctx: CanvasRenderingContext2D, w: World, camX: number, camY: number, size: StageSize) {
  let best: Crate | null = null;
  let bestD = Infinity;
  for (const c of w.crates) {
    if (c.opened) continue;
    const d = Math.hypot(c.x - w.px, c.y - w.py);
    if (d < bestD) {
      best = c;
      bestD = d;
    }
  }
  if (!best) return;
  const sx = best.x - camX;
  const sy = best.y - camY;
  if (sx > 30 && sx < size.w - 30 && sy > 70 && sy < size.h - 30) return;
  const cx = size.w / 2;
  const cy = size.h / 2;
  const a = Math.atan2(sy - cy, sx - cx);
  const ex = Math.max(40, Math.min(size.w - 40, cx + Math.cos(a) * size.w));
  const ey = Math.max(90, Math.min(size.h - 40, cy + Math.sin(a) * size.h));
  ctx.save();
  ctx.translate(ex, ey);
  ctx.rotate(a);
  ctx.fillStyle = CRATE_COLORS[best.kind];
  ctx.shadowColor = CRATE_COLORS[best.kind];
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(18 + Math.sin(w.t * 8) * 3, 0);
  ctx.lineTo(-8, -12);
  ctx.lineTo(-2, 0);
  ctx.lineTo(-8, 12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export default function SurvivalIslandGame({ questions, muted, onFinish }: ArcadeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<World>(makeWorld(questions));
  const islandRef = useRef<HTMLCanvasElement | null>(null);
  const phaseRef = useRef<Phase>('ready');
  const mutedRef = useRef(muted);
  const finishedRef = useRef(false);
  const keysRef = useRef(new Set<string>());
  const joyRef = useRef<{ id: number; ox: number; oy: number; x: number; y: number } | null>(null);
  const hudTimer = useRef(0);
  const [phase, setPhaseState] = useState<Phase>('ready');
  const [countdown, setCountdown] = useState(3);
  const [hud, setHud] = useState<Hud>({ score: 0, gems: 0, hearts: MAX_HEARTS, combo: 0, shield: 0, boost: 0, round: 0, timer: 0, shrinking: false, final: false, outside: false, opened: 0 });
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [toast, setToast] = useState<{ id: number; title: string; text: string } | null>(null);
  const [joy, setJoy] = useState<{ x: number; y: number } | null>(null);
  mutedRef.current = muted;

  const setPhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  const syncHud = useCallback(() => {
    const w = worldRef.current;
    const spec = ROUNDS[w.round];
    const final = w.round >= ROUNDS.length - 1 && w.roundT >= (spec?.hold ?? 0) + (spec?.shrink ?? 0);
    const timer = final ? FINAL_HOLD - w.finalHold : spec ? (w.shrinking ? spec.hold + spec.shrink - w.roundT : spec.hold - w.roundT) : 0;
    setHud({
      score: w.score,
      gems: w.gems,
      hearts: w.hearts,
      combo: w.combo,
      shield: w.shield,
      boost: w.boost,
      round: Math.max(1, w.round + 1),
      timer: Math.max(0, Math.ceil(timer)),
      shrinking: w.shrinking && !final,
      final,
      outside: w.outside,
      opened: w.answered,
    });
  }, []);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const w = worldRef.current;
    setPhase('done');
    playSound(w.hearts > 0 ? 'win' : 'wrong', mutedRef.current);
    onFinish({ score: w.score, correct: w.correct, total: questions.length, bestCombo: w.bestCombo, missed: w.missed });
  }, [onFinish, questions.length, setPhase]);

  const openCrate = useCallback(
    (crate: Crate) => {
      crate.opened = true;
      keysRef.current.clear();
      joyRef.current = null;
      setJoy(null);
      playSound('unlock', mutedRef.current);
      setQuiz({ crate, options: answerOptions(crate.question, 4), picked: null });
      setPhase('question');
    },
    [setPhase],
  );

  const update = useCallback(
    (dt: number) => {
      const w = worldRef.current;
      w.t += dt;
      w.flash = Math.max(0, w.flash - dt * 1.5);
      w.shield = Math.max(0, w.shield - dt);
      w.boost = Math.max(0, w.boost - dt);

      let ix = 0;
      let iy = 0;
      const keys = keysRef.current;
      if (keys.has('left')) ix -= 1;
      if (keys.has('right')) ix += 1;
      if (keys.has('up')) iy -= 1;
      if (keys.has('down')) iy += 1;
      const stick = joyRef.current;
      if (stick) {
        ix += stick.x;
        iy += stick.y;
      }
      const mag = Math.hypot(ix, iy);
      w.moving = mag > 0.15;
      if (w.moving) {
        const n = Math.min(1, mag);
        const speed = SPEED * (w.boost > 0 ? BOOST : 1) * n;
        const nx = w.px + (ix / mag) * speed * dt;
        const ny = w.py + (iy / mag) * speed * dt;
        if (landDepth(w.shape, nx, w.py) > 6) w.px = nx;
        if (landDepth(w.shape, w.px, ny) > 6) w.py = ny;
        if (Math.abs(ix) > 0.1) w.facing = ix > 0 ? 1 : -1;
        w.walkT += dt * (w.boost > 0 ? 1.4 : 1);
        if (w.boost > 0 && Math.random() < 0.6) {
          w.particles.push({ x: w.px + rand(-8, 8), y: w.py, vx: rand(-30, 30), vy: rand(-40, -10), life: 0, max: 0.5, color: '#fde047', size: rand(2, 4) });
        }
      }
      for (const p of w.props) {
        const dx = w.px - p.x;
        const dy = w.py - p.y;
        const d = Math.hypot(dx, dy);
        const min = p.r + PLAYER_R;
        if (d < min && d > 0.01) {
          w.px = p.x + (dx / d) * min;
          w.py = p.y + (dy / d) * min;
        }
      }

      for (const p of w.pickups) {
        if (p.taken || Math.hypot(p.x - w.px, p.y - w.py) > 30) continue;
        p.taken = true;
        if (p.kind === 'gem') {
          w.gems += 1;
          w.score += 10;
          burst(w, p.x, p.y - 10, [`hsl(${p.hue} 90% 65%)`, '#ffffff'], 10, 140);
          playSound('coin', mutedRef.current);
        } else {
          w.hearts = Math.min(MAX_HEARTS, w.hearts + 0.5);
          w.score += 25;
          burst(w, p.x, p.y - 10, ['#f97316', '#fde68a', '#22c55e'], 14, 160);
          playSound('pop', mutedRef.current);
        }
      }

      const spec = ROUNDS[w.round];
      w.roundT += dt;
      if (spec) {
        if (!w.shrinking && w.roundT >= spec.hold) {
          w.shrinking = true;
          playSound('storm', mutedRef.current);
        }
        if (w.shrinking) {
          const k = Math.min(1, (w.roundT - spec.hold) / spec.shrink);
          const e = k * k * (3 - 2 * k);
          w.zone = {
            x: w.from.x + (w.target.x - w.from.x) * e,
            y: w.from.y + (w.target.y - w.from.y) * e,
            r: w.from.r + (w.target.r - w.from.r) * e,
          };
          if (k >= 1) {
            if (w.round < ROUNDS.length - 1) startRound(w);
            else {
              w.finalHold += dt;
              if (w.finalHold >= FINAL_HOLD) {
                finish();
                return;
              }
            }
          }
        }
      }

      const distOut = Math.hypot(w.px - w.zone.x, w.py - w.zone.y) - w.zone.r;
      w.outside = distOut > 0;
      if (w.outside && w.shield <= 0) {
        w.hearts = Math.max(0, w.hearts - dt * (0.22 + w.round * 0.04));
        w.stormTick -= dt;
        if (w.stormTick <= 0) {
          w.stormTick = 0.9;
          w.flash = 0.25;
          w.flashColor = '#a855f7';
          playSound('storm', mutedRef.current);
        }
        if (w.hearts <= 0) {
          finish();
          return;
        }
      }

      for (const c of w.crates) {
        if (!c.opened && Math.hypot(c.x - w.px, c.y - w.py) < 40) {
          openCrate(c);
          break;
        }
      }

      w.particles = w.particles.filter((p) => {
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 300 * dt;
        return p.life < p.max;
      });

      hudTimer.current -= dt;
      if (hudTimer.current <= 0) {
        hudTimer.current = 0.1;
        syncHud();
      }
    },
    [finish, openCrate, syncHud],
  );

  useCanvasStage(canvasRef, H, (ctx, dt, size) => {
    const w = worldRef.current;
    if (!islandRef.current) islandRef.current = renderIsland(w.shape);
    if (phaseRef.current === 'playing') update(dt);
    else {
      w.t += dt * (phaseRef.current === 'paused' ? 0 : 1);
      w.flash = Math.max(0, w.flash - dt);
      w.particles = w.particles.filter((p) => {
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        return p.life < p.max;
      });
    }
    const camX = Math.max(0, Math.min(WORLD_W - size.w, w.px - size.w / 2));
    const camY = Math.max(0, Math.min(WORLD_H - size.h, w.py - size.h * 0.55));

    const sea = ctx.createLinearGradient(0, 0, 0, size.h);
    sea.addColorStop(0, '#0369a1');
    sea.addColorStop(1, '#0c4a6e');
    ctx.fillStyle = sea;
    ctx.fillRect(0, 0, size.w, size.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 2;
    const gap = 70;
    for (let gx = Math.floor(camX / gap) * gap; gx < camX + size.w + gap; gx += gap) {
      for (let gy = Math.floor(camY / gap) * gap; gy < camY + size.h + gap; gy += gap) {
        const off = Math.sin(w.t * 1.5 + gx * 0.05 + gy * 0.03) * 8;
        const sx = gx - camX + ((gy / gap) % 2) * 35 + off;
        const sy = gy - camY;
        ctx.beginPath();
        ctx.moveTo(sx - 12, sy);
        ctx.quadraticCurveTo(sx, sy - 5, sx + 12, sy);
        ctx.stroke();
      }
    }
    ctx.drawImage(islandRef.current, camX, camY, size.w, size.h, 0, 0, size.w, size.h);

    ctx.save();
    ctx.translate(-camX, -camY);
    const inView = (x: number, y: number, pad = 120) => x > camX - pad && x < camX + size.w + pad && y > camY - pad && y < camY + size.h + pad * 2;
    for (const p of w.pickups) if (!p.taken && inView(p.x, p.y)) drawPickup(ctx, p, w.t);
    const sprites: Array<{ y: number; draw: () => void }> = [];
    for (const p of w.props) if (inView(p.x, p.y)) sprites.push({ y: p.y, draw: () => drawProp(ctx, p, w.t) });
    for (const c of w.crates) if (!c.opened && inView(c.x, c.y, 260)) sprites.push({ y: c.y, draw: () => drawCrate(ctx, c, w.t) });
    sprites.push({ y: w.py, draw: () => drawPlayer(ctx, w) });
    sprites.sort((a, b) => a.y - b.y).forEach((s) => s.draw());
    for (const p of w.particles) {
      ctx.globalAlpha = Math.max(0, 1 - p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    drawStorm(ctx, w, camX, camY, size);
    if (phaseRef.current !== 'ready') {
      drawPointer(ctx, w, camX, camY, size);
      drawMinimap(ctx, w, islandRef.current, size);
    }
    if (w.outside && w.shield <= 0 && phaseRef.current === 'playing') {
      const v = ctx.createRadialGradient(size.w / 2, size.h / 2, size.h * 0.35, size.w / 2, size.h / 2, size.w * 0.7);
      v.addColorStop(0, 'rgba(126, 34, 206, 0)');
      v.addColorStop(1, `rgba(126, 34, 206, ${0.45 + Math.sin(w.t * 6) * 0.1})`);
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, size.w, size.h);
    }
    if (w.flash > 0) {
      ctx.globalAlpha = Math.min(0.4, w.flash);
      ctx.fillStyle = w.flashColor;
      ctx.fillRect(0, 0, size.w, size.h);
      ctx.globalAlpha = 1;
    }
  });

  const start = useCallback(() => {
    playSound('tick', mutedRef.current);
    setCountdown(3);
    setPhase('countdown');
  }, [setPhase]);

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      const w = worldRef.current;
      if (w.round < 0) startRound(w);
      syncHud();
      setPhase('playing');
      return;
    }
    const timer = window.setTimeout(() => {
      playSound('tick', mutedRef.current);
      setCountdown((value) => value - 1);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [countdown, phase, setPhase, syncHud]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const pick = useCallback(
    (option: string) => {
      if (!quiz || quiz.picked) return;
      const w = worldRef.current;
      const crate = quiz.crate;
      setQuiz({ ...quiz, picked: option });
      w.answered += 1;
      if (option === crate.question.answer) {
        w.combo += 1;
        w.bestCombo = Math.max(w.bestCombo, w.combo);
        w.correct += 1;
        const points = 100 * Math.min(w.combo, 5) * (crate.kind === 'star' ? 2 : 1);
        w.score += points;
        if (crate.kind === 'shield') w.shield = SHIELD_TIME;
        if (crate.kind === 'speed') w.boost = SPEED_TIME;
        burst(w, crate.x, crate.y - 20, [CRATE_COLORS[crate.kind], '#ffffff', '#fde68a'], 40, 300);
        w.flash = 0.25;
        w.flashColor = '#22c55e';
        playSound('correct', mutedRef.current);
        const reward = crate.kind === 'shield' ? 'Storm shield on!' : crate.kind === 'speed' ? 'Speed boost!' : 'Double points!';
        setToast({ id: Date.now(), title: `${reward}  +${points}`, text: crate.question.explanation });
      } else {
        w.combo = 0;
        w.hearts = Math.max(0, w.hearts - 1);
        w.missed.push(crate.question);
        w.flash = 0.4;
        w.flashColor = '#ef4444';
        playSound('wrong', mutedRef.current);
      }
      syncHud();
    },
    [quiz, syncHud],
  );

  const closeQuiz = useCallback(() => {
    if (!quiz?.picked) return;
    const w = worldRef.current;
    const right = quiz.picked === quiz.crate.question.answer;
    setQuiz(null);
    if (right) {
      if (quiz.crate.kind === 'shield') playSound('shield', mutedRef.current);
      if (quiz.crate.kind === 'speed') playSound('boost', mutedRef.current);
    } else setToast(null);
    if (w.hearts <= 0 || w.answered >= questions.length) {
      finish();
      return;
    }
    setPhase('playing');
  }, [finish, questions.length, quiz, setPhase]);

  useEffect(() => {
    if (!quiz?.picked || quiz.picked !== quiz.crate.question.answer) return;
    const timer = window.setTimeout(closeQuiz, 1800);
    return () => window.clearTimeout(timer);
  }, [closeQuiz, quiz]);

  useEffect(() => {
    const map: Record<string, string> = {
      ArrowLeft: 'left', a: 'left', A: 'left',
      ArrowRight: 'right', d: 'right', D: 'right',
      ArrowUp: 'up', w: 'up', W: 'up',
      ArrowDown: 'down', s: 'down', S: 'down',
    };
    const onDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const dir = map[event.key];
      if (dir && phaseRef.current === 'playing') {
        event.preventDefault();
        keysRef.current.add(dir);
      } else if ((event.key === 'Escape' || event.key === 'p' || event.key === 'P') && phaseRef.current === 'playing') {
        keysRef.current.clear();
        setPhase('paused');
      }
    };
    const onUp = (event: KeyboardEvent) => {
      const dir = map[event.key];
      if (dir) keysRef.current.delete(dir);
    };
    const onBlur = () => keysRef.current.clear();
    const onHide = () => {
      if (document.hidden && phaseRef.current === 'playing') setPhase('paused');
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [setPhase]);

  const onJoyDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (phaseRef.current !== 'playing') return;
    const rect = event.currentTarget.getBoundingClientRect();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* pointer already released */
    }
    joyRef.current = { id: event.pointerId, ox: rect.left + rect.width / 2, oy: rect.top + rect.height / 2, x: 0, y: 0 };
    onJoyMove(event);
  };
  const onJoyMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const stick = joyRef.current;
    if (!stick || stick.id !== event.pointerId) return;
    const radius = event.currentTarget.getBoundingClientRect().width / 2;
    let dx = (event.clientX - stick.ox) / radius;
    let dy = (event.clientY - stick.oy) / radius;
    const m = Math.hypot(dx, dy);
    if (m > 1) {
      dx /= m;
      dy /= m;
    }
    stick.x = dx;
    stick.y = dy;
    setJoy({ x: dx, y: dy });
  };
  const onJoyUp = () => {
    joyRef.current = null;
    setJoy(null);
  };

  const timer = `${Math.floor(hud.timer / 60)}:${String(hud.timer % 60).padStart(2, '0')}`;

  return (
    <div className="arc-game arc-island">
      <canvas ref={canvasRef} className="arc-canvas" aria-label="Survival Island game" />

      {phase !== 'ready' ? (
        <div className="arc-hud">
          <div className="arc-hud__group">
            <span className="arc-pill"><Star className="arc-pill__icon text-amber-300" />{hud.score.toLocaleString()}</span>
            <span className="arc-pill"><Gem className="arc-pill__icon text-cyan-300" />{hud.gems}</span>
          </div>
          <div className={`arc-banner arc-island__banner ${hud.outside ? 'is-danger' : ''}`}>
            <span className="arc-banner__count"><Package className="arc-pill__icon" /> {hud.opened}/{questions.length}</span>
            <span>
              {hud.outside
                ? 'Storm! Get back inside the circle'
                : hud.final
                  ? `Final circle · survive ${timer}`
                  : hud.shrinking
                    ? `Round ${hud.round}/${ROUNDS.length} · storm closing in`
                    : `Round ${hud.round}/${ROUNDS.length} · storm moves in ${timer}`}
            </span>
          </div>
          <div className="arc-hud__group">
            {hud.combo >= 2 ? <span className="arc-pill arc-pill--combo">Combo x{Math.min(hud.combo, 5)}</span> : null}
            {hud.shield > 0 ? <span className="arc-pill arc-pill--shield"><Shield className="arc-pill__icon" />{Math.ceil(hud.shield)}s</span> : null}
            {hud.boost > 0 ? <span className="arc-pill arc-pill--boost"><Wind className="arc-pill__icon" />{Math.ceil(hud.boost)}s</span> : null}
            <HeartsPill hearts={hud.hearts} max={MAX_HEARTS} />
            {phase === 'playing' ? (
              <button type="button" className="arc-icon-btn" aria-label="Pause" onClick={() => { keysRef.current.clear(); setPhase('paused'); }}>
                <Pause className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {phase === 'playing' ? (
        <div
          className="arc-joystick"
          onPointerDown={onJoyDown}
          onPointerMove={onJoyMove}
          onPointerUp={onJoyUp}
          onPointerCancel={onJoyUp}
          role="application"
          aria-label="Movement joystick"
        >
          <span className="arc-joystick__knob" style={{ transform: `translate(${(joy?.x ?? 0) * 60}%, ${(joy?.y ?? 0) * 60}%)` }} />
        </div>
      ) : null}

      {toast ? <CorrectToast key={toast.id} title={toast.title} text={toast.text} /> : null}

      {phase === 'ready' ? (
        <ReadyModal
          eyebrow="Survival Island"
          title="Outlast the storm, crack the crates!"
          howto={[
            <><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> / arrows or the joystick to explore</>,
            <>Walk into a glowing <strong>loot crate</strong> and answer to win a shield, speed boost or double points</>,
            <>Stay inside the circle: the storm drains hearts, and it shrinks every round</>,
          ]}
          cta="Land on the island"
          onStart={start}
        />
      ) : null}

      {phase === 'countdown' ? <Countdown value={countdown} /> : null}
      {phase === 'paused' ? <PausedModal onResume={() => setPhase('playing')} /> : null}

      {phase === 'question' && quiz ? (
        <QuizModal
          className="arc-island__quiz"
          eyebrow={
            <>
              <Sparkles className="h-4 w-4" />
              {quiz.crate.kind === 'shield' ? 'Shield crate' : quiz.crate.kind === 'speed' ? 'Speed crate' : 'Star crate'} · crate {worldRef.current.answered + (quiz.picked ? 0 : 1)} of {questions.length}
            </>
          }
          question={quiz.crate.question}
          options={quiz.options}
          picked={quiz.picked}
          onPick={pick}
          onContinue={closeQuiz}
          continueLabel={quiz.picked === quiz.crate.question.answer ? 'Grab the reward' : hud.hearts > 0 && worldRef.current.answered < questions.length ? 'Got it, keep exploring' : 'See results'}
        />
      ) : null}
    </div>
  );
}
