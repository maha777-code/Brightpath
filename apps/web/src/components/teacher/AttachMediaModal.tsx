import { useRef, useState } from 'react';
import { FileUp, Loader2, Plus, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { TeacherAttachment } from '@brightpath/shared';

const ACCEPT = '.pdf,.png,.jpg,.jpeg,.pptx,application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.presentationml.presentation';

interface AttachMediaModalProps {
  subtopicId: string;
  subtopicLabel: string;
  onClose: () => void;
  onAttached: (attachments: TeacherAttachment[]) => void;
}

function isAllowed(file: File): boolean {
  const name = file.name.toLowerCase();
  return (
    name.endsWith('.pdf') ||
    name.endsWith('.png') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.pptx') ||
    file.type === 'application/pdf' ||
    file.type === 'image/png' ||
    file.type === 'image/jpeg'
  );
}

export default function AttachMediaModal({
  subtopicId,
  subtopicLabel,
  onClose,
  onAttached,
}: AttachMediaModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFiles = (list: FileList | File[]) => {
    const next = [...list].filter(isAllowed);
    if (!next.length) {
      setError('Only PDF, PNG, JPEG, and PPTX files are supported.');
      return;
    }
    setError(null);
    setFiles((prev) => {
      const names = new Set(prev.map((f) => `${f.name}:${f.size}`));
      return [...prev, ...next.filter((f) => !names.has(`${f.name}:${f.size}`))].slice(0, 8);
    });
  };

  const upload = async () => {
    if (!files.length) {
      setError('Drop or choose at least one file.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api.attachSubtopicFiles(subtopicId, files);
      onAttached(res.attachments);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4">
      <div className="w-full max-w-lg rounded-3xl border border-cyan-400/30 bg-[#312E81] p-8 text-white shadow-[0_0_40px_rgba(34,211,238,0.2)]">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-cyan-200">Attach media</p>
            <h3 className="text-xl font-extrabold">{subtopicLabel}</h3>
            <p className="mt-1 text-sm text-cyan-100/80">PDF, PNG, JPEG, or PPTX — indexed into this subtopic’s RAG context.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/20 p-2 hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
          }}
          className={[
            'cursor-pointer rounded-2xl border-2 border-dashed px-5 py-10 text-center transition',
            dragOver ? 'border-cyan-300 bg-cyan-400/10' : 'border-cyan-400/35 bg-slate-950/40',
          ].join(' ')}
          onClick={() => inputRef.current?.click()}
        >
          <FileUp className="mx-auto mb-2 h-8 w-8 text-cyan-200" />
          <p className="font-bold">Drop files here or click to browse</p>
          <p className="mt-1 text-sm text-cyan-200/80">Up to 8 files, 20 MB each</p>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>

        {files.length > 0 && (
          <ul className="mt-4 max-h-40 space-y-2 overflow-y-auto text-sm">
            {files.map((f) => (
              <li
                key={`${f.name}-${f.size}`}
                className="flex items-center justify-between rounded-xl bg-slate-950/50 px-3 py-2"
              >
                <span className="truncate pr-3">{f.name}</span>
                <button
                  type="button"
                  className="text-cyan-200 hover:text-white"
                  onClick={() => setFiles((prev) => prev.filter((x) => x !== f))}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && <p className="mt-3 text-sm font-semibold text-rose-200">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/20 px-5 py-2.5 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void upload()}
            disabled={busy || files.length === 0}
            className="td-btn-cta inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {busy ? 'Indexing…' : 'Upload & index'}
          </button>
        </div>
      </div>
    </div>
  );
}
