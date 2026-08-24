import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import {
  colorFromToken,
  kindFromShape,
  parseHexColor,
  PrimitiveGeometry,
  type PrimitiveKind,
} from './primitives';

export type StageElement = {
  name?: string;
  type?: string;
  color?: string;
};

export type StageConfig = {
  title?: string;
  stageLabel?: string;
  elements?: StageElement[];
  actionText?: string;
  primaryColor?: string;
  secondaryColor?: string;
  primaryShape?: string;
  calloutBadges?: string[];
  speedMultiplier?: number;
};

function elementKind(el: StageElement, fallback: PrimitiveKind): PrimitiveKind {
  const t = String(el.type || el.name || '').toLowerCase();
  if (t.includes('container') || t.includes('beaker') || t.includes('flask') || t.includes('vessel')) {
    return 'container';
  }
  if (t.includes('particle') || t.includes('atom') || t.includes('cell') || t.includes('grain')) {
    return 'particles';
  }
  return kindFromShape(el.type || el.name, fallback);
}

function GlassContainer({ color, t }: { color: string; t: number }) {
  const fill = 0.45 + Math.sin(t * 1.4) * 0.06;
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[0.72, 0.8, 1.7, 36, 1, true]} />
        <meshStandardMaterial
          color="#bae6fd"
          transparent
          opacity={0.22}
          roughness={0.12}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[0.64, 0.7, fill * 1.2, 32]} />
        <meshStandardMaterial color={color} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

function ParticleCloud({ color, t, count = 14 }: { color: string; t: number; count?: number }) {
  const pts = React.useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * 0.45, (i % 5) * 0.12 - 0.2, Math.sin(a) * 0.45);
    });
  }, [count]);
  return (
    <group>
      {pts.map((p, i) => (
        <mesh
          key={i}
          position={[
            p.x + Math.sin(t * 2.2 + i) * 0.08,
            p.y + Math.cos(t * 1.7 + i) * 0.1,
            p.z,
          ]}
        >
          <sphereGeometry args={[0.09, 10, 10]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} />
        </mesh>
      ))}
    </group>
  );
}

/** Generic apparatus / process stage: glass vessels, primitives, and direction vectors from config.elements. */
export const DynamicInteractiveStage: React.FC<{
  config: StageConfig;
  frame?: number;
}> = ({ config, frame: frameProp }) => {
  const hookFrame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const frame = frameProp ?? hookFrame;
  const t = frame / fps;
  const speed = Number(config.speedMultiplier ?? 1.25);
  const primary = parseHexColor(config.primaryColor, '#00A8FF');
  const secondary = parseHexColor(config.secondaryColor, '#FACC15');
  const elements = (config.elements?.length
    ? config.elements
    : [
        { name: config.stageLabel || 'Primary', type: config.primaryShape || 'container', color: primary },
        { name: config.actionText || 'Change', type: 'particles', color: secondary },
      ]
  ).slice(0, 5);
  const n = Math.max(1, elements.length);

  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -1.55, 0]}>
        <circleGeometry args={[3.2, 48]} />
        <meshStandardMaterial color="#0b1220" />
      </mesh>

      {elements.map((el, i) => {
        const x = (i - (n - 1) / 2) * 2.15;
        const kind = elementKind(el, i === 0 ? 'container' : 'sphere');
        const color = parseHexColor(el.color, i % 2 === 0 ? primary : secondary);
        const bob = Math.sin(t * speed + i) * 0.08;
        return (
          <group key={`${el.name || kind}-${i}`} position={[x, bob, 0]}>
            {kind === 'container' ? (
              <GlassContainer color={color} t={t * speed} />
            ) : kind === 'particles' ? (
              <ParticleCloud color={color} t={t * speed} />
            ) : (
              <mesh rotation={[0.2, t * 0.4 * (i % 2 === 0 ? 1 : -1), 0.1]}>
                <PrimitiveGeometry kind={kind} scale={1.05} />
                <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.32} />
              </mesh>
            )}
          </group>
        );
      })}

      {n >= 2 ? (
        <group position={[0, 0.85, 0.4]}>
          <mesh rotation={[0, 0, -0.15]} position={[0, 0, 0]}>
            <cylinderGeometry args={[0.035, 0.035, Math.min(4.2, (n - 1) * 2.15), 8]} />
            <meshStandardMaterial
              color={colorFromToken(config.actionText, '#fbbf24')}
              emissive="#f59e0b"
              emissiveIntensity={0.55}
            />
          </mesh>
          <mesh position={[Math.min(2.1, (n - 1) * 1.05), 0.15, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.14, 0.32, 10]} />
            <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.6} />
          </mesh>
        </group>
      ) : null}
    </group>
  );
};
