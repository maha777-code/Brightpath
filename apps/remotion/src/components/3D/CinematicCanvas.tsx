import React, { useLayoutEffect, useRef } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import type { LessonMatterState, LessonMood, LessonShape, LessonVisualKind } from '@brightpath/shared';
import { isHeated, lattice, particleColor, particlePose } from './scienceMath';
import { paletteFor } from './cinematicPalettes';

export type CinematicCanvasProps = {
  visualKind: LessonVisualKind;
  mood?: LessonMood;
  shape?: LessonShape;
  accentColor?: string;
  matterState?: LessonMatterState;
  progress01: number;
  objectLabel?: string;
  leftVisual?: string;
  rightVisual?: string;
};

type Handle = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  root: THREE.Group;
  hero: THREE.Mesh[];
  particles: THREE.Mesh[];
  ice: THREE.Mesh[];
  steam: THREE.Mesh[];
  flames: THREE.Mesh[];
  liquid: THREE.Mesh | null;
  heatLight: THREE.PointLight;
  satellites: THREE.Mesh[];
};

function mat(color: string, extra: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0.1, ...extra });
}

function heroGeometry(shape: LessonShape): THREE.BufferGeometry {
  if (shape === 'cube') return new THREE.BoxGeometry(1.55, 1.55, 1.55);
  if (shape === 'cylinder') return new THREE.CylinderGeometry(0.7, 0.7, 1.7, 32);
  if (shape === 'crystal') return new THREE.OctahedronGeometry(1.15, 0);
  if (shape === 'torus') return new THREE.TorusGeometry(0.95, 0.32, 16, 40);
  return new THREE.SphereGeometry(1.12, 36, 36);
}

function addBeaker(group: THREE.Group) {
  group.add(
    new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 1.14, 2.2, 40, 1, true),
      mat('#dbeafe', { transparent: true, opacity: 0.2, side: THREE.DoubleSide, roughness: 0.1 }),
    ),
  );
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.045, 10, 36), mat('#cbd5e1', { metalness: 0.25 }));
  rim.position.y = 1.1;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.16, 1.2, 0.1, 36), mat('#94a3b8'));
  base.position.y = -1.12;
  const liquid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.96, 1.02, 1, 36),
    mat('#3aa0ff', { transparent: true, opacity: 0.46 }),
  );
  group.add(rim, base, liquid);
  return liquid;
}

function addParticles(group: THREE.Group, count: number) {
  const geo = new THREE.SphereGeometry(0.11, 12, 12);
  return Array.from({ length: count }, () => {
    const mesh = new THREE.Mesh(geo, mat('#2b9bff', { emissive: '#2b9bff', emissiveIntensity: 0.2 }));
    group.add(mesh);
    return mesh;
  });
}

