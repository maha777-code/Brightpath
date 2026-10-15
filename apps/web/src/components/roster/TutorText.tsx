import { Fragment, type ReactNode } from 'react';

type ListBlock = { ordered: boolean; items: string[] };

const SUB = '₀₁₂₃₄₅₆₇₈₉';
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const digits = (value: string, map: string) => value.replace(/\d/g, (d) => map[Number(d)]);

function plainMath(expr: string) {
  return expr
    .replace(/_\{?(\d+)\}?/g, (_m, d: string) => digits(d, SUB))
    .replace(/\^\{?(\d+)\}?/g, (_m, d: string) => digits(d, SUP))
    .replace(/\\(times|cdot)/g, (_m, op: string) => (op === 'times' ? '×' : '·'))
    .replace(/\\rightarrow|\\to/g, '→');
}

function inline(text: string): ReactNode[] {
  const cleaned = text.replace(/\$([^$\n]+)\$/g, (_m, expr: string) => plainMath(expr));
  return cleaned.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      <strong key={i} className="font-bold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

/** Renders the small Markdown subset Sharada uses: paragraphs, bullet or numbered lists, and bold. */
export function TutorText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const open: { list: ListBlock | null } = { list: null };

  const flush = () => {
    const list = open.list;
    if (!list) return;
    const Tag = list.ordered ? 'ol' : 'ul';
    blocks.push(
      <Tag key={blocks.length} className={`my-1 space-y-1 pl-5 ${list.ordered ? 'list-decimal' : 'list-disc'}`}>
        {list.items.map((item, i) => (
          <li key={i}>{inline(item)}</li>
        ))}
      </Tag>,
    );
    open.list = null;
  };

  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const item = /^[*-]\s+(.*)$/.exec(line) ?? /^\d+[.)]\s+(.*)$/.exec(line);
    if (item) {
      const ordered = /^\d/.test(line);
      if (open.list && open.list.ordered !== ordered) flush();
      open.list ??= { ordered, items: [] };
      open.list.items.push(item[1]);
      continue;
    }
    flush();
    if (line) blocks.push(<p key={blocks.length}>{inline(line.replace(/^#+\s*/, ''))}</p>);
  }
  flush();

  return <div className="space-y-2">{blocks}</div>;
}
