import React, { useMemo } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';

export type ParticleZoomProps = {
  particleTypeA?: string;
  particleTypeB?: string;
  keyTakeaway?: string;
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

/** Lattice of type-A spheres with type-B filling interstitial spaces. */
export const ParticleZoomScene: React.FC<{ props: ParticleZoomProps }> = ({ props }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const speed = Number(props.speedMultiplier ?? 1.3);
  const colorA = colorFromToken(props.particleTypeA, '#38bdf8');
  const colorB = colorFromToken(props.particleTypeB, '#facc15');

  const lattice = useMemo(() => {
    const a: THREE.Vector3[] = [];
    const b: THREE.Vector3[] = [];
    for (let x = -2; x <= 2; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -2; z <= 2; z++) {
          a.push(new THREE.Vector3(x * 0.85, y * 0.85, z * 0.85));
          if ((x + y + z) % 2 === 0) {
            b.push(new THREE.Vector3(x * 0.85 + 0.42, y * 0.85 + 0.2, z * 0.85 + 0.42));
          }
        }
      }
    }
    return { a, b };
  }, []);

  const zoom = 1 + Math.min(0.55, t * 0.08);

  return (
    <group scale={zoom} rotation={[0.15, t * 0.25 * speed, 0]}>
      {lattice.a.map((p, i) => (
        <mesh
          key={`a-${i}`}
          position={[
            p.x + Math.sin(t * speed + i) * 0.04,
            p.y + Math.cos(t * speed * 0.8 + i) * 0.04,
            p.z,
          ]}
        >
          <sphereGeometry args={[0.18, 12, 12]} />
          <meshStandardMaterial color={colorA} emissive={colorA} emissiveIntensity={0.2} />
        </mesh>
      ))}
      {lattice.b.map((p, i) => (
        <mesh
          key={`b-${i}`}
          position={[
            p.x + Math.cos(t * speed * 1.2 + i) * 0.05,
            p.y,
            p.z + Math.sin(t * speed + i) * 0.05,
          ]}
        >
          <sphereGeometry args={[0.1, 10, 10]} />
          <meshStandardMaterial color={colorB} emissive={colorB} emissiveIntensity={0.35} />
        </mesh>
      ))}
    </group>
  );
};
