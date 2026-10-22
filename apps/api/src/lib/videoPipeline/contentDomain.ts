import type { VisualArchetype, VisualContentDomain } from '@brightpath/shared';
import type { TopicContextPacket } from './types.js';

const DSML_RE =
  /\b(dsml|data science|machine learning|regression|galton|least[\s-]?squares|design matrix|squared[\s-]?error|sigma\^?2|σ\^?2|g\*\s*\(|beta_0|β|scatter|estimator|predictor|supervised learning|ordinary least|ols|residual|variance|covariance|correlation|feature vector|training set)\b/i;

const CHEM_RE =
  /\b(beaker|flask|molecule|evaporation|solute|solvent|nacl|h2o|chemistry|chemical|acid|base|salt|reaction|compound|atom|ion|periodic|melting point|boiling point|lattice|diffusion|states? of matter|valency|oxidation)\b/i;

const BIO_RE =
  /\b(biology|cell|photosynthesis|respiration|mitosis|meiosis|tissue|organ|organism|chloroplast|nucleus|enzyme|dna|rna|gene|plant|animal|digestion|blood|neuron|ecosystem|habitat|nutrition|stomata|xylem|phloem)\b/i;

const PHYS_RE =
  /\b(physics|force|newton|velocity|acceleration|momentum|gravity|friction|current|voltage|resistance|ohm|magnet|lens|refraction|reflection|wave|frequency|energy|work done|joule|watt|motion|inertia|pressure|density)\b/i;

const MATH_RE =
  /\b(theorem|matrix|vector space|eigen|determinant|equation|proof|algebra|calculus|linear algebra|inner product|norm|gradient|partial derivative|latex|fraction|integer|polynomial|geometry|triangle|angle|probability)\b/i;

function subjectHint(subject: string): VisualContentDomain | undefined {
  const s = subject.toLowerCase();
  if (/\bphys/.test(s)) return 'physics';
  if (/\bchem/.test(s)) return 'chemistry';
  if (/\bbio/.test(s)) return 'biology';
  if (/\bmath|geometry|algebra/.test(s)) return 'math';
  return undefined;
}

export function detectContentDomain(ctx: TopicContextPacket): VisualContentDomain {
  const blob = [
    ctx.textbookTitle,
    ctx.subject,
    ctx.title,
    ctx.chapterTitle,
    ctx.chapterSummary,
    ...(ctx.ragExcerpts ?? []).slice(0, 10),
  ]
    .join(' ')
    .toLowerCase();

  const titleBlob = `${ctx.textbookTitle} ${ctx.subject} ${ctx.fileName ?? ''}`.toLowerCase();
  if (DSML_RE.test(blob) || /\bdsml\b/.test(titleBlob) || /data\s*sci/.test(titleBlob)) {
    return 'dsml';
  }

  const fromSubject = subjectHint(ctx.subject);
  if (fromSubject) return fromSubject;

  const scores: Array<[VisualContentDomain, number]> = [
    ['biology', BIO_RE.test(blob) ? 2 : 0],
    ['physics', PHYS_RE.test(blob) ? 2 : 0],
    ['chemistry', CHEM_RE.test(blob) && !DSML_RE.test(blob) ? 2 : 0],
    ['math', MATH_RE.test(blob) || /\bmath/.test(ctx.subject.toLowerCase()) ? 2 : 0],
  ];
  scores.sort((a, b) => b[1] - a[1]);
  if (scores[0][1] > 0) return scores[0][0];
  return 'generic';
}

/** Pull exact formulas / named studies from RAG so scripts can quote them. */
export function extractFormulasFromContext(ctx: TopicContextPacket): string[] {
  const blob = [ctx.chapterSummary, ...(ctx.ragExcerpts ?? [])].join('\n');
  const found: string[] = [];
  const push = (s: string) => {
    const t = s.replace(/\s+/g, ' ').trim();
    if (t.length >= 4 && t.length <= 160 && !found.includes(t)) found.push(t);
  };

  for (const m of blob.matchAll(/\$[^$\n]{3,100}\$/g)) push(m[0]);
  for (const m of blob.matchAll(/g\s*\*\s*\([^)]{1,24}\)\s*=\s*[^\n.]{3,80}/gi)) push(m[0]);
  for (const m of blob.matchAll(/E\s*\[\s*Y[^\]]{0,40}\]/gi)) push(m[0]);
  for (const m of blob.matchAll(/Y\s*=\s*X\s*[βßb][^\n.]{0,48}/gi)) push(m[0]);
  for (const m of blob.matchAll(/y\s*=\s*β_?0\s*\+\s*β_?1[^\n.]{0,40}/gi)) push(m[0]);
  for (const m of blob.matchAll(/Galton[^\n.]{8,120}/gi)) push(m[0]);
  for (const m of blob.matchAll(/squared[\s-]?error[^\n.]{0,80}/gi)) push(m[0]);
  for (const m of blob.matchAll(/[A-Za-z][A-Za-z0-9_]*\s*=\s*[^\n.]{3,60}/g)) {
    if (/[=]/.test(m[0]) && m[0].length < 80) push(m[0]);
  }

  return found.slice(0, 8);
}

export function defaultArchetypesForDomain(domain: VisualContentDomain): VisualArchetype[] {
  if (domain === 'dsml') {
    return ['math_overlay', 'scatter_plot', 'regression_fit', 'matrix_board', 'concept_card', 'split_comparison'];
  }
  if (domain === 'math') {
    return ['math_overlay', 'matrix_board', 'split_comparison', 'concept_card', 'math_overlay', 'concept_card'];
  }
  if (domain === 'chemistry') {
    return ['split_comparison', 'interactive_stage', 'micro_zoom', 'concept_card', 'interactive_stage', 'concept_card'];
  }
  return ['concept_card', 'split_comparison', 'math_overlay', 'concept_card', 'split_comparison', 'concept_card'];
}

export function isLabVisualDomain(domain: VisualContentDomain | string | undefined): boolean {
  const d = String(domain ?? '').toLowerCase();
  return d === 'chemistry' || d === 'lab';
}
