import { useRef, useState } from 'react';
import { ChevronDown, FilePlus, FileText } from 'lucide-react';

const MENU_STYLE = {
  backgroundColor: '#0f172a',
  color: '#f8fafc',
  WebkitTextFillColor: '#f8fafc',
} as const;

const ITEM_STYLE = {
  backgroundColor: 'rgba(30, 41, 59, 0.85)',
  color: '#f8fafc',
  WebkitTextFillColor: '#f8fafc',
} as const;

export function AddFileMenu({
  onFiles,
  multiple = true,
  accept = '.pdf,.doc,.docx,.txt,.md,application/pdf',
}: {
  onFiles: (files: FileList | null) => void;
  multiple?: boolean;
  accept?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        className="inline-flex cursor-pointer appearance-none items-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-1.5 text-xs font-bold text-slate-100 transition-all hover:bg-slate-800 hover:text-white"
        style={{ color: '#f1f5f9', WebkitTextFillColor: '#f1f5f9' }}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <FilePlus className="h-3.5 w-3.5 text-cyan-400" />
        <span>+ Add File</span>
        <ChevronDown className="h-3 w-3" />
      </button>
      {open ? (
        <div
          role="menu"
          className="add-file-menu absolute bottom-full left-0 z-50 mb-2 w-56 rounded-xl border border-slate-700/80 bg-slate-900 p-1.5 shadow-2xl backdrop-blur-xl"
          style={MENU_STYLE}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              fileRef.current?.click();
            }}
            className="add-file-menu-item group flex w-full cursor-pointer appearance-none items-center gap-2.5 rounded-lg border border-slate-700/50 bg-slate-800/60 px-3 py-2.5 text-left text-xs font-semibold text-slate-100 transition-all hover:border-cyan-500/40 hover:bg-cyan-500/20 hover:text-white"
            style={ITEM_STYLE}
          >
            <FileText className="h-4 w-4 text-cyan-400 transition-transform group-hover:scale-110" />
            <span className="font-medium text-slate-100">Upload PDF or document</span>
          </button>
        </div>
      ) : null}
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(event) => {
          onFiles(event.target.files);
          event.currentTarget.value = '';
        }}
      />
    </div>
  );
}
