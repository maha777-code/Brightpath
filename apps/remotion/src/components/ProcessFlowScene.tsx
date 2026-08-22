import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';

export type ProcessFlowProps = {
  stepLabels?: string[];
  action?: string;
  speedMultiplier?: number;
};

/** Horizontal process / timeline nodes with a travelling highlight. */
export const ProcessFlowScene: React.FC<{ props: ProcessFlowProps }> = ({ props }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const speed = Number(props.speedMultiplier ?? 1.2);
  const labels =
    Array.isArray(props.stepLabels) && props.stepLabels.length
      ? props.stepLabels.slice(0, 4)
      : ['Start', 'Change', 'Result'];

  const active = Math.min(labels.length - 1, Math.floor((t * speed * 0.45) % labels.length));

  return (
    <group position={[0, -0.2, 0]}>
      {/* Base rail */}
      <mesh position={[0, -0.8, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 5.2, 12]} />
        <meshStandardMaterial color="#475569" />
      </mesh>

      {labels.map((label, i) => {
        const x = -2.2 + i * (4.4 / Math.max(1, labels.length - 1));
        const isActive = i === active;
        const scale = isActive ? 1.25 : 1;
        return (
          <group key={`${label}-${i}`} position={[x, -0.8, 0]} scale={scale}>
            <mesh>
              <sphereGeometry args={[0.28, 16, 16]} />
              <meshStandardMaterial
                color={isActive ? '#34d399' : '#64748b'}
                emissive={isActive ? '#059669' : '#334155'}
                emissiveIntensity={isActive ? 0.55 : 0.15}
              />
            </mesh>
            {/* Marker tower */}
            <mesh position={[0, 0.85, 0]}>
              <boxGeometry args={[0.7, 0.9, 0.12]} />
              <meshStandardMaterial
                color={isActive ? '#064e3b' : '#1e293b'}
                metalness={0.1}
                roughness={0.6}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};
