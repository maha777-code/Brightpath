import type { VisualArchetype, VisualContentDomain } from '@brightpath/shared';
import type { TopicContextPacket } from './types.js';

const DSML_RE =
  /\b(dsml|data science|machine learning|regression|galton|least[\s-]?squares|design matrix|squared[\s-]?error|sigma\^?2|σ\^?2|g\*\s*\(|beta_0|β|scatter|estimator|predictor|supervised learning|ordinary least|ols|residual|variance|covariance|correlation|feature vector|training set)\b/i;

const CHEM_RE =
  /\b(beaker|flask|molecule|evaporation|solute|solvent|nacl|h2o|chemistry|melting point|boiling point|lattice|diffusion|matter in our surroundings)\b/i;

const MATH_RE =
  /\b(theorem|matrix|vector space|eigen|determinant|equation|proof|algebra|calculus|linear algebra|inner product|norm|gradient|partial derivative|latex)\b/i;

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
  if (CHEM_RE.test(blob) && !DSML_RE.test(blob)) return 'chemistry';
  if (MATH_RE.test(blob) || /\bmath/.test(ctx.subject.toLowerCase())) return 'math';
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
  return ['math_overlay', 'split_comparison', 'concept_card', 'matrix_board', 'math_overlay', 'concept_card'];
}

export function isLabVisualDomain(domain: VisualContentDomain | string | undefined): boolean {
  const d = String(domain ?? '').toLowerCase();
  return d === 'chemistry' || d === 'lab';
}
