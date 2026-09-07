import React from 'react';
import { interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { PIXEL_COLORS } from './pixelTheme';

function PixelDude({
  x,
  y,
  color,
  bounce,
  size = 36,
}: {
  x: number;
  y: number;
  color: string;
  bounce: number;
  size?: number;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y + bounce,
        width: size,
        height: size * 1.25,
        imageRendering: 'pixelated',
      }}
    >
      <div style={{ width: size * 0.55, height: size * 0.4, marginLeft: size * 0.22, background: color }} />
      <div
        style={{
          width: size,
          height: size * 0.55,
          background: color,
          boxShadow: `inset ${size * 0.18}px ${size * 0.12}px 0 #0f172a`,
        }}
      />
      <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
        <div style={{ width: size * 0.28, height: size * 0.32, background: '#334155' }} />
        <div style={{ width: size * 0.28, height: size * 0.32, background: '#334155' }} />
      </div>
    </div>
  );
}

function Tile({
  left,
  top,
  w,
  h,
  color,
  pulse = 0,
}: {
  left: number;
  top: number;
  w: number;
  h: number;
  color: string;
  pulse?: number;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width: w,
        height: h,
        background: color,
        boxShadow: `inset -3px -3px 0 rgba(0,0,0,0.35), 0 0 ${8 + pulse * 12}px ${color}`,
        imageRendering: 'pixelated',
      }}
    />
  );
}

export const PixelPlayfield: React.FC<{
  levelIndex: number;
  action?: string;
  progress01: number;
  formula?: string;
}> = ({ levelIndex, action, progress01, formula }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const bounce = Math.sin(t * 10) * 4;
  const a = String(action ?? '').toLowerCase();
  const fail = a.includes('wall') || a.includes('fail') || a.includes('dodge');
  const loop = a.includes('loop');
  const train = a.includes('feed') || a.includes('train');
  const coop = a.includes('co_op') || a.includes('coop') || a.includes('clear') || a.includes('celebr');

  const runX = interpolate(progress01, [0, 1], [70, fail ? 430 : 860], {
    extrapolateRight: 'clamp',
  });
  const bump = fail ? Math.abs(Math.sin(progress01 * Math.PI * 6)) * 18 : 0;
  const petSize = 18 + levelIndex * 7 + (train || coop ? 10 : 0);
  const petX = coop ? runX + 52 : 920 - levelIndex * 30;
  const petY = coop ? 390 : 360 - (train ? Math.sin(t * 3) * 12 : 0);

  const noiseTiles = Array.from({ length: 7 }, (_, i) => {
    const drift = Math.sin(t * (1.4 + i * 0.2) + i) * (levelIndex >= 2 ? 46 : 0);
    return (
      <Tile
        key={i}
        left={520 + i * 72}
        top={268 + drift}
        w={28}
        h={28}
        color={PIXEL_COLORS.hazard}
        pulse={levelIndex >= 2 ? 1 : 0}
      />
    );
  });

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(180deg, ${PIXEL_COLORS.bgTop} 0%, ${PIXEL_COLORS.bgBottom} 100%)`,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(rgba(56,189,248,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.08) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          imageRendering: 'pixelated',
        }}
      />

      {/* ground */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 118,
          height: 18,
          background: PIXEL_COLORS.path,
          boxShadow: '0 -6px 0 #065f46',
        }}
      />

      {/* L1 wall / L2 gates / L3 noise / L4 glow path / boss maze */}
      {levelIndex === 0 ? <Tile left={470} top={300} w={36} h={160} color={PIXEL_COLORS.wall} /> : null}
      {levelIndex === 1
        ? [0, 1, 2, 3].map((i) => (
            <Tile
              key={i}
              left={280 + i * 180}
              top={loop ? 250 + Math.sin(t * 4 + i) * 40 : 310}
              w={24}
              h={90}
              color="#22d3ee"
            />
          ))
        : null}
      {levelIndex >= 2 ? noiseTiles : null}
      {levelIndex >= 3 ? (
        <div
          style={{
            position: 'absolute',
            left: 80,
            top: 430,
            width: interpolate(progress01, [0, 1], [40, 900], { extrapolateRight: 'clamp' }),
            height: 10,
            background: PIXEL_COLORS.companion,
            boxShadow: '0 0 18px #a78bfa',
          }}
        />
      ) : null}

      <PixelDude x={runX - bump} y={360} color={PIXEL_COLORS.hero} bounce={bounce} />
      {levelIndex >= 1 ? (
        <PixelDude x={petX} y={petY} color={PIXEL_COLORS.companion} bounce={-bounce} size={petSize} />
      ) : (
        <PixelDude x={940} y={410} color="#475569" bounce={0} size={16} />
      )}

      {formula ? (
        <div
          style={{
            position: 'absolute',
            left: 420,
            top: 88,
            maxWidth: 440,
            padding: '8px 10px',
            background: 'rgba(2,6,23,0.55)',
            color: '#e0f2fe',
            fontFamily: '"Courier New", monospace',
            fontSize: 13,
            border: '2px solid #22d3ee',
          }}
        >
          {formula}
        </div>
      ) : null}
    </div>
  );
};
