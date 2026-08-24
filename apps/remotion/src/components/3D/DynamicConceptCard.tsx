import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { kindFromShape, parseHexColor, PrimitiveGeometry } from './primitives';

export type ConceptCardConfig = {
  headline?: string;
  title?: string;
  takeawayBadge?: string;
  keyTakeaway?: string;
  primaryColor?: string;
  secondaryColor?: string;
  primaryShape?: string;
  calloutBadges?: string[];
  speedMultiplier?: number;
};

/** Floating 3D plaque + orbiting badge chips for a law, formula, or definition. */
export const DynamicConceptCard: React.FC<{
  config: ConceptCardConfig;
  frame?: number;
}> = ({ config, frame: frameProp }) => {
  const hookFrame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const frame = frameProp ?? hookFrame;
  const t = frame / fps;
  const speed = Number(config.speedMultiplier ?? 1.15);
  const primary = parseHexColor(config.primaryColor, '#818cf8');
  const secondary = parseHexColor(config.secondaryColor, '#34d399');
  const kind = kindFromShape(config.primaryShape, 'grid');
  const badges = (config.calloutBadges ?? []).slice(0, 4);

  return (
    <group rotation={[0.08, t * 0.12 * speed, 0]}>
      <mesh position={[0, 0.05, -0.15]}>
        <boxGeometry args={[4.4, 2.6, 0.18]} />
        <meshStandardMaterial color="#111827" metalness={0.25} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.05, -0.02]}>
        <boxGeometry args={[4.15, 2.35, 0.04]} />
        <meshStandardMaterial color="#1e1b4b" emissive={primary} emissiveIntensity={0.18} />
      </mesh>
      <mesh position={[0, 0.15, 0.35]} rotation={[0.4, t * 0.6 * speed, 0.2]}>
        <PrimitiveGeometry kind={kind} scale={1.35} />
        <meshStandardMaterial color={primary} emissive={primary} emissiveIntensity={0.5} />
      </mesh>
      {badges.map((_, i) => {
        const a = (i / Math.max(1, badges.length)) * Math.PI * 2 + t * 0.5;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 2.35, Math.sin(a * 1.4) * 0.55, Math.sin(a) * 0.6]}
          >
            <boxGeometry args={[0.55, 0.22, 0.08]} />
            <meshStandardMaterial color={secondary} emissive={secondary} emissiveIntensity={0.45} />
          </mesh>
        );
      })}
    </group>
  );
};
