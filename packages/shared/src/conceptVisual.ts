import type {
  ConceptMotion,
  ConceptSolid,
  ConceptView,
  ConceptVisual,
  ConceptVisualKind,
  LessonSlide,
  VisualContentDomain,
} from './teacher.js';

const SOLID_RULES: Array<[RegExp, ConceptSolid]> = [
  [/\bcuboids?\b|\brectangular\s+prisms?\b/i, 'cuboid'],
  [/\bcubes?\b|\bhexahedrons?\b/i, 'cube'],
  [/\bcylinders?\b/i, 'cylinder'],
  [/\bcones?\b/i, 'cone'],
  [/\bhemispheres?\b/i, 'hemisphere'],
  [/\bspheres?\b/i, 'sphere'],
  [/\bpyramids?\b/i, 'pyramid'],
  [/\bprisms?\b/i, 'prism'],
];

const GEOMETRY_RE =
  /\b(solid shapes?|visualis(?:e|ing)|visualiz(?:e|ing)|orthographic|front view|side view|top view|nets? of|faces? and edges?)\b/i;
const VIEW_RE = /\b(orthographic|front view|side view|top view|plan view)\b/i;
const NET_RE = /\b(nets? of|unfold(?:ed|ing)?|laid flat)\b/i;
const CYCLE_RE = /\b(cycle|photosynthesis|respiration|mitosis|meiosis|circulation|feedback)\b/i;
const SEQUENCE_RE = /\b(steps?|stages?|process|then|next|first|procedure|how it)\b/i;
const COMPARE_RE = /\b(vs\.?|versus|unlike|difference|compare|contrast)\b/i;
const SYSTEM_RE =
  /\b(parts?|structure|organelle|organ|cell|atom|molecule|circuit|system|labelled|labeled|anatomy)\b/i;
const FIELD_RE =
  /\b(force|velocity|acceleration|momentum|field|current|voltage|ray|wave|lens|friction|gravity|vector)\b/i;
const TIME_RE = /\b(year|timeline|reign|after the|before the)\b/i;
const FORMULA_RE = /[=≈]|\\frac|\^|π|sqrt|²|³/;
const EXAMPLE_RE = /\b(example|solve|find|worked|exercise)\b/i;

const KIND_ALIASES: Record<string, ConceptVisualKind> = {
  process: 'sequence',
  formula: 'equation',
  parts: 'system',
  scene: 'board',
};

function blobOf(
  slide: Pick<
    LessonSlide,
    'heading' | 'bullets' | 'points' | 'quote' | 'visualPrompt' | 'body' | 'formula' | 'left' | 'right' | 'stat'
  >,
): string {
  return [
    slide.heading,
    slide.body,
    slide.quote,
    slide.visualPrompt,
    slide.formula,
    slide.stat?.label,
    slide.stat?.value,
    ...(slide.bullets ?? []),
    ...(slide.points ?? []),
    ...(slide.left?.points ?? []),
    ...(slide.right?.points ?? []),
    slide.left?.label,
    slide.right?.label,
  ]
    .filter(Boolean)
    .join(' ');
}

export function detectSolid(text: string): ConceptSolid | undefined {
  for (const [re, solid] of SOLID_RULES) {
    if (re.test(text)) return solid;
  }
  return undefined;
}

