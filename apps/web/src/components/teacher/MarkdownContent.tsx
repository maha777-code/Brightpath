import { Fragment, type ReactNode } from 'react';

function renderInline(text: string): ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return tokens.map((token, index) => {
    if (!token) return null;
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      return (
        <strong key={index} className="font-semibold text-slate-50">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
      return (
        <code key={index} className="rounded bg-slate-800 px-1 py-0.5 text-[0.95em] text-amber-200">
          {token.slice(1, -1)}
        </code>
      );
    }
    const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (link) {
      return (
        <a
          key={index}
          href={link[2]}
          className="text-purple-300 underline decoration-purple-500/50"
          target="_blank"
          rel="noreferrer"
        >
          {link[1]}
        </a>
      );
    }
    return <Fragment key={index}>{token}</Fragment>;
  });
}

function headingClass(level: number): string {
  if (level === 1) return 'text-2xl font-bold text-slate-50';
  if (level === 2) return 'mt-6 text-xl font-semibold text-slate-100';
  return 'mt-4 text-lg font-semibold text-slate-200';
}

function isListLine(line: string): boolean {
  return /^\s*([-*]|\d+[.)])\s+/.test(line);
}

function listItemBody(line: string): string {
  return line.replace(/^\s*([-*]|\d+[.)])\s+/, '');
}

export function MarkdownContent({ markdown }: { markdown: string }) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const nodes: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? '';
    if (!line.trim()) {
      i += 1;
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      nodes.push(<hr key={`hr-${i}`} className="my-4 border-b border-slate-800" />);
      i += 1;
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.*)$/);
    if (heading) {
      const Tag = (`h${heading[1].length}` as unknown) as 'h1' | 'h2' | 'h3';
      nodes.push(
        <Tag key={`h-${i}`} className={headingClass(heading[1].length)}>
          {renderInline(heading[2])}
        </Tag>,
      );
      i += 1;
      continue;
    }

    if (isListLine(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: ReactNode[][] = [];
      const start = i;
      while (i < lines.length) {
        const current = lines[i] ?? '';
        if (!current.trim()) break;
        if (isListLine(current)) {
          items.push([renderInline(listItemBody(current))]);
          i += 1;
          while (i < lines.length) {
            const nested = lines[i] ?? '';
            if (!nested.trim()) break;
            if (isListLine(nested) && !/^\s{2,}/.test(nested)) break;
            items[items.length - 1]?.push(
              <div key={`n-${i}`} className="mt-1 text-slate-200">
                {renderInline(nested.trim())}
              </div>,
            );
            i += 1;
          }
          continue;
        }
        break;
      }
      const ListTag = ordered ? 'ol' : 'ul';
      nodes.push(
        <ListTag
          key={`list-${start}`}
          className={
            ordered
              ? 'list-decimal space-y-2 pl-6 text-slate-100'
              : 'list-disc space-y-2 pl-6 text-slate-100'
          }
        >
          {items.map((item, idx) => (
            <li key={`${start}-${idx}`} className="leading-relaxed">
              {item}
            </li>
          ))}
        </ListTag>,
      );
      continue;
    }

    const para: string[] = [line];
    i += 1;
    while (i < lines.length) {
      const next = lines[i] ?? '';
      if (!next.trim() || next.startsWith('#') || isListLine(next) || /^---+$/.test(next.trim())) break;
      para.push(next);
      i += 1;
    }
    const joined = para.join(' ');
    const wordBank = /word bank/i.test(joined);
    nodes.push(
      <p
        key={`p-${i}-${joined.slice(0, 12)}`}
        className={
          wordBank
            ? 'rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 leading-relaxed text-slate-100'
            : 'leading-relaxed text-slate-100'
        }
      >
        {renderInline(joined)}
      </p>,
    );
  }

  return (
    <div className="prose prose-invert max-w-none space-y-4 text-slate-100 leading-relaxed">
      {nodes}
    </div>
  );
}

export default MarkdownContent;
