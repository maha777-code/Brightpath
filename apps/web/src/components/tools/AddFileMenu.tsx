import { useRef, useState } from 'react';
import { ChevronDown, FilePlus, FileText } from 'lucide-react';

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
        className="mv-pres-field inline-flex cursor-pointer appearance-none items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <FilePlus className="h-3.5 w-3.5" />
        <span>Add File</span>
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open ? (
        <div
          role="menu"
          className="add-file-menu mv-pres-card absolute bottom-full left-0 z-50 mb-2 w-56 rounded-xl border p-1.5 shadow-2xl"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              fileRef.current?.click();
            }}
            className="add-file-menu-item mv-pres-field flex w-full cursor-pointer appearance-none items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-semibold"
          >
            <FileText className="mv-pres-accent h-4 w-4" />
            <span>Upload PDF or document</span>
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
