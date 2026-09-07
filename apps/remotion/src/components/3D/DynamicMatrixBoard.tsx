import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { parseHexColor } from './primitives';
import { GlowingAxes } from './DynamicScatterPlot';

export type MatrixBoardConfig = {
  primaryColor?: string;
  secondaryColor?: string;
  speedMultiplier?: number;
  leftLabel?: string;
  rightLabel?: string;
  formulaText?: string;
  headline?: string;
};

/** Glowing matrix / design-matrix cells for Y = Xβ + ε. */
export const DynamicMatrixBoard: React.FC<{
  config: MatrixBoardConfig;
  frame?: number;
}> = ({ config, frame: frameProp }) => {
  const hookFrame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const frame = frameProp ?? hookFrame;
  const t = frame / fps;
  const speed = Number(config.speedMultiplier ?? 1);
  const primary = parseHexColor(config.primaryColor, '#38bdf8');
  const secondary = parseHexColor(config.secondaryColor, '#FACC15');
  const rows = 4;
  const cols = 3;

  return (
    <group rotation={[0.18, t * 0.12 * speed, 0]}>
      {Array.from({ length: rows * cols }, (_, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const lit = (t * 3 + i) % 8 < 5;
        return (
          <mesh
            key={i}
            position={[(c - 1) * 0.85 - 1.4, 1.35 - r * 0.7, 0]}
          >
            <boxGeometry args={[0.7, 0.55, 0.12]} />
            <meshStandardMaterial
              color={c === 2 ? secondary : primary}
              emissive={c === 2 ? secondary : primary}
              emissiveIntensity={lit ? 0.7 : 0.25}
            />
          </mesh>
        );
      })}
      {Array.from({ length: 4 }, (_, i) => (
        <mesh key={`b-${i}`} position={[2.15, 1.35 - i * 0.7, 0]}>
          <boxGeometry args={[0.42, 0.55, 0.12]} />
          <meshStandardMaterial color={secondary} emissive={secondary} emissiveIntensity={0.65} />
        </mesh>
      ))}
      {Array.from({ length: 4 }, (_, i) => (
        <mesh key={`y-${i}`} position={[3.15, 1.35 - i * 0.7, 0]}>
          <boxGeometry args={[0.42, 0.55, 0.12]} />
          <meshStandardMaterial color="#a78bfa" emissive="#a78bfa" emissiveIntensity={0.55} />
        </mesh>
      ))}
    </group>
  );
};

export type MathAxesConfig = {
  primaryColor?: string;
  secondaryColor?: string;
  speedMultiplier?: number;
};

/** Coordinate axes / vector-space fallback (no lab glassware). */
export const DynamicMathAxes: React.FC<{
  config: MathAxesConfig;
  frame?: number;
}> = ({ config, frame: frameProp }) => {
  const hookFrame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const frame = frameProp ?? hookFrame;
  const t = frame / fps;
  const speed = Number(config.speedMultiplier ?? 1);
  const primary = parseHexColor(config.primaryColor, '#818cf8');
  const secondary = parseHexColor(config.secondaryColor, '#34d399');

  return (
    <group rotation={[0.35, t * 0.15 * speed, 0.05]}>
      <GlowingAxes color={primary} t={t * speed} />
      <mesh position={[1.4, 1.1, 0.4]} rotation={[0.4, t * 0.8, 0.2]}>
        <octahedronGeometry args={[0.45, 0]} />
        <meshStandardMaterial color={secondary} emissive={secondary} emissiveIntensity={0.7} />
      </mesh>
      <mesh position={[-1.6, 0.7, 0.2]} rotation={[t * 0.5, 0.3, 0]}>
        <torusGeometry args={[0.55, 0.06, 10, 32]} />
        <meshStandardMaterial color={primary} emissive={primary} emissiveIntensity={0.55} />
      </mesh>
    </group>
  );
};
