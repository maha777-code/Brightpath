import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { ArcadeQuestion } from '@brightpath/shared';
import { ChevronLeft, ChevronRight, ChevronUp, Coins, Heart, Pause, Play, Star } from 'lucide-react';
import { answerOptions, isTypingTarget, playSound, type ArcadeGameProps } from './arcadeKit';

const W = 960;
const H = 540;
const HORIZON = H * 0.36;
const GROUND_BOTTOM = H * 1.04;
const FOCAL = 6;
const LANE_SPACING = W * 0.27;
const PLAYER_Z = 1.6;
const SPAWN_Z = 62;
const BUILDING_SPAN = 84;
const JUMP_TIME = 0.75;
const MAX_HEARTS = 3;
const GATE_COLORS = ['#22d3ee', '#fbbf24', '#f472b6'];
const NEON = ['#22d3ee', '#f472b6', '#facc15', '#a3e635', '#fb923c'];

type Phase = 'ready' | 'countdown' | 'playing' | 'feedback' | 'paused' | 'done';

interface Gate {
  z: number;
  options: string[];
  question: ArcadeQuestion;
  resolved: boolean;
  chosen: number;
}
interface Coin { z: number; lane: number; taken: boolean }
interface Barrier { z: number; lane: number; hit: boolean }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }
interface Building { side: -1 | 1; z: number; depth: number; height: number; color: string; windows: number[] }
interface Skyline { x: number; w: number; h: number; lit: number[] }

interface World {
  lane: number;
  lanePos: number;
  jump: number;
  speed: number;
  distance: number;
  runT: number;
  stumble: number;
  flash: number;
  flashColor: string;
  gate: Gate | null;
  nextGateIn: number;
  spawnIn: number;
  coins: Coin[];
  barriers: Barrier[];
  particles: Particle[];
  buildings: Building[];
  skyline: Skyline[];
  stars: { x: number; y: number; r: number }[];
  questionIndex: number;
  score: number;
  coinCount: number;
  hearts: number;
  combo: number;
  bestCombo: number;
  correct: number;
  missed: ArcadeQuestion[];
}

interface Hud {
  score: number;
  coins: number;
  hearts: number;
  combo: number;
  questionNumber: number;
  prompt: string | null;
}

interface Toast { id: number; title: string; text: string }

const scaleAt = (z: number) => FOCAL / (FOCAL + Math.max(z, -FOCAL * 0.85));
const yAt = (z: number) => HORIZON + (GROUND_BOTTOM - HORIZON) * scaleAt(z);
const xAt = (lanePos: number, z: number) => W / 2 + (lanePos - 1) * LANE_SPACING * scaleAt(z);
const fog = (z: number) => Math.max(0, Math.min(1, 1.3 - z / SPAWN_Z));
const rand = (min: number, max: number) => min + Math.random() * (max - min);

function makeBuildings(): Building[] {
  const list: Building[] = [];
  for (const side of [-1, 1] as const) {
    let z = -2;
    while (z < BUILDING_SPAN - 2) {
      const depth = rand(5, 9);
      list.push({
        side,
        z,
        depth,
        height: rand(260, 560),
        color: ['#1e1b4b', '#172554', '#3b0764', '#0f172a', '#1e293b'][Math.floor(Math.random() * 5)],
        windows: Array.from({ length: 24 }, () => (Math.random() < 0.55 ? Math.floor(Math.random() * NEON.length) : -1)),
      });
      z += depth + rand(0.6, 1.6);
    }
  }
  return list;
}

