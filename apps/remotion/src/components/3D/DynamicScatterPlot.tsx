import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { parseHexColor } from './primitives';

export type ScatterConfig = {
  primaryColor?: string;
  secondaryColor?: string;
  speedMultiplier?: number;
  formulaText?: string;
  equationLatex?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  showFitLine?: boolean;
};

function galtonCloud(count: number): Array<[number, number, number]> {
  const pts: Array<[number, number, number]> = [];
  for (let i = 0; i < count; i++) {
    const u = (i + 0.5) / count;
    const x = (u - 0.5) * 4.2;
    const noise = Math.sin(i * 12.9898) * 43758.5453;
    const frac = noise - Math.floor(noise);
    const y = 0.55 * x + (frac - 0.5) * 1.35;
    const z = ((i * 17) % 7) * 0.04 - 0.12;
    pts.push([x, y, z]);
  }
  return pts;
}

/** Glowing XY axes used by scatter, regression, and generic math scenes. */
export const GlowingAxes: React.FC<{
  color: string;
  t: number;
}> = ({ color, t }) => {
  const pulse = 0.35 + Math.sin(t * 2.2) * 0.12;
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[7.2, 4.6]} />
        <meshStandardMaterial color="#07111f" transparent opacity={0.92} />
      </mesh>
      {/* X axis */}
      <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.028, 0.028, 6.4, 10]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7 + pulse} />
      </mesh>
      {/* Y axis */}
      <mesh position={[0, 1.35, 0]}>
        <cylinderGeometry args={[0.028, 0.028, 2.8, 10]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7 + pulse} />
      </mesh>
      {/* grid ticks */}
      {[-2, -1, 1, 2].map((x) => (
        <mesh key={`gx-${x}`} position={[x * 1.15, 0, 0]}>
          <boxGeometry args={[0.04, 0.16, 0.04]} />
          <meshStandardMaterial color="#67e8f9" emissive="#22d3ee" emissiveIntensity={0.45} />
        </mesh>
      ))}
    </group>
  );
};

/** Interactive 2D/3D scatter + optional OLS fit line y = β0 + β1 x. */
export const DynamicScatterPlot: React.FC<{
  config: ScatterConfig;
  frame?: number;
  showFitLine?: boolean;
}> = ({ config, frame: frameProp, showFitLine }) => {
  const hookFrame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const frame = frameProp ?? hookFrame;
  const t = frame / fps;
  const speed = Number(config.speedMultiplier ?? 1);
  const primary = parseHexColor(config.primaryColor, '#38bdf8');
  const secondary = parseHexColor(config.secondaryColor, '#FACC15');
  const pts = React.useMemo(() => galtonCloud(22), []);
  const drawLine = showFitLine ?? config.showFitLine ?? true;
  const visible = Math.min(pts.length, 6 + Math.floor(t * 4));

  return (
    <group rotation={[0.42, t * 0.08 * speed, 0]}>
      <GlowingAxes color={primary} t={t * speed} />
      {pts.slice(0, visible).map((p, i) => (
        <mesh
          key={i}
          position={[
            p[0] * 1.15,
            0.35 + p[1] * 0.55 + Math.sin(t * 2 + i) * 0.03,
            p[2],
          ]}
        >
          <sphereGeometry args={[0.1, 12, 12]} />
          <meshStandardMaterial
            color={i % 3 === 0 ? secondary : primary}
            emissive={i % 3 === 0 ? secondary : primary}
            emissiveIntensity={0.55}
          />
        </mesh>
      ))}
      {drawLine ? (
        <mesh position={[0, 0.55, 0.15]} rotation={[0, 0, -0.48]}>
          <cylinderGeometry args={[0.035, 0.035, 5.4, 10]} />
          <meshStandardMaterial color={secondary} emissive={secondary} emissiveIntensity={0.85} />
        </mesh>
      ) : null}
    </group>
  );
};
