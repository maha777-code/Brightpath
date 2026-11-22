import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { ArcadeQuestion } from '@brightpath/shared';
import { ChevronLeft, ChevronRight, Crosshair, Heart, Pause, Snowflake, Star, Zap } from 'lucide-react';
import { answerOptions, isTypingTarget, playSound, type ArcadeGameProps } from './arcadeKit';
import { Countdown, CorrectToast, HeartsPill, PausedModal, ReadyModal, WrongFeedback, useCanvasStage, type StageSize } from './arcadeUi';
import './arcadeGames.css';

const H = 540;
const SHIP_Y = H - 62;
const SHIP_SPEED = 560;
const MAX_LIVES = 3;
const ROCK_R = 50;
const FIRE_GAP = 0.24;
const POWER_COLORS = { triple: '#f472b6', slow: '#38bdf8', life: '#f43f5e' } as const;

type Phase = 'ready' | 'countdown' | 'playing' | 'feedback' | 'paused' | 'done';
type PowerKind = keyof typeof POWER_COLORS;

interface Rock { x: number; y: number; r: number; vy: number; rot: number; vr: number; label: string; correct: boolean; shape: number[]; alive: boolean; fade: number; hue: number; age: number }
interface Debris { x: number; y: number; r: number; vy: number; vx: number; rot: number; shape: number[] }
interface Bullet { x: number; y: number; vx: number }
interface Power { x: number; y: number; kind: PowerKind }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }
interface Ring { x: number; y: number; life: number; color: string }
interface StarDot { x: number; y: number; layer: number }

interface World {
  t: number;
  x: number;
  tilt: number;
  aimX: number | null;
  cooldown: number;
  rocks: Rock[];
  debris: Debris[];
  bullets: Bullet[];
  powers: Power[];
  particles: Particle[];
  rings: Ring[];
  stars: StarDot[];
  question: ArcadeQuestion | null;
  qIndex: number;
  waveDelay: number;
  debrisIn: number;
  lives: number;
  score: number;
  combo: number;
  bestCombo: number;
  correct: number;
  missed: ArcadeQuestion[];
  triple: number;
  slow: number;
  shake: number;
  flash: number;
  flashColor: string;
}

interface Hud { score: number; lives: number; combo: number; triple: number; slow: number; prompt: string | null; qNumber: number }

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const rockShape = (n = 11) => Array.from({ length: n }, () => rand(0.78, 1.08));

function makeWorld(): World {
  const stars: StarDot[] = [];
  for (let layer = 0; layer < 3; layer += 1) {
    for (let i = 0; i < [90, 50, 24][layer]; i += 1) stars.push({ x: Math.random(), y: Math.random() * H, layer });
  }
  return {
    t: 0, x: 0.5, tilt: 0, aimX: null, cooldown: 0, rocks: [], debris: [], bullets: [], powers: [], particles: [], rings: [], stars,
    question: null, qIndex: 0, waveDelay: 0.6, debrisIn: 2, lives: MAX_LIVES, score: 0, combo: 0, bestCombo: 0, correct: 0, missed: [],
    triple: 0, slow: 0, shake: 0, flash: 0, flashColor: '#ef4444',
  };
}

function burst(w: World, x: number, y: number, colors: string[], count: number, power = 260) {
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const s = rand(power * 0.2, power);
    w.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: rand(0.4, 1), color: colors[i % colors.length], size: rand(1.5, 4.5) });
  }
}

