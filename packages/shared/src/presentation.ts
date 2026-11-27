export const PRESENTATION_SLIDE_OPTIONS = [
  { id: 'short', label: 'Short (3-6 Slides)', count: 5 },
  { id: 'standard', label: 'Standard (7-12 Slides)', count: 10 },
  { id: 'long', label: 'Long (13-20 Slides)', count: 15 },
] as const;

export type PresentationSlideCount = (typeof PRESENTATION_SLIDE_OPTIONS)[number]['id'];

export const PRESENTATION_THEMES = [
  { id: 'made', label: 'Made for you' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'magic', label: 'Magic' },
  { id: 'playful', label: 'Playful' },
  { id: 'chalk', label: 'Chalk' },
  { id: 'notebook', label: 'Notebook' },
  { id: 'scholar', label: 'Scholar' },
] as const;

export type PresentationTheme = (typeof PRESENTATION_THEMES)[number]['id'];

export const PRESENTATION_LAYOUTS = ['cover', 'split', 'cards', 'quote', 'steps', 'focus'] as const;

export type PresentationLayout = (typeof PRESENTATION_LAYOUTS)[number];

export interface PresentationPayload {
  gradeLevel: string;
  slideCount: PresentationSlideCount;
  topic: string;
  additionalCriteria?: string;
  attachments?: string[];
  attachedDocumentContext?: string;
  imageFiles?: string[];
  /** Teacher follow-up that should change the deck already on screen. */
  revision?: string;
  currentSlides?: PresentationSlide[];
}

export interface PresentationSlide {
  title: string;
  subtitle?: string;
  bullets: string[];
  question?: string;
  speakerNotes: string;
  imagePrompt: string;
  /** How this slide is arranged. Cover, picture, cards, quote, or steps. */
  layout?: PresentationLayout;
  /** Teaching illustration for this slide, when a picture explains the concept. Absolute URL. */
  imageUrl?: string;
}

export interface PresentationResponse {
  title: string;
  gradeLevel: string;
  objective: string;
  slides: PresentationSlide[];
}

const LAYOUT_CYCLE: PresentationLayout[] = ['split', 'cards', 'steps', 'focus', 'quote'];

function isLayout(value: string | undefined): value is PresentationLayout {
  return PRESENTATION_LAYOUTS.includes(value as PresentationLayout);
}

/** Gives every slide a layout, and keeps the same arrangement from repeating back to back. */
export function assignSlideLayouts(slides: PresentationSlide[]): PresentationSlide[] {
  let previous: PresentationLayout | '' = '';
  return slides.map((slide, index) => {
    if (index === 0) {
      previous = 'cover';
      return { ...slide, layout: 'cover', imagePrompt: '' };
    }
    let layout = slide.layout;
    const visual = slide.imagePrompt.trim().length >= 24;
    if (!isLayout(layout) || layout === 'cover' || layout === previous) {
      layout = visual ? (index % 2 === 0 ? 'focus' : 'split') : LAYOUT_CYCLE[index % LAYOUT_CYCLE.length];
      if (layout === previous) layout = LAYOUT_CYCLE[(LAYOUT_CYCLE.indexOf(layout) + 1) % LAYOUT_CYCLE.length];
    }
    previous = layout;
    return { ...slide, layout };
  });
}

/** Layout to draw. A picture slide stays a picture slide only when an image arrived. */
export function slideLayout(slide: PresentationSlide, index: number): PresentationLayout {
  if (index === 0) return 'cover';
  if (slide.imageUrl) return slide.layout === 'focus' ? 'focus' : 'split';
  if (slide.layout === 'cards' || slide.layout === 'quote' || slide.layout === 'steps') return slide.layout;
  if (slide.question && slide.bullets.length <= 1) return 'quote';
  if (slide.bullets.length >= 3) return index % 2 === 0 ? 'cards' : 'steps';
  return 'steps';
}

export function presentationSlideTarget(id: PresentationSlideCount): number {
  return PRESENTATION_SLIDE_OPTIONS.find((option) => option.id === id)?.count ?? 10;
}
