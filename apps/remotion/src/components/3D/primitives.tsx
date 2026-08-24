import React from 'react';

export type PrimitiveKind = 'sphere' | 'cube' | 'cylinder' | 'grid' | 'octa' | 'container' | 'particles';

export function parseHexColor(raw: string | undefined, fallback: string): string {
  const s = String(raw ?? '').trim();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s)) return s;
  return colorFromToken(s, fallback);
}

export function colorFromToken(token: string | undefined, fallback: string): string {
  const t = String(token ?? '').toLowerCase();
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(t)) return t;
  if (t.includes('yellow') || t.includes('gold') || t.includes('sun')) return '#facc15';
  if (t.includes('orange') || t.includes('amber')) return '#f59e0b';
  if (t.includes('red') || t.includes('heat') || t.includes('warn')) return '#fb7185';
  if (t.includes('green') || t.includes('plant') || t.includes('life')) return '#4ade80';
  if (t.includes('purple') || t.includes('violet')) return '#c084fc';
  if (t.includes('pink')) return '#f9a8d4';
  if (t.includes('blue') || t.includes('water') || t.includes('sky')) return '#00A8FF';
  if (t.includes('white') || t.includes('glass')) return '#e2e8f0';
  return fallback;
}

export function kindFromShape(raw: string | undefined, fallback: PrimitiveKind = 'sphere'): PrimitiveKind {
  const t = String(raw ?? '').toLowerCase();
  if (t.includes('cube') || t.includes('box') || t.includes('square')) return 'cube';
  if (t.includes('cylind') || t.includes('rod') || t.includes('container') || t.includes('beaker')) {
    return 'cylinder';
  }
  if (t.includes('grid') || t.includes('lattice') || t.includes('mesh')) return 'grid';
  if (t.includes('octa') || t.includes('crystal')) return 'octa';
  if (t.includes('particle')) return 'particles';
  if (t.includes('sphere') || t.includes('ball') || t.includes('cell')) return 'sphere';
  return fallback;
}

export const PrimitiveGeometry: React.FC<{ kind: PrimitiveKind; scale?: number }> = ({
  kind,
  scale = 1,
}) => {
  if (kind === 'cube') return <boxGeometry args={[0.95 * scale, 0.95 * scale, 0.95 * scale]} />;
  if (kind === 'cylinder' || kind === 'container') {
    return <cylinderGeometry args={[0.42 * scale, 0.48 * scale, 1.15 * scale, 28]} />;
  }
  if (kind === 'octa') return <octahedronGeometry args={[0.58 * scale, 0]} />;
  if (kind === 'grid') return <torusGeometry args={[0.5 * scale, 0.07 * scale, 10, 28]} />;
  return <sphereGeometry args={[0.52 * scale, 20, 20]} />;
};
