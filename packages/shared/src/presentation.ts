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

function clip(value: string, max: number): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

function sourceExcerpt(raw: string | undefined): string {
  return (raw ?? '')
    .replace(/===\s*ATTACHED FILE CONTENT(?:\s*\([^)]*\))?\s*===/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function presentationTitle(topic: string): string {
  const first = topic.split(/[.\n?]/)[0]?.trim() ?? '';
  return clip(first || topic, 72) || 'Presentation';
}

export function fallbackPresentation(input: PresentationPayload): PresentationResponse {
  const topic = input.topic.trim() || 'this lesson';
  const grade = input.gradeLevel.trim() || 'this class';
  const source = sourceExcerpt(input.attachedDocumentContext);
  const criteria = input.additionalCriteria?.trim() ?? '';
  const files = (input.attachments ?? []).filter(Boolean);
  const title = presentationTitle(topic);
  const evidence = source ? clip(source, 220) : '';
  const count = presentationSlideTarget(input.slideCount);
  const fileNote = files.length ? `Source files: ${files.join(', ')}.` : '';

  const slides: PresentationSlide[] = [
    {
      title,
      subtitle: `How does this idea work for ${grade}?`,
      bullets: [],
      speakerNotes: `Open with the driving question. Tell students the deck will end with them explaining ${title} in their own words. ${fileNote}`,
      imagePrompt: '',
    },
    {
      title: 'Start with something you can see',
      subtitle: 'A phenomenon, not a definition',
      bullets: [
        `Name one place ${grade} students already meet ${title}.`,
        evidence ? `From the uploaded material: ${evidence}` : `Ask what would change if ${title} stopped working.`,
        'Collect two observations before giving the vocabulary.',
      ],
      question: `Where have you already seen ${title} without calling it that?`,
      speakerNotes: 'Pause after the question. Accept everyday language before introducing the formal term.',
      imagePrompt: '',
    },
    {
      title: 'What we will be able to do',
      bullets: [
        `Explain ${title} in one clear sentence.`,
        'Use the model on a new example, not only the one on the slide.',
        criteria ? clip(criteria, 180) : 'Answer a check-for-understanding question without looking back.',
      ],
      speakerNotes: 'Read the goals aloud and ask which one feels hardest. That becomes the stretch check later.',
      imagePrompt: '',
    },
    {
      title: 'The model',
      subtitle: 'One idea, said carefully',
      bullets: [
        `${title} is the idea students must be able to use, not just recite.`,
        evidence ? `Keep this claim tied to the source: ${clip(evidence, 160)}` : 'Separate what the model explains from what it does not.',
        'Point to the part of the model that does the work.',
      ],
      speakerNotes: 'Build the model in two steps. First the whole picture, then the one moving part students confuse.',
      imagePrompt: '',
    },
    {
      title: 'Words that carry the idea',
      bullets: [
        `Term: the precise name for ${title}.`,
        'Everyday word: what students said during the opening.',
        'Relationship: how the term connects to the phenomenon.',
      ],
      question: 'Which word names the process, and which word only describes the result?',
      speakerNotes: 'Have pairs write one sentence that uses the term correctly. Listen for the result being mistaken for the process.',
      imagePrompt: '',
    },
    {
      title: 'Watch it happen',
      subtitle: 'A worked example',
      bullets: [
        'State the starting conditions.',
        `Show the change that ${title} accounts for.`,
        'End with the result and why it had to come out that way.',
      ],
      speakerNotes: 'Narrate the example slowly. Ask students to predict the next step before you reveal it.',
      imagePrompt: '',
    },
    {
      title: 'Check the model',
      bullets: [
        'What went in?',
        'What changed in the middle?',
        'What came out, and what stayed the same?',
      ],
      question: `If one step of ${title} were skipped, what would be different in the result?`,
      speakerNotes: 'This is a reasoning question, not a recall question. Ask a student to point at the step, not just name it.',
      imagePrompt: '',
    },
    {
      title: 'The mix-up to avoid',
      bullets: [
        `Students often describe the result of ${title} as if it were the process.`,
        'They also swap this idea with a nearby idea that looks similar.',
        'The correction is to name the step that actually does the work.',
      ],
      speakerNotes: 'Show the wrong explanation kindly, then repair it with the model from the earlier slide.',
      imagePrompt: '',
    },
    {
      title: 'Try a new case',
      subtitle: 'Same model, different example',
      bullets: [
        'Give a short case students have not seen.',
        'They must use the model, not copy the worked example.',
        files.length ? `Stay consistent with ${files[0]}.` : 'Keep the case inside what this lesson actually taught.',
      ],
      question: `How would you use ${title} to explain this new case to a classmate?`,
      speakerNotes: 'Circulate and look for students who restate the title without using the mechanism.',
      imagePrompt: '',
    },
    {
      title: 'Put the pieces in order',
      bullets: [
        'List the steps in the order they happen.',
        'Mark the step that is easiest to skip.',
        'Say what evidence would show the step occurred.',
      ],
      speakerNotes: 'Use this as a quick sort. Students can number the steps on paper before you show an order.',
      imagePrompt: '',
    },
    {
      title: 'Why it matters outside this class',
      bullets: [
        `Name one decision or observation that depends on ${title}.`,
        'Say who uses this idea in real work or daily life.',
        evidence ? `Connect it back to the source: ${clip(evidence, 140)}` : 'Keep the transfer concrete for this grade.',
      ],
      speakerNotes: 'Ask for a local example before offering your own.',
      imagePrompt: '',
    },
    {
      title: 'Argue from the model',
      bullets: [
        'Claim: one sentence a student could defend.',
        'Evidence: a step, example, or detail from the lesson.',
        'Reasoning: why that evidence supports the claim.',
      ],
      question: `What is the strongest evidence that ${title} explains the opening phenomenon?`,
      speakerNotes: 'Require the because. A correct word without a reason is not finished.',
      imagePrompt: '',
    },
    {
      title: 'What a strong answer includes',
      bullets: [
        'The correct term.',
        'The mechanism, not only the outcome.',
        'One specific example.',
      ],
      speakerNotes: 'Show an almost-right answer and ask the class what is missing.',
      imagePrompt: '',
    },
    {
      title: 'Discuss with a partner',
      bullets: [
        'Partner A explains the model.',
        'Partner B asks one challenge question.',
        'Switch, and improve one sentence.',
      ],
      speakerNotes: 'Give 90 seconds. Then take one improved sentence from the room.',
      imagePrompt: '',
    },
    {
      title: 'Before you leave',
      subtitle: 'Show what you can do now',
      bullets: [
        `Explain ${title} without reading the slide.`,
        'Answer the driving question from the first slide.',
        'Name the mix-up you will watch for next time.',
      ],
      question: `In two or three sentences, how would you teach ${title} to someone who missed class?`,
      speakerNotes: 'Collect the exit ticket. The next lesson should reopen whatever most students skipped.',
      imagePrompt: '',
    },
  ];

  const selected = slides.slice(0, count);
  const questionCount = selected.filter((slide) => slide.question).length;
  if (questionCount < 3) {
    const extras = slides.filter((slide) => slide.question && !selected.includes(slide));
    for (const extra of extras) {
      if (selected.filter((slide) => slide.question).length >= 3) break;
      if (selected.length < count) selected.push(extra);
    }
  }

  return {
    title,
    gradeLevel: grade,
    objective: `Students can explain ${title} and use it on a new example.${criteria ? ` Teacher note: ${clip(criteria, 240)}` : ''}`,
    slides: assignSlideLayouts(selected.slice(0, count)),
  };
}

/** Applies a follow-up when the model returns the same deck unchanged. */
export function revisePresentation(deck: PresentationResponse, instruction: string): PresentationResponse {
  const ask = clip(instruction, 180);
  const added: PresentationSlide = {
    title: clip(ask.replace(/^(please\s+)?(add|insert|include|create)\s+(a\s+)?(new\s+)?(slide\s+)?(about|on|for)?\s*/i, ''), 72) || 'Follow-up',
    subtitle: 'Added from the conversation',
    bullets: [
      ask,
      `Connect this to ${deck.title}.`,
      'Ask students what they would change in an earlier answer.',
    ],
    question: `What new idea does this add to ${deck.title}?`,
    speakerNotes: `The teacher asked: ${ask}. Teach this as its own slide, then return to the driving question.`,
    imagePrompt: '',
  };
  return {
    ...deck,
    slides: assignSlideLayouts([...deck.slides, added].slice(0, 20)),
  };
}
