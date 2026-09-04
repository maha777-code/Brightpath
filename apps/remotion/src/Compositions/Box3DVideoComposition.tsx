import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import {
  Box3DWorld,
  buildPhysicsWorldForTemplate,
  type GenerationTemplateId,
  type PhysicsWorldSpec,
} from '@brightpath/shared';

export interface Box3DVideoCompositionProps {
  templateId?: GenerationTemplateId | string;
  physicsWorld?: PhysicsWorldSpec | null;
  title?: string;
  optionIds?: string[];
  correctOptionId?: string;
}

/**
 * Remotion entry: steps Box3DWorld with useCurrentFrame() for deterministic renders.
 */
export const Box3DVideoComposition: React.FC<Box3DVideoCompositionProps> = ({
  templateId = 'tom_and_jerry',
  physicsWorld,
  title = 'Physics Challenge',
  optionIds = ['A', 'B', 'C', 'D'],
  correctOptionId = 'B',
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const spec = useMemo(() => {
    const options = optionIds.map((id) => ({ id, correct: id === correctOptionId }));
    return buildPhysicsWorldForTemplate(templateId, options, physicsWorld ?? undefined);
  }, [templateId, physicsWorld, optionIds, correctOptionId]);

  const bodies = useMemo(() => {
    const w = new Box3DWorld(spec);
    const target = w.getBodies().find((b) => b.optionId === correctOptionId);
    if (target) w.launchPlayerToward(target.position, 14);
    for (let i = 0; i < frame; i++) w.step(1 / fps);
    return { bodies: w.getBodies(), bounds: w.bounds };
  }, [frame, fps, spec, correctOptionId]);

  const canvasW = Math.min(1100, width - 64);
  const canvasH = Math.min(560, height - 160);

  return (
    <AbsoluteFill
      style={{
        background:
          spec.environment === 'space'
            ? 'radial-gradient(circle at 30% 20%, #1e3a8a, #020617 70%)'
            : spec.environment === 'bouncy'
              ? 'radial-gradient(circle at 50% 0%, #134e4a, #042f2e 75%)'
              : 'radial-gradient(circle at 40% 10%, #44403c, #1c1917 70%)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
      }}
    >
      <div style={{ width: '100%', maxWidth: 1100, textAlign: 'center' }}>
        <p style={{ color: '#e2e8f0', fontSize: 28, fontWeight: 800, marginBottom: 16 }}>{title}</p>
        <svg width={canvasW} height={canvasH} style={{ borderRadius: 16, background: '#020617' }}>
          {bodies.bodies.map((body) => {
            const x = canvasW / 2 + (body.position[0] / bodies.bounds[0]) * (canvasW * 0.42);
            const y = canvasH / 2 - (body.position[1] / bodies.bounds[1]) * (canvasH * 0.42);
            const rw = Math.max(8, (body.size[0] / bodies.bounds[0]) * canvasW * 0.42);
            const rh = Math.max(8, (body.size[1] / bodies.bounds[1]) * canvasH * 0.42);
            if (body.isPlayer) {
              return (
                <circle key={body.id} cx={x} cy={y} r={Math.max(rw, rh) * 0.55} fill="#38bdf8" />
              );
            }
            if (body.isOptionTarget) {
              return (
                <g key={body.id}>
                  <rect
                    x={x - rw / 2}
                    y={y - rh / 2}
                    width={rw}
                    height={rh}
                    rx={8}
                    fill={body.isCorrect ? '#22c55e' : '#a78bfa'}
                  />
                  <text
                    x={x}
                    y={y}
                    fill="#0f172a"
                    fontSize={18}
                    fontWeight={800}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {body.optionId}
                  </text>
                </g>
              );
            }
            return (
              <rect
                key={body.id}
                x={x - rw / 2}
                y={y - rh / 2}
                width={rw}
                height={rh}
                fill="#78716c"
              />
            );
          })}
        </svg>
        <p style={{ color: '#94a3b8', fontSize: 16, marginTop: 12, fontFamily: 'monospace' }}>
          frame {frame} · step 1/{fps}s · template {templateId}
        </p>
      </div>
    </AbsoluteFill>
  );
};

export default Box3DVideoComposition;