function uniqueLabels(items: Array<string | undefined>, max: number): string[] {
  const out: string[] = [];
  for (const item of items) {
    const t = String(item || '').replace(/\s+/g, ' ').trim();
    if (!t || out.includes(t)) continue;
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

function normalizeKind(kind: string | undefined): ConceptVisualKind | undefined {
  if (!kind) return undefined;
  return KIND_ALIASES[kind] || (kind as ConceptVisualKind);
}

function kindFromText(
  text: string,
  layout: string | undefined,
  solid: ConceptSolid | undefined,
  domain?: VisualContentDomain,
): ConceptVisualKind {
  if (layout === 'stat') return 'count';
  if (layout === 'two_column' || layout === 'compare') return 'compare';
  if (layout === 'example') return 'example';

  const geometryChapter = Boolean(solid && (GEOMETRY_RE.test(text) || VIEW_RE.test(text) || NET_RE.test(text)));
  if (geometryChapter && NET_RE.test(text)) return 'net';
  if (geometryChapter && VIEW_RE.test(text)) return 'views';
  if (geometryChapter) return solid && SYSTEM_RE.test(text) ? 'system' : 'solid';

  if (CYCLE_RE.test(text)) return 'cycle';
  if (domain === 'physics' && FIELD_RE.test(text)) return 'field';
  if (EXAMPLE_RE.test(text)) return 'example';
  if ((domain === 'math' || domain === 'dsml') && FORMULA_RE.test(text)) return 'equation';
  if (layout === 'diagram' || SEQUENCE_RE.test(text)) return 'sequence';
  if (SYSTEM_RE.test(text)) return 'system';
  if (TIME_RE.test(text)) return 'timeline';
  if (COMPARE_RE.test(text)) return 'compare';
  if (FORMULA_RE.test(text)) return 'equation';
  return 'board';
}

function motionFor(kind: ConceptVisualKind): ConceptMotion {
  if (kind === 'net') return 'unfold';
  if (kind === 'views' || kind === 'solid') return 'rotate';
  if (kind === 'sequence' || kind === 'process' || kind === 'timeline' || kind === 'cycle') return 'build';
  if (kind === 'compare') return 'split';
  if (kind === 'count' || kind === 'field') return 'pulse';
  return 'reveal';
}

export function inferConceptVisual(
  slide: Pick<
    LessonSlide,
    | 'heading'
    | 'bullets'
    | 'points'
    | 'quote'
    | 'visualPrompt'
    | 'body'
    | 'formula'
    | 'left'
    | 'right'
    | 'stat'
    | 'layout'
    | 'visual'
  >,
  topicTitle = '',
  domain?: VisualContentDomain,
): ConceptVisual {
  const resolvedDomain = slide.visual?.domain || domain;
  if (slide.visual?.kind && slide.visual.subject) {
    const kind = normalizeKind(slide.visual.kind) || slide.visual.kind;
    return {
      ...slide.visual,
      kind,
      domain: resolvedDomain,
      objects: slide.visual.objects?.length
        ? slide.visual.objects
        : uniqueLabels(slide.bullets ?? slide.points ?? [], 4),
      labels: slide.visual.labels?.length
        ? slide.visual.labels
        : uniqueLabels(slide.bullets ?? slide.points ?? [], 6),
      motion: slide.visual.motion || motionFor(kind),
      solid: GEOMETRY_RE.test(`${topicTitle} ${blobOf(slide)}`) ? slide.visual.solid : slide.visual.solid,
    };
  }

  const text = `${topicTitle} ${blobOf(slide)}`;
  const geometryChapter = GEOMETRY_RE.test(text);
  const solid = geometryChapter ? detectSolid(text) : undefined;
  const kind = kindFromText(text, slide.layout, solid, resolvedDomain);
  const objects = uniqueLabels(
    [slide.heading, ...(slide.bullets ?? []), ...(slide.points ?? []), slide.left?.label, slide.right?.label],
    5,
  );
  const labels = uniqueLabels(
    [
      ...(slide.bullets ?? []),
      ...(slide.points ?? []),
      ...(slide.left?.points ?? []),
      ...(slide.right?.points ?? []),
      slide.stat?.value,
      slide.formula,
    ],
    6,
  );
  const views: ConceptView[] | undefined = kind === 'views' ? ['front', 'side', 'top'] : undefined;

  return {
    kind,
    subject: slide.heading || topicTitle || 'concept',
    domain: resolvedDomain,
    solid,
    objects,
    labels,
    motion: motionFor(kind),
    views,
  };
}