function makeWorld(): World {
  let x = -20;
  const skyline: Skyline[] = [];
  while (x < W + 20) {
    const w = rand(30, 70);
    skyline.push({ x, w, h: rand(40, 150), lit: Array.from({ length: 12 }, () => (Math.random() < 0.35 ? 1 : 0)) });
    x += w + rand(2, 8);
  }
  return {
    lane: 1,
    lanePos: 1,
    jump: 0,
    speed: 4,
    distance: 0,
    runT: 0,
    stumble: 0,
    flash: 0,
    flashColor: '#ef4444',
    gate: null,
    nextGateIn: 1.2,
    spawnIn: 0.6,
    coins: [],
    barriers: [],
    particles: [],
    buildings: makeBuildings(),
    skyline,
    stars: Array.from({ length: 60 }, () => ({ x: Math.random() * W, y: Math.random() * HORIZON * 0.8, r: rand(0.5, 1.8) })),
    questionIndex: 0,
    score: 0,
    coinCount: 0,
    hearts: MAX_HEARTS,
    combo: 0,
    bestCombo: 0,
    correct: 0,
    missed: [],
  };
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function burst(world: World, x: number, y: number, colors: string[], count: number, power = 260) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = rand(power * 0.3, power);
    world.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - power * 0.4,
      life: 0,
      max: rand(0.5, 1),
      color: colors[i % colors.length],
      size: rand(2, 6),
    });
  }
}

