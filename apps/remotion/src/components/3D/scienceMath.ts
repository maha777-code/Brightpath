import type { LessonMatterState } from '@brightpath/shared';

export type Vec3 = { x: number; y: number; z: number };

export function lattice(nx = 4, ny = 3, nz = 3): Vec3[] {
  const pts: Vec3[] = [];
  for (let x = 0; x < nx; x++) {
    for (let y = 0; y < ny; y++) {
      for (let z = 0; z < nz; z++) {
        pts.push({
          x: (x - (nx - 1) / 2) * 0.4,
          y: (y - (ny - 1) / 2) * 0.38,
          z: (z - (nz - 1) / 2) * 0.4,
        });
      }
    }
  }
  return pts;
}

export function seedLiquid(i: number): Vec3 {
  return {
    x: Math.sin(i * 2.17) * 0.72,
    y: -0.52 + (i % 5) * 0.13,
    z: Math.cos(i * 1.61) * 0.68,
  };
}

export function seedGas(i: number): Vec3 {
  return {
    x: Math.sin(i * 1.37) * 0.92,
    y: Math.sin(i * 0.91) * 0.78,
    z: Math.cos(i * 1.13) * 0.9,
  };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function particlePose(
  i: number,
  base: Vec3,
  state: LessonMatterState,
  progress: number,
  t: number,
): Vec3 {
  const liquid = seedLiquid(i);
  const gas = seedGas(i);
  let target = { ...base };
  let vib = 0.018;
  let speed = 1;

  if (state === 'solid') {
    vib = 0.02;
  } else if (state === 'melting') {
    target = {
      x: lerp(base.x, liquid.x, progress),
      y: lerp(base.y, liquid.y, progress),
      z: lerp(base.z, liquid.z, progress),
    };
    vib = 0.03 + progress * 0.05;
    speed = 1 + progress;
  } else if (state === 'liquid' || state === 'heating') {
    target = { ...liquid };
    vib = state === 'heating' ? 0.08 : 0.055;
    speed = state === 'heating' ? 2.2 : 1.5;
    target.x += Math.sin(t * speed + i) * 0.12;
    target.z += Math.cos(t * speed * 0.8 + i) * 0.1;
  } else if (state === 'evaporating') {
    const rising = i % 3 === 0;
    if (rising) {
      target = {
        x: lerp(liquid.x, gas.x, progress),
        y: lerp(liquid.y, gas.y, progress) + progress * 0.85,
        z: lerp(liquid.z, gas.z, progress),
      };
    } else {
      target = { ...liquid };
    }
    vib = 0.06 + progress * 0.05;
    speed = 1.6 + progress;
    target.x += Math.sin(t * speed + i) * (0.1 + progress * 0.2);
  } else {
    speed = 2.4;
    vib = 0.04;
    target = {
      x: Math.sin(t * speed * 0.55 + i) * 0.95,
      y: Math.sin(t * speed * 0.42 + i * 0.4) * 0.82,
      z: Math.cos(t * speed * 0.5 + i * 0.7) * 0.9,
    };
  }

  return {
    x: target.x + Math.sin(t * 3.1 * speed + i) * vib,
    y: target.y + Math.cos(t * 2.4 * speed + i) * vib,
    z: target.z + Math.sin(t * 1.8 * speed + i * 0.3) * vib,
  };
}

export function particleColor(state: LessonMatterState, progress: number): string {
  if (state === 'solid') return '#2b9bff';
  if (state === 'melting') return progress > 0.55 ? '#6ec4ff' : '#2b9bff';
  if (state === 'liquid') return '#3aa0ff';
  if (state === 'heating') return progress > 0.4 ? '#ff8a3c' : '#5eb0ff';
  if (state === 'evaporating') return progress > 0.5 ? '#e2e8f0' : '#7ec8ff';
  return '#dbeafe';
}

export function isHeated(state: LessonMatterState): boolean {
  return state === 'heating' || state === 'melting' || state === 'evaporating';
}
