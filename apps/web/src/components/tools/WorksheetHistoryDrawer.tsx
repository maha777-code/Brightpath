import { useEffect, useMemo, useState } from 'react';
import { History, Loader2, X } from 'lucide-react';
import type { WorksheetHistoryItem } from '@brightpath/shared';
import { api } from '@/lib/api';

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Saved version';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function WorksheetHistoryDrawer({
  open,
  onClose,
  topic,
  fallbackItems = [],
  activeId,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  topic?: string;
  fallbackItems?: WorksheetHistoryItem[];
  activeId?: string;
  onSelect: (item: WorksheetHistoryItem) => void;
}) {
  const [items, setItems] = useState<WorksheetHistoryItem[]>(fallbackItems);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void api
      .worksheetHistory(topic)
      .then((res) => {
        if (!cancelled) setItems(res.items);
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setError(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, topic]);

  const list = useMemo(() => {
    const seen = new Set<string>();
    return [...items, ...fallbackItems].filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [items, fallbackItems]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/40"
        aria-label="Close version history"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2 text-slate-800">
            <History className="h-4 w-4 text-violet-600" />
            <h2 className="text-sm font-semibold">Version history</h2>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading versions…
            </div>
          ) : list.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-slate-500">
              {error ?? 'Generate a worksheet to start a version history.'}
            </p>
          ) : (
            <ul className="space-y-2">
              {list.map((item) => {
                const active = item.id === activeId;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={[
                        'w-full rounded-xl border px-3 py-3 text-left transition-colors',
                        active
                          ? 'border-violet-300 bg-violet-50'
                          : 'border-slate-200 bg-white hover:border-violet-200 hover:bg-slate-50',
                      ].join(' ')}
                      onClick={() => {
                        onSelect(item);
                        onClose();
                      }}
                    >
                      <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{item.topicOrText}</p>
                      <p className="mt-1 text-xs font-medium text-violet-700">
                        {item.gradeLevel} · {formatWhen(item.createdAt)}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
