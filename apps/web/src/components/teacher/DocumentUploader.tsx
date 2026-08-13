import { useRef, useState } from 'react';
import { FileUp, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';
import type { Textbook } from '@brightpath/shared';
import { api } from '@/lib/api';

interface DocumentUploaderProps {
  textbook: Textbook | null;
  onUploaded: (t: Textbook) => void;
  onVerified: (t: Textbook) => void;
}

const ACCENT = '#5B46BA';

export function DocumentUploader({ textbook, onUploaded, onVerified }: DocumentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState<'upload' | 'verify' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('NCERT Science Class 9');

  const readFile = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const comma = result.indexOf(',');
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = () => reject(new Error('Failed to read PDF'));
      reader.readAsDataURL(file);
    });

  const uploadFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF textbook.');
      return;
    }
    setError(null);
    setBusy('upload');
    try {
      const fileBase64 = await readFile(file);
      const res = await api.uploadTextbook({
        title: title.trim() || file.name.replace(/\.pdf$/i, ''),
        fileName: file.name,
        fileBase64,
        subject: 'Science',
        gradeLabel: 'Class 9',
      });
      onUploaded(res.textbook);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(null);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  };

  const verify = async () => {
    if (!textbook) return;
    setBusy('verify');
    setError(null);
    try {
      const res = await api.verifyTextbook(textbook.id);
      onVerified(res.textbook);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-soft sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-800">Textbook / Curriculum</h2>
          <p className="text-sm text-slate-500">Upload a state textbook PDF, then verify for RAG indexing.</p>
        </div>
        {textbook?.status === 'INDEXED' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
            <CheckCircle2 className="h-3.5 w-3.5" /> Indexed
          </span>
        )}
      </div>

      <label className="mb-3 block text-xs font-bold uppercase tracking-wide text-slate-400">
        Textbook title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        />
      </label>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={[
          'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-10 transition',
          dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50',
        ].join(' ')}
      >
        <FileUp className="mb-2 h-8 w-8" style={{ color: ACCENT }} />
        <p className="text-sm font-bold text-slate-700">Upload State Textbook (PDF)</p>
        <p className="mt-1 text-xs text-slate-500">Drag & drop or click to browse</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadFile(file);
            e.target.value = '';
          }}
        />
      </div>

      {textbook && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-800">{textbook.title}</p>
            <p className="text-xs text-slate-500">
              {textbook.fileName} · {(textbook.fileSizeBytes / 1024).toFixed(0)} KB · {textbook.status}
            </p>
          </div>
          <button
            type="button"
            disabled={busy === 'verify' || textbook.status === 'VERIFYING'}
            onClick={() => void verify()}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-md disabled:opacity-60"
            style={{ background: ACCENT }}
          >
            {busy === 'verify' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Verify Document
          </button>
        </div>
      )}

      {busy === 'upload' && (
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-indigo-700">
          <Loader2 className="h-4 w-4 animate-spin" /> Uploading PDF…
        </p>
      )}
      {error && <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p>}
    </section>
  );
}
