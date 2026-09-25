import { Fragment, useState, type ReactNode } from 'react';
import { ArrowDownToLine, Copy, Check } from 'lucide-react';

function renderInline(text: string): ReactNode[] {
  const tokens = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);
  return tokens.map((token, index) => {
    if (!token) return null;
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      return (
        <strong key={index} className="mr-1.5 font-bold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    }
    if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
      return (
        <code key={index} className="rounded bg-[#282a2c] px-2 py-0.5 font-mono text-sm text-cyan-300">
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
  if (level === 1) return 'mb-3 mt-6 text-xl font-bold text-white sm:text-2xl';
  if (level === 2) return 'mb-3 mt-6 text-xl font-bold text-white sm:text-2xl';
  return 'mb-3 mt-6 text-xl font-bold text-white';
}

function CodeBlock({ lang, code }: { lang: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const label = lang.trim() || 'Plaintext';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const download = () => {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sharada-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'plaintext'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-[#1e1f20] shadow-md">
      <div className="flex items-center justify-between rounded-t-2xl border-b border-slate-700/60 bg-[#1e1f20] px-4 py-2.5 font-mono text-xs text-slate-300">
        <span>{label}</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex cursor-pointer appearance-none items-center border-0 bg-transparent p-0 text-slate-300 hover:text-white"
            aria-label="Download code"
            title="Download"
            onClick={download}
          >
            <ArrowDownToLine className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="inline-flex cursor-pointer appearance-none items-center border-0 bg-transparent p-0 text-slate-300 hover:text-white"
            aria-label="Copy code"
            title={copied ? 'Copied' : 'Copy code'}
            onClick={() => void copy()}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <pre className="overflow-x-auto rounded-b-2xl border border-slate-800/80 bg-[#1e1f20] p-4 font-mono text-sm leading-relaxed text-slate-200 sm:text-base">
        <code>{code}</code>
      </pre>
    </div>
  );
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

    if (line.trim().startsWith('```')) {
      const lang = line.trim().slice(3).trim() || 'Plaintext';
      const start = i;
      const buffer: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] ?? '').trim().startsWith('```')) {
        buffer.push(lines[i] ?? '');
        i += 1;
      }
      if (i < lines.length) i += 1;
      nodes.push(<CodeBlock key={`code-${start}`} lang={lang} code={buffer.join('\n')} />);
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
      if (ordered) {
        nodes.push(
          <ol key={`list-${start}`} className="space-y-3 pl-1 text-base leading-[1.7] text-slate-200 sm:text-lg">
            {items.map((item, idx) => (
              <li key={`${start}-${idx}`} className="flex items-start gap-3">
                <span className="font-bold text-slate-100">{idx + 1}.</span>
                <span className="font-normal text-slate-200">{item}</span>
              </li>
            ))}
          </ol>,
        );
      } else {
        nodes.push(
          <ul key={`list-${start}`} className="list-disc space-y-2.5 pl-6 text-slate-200 marker:text-slate-400">
            {items.map((item, idx) => (
              <li key={`${start}-${idx}`} className="leading-[1.7]">
                {item}
              </li>
            ))}
          </ul>,
        );
      }
      continue;
    }

    const para: string[] = [line];
    i += 1;
    while (i < lines.length) {
      const next = lines[i] ?? '';
      if (!next.trim() || next.trim().startsWith('```') || next.startsWith('#') || isListLine(next) || /^---+$/.test(next.trim())) break;
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
            : 'text-base font-normal leading-[1.7] tracking-wide text-slate-200 sm:text-[17px]'
        }
      >
        {renderInline(joined)}
      </p>,
    );
  }

  return (
    <div className="max-w-none space-y-4 text-base font-normal leading-[1.7] tracking-wide text-slate-200 sm:text-[17px]">
      {nodes}
    </div>
  );
}

export default MarkdownContent;
