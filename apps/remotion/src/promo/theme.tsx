import React, { createContext, useContext } from 'react';
import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';

export const PROMO_FPS = 30;
export const PROMO_WIDTH = 1920;
export const PROMO_HEIGHT = 1080;
/** Safe area kept clear on every edge. */
export const PAD = 96;
/** Frames each scene overlaps the next one for the crossfade. */
export const OVERLAP = 12;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a 6-digit hex colour like #22D3EE');
const seconds = z.number().min(1).max(20);

export const promoSchema = z.object({
  url: z.string(),
  colors: z.object({
    primary: hex,
    accent: hex,
    background: hex,
    text: hex,
  }),
  copy: z.object({
    hookLine1: z.string(),
    hookLine2: z.string(),
    problemHeadline: z.string(),
    problemSub: z.string(),
    revealTagline: z.string(),
    feature1Label: z.string(),
    feature1Headline: z.string(),
    feature2Label: z.string(),
    feature2Headline: z.string(),
    feature3Label: z.string(),
    feature3Headline: z.string(),
    audienceLead: z.string(),
    audiences: z.array(z.string()).min(1),
    ctaHeadline: z.string(),
    ctaButton: z.string(),
    ctaNote: z.string(),
  }),
  timing: z.object({
    hook: seconds,
    problem: seconds,
    reveal: seconds,
    feature1: seconds,
    feature2: seconds,
    feature3: seconds,
    audiences: seconds,
    cta: seconds,
  }),
});

export type PromoProps = z.infer<typeof promoSchema>;

export const defaultPromoProps: PromoProps = {
  url: 'mindvault.academy',
  colors: {
    primary: '#22D3EE',
    accent: '#8B5CF6',
    background: '#030712',
    text: '#F8FAFC',
  },
  copy: {
    hookLine1: 'Still planning lessons',
    hookLine2: 'at midnight?',
    problemHeadline: "Generic AI doesn't know your syllabus.",
    problemSub: 'So you rewrite every answer. Again.',
    revealTagline: 'The AI teaching assistant that follows your syllabus.',
    feature1Label: 'Curriculum & Textbook Studio',
    feature1Headline: 'Upload your textbook once.',
    feature2Label: '11 AI tools',
    feature2Headline: 'Every tool follows your chapters.',
    feature3Label: 'Sharada AI tutor',
    feature3Headline: 'A safe AI tutor for every student.',
    audienceLead: 'Built for',
    audiences: ['teachers', 'schools', 'students', 'parents'],
    ctaHeadline: 'Start free today.',
    ctaButton: 'Get started free',
    ctaNote: 'No card needed',
  },
  timing: {
    hook: 4,
    problem: 8,
    reveal: 5,
    feature1: 7,
    feature2: 7,
    feature3: 6,
    audiences: 3,
    cta: 5,
  },
};

export function promoDurationInFrames(props: PromoProps): number {
  const total = Object.values(props.timing).reduce((sum, s) => sum + s, 0);
  return Math.round(total * PROMO_FPS);
}

const PromoContext = createContext<PromoProps>(defaultPromoProps);
export const PromoProvider = PromoContext.Provider;
export const usePromo = () => useContext(PromoContext);

export const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

export const SPRING = {
  pop: { damping: 11, stiffness: 220, mass: 0.6 },
  snappy: { damping: 15, stiffness: 170, mass: 0.6 },
  soft: { damping: 20, stiffness: 110, mass: 0.8 },
} as const;

export function useEnter(delay: number, config: { damping: number; stiffness: number; mass: number } = SPRING.snappy) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: Math.max(0, frame - delay), fps, config });
}

export function rise(p: number, distance = 40): React.CSSProperties {
  return { opacity: p, transform: `translateY(${(1 - p) * distance}px)` };
}

export function alpha(color: string, a: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return color;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export function typed(text: string, frame: number, start: number, charsPerFrame = 1.4): string {
  return text.slice(0, Math.max(0, Math.floor((frame - start) * charsPerFrame)));
}