function drawScene(ctx: CanvasRenderingContext2D, w: World) {
  const sky = ctx.createLinearGradient(0, 0, 0, HORIZON);
  sky.addColorStop(0, '#0b1033');
  sky.addColorStop(0.55, '#4c1d95');
  sky.addColorStop(1, '#fb7185');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, HORIZON + 2);

  ctx.fillStyle = '#ffffff';
  for (const star of w.stars) {
    ctx.globalAlpha = 0.4 + 0.4 * Math.sin(w.runT * 2 + star.x);
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const sun = ctx.createRadialGradient(W / 2, HORIZON, 10, W / 2, HORIZON, 120);
  sun.addColorStop(0, 'rgba(254,240,138,0.95)');
  sun.addColorStop(0.45, 'rgba(251,146,60,0.55)');
  sun.addColorStop(1, 'rgba(251,113,133,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(W / 2 - 140, HORIZON - 140, 280, 140);

  const shift = (w.lanePos - 1) * -18;
  for (const b of w.skyline) {
    const x = b.x + shift;
    ctx.fillStyle = '#1e1046';
    ctx.fillRect(x, HORIZON - b.h, b.w, b.h);
    ctx.fillStyle = 'rgba(253,224,71,0.55)';
    b.lit.forEach((on, index) => {
      if (!on) return;
      const col = index % 3;
      const row = Math.floor(index / 3);
      ctx.fillRect(x + 6 + col * (b.w / 3.2), HORIZON - b.h + 8 + row * 14, 4, 6);
    });
  }

  const ground = ctx.createLinearGradient(0, HORIZON, 0, H);
  ground.addColorStop(0, '#312e81');
  ground.addColorStop(1, '#0f172a');
  ctx.fillStyle = ground;
  ctx.fillRect(0, HORIZON, W, H - HORIZON);

  const farZ = SPAWN_Z + 20;
  ctx.fillStyle = '#27272a';
  ctx.beginPath();
  ctx.moveTo(xAt(-0.55, farZ), yAt(farZ));
  ctx.lineTo(xAt(2.55, farZ), yAt(farZ));
  ctx.lineTo(xAt(2.55, -1), yAt(-1));
  ctx.lineTo(xAt(-0.55, -1), yAt(-1));
  ctx.closePath();
  ctx.fill();

  const tieGap = 1.4;
  const offset = w.distance % tieGap;
  for (let z = SPAWN_Z + 10 - offset; z > -1; z -= tieGap) {
    const s = scaleAt(z);
    const y = yAt(z);
    ctx.globalAlpha = fog(z);
    ctx.fillStyle = '#5b3a1e';
    for (let lane = 0; lane < 3; lane += 1) {
      const cx = xAt(lane, z);
      const half = LANE_SPACING * 0.36 * s;
      ctx.fillRect(cx - half, y - 5 * s, half * 2, Math.max(1, 9 * s));
    }
  }
  ctx.globalAlpha = 1;

  for (let lane = 0; lane < 3; lane += 1) {
    for (const off of [-0.2, 0.2]) {
      const far = { x: xAt(lane + off, farZ), y: yAt(farZ) };
      const near = { x: xAt(lane + off, -1), y: yAt(-1) };
      const grad = ctx.createLinearGradient(0, far.y, 0, near.y);
      grad.addColorStop(0, 'rgba(203,213,225,0.15)');
      grad.addColorStop(1, 'rgba(226,232,240,0.95)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(far.x, far.y);
      ctx.lineTo(near.x, near.y);
      ctx.stroke();
    }
  }

  const buildings = [...w.buildings].sort((a, b) => b.z - a.z);
  for (const b of buildings) {
    const z0 = Math.max(b.z, -1.5);
    const z1 = b.z + b.depth;
    if (z1 < -1.5 || z0 > SPAWN_Z + 15) continue;
    const edge = b.side < 0 ? -0.75 : 2.75;
    const p0 = { x: xAt(edge, z0), y: yAt(z0), s: scaleAt(z0) };
    const p1 = { x: xAt(edge, z1), y: yAt(z1), s: scaleAt(z1) };
    ctx.globalAlpha = fog(z0);
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.lineTo(p1.x, p1.y - b.height * p1.s);
    ctx.lineTo(p0.x, p0.y - b.height * p0.s);
    ctx.closePath();
    ctx.fill();
    const outward = b.side < 0 ? -1 : 1;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y - b.height * p0.s);
    ctx.lineTo(p0.x + outward * 400 * p0.s, p0.y - b.height * p0.s);
    ctx.lineTo(p0.x + outward * 400 * p0.s, p0.y);
    ctx.lineTo(p0.x, p0.y);
    ctx.closePath();
    ctx.fillStyle = b.color;
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fill();
    const cols = 4;
    const rows = 6;
    b.windows.forEach((tone, index) => {
      if (tone < 0) return;
      const col = index % cols;
      const row = Math.floor(index / cols);
      if (row >= rows) return;
      const t0 = (col + 0.25) / cols;
      const t1 = (col + 0.7) / cols;
      const h0 = (row + 0.3) / (rows + 0.5);
      const h1 = (row + 0.8) / (rows + 0.5);
      const pt = (t: number, h: number) => {
        const x = p0.x + (p1.x - p0.x) * t;
        const yb = p0.y + (p1.y - p0.y) * t;
        const s = p0.s + (p1.s - p0.s) * t;
        return { x, y: yb - b.height * s * (1 - h) };
      };
      const a = pt(t0, h0);
      const c = pt(t1, h0);
      const d = pt(t1, h1);
      const e = pt(t0, h1);
      ctx.fillStyle = NEON[tone];
      ctx.globalAlpha = fog(z0) * 0.8;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(d.x, d.y);
      ctx.lineTo(e.x, e.y);
      ctx.closePath();
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  const haze = ctx.createLinearGradient(0, HORIZON - 30, 0, HORIZON + 50);
  haze.addColorStop(0, 'rgba(251,113,133,0)');
  haze.addColorStop(0.5, 'rgba(251,113,133,0.35)');
  haze.addColorStop(1, 'rgba(76,29,149,0)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, HORIZON - 30, W, 80);
}

function drawGate(ctx: CanvasRenderingContext2D, gate: Gate) {
  const z = gate.z;
  if (z < -1.2) return;
  const s = scaleAt(z);
  const base = yAt(z);
  ctx.globalAlpha = fog(z);
  gate.options.forEach((label, lane) => {
    const cx = xAt(lane, z);
    const gw = LANE_SPACING * 0.84 * s;
    const gh = 250 * s;
    const left = cx - gw / 2;
    const top = base - gh;
    let color = GATE_COLORS[lane];
    if (gate.resolved) {
      if (label === gate.question.answer) color = '#22c55e';
      else if (lane === gate.chosen) color = '#ef4444';
    }
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 24 * s;
    ctx.fillStyle = `${color}33`;
    ctx.fillRect(left, top, gw, gh);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, 10 * s);
    ctx.strokeRect(left, top, gw, gh);
    ctx.restore();

    const fontSize = Math.max(9, 34 * s);
    ctx.font = `800 ${fontSize}px Inter, system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = wrapText(ctx, label, gw * 0.86);
    const lineH = fontSize * 1.15;
    const startY = top + gh * 0.42 - ((lines.length - 1) * lineH) / 2;
    lines.forEach((line, index) => {
      const y = startY + index * lineH;
      ctx.lineWidth = Math.max(2, 6 * s);
      ctx.strokeStyle = 'rgba(2,6,23,0.85)';
      ctx.strokeText(line, cx, y);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(line, cx, y);
    });
  });
  ctx.globalAlpha = 1;
}

function drawCoin(ctx: CanvasRenderingContext2D, coin: Coin, t: number) {
  const s = scaleAt(coin.z);
  const x = xAt(coin.lane, coin.z);
  const y = yAt(coin.z) - (48 + Math.sin(t * 5 + coin.z) * 6) * s;
  const r = 17 * s;
  const rx = Math.max(r * 0.15, r * Math.abs(Math.cos(t * 5 + coin.z)));
  ctx.globalAlpha = fog(coin.z);
  const grad = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  grad.addColorStop(0, '#fef08a');
  grad.addColorStop(0.5, '#facc15');
  grad.addColorStop(1, '#b45309');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#92400e';
  ctx.lineWidth = Math.max(1, 2.5 * s);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawBarrier(ctx: CanvasRenderingContext2D, barrier: Barrier) {
  const s = scaleAt(barrier.z);
  const cx = xAt(barrier.lane, barrier.z);
  const base = yAt(barrier.z);
  const bw = LANE_SPACING * 0.74 * s;
  const bh = 34 * s;
  const top = base - 70 * s;
  ctx.globalAlpha = fog(barrier.z);
  ctx.fillStyle = '#334155';
  ctx.fillRect(cx - bw / 2 + 6 * s, top, 8 * s, base - top);
  ctx.fillRect(cx + bw / 2 - 14 * s, top, 8 * s, base - top);
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - bw / 2, top, bw, bh);
  ctx.clip();
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(cx - bw / 2, top, bw, bh);
  ctx.fillStyle = '#ef4444';
  for (let x = -bw; x < bw * 2; x += 36 * s) {
    ctx.beginPath();
    ctx.moveTo(cx - bw / 2 + x, top + bh);
    ctx.lineTo(cx - bw / 2 + x + 18 * s, top + bh);
    ctx.lineTo(cx - bw / 2 + x + 18 * s + bh, top);
    ctx.lineTo(cx - bw / 2 + x + bh, top);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function drawRunner(ctx: CanvasRenderingContext2D, w: World) {
  const s = scaleAt(PLAYER_Z) * 1.25;
  const jumpH = w.jump > 0 ? Math.sin(Math.PI * (1 - w.jump / JUMP_TIME)) : 0;
  const x = xAt(w.lanePos, PLAYER_Z);
  const ground = yAt(PLAYER_Z);
  const y = ground - jumpH * 120 * s;
  const phase = w.runT * 15;
  const tilt = (w.lane - w.lanePos) * 0.25;

  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(x, ground + 2, 38 * s * (1 - jumpH * 0.4), 9 * s, 0, 0, Math.PI * 2);
  ctx.fill();

  if (w.stumble > 0 && Math.floor(w.stumble * 20) % 2 === 0) ctx.globalAlpha = 0.45;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.scale(s, s);

  const legSwing = jumpH > 0 ? 0 : Math.sin(phase);
  const legs: Array<[number, number, string]> = [
    [-13, legSwing, '#1e293b'],
    [13, -legSwing, '#0f172a'],
  ];
  for (const [lx, swing, color] of legs) {
    const lift = Math.max(0, swing) * 16;
    ctx.fillStyle = color;
    roundRect(ctx, lx - 9, -62, 18, 52 - lift, 8);
    ctx.fillStyle = '#ef4444';
    roundRect(ctx, lx - 12, -16 - lift, 24, 14, 6);
    ctx.fillStyle = '#f8fafc';
    roundRect(ctx, lx - 12, -6 - lift, 24, 5, 2);
  }

  const armSwing = jumpH > 0 ? -0.9 : Math.sin(phase) * 0.7;
  for (const [ax, dir] of [[-30, 1], [30, -1]] as const) {
    ctx.save();
    ctx.translate(ax, -118);
    ctx.rotate(armSwing * dir);
    ctx.fillStyle = '#1d4ed8';
    roundRect(ctx, -8, 0, 16, 46, 8);
    ctx.fillStyle = '#f1c27d';
    ctx.beginPath();
    ctx.arc(0, 48, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = '#2563eb';
  roundRect(ctx, -30, -128, 60, 72, 18);
  ctx.fillStyle = '#1e3a8a';
  roundRect(ctx, -22, -122, 44, 50, 12);
  ctx.fillStyle = '#1e40af';
  roundRect(ctx, -16, -96, 32, 20, 6);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-12, -86);
  ctx.lineTo(12, -86);
  ctx.stroke();

  ctx.fillStyle = '#f1c27d';
  ctx.beginPath();
  ctx.arc(-21, -150, 6, 0, Math.PI * 2);
  ctx.arc(21, -150, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3b2314';
  ctx.beginPath();
  ctx.arc(0, -152, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4a2c17';
  ctx.beginPath();
  ctx.moveTo(-18, -168);
  ctx.lineTo(-6, -182);
  ctx.lineTo(2, -170);
  ctx.lineTo(12, -184);
  ctx.lineTo(18, -166);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawEffects(ctx: CanvasRenderingContext2D, w: World) {
  for (const p of w.particles) {
    ctx.globalAlpha = Math.max(0, 1 - p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (w.combo >= 3) {
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 14; i += 1) {
      const angle = (i / 14) * Math.PI * 2 + w.runT;
      const r0 = 300 + ((w.runT * 900 + i * 97) % 300);
      const cx = W / 2;
      const cy = HORIZON + 40;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * r0, cy + Math.sin(angle) * r0 * 0.6);
      ctx.lineTo(cx + Math.cos(angle) * (r0 + 80), cy + Math.sin(angle) * (r0 + 80) * 0.6);
      ctx.stroke();
    }
  }

  if (w.flash > 0) {
    ctx.globalAlpha = Math.min(0.45, w.flash);
    ctx.fillStyle = w.flashColor;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
}

export default function LaneRunnerGame({ questions, muted, onFinish }: ArcadeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<World>(makeWorld());
  const phaseRef = useRef<Phase>('ready');
  const mutedRef = useRef(muted);
  const finishedRef = useRef(false);
  const swipeRef = useRef<{ x: number; y: number } | null>(null);
  const [phase, setPhaseState] = useState<Phase>('ready');
  const [countdown, setCountdown] = useState(3);
  const [hud, setHud] = useState<Hud>({ score: 0, coins: 0, hearts: MAX_HEARTS, combo: 0, questionNumber: 0, prompt: null });
  const [toast, setToast] = useState<Toast | null>(null);
  const [feedback, setFeedback] = useState<{ question: ArcadeQuestion; chosen: string } | null>(null);

  mutedRef.current = muted;

  const setPhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  const syncHud = useCallback(() => {
    const w = worldRef.current;
    setHud({
      score: w.score,
      coins: w.coinCount,
      hearts: w.hearts,
      combo: w.combo,
      questionNumber: w.gate ? questions.indexOf(w.gate.question) + 1 : w.questionIndex,
      prompt: w.gate && !w.gate.resolved ? w.gate.question.prompt : null,
    });
  }, [questions]);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const w = worldRef.current;
    setPhase('done');
    playSound(w.hearts > 0 ? 'win' : 'wrong', mutedRef.current);
    onFinish({
      score: w.score,
      correct: w.correct,
      total: questions.length,
      bestCombo: w.bestCombo,
      missed: w.missed,
    });
  }, [onFinish, questions.length, setPhase]);

  const resolveGate = useCallback(
    (gate: Gate) => {
      const w = worldRef.current;
      const lane = Math.round(w.lanePos);
      const chosen = gate.options[lane];
      gate.resolved = true;
      gate.chosen = lane;
      w.questionIndex += 1;
      const s = scaleAt(PLAYER_Z);
      const px = xAt(lane, PLAYER_Z);
      const py = yAt(PLAYER_Z) - 150 * s;
      if (chosen === gate.question.answer) {
        w.combo += 1;
        w.bestCombo = Math.max(w.bestCombo, w.combo);
        w.correct += 1;
        const points = 100 * Math.min(w.combo, 5);
        w.score += points;
        w.flash = 0.35;
        w.flashColor = '#22c55e';
        burst(w, px, py, ['#22c55e', '#facc15', '#ffffff', '#22d3ee'], 46, 380);
        playSound('correct', mutedRef.current);
        setToast({ id: Date.now(), title: `+${points}  ·  ${gate.question.answer}`, text: gate.question.explanation });
      } else {
        w.combo = 0;
        w.hearts -= 1;
        w.missed.push(gate.question);
        w.flash = 0.5;
        w.flashColor = '#ef4444';
        burst(w, px, py, ['#ef4444', '#f97316'], 24, 220);
        playSound('wrong', mutedRef.current);
        setToast(null);
        setFeedback({ question: gate.question, chosen });
        setPhase('feedback');
      }
      syncHud();
    },
    [setPhase, syncHud],
  );

  const update = useCallback(
    (dt: number) => {
      const w = worldRef.current;
      w.runT += dt;
      w.lanePos += (w.lane - w.lanePos) * Math.min(1, dt * 14);
      if (w.jump > 0) w.jump = Math.max(0, w.jump - dt);
      w.stumble = Math.max(0, w.stumble - dt);
      w.flash = Math.max(0, w.flash - dt * 1.4);
      const target = 11 + Math.min(w.combo, 8) * 1.1;
      w.speed += (target - w.speed) * Math.min(1, dt * 2);
      const dz = w.speed * (w.stumble > 0 ? 0.55 : 1) * dt;
      w.distance += dz;

      for (const b of w.buildings) {
        b.z -= dz;
        if (b.z + b.depth < -2) b.z += BUILDING_SPAN;
      }
      for (const coin of w.coins) coin.z -= dz;
      for (const barrier of w.barriers) barrier.z -= dz;
      w.coins = w.coins.filter((coin) => coin.z > -2 && !coin.taken);
      w.barriers = w.barriers.filter((barrier) => barrier.z > -2);

      w.particles = w.particles.filter((p) => {
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 700 * dt;
        return p.life < p.max;
      });

      const playerLane = Math.round(w.lanePos);
      const jumpH = w.jump > 0 ? Math.sin(Math.PI * (1 - w.jump / JUMP_TIME)) : 0;
      for (const coin of w.coins) {
        if (!coin.taken && coin.lane === playerLane && Math.abs(coin.z - PLAYER_Z) < 0.7) {
          coin.taken = true;
          w.coinCount += 1;
          w.score += 10;
          burst(w, xAt(coin.lane, PLAYER_Z), yAt(PLAYER_Z) - 60, ['#facc15', '#fef08a'], 8, 160);
          playSound('coin', mutedRef.current);
          syncHud();
        }
      }
      for (const barrier of w.barriers) {
        if (!barrier.hit && barrier.lane === playerLane && Math.abs(barrier.z - PLAYER_Z) < 0.5 && jumpH < 0.4) {
          barrier.hit = true;
          w.stumble = 0.8;
          w.combo = 0;
          w.score = Math.max(0, w.score - 50);
          w.flash = 0.3;
          w.flashColor = '#f97316';
          playSound('bump', mutedRef.current);
          syncHud();
        }
      }

      w.spawnIn -= dt;
      if (w.spawnIn <= 0) {
        w.spawnIn = rand(0.9, 1.6);
        const lane = Math.floor(Math.random() * 3);
        const gateSoon = !w.gate && w.nextGateIn < 1.4;
        const nearGate = w.gate && SPAWN_Z - w.gate.z < 10;
        if (Math.random() < 0.3 && !gateSoon && !nearGate && w.combo >= 1) {
          w.barriers.push({ z: SPAWN_Z, lane, hit: false });
        } else {
          for (let i = 0; i < 5; i += 1) w.coins.push({ z: SPAWN_Z + i * 2.2, lane, taken: false });
        }
      }

      if (!w.gate) {
        w.nextGateIn -= dt;
        if (w.nextGateIn <= 0) {
          if (w.questionIndex >= questions.length) {
            finish();
            return;
          }
          const question = questions[w.questionIndex];
          w.gate = { z: SPAWN_Z, options: answerOptions(question, 3), question, resolved: false, chosen: -1 };
          w.barriers = w.barriers.filter((barrier) => barrier.z < SPAWN_Z - 12);
          playSound('tick', mutedRef.current);
          syncHud();
        }
      } else {
        w.gate.z -= dz;
        if (!w.gate.resolved && w.gate.z <= PLAYER_Z) resolveGate(w.gate);
        if (w.gate && w.gate.z < -3) {
          w.gate = null;
          w.nextGateIn = 1.1;
          syncHud();
        }
      }
    },
    [finish, questions, resolveGate, syncHud],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const w = worldRef.current;
      if (phaseRef.current === 'playing') {
        update(dt);
      } else if (phaseRef.current === 'ready' || phaseRef.current === 'countdown') {
        w.runT += dt;
        w.distance += dt * 4;
        for (const b of w.buildings) {
          b.z -= dt * 4;
          if (b.z + b.depth < -2) b.z += BUILDING_SPAN;
        }
      } else if (phaseRef.current === 'feedback' || phaseRef.current === 'done') {
        w.flash = Math.max(0, w.flash - dt);
        w.particles = w.particles.filter((p) => {
          p.life += dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.vy += 700 * dt;
          return p.life < p.max;
        });
      }
      ctx.clearRect(0, 0, W, H);
      drawScene(ctx, w);
      const objects: Array<{ z: number; draw: () => void }> = [
        ...w.coins.map((coin) => ({ z: coin.z, draw: () => drawCoin(ctx, coin, w.runT) })),
        ...w.barriers.map((barrier) => ({ z: barrier.z, draw: () => drawBarrier(ctx, barrier) })),
      ];
      if (w.gate) {
        const gate = w.gate;
        objects.push({ z: gate.z, draw: () => drawGate(ctx, gate) });
      }
      objects.sort((a, b) => b.z - a.z);
      const behind = objects.filter((o) => o.z >= PLAYER_Z - 0.2);
      const front = objects.filter((o) => o.z < PLAYER_Z - 0.2);
      behind.forEach((o) => o.draw());
      drawRunner(ctx, w);
      front.forEach((o) => o.draw());
      drawEffects(ctx, w);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [update]);

  const move = useCallback((dir: -1 | 1) => {
    if (phaseRef.current !== 'playing') return;
    const w = worldRef.current;
    w.lane = Math.max(0, Math.min(2, w.lane + dir));
  }, []);

  const jump = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    const w = worldRef.current;
    if (w.jump <= 0) w.jump = JUMP_TIME;
  }, []);

  const start = useCallback(() => {
    playSound('tick', mutedRef.current);
    setCountdown(3);
    setPhase('countdown');
  }, [setPhase]);

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      worldRef.current.speed = 6;
      setPhase('playing');
      return;
    }
    const timer = window.setTimeout(() => {
      playSound('tick', mutedRef.current);
      setCountdown((value) => value - 1);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [countdown, phase, setPhase]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const continueRun = useCallback(() => {
    setFeedback(null);
    if (worldRef.current.hearts <= 0) {
      finish();
      return;
    }
    setPhase('playing');
  }, [finish, setPhase]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const current = phaseRef.current;
      if (current === 'feedback' && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        continueRun();
        return;
      }
      if (current !== 'playing') return;
      if (event.key === 'ArrowLeft' || event.key === 'a' || event.key === 'A') {
        event.preventDefault();
        move(-1);
      } else if (event.key === 'ArrowRight' || event.key === 'd' || event.key === 'D') {
        event.preventDefault();
        move(1);
      } else if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W' || event.key === ' ') {
        event.preventDefault();
        jump();
      } else if (event.key === 'Escape' || event.key === 'p' || event.key === 'P') {
        setPhase('paused');
      }
    };
    const onHide = () => {
      if (document.hidden && phaseRef.current === 'playing') setPhase('paused');
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [continueRun, jump, move, setPhase]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    swipeRef.current = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const startPoint = swipeRef.current;
    swipeRef.current = null;
    if (!startPoint) return;
    const dx = event.clientX - startPoint.x;
    const dy = event.clientY - startPoint.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 28) return;
    if (Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? -1 : 1);
    else if (dy < 0) jump();
  };

  return (
    <div className="arc-game" onPointerDown={onPointerDown} onPointerUp={onPointerUp}>
      <canvas ref={canvasRef} className="arc-canvas" aria-label="Lane Runner game" />

      {phase !== 'ready' ? (
        <div className="arc-hud">
          <div className="arc-hud__group">
            <span className="arc-pill"><Star className="arc-pill__icon text-amber-300" />{hud.score.toLocaleString()}</span>
            <span className="arc-pill"><Coins className="arc-pill__icon text-yellow-300" />{hud.coins}</span>
          </div>
          {hud.prompt ? (
            <div className="arc-banner" key={hud.prompt}>
              <span className="arc-banner__count">Q{hud.questionNumber}/{questions.length}</span>
              <span>{hud.prompt}</span>
            </div>
          ) : (
            <span />
          )}
          <div className="arc-hud__group">
            {hud.combo >= 2 ? <span className="arc-pill arc-pill--combo">Combo x{Math.min(hud.combo, 5)}</span> : null}
            <span className="arc-pill" aria-label={`${hud.hearts} lives left`}>
              {Array.from({ length: MAX_HEARTS }, (_, index) => (
                <Heart
                  key={index}
                  className={`arc-pill__icon ${index < hud.hearts ? 'fill-rose-500 text-rose-500' : 'text-slate-500'}`}
                />
              ))}
            </span>
            {phase === 'playing' ? (
              <button type="button" className="arc-icon-btn" aria-label="Pause" onClick={() => setPhase('paused')}>
                <Pause className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {phase === 'playing' ? (
        <div className="arc-controls">
          <button type="button" className="arc-icon-btn arc-icon-btn--lg" aria-label="Move left" onClick={() => move(-1)}>
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button type="button" className="arc-icon-btn arc-icon-btn--lg" aria-label="Jump" onClick={jump}>
            <ChevronUp className="h-6 w-6" />
          </button>
          <button type="button" className="arc-icon-btn arc-icon-btn--lg" aria-label="Move right" onClick={() => move(1)}>
            <ChevronRight className="h-6 w-6" />
          </button>
        </div>
      ) : null}

      {toast ? (
        <div className="arc-toast" key={toast.id}>
          <p className="arc-toast__title">{toast.title}</p>
          <p className="arc-toast__text">{toast.text}</p>
        </div>
      ) : null}

      {phase === 'ready' ? (
        <div className="arc-overlay">
          <div className="arc-modal">
            <p className="arc-modal__eyebrow">Lane Runner</p>
            <h3 className="arc-modal__title">Run through the right answer!</h3>
            <ul className="arc-howto">
              <li><kbd>←</kbd><kbd>→</kbd> or swipe to switch lanes</li>
              <li><kbd>↑</kbd> / <kbd>Space</kbd> to jump over barriers</li>
              <li>Grab coins, keep your streak, and protect your 3 hearts</li>
            </ul>
            <button type="button" className="arc-cta" onClick={start}>
              <Play className="h-5 w-5" /> Start run
            </button>
          </div>
        </div>
      ) : null}

      {phase === 'countdown' ? (
        <div className="arc-overlay arc-overlay--clear">
          <span className="arc-count" key={countdown}>{countdown > 0 ? countdown : 'GO!'}</span>
        </div>
      ) : null}

      {phase === 'paused' ? (
        <div className="arc-overlay">
          <div className="arc-modal">
            <h3 className="arc-modal__title">Paused</h3>
            <button type="button" className="arc-cta" onClick={() => setPhase('playing')}>
              <Play className="h-5 w-5" /> Resume
            </button>
          </div>
        </div>
      ) : null}

      {phase === 'feedback' && feedback ? (
        <div className="arc-overlay">
          <div className="arc-modal arc-modal--feedback">
            <p className="arc-modal__eyebrow arc-modal__eyebrow--bad">Not quite!</p>
            <h3 className="arc-modal__title">{feedback.question.prompt}</h3>
            <p className="arc-answer arc-answer--bad">You chose: {feedback.chosen}</p>
            <p className="arc-answer arc-answer--good">Correct answer: {feedback.question.answer}</p>
            <p className="arc-modal__text">{feedback.question.explanation}</p>
            {feedback.question.misconception ? (
              <p className="arc-modal__note">Common mix-up: {feedback.question.misconception}</p>
            ) : null}
            <button type="button" className="arc-cta" onClick={continueRun} autoFocus>
              {hud.hearts > 0 ? 'Got it, keep running' : 'See results'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
