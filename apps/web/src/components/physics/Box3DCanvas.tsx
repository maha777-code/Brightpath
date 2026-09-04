import { useEffect, useMemo, useRef } from 'react';
import {
  Box3DWorld,
  type PhysicsBodyState,
  type PhysicsWorldSpec,
  type GenerationTemplateId,
} from '@brightpath/shared';

export interface Box3DCanvasProps {
  worldSpec: PhysicsWorldSpec;
  templateId?: GenerationTemplateId | string;
  /** When set, world is stepped externally (Remotion). Otherwise rAF drives live play. */
  externalWorld?: Box3DWorld | null;
  /** Live play: fixed timestep (seconds). Default 1/60. */
  fixedDt?: number;
  width?: number;
  height?: number;
  className?: string;
  onContactStart?: (bodyA: PhysicsBodyState, bodyB: PhysicsBodyState) => void;
  onWorldReady?: (world: Box3DWorld) => void;
}

const ENV_COLORS: Record<string, { bg: string; grid: string; player: string; target: string }> = {
  space: { bg: '#020617', grid: '#1e3a5f', player: '#38bdf8', target: '#a78bfa' },
  earth: { bg: '#1c1917', grid: '#44403c', player: '#fbbf24', target: '#fb7185' },
  bouncy: { bg: '#042f2e', grid: '#115e59', player: '#f472b6', target: '#34d399' },
  noir: { bg: '#0f172a', grid: '#334155', player: '#e2e8f0', target: '#c4b5fd' },
};

function project(pos: [number, number, number], w: number, h: number, bounds: [number, number, number]) {
  const sx = w / 2 + (pos[0] / bounds[0]) * (w * 0.42);
  const sy = h / 2 - (pos[1] / bounds[1]) * (h * 0.42);
  return { x: sx, y: sy };
}

function drawBody(
  ctx: CanvasRenderingContext2D,
  body: PhysicsBodyState,
  w: number,
  h: number,
  bounds: [number, number, number],
  colors: (typeof ENV_COLORS)[string],
) {
  const { x, y } = project(body.position, w, h, bounds);
  const rw = Math.max(8, (body.size[0] / bounds[0]) * w * 0.42);
  const rh = Math.max(8, (body.size[1] / bounds[1]) * h * 0.42);

  ctx.save();
  if (body.isPlayer) {
    ctx.fillStyle = colors.player;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(rw, rh) * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (body.isOptionTarget) {
    ctx.fillStyle = body.isCorrect ? '#22c55e' : colors.target;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(x - rw / 2, y - rh / 2, rw, rh);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - rw / 2, y - rh / 2, rw, rh);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(body.optionId ?? '?', x, y);
  } else {
    const kind = body.kind ?? 'obstacle';
    ctx.fillStyle =
      kind === 'asteroid'
        ? '#64748b'
        : kind === 'anvil'
          ? '#57534e'
          : kind === 'candy'
            ? '#f472b6'
            : kind === 'trap'
              ? '#f97316'
              : '#78716c';
    ctx.fillRect(x - rw / 2, y - rh / 2, rw, rh);
  }
  ctx.restore();
}

/**
 * React canvas wrapper around the shared deterministic Box3D world.
 * Live mode uses rAF; Remotion passes `externalWorld` stepped via useCurrentFrame.
 */
export default function Box3DCanvas({
  worldSpec,
  templateId,
  externalWorld,
  fixedDt = 1 / 60,
  width = 720,
  height = 420,
  className,
  onContactStart,
  onWorldReady,
}: Box3DCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<Box3DWorld | null>(null);
  const contactRef = useRef(onContactStart);
  contactRef.current = onContactStart;

  const colors = useMemo(() => {
    const env = worldSpec.environment ?? 'earth';
    return ENV_COLORS[env] ?? ENV_COLORS.earth;
  }, [worldSpec.environment]);

  useEffect(() => {
    if (externalWorld) {
      worldRef.current = externalWorld;
      onWorldReady?.(externalWorld);
      return;
    }

    const world = new Box3DWorld(worldSpec);
    worldRef.current = world;
    const off = world.on('contact-start', (a, b) => contactRef.current?.(a, b));
    onWorldReady?.(world);

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const tick = (now: number) => {
      const elapsed = Math.min(0.05, (now - last) / 1000);
      last = now;
      acc += elapsed;
      while (acc >= fixedDt) {
        world.step(fixedDt);
        acc -= fixedDt;
      }
      paint(world);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      off();
      worldRef.current = null;
    };
    // Recreate when template / gravity / target layout changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, JSON.stringify(worldSpec.gravity), JSON.stringify(worldSpec.targets), externalWorld]);

  useEffect(() => {
    if (!externalWorld) return;
    const off = externalWorld.on('contact-start', (a, b) => contactRef.current?.(a, b));
    paint(externalWorld);
    return off;
  }, [externalWorld]);

  function paint(world: Box3DWorld) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const bounds = world.bounds;

    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = colors.grid;
    ctx.lineWidth = 1;
    for (let i = -4; i <= 4; i++) {
      const x = w / 2 + (i / 4) * (w * 0.42);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
      const y = h / 2 + (i / 4) * (h * 0.42);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    for (const body of world.getBodies()) {
      drawBody(ctx, body, w, h, bounds, colors);
    }
  }

  // Remotion / external: repaint whenever parent re-renders after stepping.
  useEffect(() => {
    if (externalWorld) paint(externalWorld);
  });

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={{ width: '100%', height: 'auto', borderRadius: 16, display: 'block' }}
    />
  );
}

export function useBox3DWorld(spec: PhysicsWorldSpec): Box3DWorld {
  return useMemo(() => new Box3DWorld(spec), [JSON.stringify(spec)]);
}
