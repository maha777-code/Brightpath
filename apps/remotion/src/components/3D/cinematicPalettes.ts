import type { LessonMood } from '@brightpath/shared';

export type CinematicPalette = {
  bg: string;
  floor: string;
  key: string;
  fill: string;
  accent: string;
  text: string;
  muted: string;
  captionBg: string;
};

export const PALETTES: Record<LessonMood, CinematicPalette> = {
  warm: {
    bg: '#f0d3b0',
    floor: '#e8c49a',
    key: '#ffe7c2',
    fill: '#fb923c',
    accent: '#d97706',
    text: '#1c1917',
    muted: '#57534e',
    captionBg: 'rgba(255,247,237,0.86)',
  },
  cool: {
    bg: '#c9d9e8',
    floor: '#e8eef5',
    key: '#fff7ed',
    fill: '#93c5fd',
    accent: '#0284c7',
    text: '#0f172a',
    muted: '#334155',
    captionBg: 'rgba(255,255,255,0.84)',
  },
  dusk: {
    bg: '#2a2038',
    floor: '#1a1424',
    key: '#fbbf24',
    fill: '#7c3aed',
    accent: '#f59e0b',
    text: '#f8fafc',
    muted: '#cbd5e1',
    captionBg: 'rgba(15,23,42,0.72)',
  },
  studio: {
    bg: '#e8eef5',
    floor: '#f8fafc',
    key: '#ffffff',
    fill: '#94a3b8',
    accent: '#0ea5e9',
    text: '#0f172a',
    muted: '#475569',
    captionBg: 'rgba(255,255,255,0.88)',
  },
  parchment: {
    bg: '#efe4c8',
    floor: '#e4d3a8',
    key: '#fde68a',
    fill: '#b45309',
    accent: '#92400e',
    text: '#3f2a14',
    muted: '#6b4f2a',
    captionBg: 'rgba(255,251,235,0.88)',
  },
  night: {
    bg: '#0b1220',
    floor: '#111827',
    key: '#67e8f9',
    fill: '#1d4ed8',
    accent: '#22d3ee',
    text: '#f8fafc',
    muted: '#94a3b8',
    captionBg: 'rgba(15,23,42,0.78)',
  },
};

export function paletteFor(mood?: LessonMood | string): CinematicPalette {
  const key = String(mood ?? 'dusk') as LessonMood;
  return PALETTES[key] ?? PALETTES.dusk;
}