function rockPath(ctx: CanvasRenderingContext2D, shape: number[], r: number) {
  ctx.beginPath();
  shape.forEach((k, i) => {
    const a = (i / shape.length) * Math.PI * 2;
    const x = Math.cos(a) * r * k;
    const y = Math.sin(a) * r * k;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

function drawBackground(ctx: CanvasRenderingContext2D, w: World, size: StageSize) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#020617');
  bg.addColorStop(0.6, '#1e1b4b');
  bg.addColorStop(1, '#312e81');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size.w, H);
  const nebula = (x: number, y: number, r: number, color: string) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  nebula(size.w * 0.2, 140 + Math.sin(w.t * 0.1) * 20, 260, 'rgba(236,72,153,0.22)');
  nebula(size.w * 0.8, 320, 300, 'rgba(56,189,248,0.18)');
  const px = size.w * 0.86;
  const py = 110 + ((w.t * 3) % 40);
  const planet = ctx.createRadialGradient(px - 20, py - 20, 6, px, py, 60);
  planet.addColorStop(0, '#fde68a');
  planet.addColorStop(0.5, '#f97316');
  planet.addColorStop(1, '#7c2d12');
  ctx.fillStyle = planet;
  ctx.beginPath();
  ctx.arc(px, py, 56, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(253, 230, 138, 0.55)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(px, py, 92, 18, -0.3, 0, Math.PI * 2);
  ctx.stroke();
  const warp = w.combo >= 3;
  for (const s of w.stars) {
    const sz = [1, 1.6, 2.4][s.layer];
    ctx.fillStyle = ['rgba(203,213,225,0.55)', 'rgba(226,232,240,0.8)', '#ffffff'][s.layer];
    const x = s.x * size.w;
    if (warp && s.layer > 0) ctx.fillRect(x - sz / 2, s.y, sz, sz * 9);
    else {
      ctx.beginPath();
      ctx.arc(x, s.y, sz, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawRock(ctx: CanvasRenderingContext2D, rock: Rock, labelWidth: number) {
  const appear = Math.max(0, Math.min(1, rock.age * 2.5));
  if (rock.alive && appear <= 0) return;
  ctx.save();
  ctx.globalAlpha = rock.alive ? appear : Math.max(0, rock.fade);
  ctx.translate(rock.x, rock.y);
  if (rock.alive && appear < 1) {
    ctx.scale(0.4 + appear * 0.6, 0.4 + appear * 0.6);
    ctx.strokeStyle = `rgba(165, 243, 252, ${1 - appear})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, rock.r * (2 - appear), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.save();
  ctx.rotate(rock.rot);
  const g = ctx.createRadialGradient(-rock.r * 0.35, -rock.r * 0.35, 4, 0, 0, rock.r * 1.1);
  g.addColorStop(0, `hsl(${rock.hue} 25% 62%)`);
  g.addColorStop(0.7, `hsl(${rock.hue} 22% 36%)`);
  g.addColorStop(1, `hsl(${rock.hue} 25% 20%)`);
  ctx.fillStyle = g;
  ctx.shadowColor = 'rgba(167, 139, 250, 0.6)';
  ctx.shadowBlur = 16;
  rockPath(ctx, rock.shape, rock.r);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
  for (const [cx, cy, cr] of [[-16, -10, 9], [14, 12, 12], [18, -18, 6], [-10, 20, 7]]) {
    ctx.beginPath();
    ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  let font = 18;
  ctx.font = `900 ${font}px Inter, system-ui, sans-serif`;
  const tw = ctx.measureText(rock.label).width;
  if (tw > labelWidth - 22) {
    font = Math.max(11, Math.floor((font * (labelWidth - 22)) / tw));
    ctx.font = `900 ${font}px Inter, system-ui, sans-serif`;
  }
  const pw = Math.min(labelWidth, ctx.measureText(rock.label).width + 22);
  ctx.fillStyle = 'rgba(2, 6, 23, 0.82)';
  ctx.strokeStyle = 'rgba(165, 243, 252, 0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-pw / 2, -font * 0.85, pw, font * 1.7, font * 0.85);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(rock.label, 0, 1);
  ctx.restore();
}

function drawShip(ctx: CanvasRenderingContext2D, w: World, x: number) {
  ctx.save();
  ctx.translate(x, SHIP_Y);
  ctx.rotate(w.tilt * 0.25);
  const flame = 18 + Math.sin(w.t * 40) * 5;
  const fg = ctx.createLinearGradient(0, 18, 0, 18 + flame + 10);
  fg.addColorStop(0, '#fde68a');
  fg.addColorStop(0.5, '#f97316');
  fg.addColorStop(1, 'rgba(239,68,68,0)');
  ctx.fillStyle = fg;
  for (const ex of [-12, 12]) {
    ctx.beginPath();
    ctx.moveTo(ex - 6, 18);
    ctx.lineTo(ex, 18 + flame + 10);
    ctx.lineTo(ex + 6, 18);
    ctx.fill();
  }
  ctx.fillStyle = '#4338ca';
  ctx.beginPath();
  ctx.moveTo(-46, 18);
  ctx.lineTo(-14, -6);
  ctx.lineTo(14, -6);
  ctx.lineTo(46, 18);
  ctx.lineTo(30, 22);
  ctx.lineTo(-30, 22);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f472b6';
  ctx.fillRect(-44, 14, 10, 6);
  ctx.fillRect(34, 14, 10, 6);
  const body = ctx.createLinearGradient(-16, 0, 16, 0);
  body.addColorStop(0, '#cbd5e1');
  body.addColorStop(0.5, '#ffffff');
  body.addColorStop(1, '#94a3b8');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(0, -42);
  ctx.quadraticCurveTo(18, -10, 16, 22);
  ctx.lineTo(-16, 22);
  ctx.quadraticCurveTo(-18, -10, 0, -42);
  ctx.fill();
  const glass = ctx.createLinearGradient(0, -26, 0, 0);
  glass.addColorStop(0, '#a5f3fc');
  glass.addColorStop(1, '#0e7490');
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.ellipse(0, -12, 7, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPower(ctx: CanvasRenderingContext2D, p: Power, t: number) {
  const color = POWER_COLORS[p.kind];
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.shadowColor = color;
  ctx.shadowBlur = 18;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(-18, -18, 36, 36, 10);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 2;
  ctx.rotate(Math.sin(t * 4) * 0.15);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 16px Inter, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(p.kind === 'triple' ? '3x' : p.kind === 'slow' ? '❄' : '♥', 0, 1);
  ctx.restore();
}

export default function SpaceDefenderGame({ questions, muted, onFinish }: ArcadeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<World>(makeWorld());
  const phaseRef = useRef<Phase>('ready');
  const mutedRef = useRef(muted);
  const finishedRef = useRef(false);
  const keysRef = useRef(new Set<string>());
  const hudTimer = useRef(0);
  const sizeRef = useRef<StageSize>({ w: 960, h: H });
  const [phase, setPhaseState] = useState<Phase>('ready');
  const [countdown, setCountdown] = useState(3);
  const [hud, setHud] = useState<Hud>({ score: 0, lives: MAX_LIVES, combo: 0, triple: 0, slow: 0, prompt: null, qNumber: 0 });
  const [toast, setToast] = useState<{ id: number; title: string; text: string } | null>(null);
  const [feedback, setFeedback] = useState<{ question: ArcadeQuestion; chosen: string | null } | null>(null);
  mutedRef.current = muted;

  const setPhase = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhaseState(next);
  }, []);

  const syncHud = useCallback(() => {
    const w = worldRef.current;
    setHud({ score: w.score, lives: w.lives, combo: w.combo, triple: w.triple, slow: w.slow, prompt: w.question?.prompt ?? null, qNumber: w.qIndex });
  }, []);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const w = worldRef.current;
    setPhase('done');
    playSound(w.lives > 0 ? 'win' : 'wrong', mutedRef.current);
    onFinish({ score: w.score, correct: w.correct, total: questions.length, bestCombo: w.bestCombo, missed: w.missed });
  }, [onFinish, questions.length, setPhase]);

  const spawnWave = useCallback(() => {
    const w = worldRef.current;
    const question = questions[w.qIndex];
    if (!question) {
      finish();
      return;
    }
    w.qIndex += 1;
    w.question = question;
    const options = answerOptions(question, 4);
    const colW = sizeRef.current.w / options.length;
    const speed = 46 * (1 + 0.14 * Math.min(w.combo, 6));
    w.rocks = options.map((label, i) => ({
      x: (i + 0.5) * colW + rand(-colW * 0.08, colW * 0.08),
      y: rand(115, 165),
      r: ROCK_R * rand(0.92, 1.05),
      vy: speed * rand(0.9, 1.1),
      rot: rand(0, 6),
      vr: rand(-0.6, 0.6),
      label,
      correct: label === question.answer,
      shape: rockShape(),
      alive: true,
      fade: 1,
      hue: [260, 220, 200, 290][i % 4],
      age: -i * 0.12,
    }));
    playSound('tick', mutedRef.current);
    syncHud();
  }, [finish, questions, syncHud]);

  const clearWave = (w: World) => {
    for (const rock of w.rocks) {
      if (!rock.alive) continue;
      rock.alive = false;
      rock.fade = 1;
      burst(w, rock.x, rock.y, ['#94a3b8', '#c4b5fd'], 10, 120);
    }
    w.question = null;
  };

  const loseLife = useCallback(
    (question: ArcadeQuestion, chosen: string | null) => {
      const w = worldRef.current;
      w.lives -= 1;
      w.combo = 0;
      w.missed.push(question);
      w.shake = 0.5;
      w.flash = 0.5;
      w.flashColor = '#ef4444';
      clearWave(w);
      playSound('wrong', mutedRef.current);
      setToast(null);
      setFeedback({ question, chosen });
      keysRef.current.clear();
      setPhase('feedback');
      syncHud();
    },
    [setPhase, syncHud],
  );

  const hitRock = useCallback(
    (rock: Rock) => {
      const w = worldRef.current;
      const question = w.question;
      if (!question) return;
      rock.alive = false;
      rock.fade = 0;
      if (rock.correct) {
        w.combo += 1;
        w.bestCombo = Math.max(w.bestCombo, w.combo);
        w.correct += 1;
        const points = 100 * Math.min(w.combo, 5);
        w.score += points;
        burst(w, rock.x, rock.y, ['#fde68a', '#f97316', '#ffffff', '#22d3ee'], 70, 420);
        w.rings.push({ x: rock.x, y: rock.y, life: 0, color: '#fde68a' });
        w.flash = 0.25;
        w.flashColor = '#22c55e';
        playSound('boom', mutedRef.current);
        playSound('correct', mutedRef.current);
        setToast({ id: Date.now(), title: `+${points} · ${question.answer}`, text: question.explanation });
        if (w.correct % 3 === 0 || Math.random() < 0.25) {
          const kinds: PowerKind[] = w.lives < MAX_LIVES ? ['triple', 'slow', 'life'] : ['triple', 'slow'];
          w.powers.push({ x: rock.x, y: rock.y, kind: kinds[Math.floor(Math.random() * kinds.length)] });
        }
        clearWave(w);
        w.waveDelay = 2.2;
        syncHud();
      } else {
        burst(w, rock.x, rock.y, ['#ef4444', '#f97316'], 36, 300);
        w.rings.push({ x: rock.x, y: rock.y, life: 0, color: '#ef4444' });
        playSound('boom', mutedRef.current);
        loseLife(question, rock.label);
      }
    },
    [loseLife, syncHud],
  );

  const update = useCallback(
    (dt: number, size: StageSize) => {
      const w = worldRef.current;
      w.t += dt;
      w.flash = Math.max(0, w.flash - dt * 1.4);
      w.shake = Math.max(0, w.shake - dt);
      w.triple = Math.max(0, w.triple - dt);
      w.slow = Math.max(0, w.slow - dt);
      w.cooldown -= dt;

      const keys = keysRef.current;
      let dir = (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0);
      if (w.aimX !== null) {
        const dx = w.aimX - w.x;
        dir = Math.abs(dx * size.w) < 6 ? 0 : Math.sign(dx);
      }
      const step = (SHIP_SPEED * dt) / size.w;
      w.x = Math.max(0.04, Math.min(0.96, w.x + dir * (w.aimX !== null ? Math.min(step, Math.abs(w.aimX - w.x)) : step)));
      w.tilt += (dir - w.tilt) * Math.min(1, dt * 10);
      const shipX = w.x * size.w;

      if ((keys.has('fire') || w.aimX !== null) && w.cooldown <= 0) {
        w.cooldown = w.triple > 0 ? FIRE_GAP * 0.8 : FIRE_GAP;
        w.bullets.push({ x: shipX, y: SHIP_Y - 44, vx: 0 });
        if (w.triple > 0) {
          w.bullets.push({ x: shipX - 10, y: SHIP_Y - 36, vx: -140 });
          w.bullets.push({ x: shipX + 10, y: SHIP_Y - 36, vx: 140 });
        }
        playSound('laser', mutedRef.current);
      }

      const starSpeed = [14, 34, 70].map((s) => s * (1 + Math.min(w.combo, 6) * 0.35));
      for (const s of w.stars) {
        s.y += starSpeed[s.layer] * dt;
        if (s.y > H) {
          s.y -= H;
          s.x = Math.random();
        }
      }

      for (const b of w.bullets) {
        b.y -= 760 * dt;
        b.x += b.vx * dt;
      }
      w.bullets = w.bullets.filter((b) => b.y > -20);

      const slowK = w.slow > 0 ? 0.5 : 1;
      for (const rock of w.rocks) {
        if (!rock.alive) {
          rock.fade -= dt * 2.5;
          continue;
        }
        rock.age += dt;
        if (rock.age > 0.5) rock.y += rock.vy * slowK * dt;
        rock.rot += rock.vr * dt;
      }
      w.rocks = w.rocks.filter((r) => r.alive || r.fade > 0);

      outer: for (const b of w.bullets) {
        for (const rock of w.rocks) {
          if (rock.alive && rock.age > 0.3 && Math.hypot(b.x - rock.x, b.y - rock.y) < rock.r) {
            b.y = -100;
            hitRock(rock);
            if (phaseRef.current !== 'playing') return;
            break outer;
          }
        }
        for (const d of w.debris) {
          if (Math.hypot(b.x - d.x, b.y - d.y) < d.r + 4) {
            b.y = -100;
            burst(w, d.x, d.y, ['#cbd5e1', '#fde68a'], 12, 160);
            d.y = H + 100;
            w.score += 10;
            playSound('pop', mutedRef.current);
          }
        }
      }

      const answerRock = w.rocks.find((r) => r.alive && r.correct);
      if (w.question && answerRock && answerRock.y > SHIP_Y + 10) {
        loseLife(w.question, null);
        return;
      }
      for (const rock of w.rocks) if (rock.alive && rock.y - rock.r > H) rock.alive = false;

      w.debrisIn -= dt;
      if (w.debrisIn <= 0) {
        w.debrisIn = rand(1.6, 3.2);
        w.debris.push({ x: rand(20, size.w - 20), y: -20, r: rand(9, 15), vy: rand(110, 170), vx: rand(-30, 30), rot: 0, shape: rockShape(8) });
      }
      for (const d of w.debris) {
        d.y += d.vy * slowK * dt;
        d.x += d.vx * dt;
        d.rot += dt * 2;
        if (Math.abs(d.x - shipX) < 34 && Math.abs(d.y - SHIP_Y) < 26) {
          d.y = H + 100;
          w.score = Math.max(0, w.score - 20);
          w.shake = 0.3;
          w.flash = 0.2;
          w.flashColor = '#f97316';
          playSound('bump', mutedRef.current);
        }
      }
      w.debris = w.debris.filter((d) => d.y < H + 30);

      for (const p of w.powers) {
        p.y += 120 * dt;
        if (Math.abs(p.x - shipX) < 40 && Math.abs(p.y - SHIP_Y) < 34) {
          p.y = H + 100;
          if (p.kind === 'triple') w.triple = 8;
          if (p.kind === 'slow') w.slow = 7;
          if (p.kind === 'life') w.lives = Math.min(MAX_LIVES, w.lives + 1);
          burst(w, shipX, SHIP_Y, [POWER_COLORS[p.kind], '#ffffff'], 24, 200);
          playSound('shield', mutedRef.current);
          syncHud();
        }
      }
      w.powers = w.powers.filter((p) => p.y < H + 40);

      w.particles = w.particles.filter((p) => {
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.98;
        p.vy *= 0.98;
        return p.life < p.max;
      });
      w.rings = w.rings.filter((r) => (r.life += dt) < 0.6);

      if (!w.question) {
        w.waveDelay -= dt;
        if (w.waveDelay <= 0) spawnWave();
      }
      hudTimer.current -= dt;
      if (hudTimer.current <= 0) {
        hudTimer.current = 0.15;
        syncHud();
      }
    },
    [hitRock, loseLife, spawnWave, syncHud],
  );

  useCanvasStage(canvasRef, H, (ctx, dt, size) => {
    sizeRef.current = size;
    const w = worldRef.current;
    const active = phaseRef.current === 'playing';
    if (active) update(dt, size);
    else if (phaseRef.current !== 'paused') {
      w.t += dt;
      for (const s of w.stars) {
        s.y += [14, 34, 70][s.layer] * dt * 0.5;
        if (s.y > H) s.y -= H;
      }
      w.flash = Math.max(0, w.flash - dt);
      w.particles = w.particles.filter((p) => {
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        return p.life < p.max;
      });
      w.rings = w.rings.filter((r) => (r.life += dt) < 0.6);
      for (const rock of w.rocks) if (!rock.alive) rock.fade -= dt * 2.5;
    }
    ctx.save();
    if (w.shake > 0) ctx.translate(rand(-6, 6) * w.shake, rand(-6, 6) * w.shake);
    drawBackground(ctx, w, size);
    const labelWidth = size.w / Math.max(1, w.rocks.length || 4) - 6;
    for (const rock of w.rocks) drawRock(ctx, rock, labelWidth);
    for (const d of w.debris) {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot);
      ctx.fillStyle = '#64748b';
      rockPath(ctx, d.shape, d.r);
      ctx.fill();
      ctx.restore();
    }
    for (const p of w.powers) drawPower(ctx, p, w.t);
    ctx.fillStyle = '#67e8f9';
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 10;
    for (const b of w.bullets) {
      ctx.beginPath();
      ctx.roundRect(b.x - 2.5, b.y - 12, 5, 18, 3);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    drawShip(ctx, w, w.x * size.w);
    for (const p of w.particles) {
      ctx.globalAlpha = Math.max(0, 1 - p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const r of w.rings) {
      ctx.globalAlpha = 1 - r.life / 0.6;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 20 + r.life * 220, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    if (w.slow > 0) {
      ctx.fillStyle = 'rgba(56,189,248,0.08)';
      ctx.fillRect(0, 0, size.w, H);
    }
    if (w.flash > 0) {
      ctx.globalAlpha = Math.min(0.4, w.flash);
      ctx.fillStyle = w.flashColor;
      ctx.fillRect(0, 0, size.w, H);
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
    const w = worldRef.current;
    if (w.lives <= 0 || w.qIndex >= questions.length) {
      finish();
      return;
    }
    w.waveDelay = 0.8;
    setPhase('playing');
  }, [finish, questions.length, setPhase]);

  useEffect(() => {
    const map: Record<string, string> = {
      ArrowLeft: 'left', a: 'left', A: 'left',
      ArrowRight: 'right', d: 'right', D: 'right',
      ' ': 'fire', ArrowUp: 'fire', w: 'fire', W: 'fire',
    };
    const onDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target) || phaseRef.current !== 'playing') return;
      const key = map[event.key];
      if (key) {
        event.preventDefault();
        keysRef.current.add(key);
      } else if (event.key === 'Escape' || event.key === 'p' || event.key === 'P') {
        keysRef.current.clear();
        setPhase('paused');
      }
    };
    const onUp = (event: KeyboardEvent) => {
      const key = map[event.key];
      if (key) keysRef.current.delete(key);
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

  const aimFromPointer = (event: ReactPointerEvent<HTMLElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || phaseRef.current !== 'playing') return;
    worldRef.current.aimX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
  };
  const hold = (key: string) => ({
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      keysRef.current.add(key);
    },
    onPointerUp: () => keysRef.current.delete(key),
    onPointerLeave: () => keysRef.current.delete(key),
    onPointerCancel: () => keysRef.current.delete(key),
  });

  return (
    <div className="arc-game arc-space">
      <canvas
        ref={canvasRef}
        className="arc-canvas"
        aria-label="Space Defender game"
        onPointerDown={(event) => {
          try {
            event.currentTarget.setPointerCapture(event.pointerId);
          } catch {
            /* pointer already released */
          }
          aimFromPointer(event);
        }}
        onPointerMove={(event) => {
          if (worldRef.current.aimX !== null) aimFromPointer(event);
        }}
        onPointerUp={() => (worldRef.current.aimX = null)}
        onPointerCancel={() => (worldRef.current.aimX = null)}
      />

      {phase !== 'ready' ? (
        <div className="arc-hud">
          <div className="arc-hud__group">
            <span className="arc-pill"><Star className="arc-pill__icon text-amber-300" />{hud.score.toLocaleString()}</span>
            {hud.triple > 0 ? <span className="arc-pill arc-pill--power"><Zap className="arc-pill__icon text-pink-300" />3x {Math.ceil(hud.triple)}s</span> : null}
            {hud.slow > 0 ? <span className="arc-pill arc-pill--shield"><Snowflake className="arc-pill__icon" />{Math.ceil(hud.slow)}s</span> : null}
          </div>
          {hud.prompt ? (
            <div className="arc-banner" key={hud.prompt}>
              <span className="arc-banner__count">Q{hud.qNumber}/{questions.length}</span>
              <span>{hud.prompt}</span>
            </div>
          ) : (
            <span />
          )}
          <div className="arc-hud__group">
            {hud.combo >= 2 ? <span className="arc-pill arc-pill--combo">Streak x{Math.min(hud.combo, 5)}</span> : null}
            <HeartsPill hearts={hud.lives} max={MAX_LIVES} />
            {phase === 'playing' ? (
              <button type="button" className="arc-icon-btn" aria-label="Pause" onClick={() => { keysRef.current.clear(); setPhase('paused'); }}>
                <Pause className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Always mounted so the touch control bar keeps its height and the canvas does not jump between phases. */}
      <div className="arc-controls arc-space__controls" data-active={phase === 'playing' ? 'true' : 'false'}>
        <button type="button" className="arc-icon-btn arc-icon-btn--lg" aria-label="Move left" disabled={phase !== 'playing'} {...hold('left')}>
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button type="button" className="arc-icon-btn arc-icon-btn--lg arc-icon-btn--fire" aria-label="Fire" disabled={phase !== 'playing'} {...hold('fire')}>
          <Crosshair className="h-6 w-6" />
        </button>
        <button type="button" className="arc-icon-btn arc-icon-btn--lg" aria-label="Move right" disabled={phase !== 'playing'} {...hold('right')}>
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      {toast ? <CorrectToast key={toast.id} title={toast.title} text={toast.text} /> : null}

      {phase === 'ready' ? (
        <ReadyModal
          eyebrow="Space Defender"
          title="Blast the asteroid with the right answer!"
          howto={[
            <><kbd>←</kbd><kbd>→</kbd> to fly, <kbd>Space</kbd> to fire, or drag on the screen to steer and auto-fire</>,
            <>Read the question banner, then hit the matching asteroid before it reaches you</>,
            <>Hitting a wrong one, or letting the right one pass, costs a <Heart className="inline h-4 w-4 fill-rose-500 text-rose-500" /></>,
          ]}
          cta="Launch"
          onStart={start}
        />
      ) : null}

      {phase === 'countdown' ? <Countdown value={countdown} /> : null}
      {phase === 'paused' ? <PausedModal onResume={() => setPhase('playing')} /> : null}

      {phase === 'feedback' && feedback ? (
        <WrongFeedback
          question={feedback.question}
          chosen={feedback.chosen}
          eyebrow={feedback.chosen ? 'Wrong asteroid!' : 'The right answer slipped past!'}
          continueLabel={hud.lives > 0 && worldRef.current.qIndex < questions.length ? 'Got it, next wave' : 'See results'}
          onContinue={continueRun}
        />
      ) : null}
    </div>
  );
}
