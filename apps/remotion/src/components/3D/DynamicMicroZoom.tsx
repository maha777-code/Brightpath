import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { colorFromToken, parseHexColor } from './primitives';

export type MicroZoomConfig = {
  headline?: string;
  particleMatrix?: { typeA?: string; typeB?: string };
  primaryParticles?: string;
  secondaryParticles?: string;
  particleTypeA?: string;
  particleTypeB?: string;
  primaryColor?: string;
  secondaryColor?: string;
  interstitialFitting?: boolean;
  takeawayBadge?: string;
  speedMultiplier?: number;
  temperature?: number;
};

/** Procedural lattice whose colors/roles come from visualConfig.particleMatrix. */
export const DynamicMicroZoom: React.FC<{
  config: MicroZoomConfig;
  frame?: number;
}> = ({ config, frame: frameProp }) => {
  const hookFrame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const frame = frameProp ?? hookFrame;
  const t = frame / fps;
  const speed = Number(config.speedMultiplier ?? 1.25);
  const typeA =
    config.particleMatrix?.typeA ||
    config.primaryParticles ||
    config.particleTypeA ||
    'type_a';
  const typeB =
    config.particleMatrix?.typeB ||
    config.secondaryParticles ||
    config.particleTypeB ||
    'type_b';
  const colorA = parseHexColor(
    config.primaryColor,
    colorFromToken(typeA, '#38bdf8'),
  );
  const colorB = parseHexColor(
    config.secondaryColor,
    colorFromToken(typeB, '#facc15'),
  );
  const fit = config.interstitialFitting !== false;

  const lattice = useMemo(() => {
    const solvent: THREE.Vector3[] = [];
    const gaps: THREE.Vector3[] = [];
    for (let x = -2; x <= 2; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -2; z <= 2; z++) {
          solvent.push(new THREE.Vector3(x * 0.9, y * 0.9, z * 0.9));
          if ((x + y + z) % 2 === 0) {
            gaps.push(new THREE.Vector3(x * 0.9 + 0.45, y * 0.9 + 0.22, z * 0.9 + 0.45));
          }
        }
      }
    }
    return { solvent, gaps };
  }, []);

  const zoom = 1.05 + Math.min(0.55, t * 0.07);
  const insert = fit ? Math.min(1, Math.max(0, (t - 0.6) / 3.2)) : 1;

  return (
    <group scale={zoom} rotation={[0.18, t * 0.22 * speed, 0]}>
      {lattice.solvent.map((p, i) => {
        const vib = 0.035 + (Number(config.temperature ?? 30) / 800);
        return (
          <mesh
            key={`a-${i}`}
            position={[
              p.x + Math.sin(t * speed * 3.1 + i) * vib,
              p.y + Math.cos(t * speed * 2.4 + i) * vib,
              p.z + Math.sin(t * speed * 1.7 + i * 0.3) * vib,
            ]}
          >
            <sphereGeometry args={[0.2, 14, 14]} />
            <meshStandardMaterial color={colorA} emissive={colorA} emissiveIntensity={0.28} />
          </mesh>
        );
      })}
      {lattice.gaps.map((p, i) => {
        const start = new THREE.Vector3(p.x * 1.8, p.y + 1.6, p.z * 1.8);
        const x = THREE.MathUtils.lerp(start.x, p.x, insert);
        const y = THREE.MathUtils.lerp(start.y, p.y, insert);
        const z = THREE.MathUtils.lerp(start.z, p.z, insert);
        return (
          <mesh key={`b-${i}`} position={[x, y, z]} scale={0.55 + insert * 0.45}>
            <sphereGeometry args={[0.11, 12, 12]} />
            <meshStandardMaterial color={colorB} emissive={colorB} emissiveIntensity={0.45} />
          </mesh>
        );
      })}
    </group>
  );
};
