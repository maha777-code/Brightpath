import { createPortal } from 'react-dom';
import { History, Trash2, X } from 'lucide-react';
import type { WorksheetHistoryItem } from '@brightpath/shared';
import { TOOL_ICON_BUTTON, TOOL_MUTED, TOOL_SECONDARY } from '@/components/tools/toolTheme';

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
    <div className="fixed inset-0 z-[80] flex justify-end bg-black/60 backdrop-blur-md" onClick={onClose}>
      <div
        className="mv-presentation mv-tool-skin flex h-full w-full max-w-md flex-col p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <History className="mv-pres-accent h-5 w-5" />
            <span>Generation History</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`${TOOL_ICON_BUTTON} p-1.5`}
            aria-label="Close generation history"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto py-4">
          {items.length === 0 ? (
            <div className={`${TOOL_MUTED} py-12 text-center text-sm`}>No generated worksheets in history yet.</div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className={`mv-pres-card flex items-center justify-between rounded-xl border p-4 ${
                  item.id === activeId ? 'border-violet-400' : 'border-transparent'
                }`}
              >
                <div className="min-w-0 flex-1 space-y-1 pr-2">
                  <h4 className="line-clamp-1 text-sm font-semibold">{item.title}</h4>
                  <p className={`${TOOL_MUTED} truncate text-xs`}>
                    {item.gradeLevel} • {item.topicOrText.split('\n')[0] || 'Generated Worksheet'}
                  </p>
                  <p className={`${TOOL_MUTED} text-xs`}>{formatWhen(item.createdAt)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onSelect(item)}
                    className={TOOL_SECONDARY}
                    title="Restore this worksheet"
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(item.id)}
                    className={`${TOOL_ICON_BUTTON} p-1.5`}
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
