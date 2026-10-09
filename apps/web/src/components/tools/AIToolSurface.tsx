import type { ReactNode } from 'react';
import { Maximize2, Minimize2, Sparkles, X } from 'lucide-react';
import { ToolBreadcrumb } from '@/components/tools/ToolBreadcrumb';

export function AIToolSurface({
  title,
  description,
  expanded = false,
  onToggleExpand,
  onClose,
  children,
  contentClassName = '',
}: {
  title: string;
  description?: string;
  expanded?: boolean;
  onToggleExpand?: () => void;
  onClose: () => void;
  children: ReactNode;
  contentClassName?: string;
}) {
  return (
    <div
      className={`relative flex min-h-0 w-full flex-1 flex-col overflow-hidden border border-cyan-500/30 bg-slate-900/90 shadow-[0_0_50px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/20 backdrop-blur-2xl transition-all duration-300 ${
        expanded ? 'h-full max-h-none max-w-none rounded-none' : 'h-full rounded-3xl'
      }`}
    >
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-blue-600/10 blur-3xl" />

      <div className="relative z-10 flex shrink-0 flex-col gap-3 border-b border-slate-800/90 bg-slate-900/60 px-6 py-4">
        <ToolBreadcrumb toolName={title} />
        <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-2 text-cyan-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 id="ai-tool-wizard-title" className="truncate text-xl font-bold tracking-tight text-white">
              {title}
            </h2>
            {description ? <p className="truncate text-xs text-slate-400">{description}</p> : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onToggleExpand ? (
            <button
              type="button"
              onClick={onToggleExpand}
              className="inline-flex h-10 w-10 cursor-pointer appearance-none items-center justify-center rounded-full border border-cyan-400/40 bg-slate-950/70 text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.2)] transition-all hover:-translate-y-0.5 hover:border-cyan-300 hover:text-white hover:shadow-[0_0_18px_rgba(34,211,238,0.4)]"
              title={expanded ? 'Collapse to modal' : 'Expand to full screen'}
              aria-label={expanded ? 'Collapse view' : 'Expand view'}
            >
              {expanded ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 cursor-pointer appearance-none items-center justify-center rounded-full border border-slate-500/80 bg-slate-950/70 text-slate-100 shadow-sm transition-all hover:-translate-y-0.5 hover:border-rose-300/70 hover:text-rose-100 hover:shadow-[0_0_16px_rgba(251,113,133,0.3)]"
            title="Close tool"
            aria-label="Close tool modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        </div>
      </div>

      <div className="relative z-10 min-h-0 flex-1 overflow-y-auto p-4 md:p-6">
        <div
          className={`min-h-full rounded-2xl border border-slate-800/80 bg-slate-950/60 shadow-inner ${contentClassName}`}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