export const CinematicCanvas: React.FC<CinematicCanvasProps> = ({
  visualKind,
  mood = 'dusk',
  shape = 'sphere',
  accentColor,
  matterState = 'solid',
  progress01,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handle = useRef<Handle | null>(null);
  const stamp = useRef(`${visualKind}:${mood}:${shape}`);
  const t = frame / fps;
  const palette = paletteFor(mood);
  const accent = accentColor && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(accentColor) ? accentColor : palette.accent;
  const lab = visualKind === 'particles' || visualKind === 'beaker';

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const nextStamp = `${visualKind}:${mood}:${shape}`;
    const rebuild = !handle.current || stamp.current !== nextStamp;
    stamp.current = nextStamp;

    if (rebuild) {
      handle.current?.renderer.dispose();
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
      renderer.setPixelRatio(1);
      renderer.setSize(width, height, false);
      renderer.setClearColor(palette.bg, 1);
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(palette.bg);
      const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 40);
      camera.position.set(2.2, 1.6, 6.4);
      camera.lookAt(0, 0.15, 0);
      scene.add(new THREE.AmbientLight(0xffffff, 0.78));
      const key = new THREE.DirectionalLight(palette.key, 1.25);
      key.position.set(5, 8, 4);
      const fill = new THREE.DirectionalLight(palette.fill, 0.5);
      fill.position.set(-4, 2, 3);
      scene.add(key, fill);
      const floor = new THREE.Mesh(new THREE.CircleGeometry(8, 48), mat(palette.floor));
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -1.85;
      scene.add(floor);

      const root = new THREE.Group();
      scene.add(root);
      const heatLight = new THREE.PointLight(0xfb923c, 0, 5);
      heatLight.position.set(0, -1.15, 0);
      root.add(heatLight);

      const hero: THREE.Mesh[] = [];
      const particles: THREE.Mesh[] = [];
      const ice: THREE.Mesh[] = [];
      const steam: THREE.Mesh[] = [];
      const flames: THREE.Mesh[] = [];
      const satellites: THREE.Mesh[] = [];
      let liquid: THREE.Mesh | null = null;

      if (lab) {
        liquid = addBeaker(root);
        particles.push(...addParticles(root, 36));
        for (const [x, z] of [
          [-0.28, 0.18],
          [0.22, -0.12],
          [0.02, 0.32],
        ]) {
          const cube = new THREE.Mesh(
            new THREE.BoxGeometry(0.42, 0.28, 0.36),
            mat('#e0f2fe', { transparent: true, opacity: 0.82 }),
          );
          cube.position.set(x, 0.2, z);
          root.add(cube);
          ice.push(cube);
        }
        for (let i = 0; i < 10; i++) {
          const puff = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), mat('#f8fafc', { transparent: true, opacity: 0.28 }));
          root.add(puff);
          steam.push(puff);
        }
        const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.28, 16), mat('#334155'));
        burner.position.y = -1.55;
        root.add(burner);
        for (let i = 0; i < 3; i++) {
          const flame = new THREE.Mesh(
            new THREE.ConeGeometry(0.1, 0.32, 8),
            mat('#fb923c', { emissive: '#ea580c', emissiveIntensity: 1.1, transparent: true, opacity: 0.85 }),
          );
          flame.position.set(Math.sin((i / 3) * Math.PI * 2) * 0.12, -1.25, Math.cos((i / 3) * Math.PI * 2) * 0.12);
          root.add(flame);
          flames.push(flame);
        }
      } else if (visualKind === 'compare') {
        const left = new THREE.Mesh(heroGeometry(shape), mat(accent));
        left.position.x = -1.7;
        left.scale.setScalar(0.72);
        const right = new THREE.Mesh(heroGeometry(shape), mat(palette.fill));
        right.position.x = 1.7;
        right.scale.setScalar(0.72);
        root.add(left, right);
        hero.push(left, right);
      } else if (visualKind === 'process' || visualKind === 'diagram' || visualKind === 'example') {
        for (let i = 0; i < 3; i++) {
          const x = (i - 1) * 2.25;
          const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.1, 24), mat(palette.floor));
          pad.position.set(x, -0.85, 0);
          const orb = new THREE.Mesh(heroGeometry(i === 1 ? shape : 'sphere'), mat(accent, { emissive: accent, emissiveIntensity: 0.18 }));
          orb.position.set(x, 0.05, 0);
          orb.scale.setScalar(0.55);
          root.add(pad, orb);
          hero.push(orb, pad);
          if (i < 2) {
            const arrow = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.34, 8), mat(palette.muted));
            arrow.position.set(x + 1.12, -0.15, 0);
            arrow.rotation.z = -Math.PI / 2;
            root.add(arrow);
          }
        }
      } else {
        const mesh = new THREE.Mesh(heroGeometry(shape), mat(accent, { emissive: accent, emissiveIntensity: 0.16 }));
        root.add(mesh);
        hero.push(mesh);
        for (let i = 0; i < 8; i++) {
          const sat = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), mat(palette.key));
          sat.userData.index = i;
          root.add(sat);
          satellites.push(sat);
        }
      }

      handle.current = {
        renderer,
        scene,
        camera,
        root,
        hero,
        particles,
        ice,
        steam,
        flames,
        liquid,
        heatLight,
        satellites,
      };
    }

    const h = handle.current;
    if (!h) return;
    h.renderer.setSize(width, height, false);
    h.camera.aspect = width / height;
    h.camera.updateProjectionMatrix();
    h.scene.background = new THREE.Color(palette.bg);
    h.root.rotation.y = t * 0.14;
    h.root.rotation.x = 0.08;

    const dolly = 6.4 - progress01 * 0.35;
    h.camera.position.set(2.2 + Math.sin(t * 0.2) * 0.15, 1.6, dolly);

    if (lab) {
      const bases = lattice(4, 3, 3);
      const color = particleColor(matterState, progress01);
      const heat = isHeated(matterState) ? 0.55 + progress01 * 0.45 : visualKind === 'beaker' ? 0.35 : 0;
      h.heatLight.intensity = 2.2 * heat;
      h.particles.forEach((mesh, i) => {
        const p = particlePose(i, bases[i] ?? bases[0], matterState, progress01, t);
        const scale = visualKind === 'beaker' ? 0.82 : 1;
        mesh.position.set(p.x * scale, p.y * scale + 0.05, p.z * scale);
        const m = mesh.material as THREE.MeshStandardMaterial;
        m.color.set(color);
        m.emissive.set(color);
      });
      const fill =
        matterState === 'gas' ? 0.08 : matterState === 'evaporating' ? 0.55 - progress01 * 0.28 : matterState === 'solid' ? 0.22 : 0.52;
      if (h.liquid) {
        const waterH = Math.max(0.12, fill * 1.35);
        h.liquid.scale.y = waterH;
        h.liquid.position.y = -0.72 + waterH / 2;
        (h.liquid.material as THREE.MeshStandardMaterial).color.set(color);
      }
      const iceAmt = matterState === 'solid' ? 1 : matterState === 'melting' ? 1 - progress01 : 0;
      h.ice.forEach((mesh, i) => {
        mesh.visible = iceAmt > 0.05;
        mesh.scale.setScalar(0.55 * iceAmt);
        mesh.position.y = 0.05 + 0.18 * iceAmt + (i % 2) * 0.04;
      });
      const steamAmt =
        matterState === 'evaporating' ? progress01 : matterState === 'gas' ? 0.85 : matterState === 'heating' ? 0.35 : 0;
      h.steam.forEach((mesh, i) => {
        const rise = ((t * 0.35 + i * 0.11) % 1) * Math.max(steamAmt, 0.001);
        mesh.visible = steamAmt > 0.05;
        mesh.position.set(Math.sin(i * 1.7) * 0.35, 0.35 + rise * 1.4, Math.cos(i * 1.3) * 0.3);
        mesh.scale.setScalar(0.18 + rise * 0.28);
        (mesh.material as THREE.MeshStandardMaterial).opacity = 0.28 * (1 - rise);
      });
      const flicker = 0.85 + Math.sin(t * 14) * 0.15;
      h.flames.forEach((mesh) => {
        mesh.visible = heat > 0.05;
        mesh.scale.set(0.7, 0.9 + flicker * 0.3, 0.7);
      });
    } else {
      h.heatLight.intensity = 0.4;
      h.hero.forEach((mesh, i) => {
        const on = visualKind === 'compare' ? true : progress01 * 3 > Math.floor(i / 2) || visualKind === 'scene' || visualKind === 'object';
        const scale = on ? 0.95 + progress01 * 0.08 : 0.72;
        if (visualKind === 'process' || visualKind === 'diagram' || visualKind === 'example') {
          if (i % 2 === 0) mesh.scale.setScalar(0.5 + (on ? 0.12 : 0));
        } else {
          mesh.scale.setScalar(scale);
        }
        mesh.rotation.y = t * 0.25;
      });
      h.satellites.forEach((mesh, i) => {
        mesh.position.set(
          Math.cos((i / 8) * Math.PI * 2 + t) * 1.9,
          Math.sin(t * 0.8 + i) * 0.38,
          Math.sin((i / 8) * Math.PI * 2 + t) * 1.9,
        );
      });
    }

    h.renderer.render(h.scene, h.camera);
  }, [
    frame,
    fps,
    width,
    height,
    visualKind,
    mood,
    shape,
    accent,
    matterState,
    progress01,
    palette.bg,
    palette.fill,
    palette.floor,
    palette.key,
    palette.muted,
    t,
    lab,
  ]);

  return <canvas ref={canvasRef} width={width} height={height} style={{ width: '100%', height: '100%', display: 'block' }} />;
};
