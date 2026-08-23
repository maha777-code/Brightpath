import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';

export type BeakerSimulationProps = {
  container?: string;
  liquidLevel?: number;
  solute?: string;
  action?: string;
  waterLevelChanged?: boolean;
  primarySubstance?: string;
  secondarySubstance?: string;
  temperature?: number;
  speedMultiplier?: number;
};

/** Translucent 100mL beaker: water volume, falling solute, stirring glass rod. */
export const BeakerSimulation: React.FC<{ props: BeakerSimulationProps }> = ({ props }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const speed = Number(props.speedMultiplier ?? 1.4);
  const fill = Math.min(0.85, Math.max(0.28, Number(props.liquidLevel ?? 50) / 100));
  const stir = String(props.action ?? '').includes('stir') || String(props.action ?? '').includes('dissolve');
  const heat = String(props.action ?? '').includes('heat');
  const waterY = -0.85 + fill * 0.95;
  const waterH = fill * 1.15;

  const crystals = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 36; i++) {
      pts.push(
        new THREE.Vector3(
          Math.sin(i * 2.3) * 0.48,
          1.55 + (i % 9) * 0.07,
          Math.cos(i * 1.9) * 0.48,
        ),
      );
    }
    return pts;
  }, []);

  const rodAngle = stir ? t * speed * 3.2 : 0.4;
  const rodX = Math.sin(rodAngle) * 0.28;
  const rodZ = Math.cos(rodAngle) * 0.22;

  return (
    <group position={[0, -0.15, 0]}>
      {/* Beaker wall */}
      <mesh>
        <cylinderGeometry args={[0.95, 1.05, 2.05, 48, 1, true]} />
        <meshStandardMaterial
          color="#bae6fd"
          transparent
          opacity={0.22}
          roughness={0.12}
          metalness={0.08}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Rim */}
      <mesh position={[0, 1.02, 0]}>
        <torusGeometry args={[0.96, 0.045, 12, 48]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.35} roughness={0.25} />
      </mesh>
      {/* Base */}
      <mesh position={[0, -1.06, 0]}>
        <cylinderGeometry args={[1.05, 1.08, 0.1, 48]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.2} roughness={0.45} />
      </mesh>
      {/* Graduation ticks */}
      {[0.25, 0.5, 0.75].map((p) => (
        <mesh key={p} position={[0.97, -0.7 + p * 1.4, 0]}>
          <boxGeometry args={[0.08, 0.02, 0.02]} />
          <meshStandardMaterial color="#f8fafc" emissive="#38bdf8" emissiveIntensity={0.4} />
        </mesh>
      ))}

      {/* Water */}
      <mesh position={[0, waterY, 0]}>
        <cylinderGeometry args={[0.88, 0.96, waterH, 48]} />
        <meshStandardMaterial
          color={heat ? '#fb923c' : '#22d3ee'}
          transparent
          opacity={0.46}
          roughness={0.18}
          metalness={0.05}
        />
      </mesh>
      {/* Meniscus glow */}
      <mesh position={[0, waterY + waterH / 2 - 0.02, 0]}>
        <torusGeometry args={[0.9, 0.02, 8, 40]} />
        <meshStandardMaterial color="#67e8f9" emissive="#22d3ee" emissiveIntensity={0.7} />
      </mesh>

      {/* Falling / dissolving solute */}
      {crystals.map((base, i) => {
        const fall = Math.min(2.4, t * speed * 0.42 + (i % 6) * 0.06);
        const y = Math.max(waterY - waterH / 2 + 0.08, base.y - fall);
        const dissolved = y < waterY + 0.15;
        const spread = dissolved ? Math.min(0.55, (t - 1.2) * 0.18) : 0;
        const wobble = dissolved ? Math.sin(t * speed * 4 + i) * 0.08 : 0;
        return (
          <mesh
            key={i}
            position={[
              base.x * (1 + spread) + wobble,
              y,
              base.z * (1 + spread),
            ]}
            scale={dissolved ? 0.7 : 1}
          >
            <octahedronGeometry args={[0.07, 0]} />
            <meshStandardMaterial
              color="#facc15"
              emissive="#ca8a04"
              emissiveIntensity={dissolved ? 0.55 : 0.2}
            />
          </mesh>
        );
      })}

      {/* Glass stirring rod */}
      <group position={[rodX, 0.35, rodZ]} rotation={[0.35, rodAngle, 0.15]}>
        <mesh>
          <cylinderGeometry args={[0.035, 0.035, 2.1, 10]} />
          <meshStandardMaterial color="#e0f2fe" transparent opacity={0.55} roughness={0.08} />
        </mesh>
      </group>
    </group>
  );
};
