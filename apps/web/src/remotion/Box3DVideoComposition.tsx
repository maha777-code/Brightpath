import { useEffect, useMemo, useRef } from 'react';
import {
  Box3DWorld,
  buildPhysicsWorldForTemplate,
  type GenerationTemplateId,
  type PhysicsWorldSpec,
} from '@brightpath/shared';

export interface Box3DVideoCompositionProps {
  /** Current frame — pass from Remotion `useCurrentFrame()` or a preview scrubber. */
  frame: number;
  /** Frames per second — pass from Remotion `useVideoConfig().fps`. */
  fps: number;
  templateId?: GenerationTemplateId | string;
  physicsWorld?: PhysicsWorldSpec | null;
  title?: string;
  optionIds?: string[];
  correctOptionId?: string;
  width?: number;
  height?: number;
}

/**
 * Deterministic Box3D Remotion stepper (frame-driven, no rAF).
 * Embed in Remotion via:
 *   const frame = useCurrentFrame();
 *   const { fps } = useVideoConfig();
 *   <Box3DVideoComposition frame={frame} fps={fps} … />
 *
 * Server renders match live previews because each frame rebuilds the world and
 * steps exactly `frame` times with `world.step(1 / fps)`.
 */
export default function Box3DVideoComposition({
  frame,
  fps,
  templateId = 'tom_and_jerry',
  physicsWorld,
  title = 'Physics Challenge',
  optionIds = ['A', 'B', 'C', 'D'],
  correctOptionId = 'B',
  width = 1100,
  height = 560,
}: Box3DVideoCompositionProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const spec = useMemo(() => {
    const options = optionIds.map((id) => ({ id, correct: id === correctOptionId }));
    return buildPhysicsWorldForTemplate(templateId, options, physicsWorld ?? undefined);
  }, [templateId, physicsWorld, optionIds, correctOptionId]);

  const world = useMemo(() => {
    const w = new Box3DWorld(spec);
    const target = w.getBodies().find((b) => b.optionId === correctOptionId);
    if (target) w.launchPlayerToward(target.position, 14);
    const safeFps = Math.max(1, fps || 30);
    for (let i = 0; i < Math.max(0, frame); i++) {
      w.step(1 / safeFps);
    }
    return w;
  }, [frame, fps, spec, correctOptionId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const bodies = world.getBodies();
    const bounds = world.bounds;
    const env = spec.environment ?? 'earth';
    const bg =
      env === 'space' ? '#020617' : env === 'bouncy' ? '#042f2e' : env === 'noir' ? '#0f172a' : '#1c1917';

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    for (const body of bodies) {
      const x = width / 2 + (body.position[0] / bounds[0]) * (width * 0.42);
      const y = height / 2 - (body.position[1] / bounds[1]) * (height * 0.42);
      const rw = Math.max(8, (body.size[0] / bounds[0]) * width * 0.42);
      const rh = Math.max(8, (body.size[1] / bounds[1]) * height * 0.42);
      if (body.isPlayer) {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(x, y, Math.max(rw, rh) * 0.55, 0, Math.PI * 2);
        ctx.fill();
      } else if (body.isOptionTarget) {
        ctx.fillStyle = body.isCorrect ? '#22c55e' : '#a78bfa';
        ctx.fillRect(x - rw / 2, y - rh / 2, rw, rh);
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(body.optionId ?? '?', x, y);
      } else {
        ctx.fillStyle = '#78716c';
        ctx.fillRect(x - rw / 2, y - rh / 2, rw, rh);
      }
    }
  }, [world, width, height, spec.environment]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        background:
          spec.environment === 'space'
            ? 'radial-gradient(circle at 30% 20%, #1e3a8a, #020617 70%)'
            : 'radial-gradient(circle at 40% 10%, #44403c, #1c1917 70%)',
        color: '#e2e8f0',
        padding: 24,
        boxSizing: 'border-box',
      }}
    >
      <p style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>{title}</p>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ width: '100%', maxWidth: width, borderRadius: 16 }}
      />
      <p style={{ fontFamily: 'monospace', fontSize: 14, opacity: 0.7, margin: 0 }}>
        frame {frame} · step 1/{fps}s · {templateId}
      </p>
    </div>
  );
}
