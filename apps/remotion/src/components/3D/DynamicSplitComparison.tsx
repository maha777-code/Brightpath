import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { colorFromToken, kindFromShape, parseHexColor, PrimitiveGeometry } from './primitives';

export type SplitConfig = {
  title?: string;
  leftLabel?: string;
  rightLabel?: string;
  leftConcept?: string;
  rightConcept?: string;
  primaryShape?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  speedMultiplier?: number;
};

/** Two parameter-driven 3D objects — labels come from visualConfig, not a hardcoded topic. */
export const DynamicSplitComparison: React.FC<{
  config: SplitConfig;
  frame?: number;
}> = ({ config, frame: frameProp }) => {
  const hookFrame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const frame = frameProp ?? hookFrame;
  const t = frame / fps;
  const speed = Number(config.speedMultiplier ?? 1.2);
  const pulse = 1 + Math.sin(t * speed * 2) * 0.04;
  const leftColor = parseHexColor(
    config.primaryColor || config.accentColor,
    colorFromToken(config.leftLabel || config.leftConcept, '#00A8FF'),
  );
  const rightColor = parseHexColor(
    config.secondaryColor,
    colorFromToken(config.rightLabel || config.rightConcept, '#FF5722'),
  );
  const leftKind = kindFromShape(config.primaryShape, 'cube');
  const rightKind = kindFromShape(config.primaryShape, 'sphere');
  const rightResolved = rightKind === leftKind ? (leftKind === 'cube' ? 'sphere' : 'cube') : rightKind;

  return (
    <group>
      <mesh position={[0, 0, -0.5]}>
        <boxGeometry args={[0.06, 3.2, 0.06]} />
        <meshStandardMaterial color="#94a3b8" emissive="#64748b" emissiveIntensity={0.4} />
      </mesh>

      <group position={[-2.15, 0, 0]} scale={pulse}>
        <mesh>
          <boxGeometry args={[2.5, 2.7, 0.14]} />
          <meshStandardMaterial color="#0f2744" metalness={0.18} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.28, 0.22]} rotation={[0.15, t * 0.45, 0]}>
          <PrimitiveGeometry kind={leftKind} scale={1.15} />
          <meshStandardMaterial color={leftColor} emissive={leftColor} emissiveIntensity={0.38} />
        </mesh>
      </group>

      <group position={[2.15, 0, 0]} scale={pulse}>
        <mesh>
          <boxGeometry args={[2.5, 2.7, 0.14]} />
          <meshStandardMaterial color="#3b1d4a" metalness={0.18} roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.28, 0.22]} rotation={[-0.15, -t * 0.45, 0]}>
          <PrimitiveGeometry kind={rightResolved} scale={1.15} />
          <meshStandardMaterial color={rightColor} emissive={rightColor} emissiveIntensity={0.38} />
        </mesh>
      </group>
    </group>
  );
};
