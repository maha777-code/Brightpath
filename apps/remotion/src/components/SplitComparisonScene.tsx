import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';

export type SplitComparisonProps = {
  leftLabel?: string;
  rightLabel?: string;
  primaryObject?: string;
  speedMultiplier?: number;
};

/** Side-by-side 3D comparison panels driven by left/right labels. */
export const SplitComparisonScene: React.FC<{ props: SplitComparisonProps }> = ({
  props,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const speed = Number(props.speedMultiplier ?? 1.2);
  const pulse = 1 + Math.sin(t * speed * 2) * 0.04;

  return (
    <group>
      {/* Divider */}
      <mesh position={[0, 0, -0.5]}>
        <boxGeometry args={[0.06, 3.2, 0.06]} />
        <meshStandardMaterial color="#94a3b8" emissive="#64748b" emissiveIntensity={0.4} />
      </mesh>

      {/* Left card */}
      <group position={[-2.1, 0, 0]} scale={pulse}>
        <mesh>
          <boxGeometry args={[2.4, 2.6, 0.15]} />
          <meshStandardMaterial color="#1e3a5f" metalness={0.15} roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.35, 0.2]}>
          <icosahedronGeometry args={[0.55, 0]} />
          <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.35} />
        </mesh>
        <mesh position={[0, -0.55, 0.25]} rotation={[0, t * 0.5, 0]}>
          <torusGeometry args={[0.45, 0.06, 10, 32]} />
          <meshStandardMaterial color="#7dd3fc" />
        </mesh>
      </group>

      {/* Right card */}
      <group position={[2.1, 0, 0]} scale={pulse}>
        <mesh>
          <boxGeometry args={[2.4, 2.6, 0.15]} />
          <meshStandardMaterial color="#3b1d4a" metalness={0.15} roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.35, 0.2]}>
          <octahedronGeometry args={[0.55, 0]} />
          <meshStandardMaterial color="#f472b6" emissive="#9d174d" emissiveIntensity={0.35} />
        </mesh>
        <mesh position={[0, -0.55, 0.25]} rotation={[0, -t * 0.5, 0]}>
          <torusGeometry args={[0.45, 0.06, 10, 32]} />
          <meshStandardMaterial color="#f9a8d4" />
        </mesh>
      </group>
    </group>
  );
};
