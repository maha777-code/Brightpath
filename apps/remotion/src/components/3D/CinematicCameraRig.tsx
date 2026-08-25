import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { useThree } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';

export function cameraPose(
  motion: string,
  progress01: number,
  frame: number,
): { position: [number, number, number]; fov: number } {
  const p = interpolate(progress01, [0, 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const m = String(motion || '')
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (m === 'push_in_close') {
    return {
      position: [0, interpolate(p, [0, 1], [1.4, 0.35]), interpolate(p, [0, 1], [11.5, 4.6])],
      fov: interpolate(p, [0, 1], [52, 38]),
    };
  }
  if (m === 'wide_angle_reveal') {
    return {
      position: [interpolate(p, [0, 1], [-1.2, 0]), interpolate(p, [0, 1], [3.2, 1.1]), interpolate(p, [0, 1], [13.5, 7.4])],
      fov: interpolate(p, [0, 1], [58, 46]),
    };
  }
  if (m === 'cinematic_pan_right') {
    return {
      position: [interpolate(p, [0, 1], [-4.2, 4.2]), 1.15, 7.2],
      fov: 48,
    };
  }
  if (m === 'top_down_macro') {
    return {
      position: [0.2, interpolate(p, [0, 1], [9.5, 5.2]), interpolate(p, [0, 1], [3.8, 1.6])],
      fov: interpolate(p, [0, 1], [50, 36]),
    };
  }
  if (m === 'hyper_zoom_into_particles') {
    return {
      position: [0, interpolate(p, [0, 1], [0.7, 0.15]), interpolate(p, [0, 1], [8.2, 2.35])],
      fov: interpolate(p, [0, 1], [48, 28]),
    };
  }
  const radius = interpolate(p, [0, 1], [8.4, 6.1]);
  const angle = frame * 0.018;
  return {
    position: [Math.sin(angle) * radius, 2.4, Math.cos(angle) * radius],
    fov: 46,
  };
}

/** Per-frame cinematic camera (Bezier-like ease via Remotion interpolate). */
export const CinematicCameraRig: React.FC<{
  motion: string;
  progress01: number;
}> = ({ motion, progress01 }) => {
  const { camera } = useThree();
  const frame = useCurrentFrame();
  const { position, fov } = cameraPose(motion, progress01, frame);
  const cam = camera as PerspectiveCamera;
  cam.position.set(position[0], position[1], position[2]);
  cam.lookAt(0, 0.15, 0);
  cam.fov = fov;
  cam.updateProjectionMatrix();
  return null;
};

export const CinematicLights: React.FC<{ lighting?: string }> = ({ lighting }) => {
  const mode = String(lighting || '')
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (mode === 'dramatic_spotlight') {
    return (
      <>
        <ambientLight intensity={0.22} />
        <spotLight
          position={[3.2, 9, 4]}
          intensity={2.6}
          angle={0.38}
          penumbra={0.55}
          color="#fff4e5"
        />
        <pointLight position={[-8, -2, -5]} intensity={0.7} color="#6d28d9" />
      </>
    );
  }
  if (mode === 'cool_discovery') {
    return (
      <>
        <ambientLight intensity={0.38} />
        <directionalLight position={[2, 8, 6]} intensity={1.35} color="#e0f2fe" />
        <pointLight position={[-4, 1, 3]} intensity={1.1} color="#22d3ee" />
        <pointLight position={[4, -1, 2]} intensity={0.55} color="#a78bfa" />
      </>
    );
  }
  return (
    <>
      <ambientLight intensity={0.42} />
      <directionalLight position={[8, 12, 6]} intensity={1.7} color="#ffe8c8" />
      <pointLight position={[-6, 2, 4]} intensity={0.85} color="#fb923c" />
      <pointLight position={[5, -2, -3]} intensity={0.45} color="#7c3aed" />
    </>
  );
};
