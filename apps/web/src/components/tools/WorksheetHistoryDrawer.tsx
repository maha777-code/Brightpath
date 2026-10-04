import { createPortal } from 'react-dom';
import { History, Trash2, X } from 'lucide-react';
import type { WorksheetHistoryItem } from '@brightpath/shared';

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Saved version';
  return date.toLocaleString();
}

export function WorksheetHistoryDrawer({
  open,
  onClose,
  items,
  activeId,
  onSelect,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  items: WorksheetHistoryItem[];
  activeId?: string;
  onSelect: (item: WorksheetHistoryItem) => void;
  onDelete: (id: string) => void;
}) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex justify-end bg-slate-950/80 backdrop-blur-md" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-md flex-col border-l border-slate-800 bg-slate-900 p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 text-lg font-bold text-cyan-400">
            <History className="h-5 w-5" />
            <span>Generation History</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer appearance-none rounded-lg border-0 bg-transparent p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            aria-label="Close generation history"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto py-4">
          {items.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">No generated worksheets in history yet.</div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className={`group flex items-center justify-between rounded-xl border bg-slate-950/60 p-4 transition-all hover:border-cyan-500/40 ${
                  item.id === activeId ? 'border-cyan-500/50' : 'border-slate-800'
                }`}
              >
                <div className="min-w-0 flex-1 space-y-1 pr-2">
                  <h4 className="line-clamp-1 text-sm font-bold text-slate-200 group-hover:text-cyan-400">{item.title}</h4>
                  <p className="truncate text-xs text-slate-500">
                    {item.gradeLevel} • {item.topicOrText.split('\n')[0] || 'Generated Worksheet'}
                  </p>
                  <p className="text-[10px] text-slate-600">{formatWhen(item.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSelect(item)}
                    className="cursor-pointer appearance-none rounded-lg border-0 bg-cyan-500/10 px-2 py-2 text-xs font-semibold text-cyan-400 transition-all hover:bg-cyan-500 hover:text-slate-950"
                    title="Restore this worksheet"
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    className="cursor-pointer appearance-none rounded-lg border-0 bg-transparent p-1.5 text-slate-500 transition-colors hover:text-rose-400"
                    title="Delete from history"
                    aria-label={`Delete ${item.title} from history`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
