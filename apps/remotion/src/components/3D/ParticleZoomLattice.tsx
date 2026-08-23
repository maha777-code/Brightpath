import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';

export type ParticleZoomLatticeProps = {
  primaryParticles?: string;
  secondaryParticles?: string;
  particleTypeA?: string;
  particleTypeB?: string;
  interstitialFitting?: boolean;
  speedMultiplier?: number;
  temperature?: number;
};

function colorFromToken(token: string | undefined, fallback: string) {
  const t = String(token ?? '').toLowerCase();
  if (t.includes('yellow') || t.includes('salt') || t.includes('gold')) return '#facc15';
  if (t.includes('red') || t.includes('heat')) return '#fb7185';
  if (t.includes('green')) return '#4ade80';
  if (t.includes('blue') || t.includes('water')) return '#38bdf8';
  return fallback;
}

/** Solvent lattice vibrates in place; solute slides into interstitial gaps. */
export const ParticleZoomLattice: React.FC<{ props: ParticleZoomLatticeProps }> = ({
  props,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const speed = Number(props.speedMultiplier ?? 1.25);
  const fit = props.interstitialFitting !== false;
  const colorA = colorFromToken(props.primaryParticles || props.particleTypeA, '#38bdf8');
  const colorB = colorFromToken(props.secondaryParticles || props.particleTypeB, '#facc15');

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
        const vib = 0.035 + (Number(props.temperature ?? 30) / 800);
        return (
          <mesh
            key={`s-${i}`}
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
          <mesh key={`g-${i}`} position={[x, y, z]} scale={0.55 + insert * 0.45}>
            <sphereGeometry args={[0.11, 12, 12]} />
            <meshStandardMaterial color={colorB} emissive={colorB} emissiveIntensity={0.45} />
          </mesh>
        );
      })}
    </group>
  );
};
