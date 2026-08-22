import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';

export type LabVisualProps = {
  container?: string;
  action?: string;
  primarySubstance?: string;
  secondarySubstance?: string;
  temperature?: number;
  speedMultiplier?: number;
};

/** Generic lab beaker/flask with dissolving / heating particle action. */
export const GenericLabScene: React.FC<{ props: LabVisualProps }> = ({ props }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const speed = Number(props.speedMultiplier ?? 1.4);
  const temp = Number(props.temperature ?? 40);
  const isHeat = String(props.action ?? '').includes('heat');
  const isDissolve = String(props.action ?? 'dissolve').includes('dissolve');
  const flask = String(props.container ?? 'beaker') === 'flask';

  const salt = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 28; i++) {
      pts.push(
        new THREE.Vector3(
          (Math.sin(i * 2.1) * 0.55),
          1.2 + (i % 7) * 0.08,
          Math.cos(i * 1.7) * 0.55,
        ),
      );
    }
    return pts;
  }, []);

  return (
    <group>
      {/* Vessel */}
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[flask ? 0.55 : 0.85, flask ? 0.7 : 0.95, 1.8, 32, 1, true]} />
        <meshStandardMaterial color="#7dd3fc" transparent opacity={0.22} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -1.05, 0]}>
        <cylinderGeometry args={[flask ? 0.7 : 0.95, flask ? 0.7 : 0.95, 0.08, 32]} />
        <meshStandardMaterial color="#38bdf8" metalness={0.2} roughness={0.4} />
      </mesh>

      {/* Liquid */}
      <mesh position={[0, -0.55, 0]}>
        <cylinderGeometry args={[flask ? 0.5 : 0.8, flask ? 0.65 : 0.88, 0.9, 32]} />
        <meshStandardMaterial
          color={isHeat ? '#fb923c' : '#38bdf8'}
          transparent
          opacity={0.45}
        />
      </mesh>

      {/* Secondary substance particles falling / dissolving */}
      {salt.map((base, i) => {
        const fall = isDissolve ? Math.min(1.6, t * speed * 0.35 + (i % 5) * 0.05) : 0;
        const spread = isDissolve ? Math.min(0.5, t * 0.12) : 0;
        const y = Math.max(-0.9, base.y - fall);
        const wobble = Math.sin(t * speed * 2 + i) * (isHeat ? 0.12 : 0.05);
        return (
          <mesh
            key={i}
            position={[
              base.x * (1 + spread) + wobble * 0.3,
              y,
              base.z * (1 + spread),
            ]}
          >
            <sphereGeometry args={[0.07, 10, 10]} />
            <meshStandardMaterial
              color={temp > 50 ? '#fbbf24' : '#facc15'}
              emissive="#a16207"
              emissiveIntensity={0.35}
            />
          </mesh>
        );
      })}
    </group>
  );
};
