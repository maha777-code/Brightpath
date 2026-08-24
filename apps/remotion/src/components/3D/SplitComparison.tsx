import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';

export type SplitComparisonProps = {
  leftLabel?: string;
  rightLabel?: string;
  leftConcept?: string;
  rightConcept?: string;
  primaryObject?: string;
  accentColor?: string;
  speedMultiplier?: number;
};

function tokenShape(label?: string): 'box' | 'octa' | 'sphere' | 'icosa' {
  const s = String(label ?? '').toLowerCase();
  if (s.includes('wood') || s.includes('block') || s.includes('solid') || s.includes('continuous')) {
    return 'box';
  }
  if (s.includes('sand') || s.includes('grain') || s.includes('particle') || s.includes('crystal')) {
    return 'octa';
  }
  if (s.includes('gas') || s.includes('air') || s.includes('vapor')) return 'sphere';
  return 'icosa';
}

function Shape({ kind }: { kind: ReturnType<typeof tokenShape> }) {
  if (kind === 'box') return <boxGeometry args={[0.95, 0.95, 0.95]} />;
  if (kind === 'octa') return <octahedronGeometry args={[0.62, 0]} />;
  if (kind === 'sphere') return <sphereGeometry args={[0.55, 18, 18]} />;
  return <icosahedronGeometry args={[0.58, 0]} />;
}

/** Side-by-side 3D comparison driven by left/right concept props from the script JSON. */
export const SplitComparison: React.FC<{
  props: SplitComparisonProps;
  frame?: number;
}> = ({ props, frame: frameProp }) => {
  const hookFrame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const frame = frameProp ?? hookFrame;
  const t = frame / fps;
  const speed = Number(props.speedMultiplier ?? 1.2);
  const pulse = 1 + Math.sin(t * speed * 2) * 0.04;
  const left = props.leftConcept || props.leftLabel || 'Left';
  const right = props.rightConcept || props.rightLabel || 'Right';
  const accent = String(props.accentColor || '#38bdf8');
  const leftKind = tokenShape(left);
  const rightKind = tokenShape(right);

  return (
    <group>
      <mesh position={[0, 0, -0.5]}>
        <boxGeometry args={[0.06, 3.2, 0.06]} />
        <meshStandardMaterial color="#94a3b8" emissive="#64748b" emissiveIntensity={0.4} />
      </mesh>

      <group position={[-2.1, 0, 0]} scale={pulse}>
        <mesh>
          <boxGeometry args={[2.4, 2.6, 0.15]} />
          <meshStandardMaterial color="#1e3a5f" metalness={0.15} roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.35, 0.2]} rotation={[0, t * 0.4, 0]}>
          <Shape kind={leftKind} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.35} />
        </mesh>
        <mesh position={[0, -0.55, 0.25]} rotation={[0, t * 0.5, 0]}>
          <torusGeometry args={[0.45, 0.06, 10, 32]} />
          <meshStandardMaterial color="#7dd3fc" />
        </mesh>
      </group>

      <group position={[2.1, 0, 0]} scale={pulse}>
        <mesh>
          <boxGeometry args={[2.4, 2.6, 0.15]} />
          <meshStandardMaterial color="#3b1d4a" metalness={0.15} roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.35, 0.2]} rotation={[0, -t * 0.4, 0]}>
          <Shape kind={rightKind} />
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

export const SplitComparisonScene = SplitComparison;
