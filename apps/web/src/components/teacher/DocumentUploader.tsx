import { useEffect, useRef, useState } from 'react';
import { FileUp, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';
import type { TeacherChapter, Textbook } from '@brightpath/shared';
import { getPlanLimits, maxPdfBytes } from '@brightpath/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface DocumentUploaderProps {
  textbook: Textbook | null;
  onUploaded: (t: Textbook) => void;
  onVerified: (payload: { textbook: Textbook; chapters?: TeacherChapter[] }) => void | Promise<void>;
}

function titleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.pdf$/i, '').replace(/^\d+-/, '').trim();
  if (!base) return '';
  if (/^dsml$/i.test(base)) return 'DSML - Data Science & Machine Learning';
  return base
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function DocumentUploader({ textbook, onUploaded, onVerified }: DocumentUploaderProps) {
  const { planType } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState<'upload' | 'verify' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');

  useEffect(() => {
    if (textbook?.title) setTitle(textbook.title);
  }, [textbook?.id, textbook?.title]);

  const limits = getPlanLimits(planType ?? 'teacher_free');
  const maxBytes = maxPdfBytes(planType ?? 'teacher_free');
  const maxMb = limits.pdfUploadMb;
  const maxCountLabel = limits.pdfUploadCount === null ? 'Unlimited' : String(limits.pdfUploadCount);

  const uploadFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setError('Please upload a PDF textbook.');
      return;
    }
    if (file.size > maxBytes) {
      setError(
        `File size exceeds the ${maxMb} MB limit for your plan. Please select a smaller PDF or upgrade.`,
      );
      return;
    }
    setError(null);
    setBusy('upload');
    const derived =
      title.trim() && !/^ncert science class 9$/i.test(title.trim())
        ? title.trim()
        : titleFromFileName(file.name);
    if (derived) setTitle(derived);
    try {
      const res = await api.uploadTextbook({
        title: derived || file.name.replace(/\.pdf$/i, ''),
        fileName: file.name,
        file,
      });
      setTitle(res.textbook.title);
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
      setTitle(res.textbook.title);
      await onVerified({ textbook: res.textbook, chapters: res.chapters });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="td-card w-full rounded-3xl p-8">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white">Textbook / Curriculum</h2>
          <p className="mt-1 text-base text-cyan-200/80">Upload a state textbook PDF, then verify for RAG indexing.</p>
          <p className="mt-1 text-base font-semibold text-cyan-200/80">
            Plan limit: {maxMb} MB · {maxCountLabel} PDF{limits.pdfUploadCount === 1 ? '' : 's'}
            {limits.pdfUploadCount === 1 ? ' · New upload replaces the current book' : ''}
          </p>
        </div>
        {textbook?.status === 'INDEXED' && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/80 px-4 py-1.5 text-base font-medium text-white shadow-[0_0_14px_rgba(6,182,212,0.35)]">
            <CheckCircle2 className="h-4 w-4" /> Indexed
          </span>
        )}
      </div>

      <label className="mb-4 block text-sm font-semibold uppercase tracking-wider text-[#A5F3FC]">
        Textbook title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Auto-filled from PDF filename (e.g. DSML)"
          className="td-input mt-2 w-full rounded-xl p-4 text-lg font-semibold outline-none"
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
          'flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-8 py-12 transition',
          dragOver
            ? 'border-[#22D3EE] bg-cyan-400/10'
            : 'border-cyan-400/45 bg-slate-950/30 hover:border-[#22D3EE] hover:bg-cyan-400/5',
        ].join(' ')}
      >
        <FileUp className="mb-3 h-10 w-10 text-[#22D3EE]" />
        <p className="text-xl font-bold text-white">Upload State Textbook (PDF)</p>
        <p className="mt-1 text-sm text-[#A5F3FC]">Drag & drop or click · Max {maxMb} MB</p>
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
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-cyan-400/20 bg-slate-950/40 p-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-200/70">Textbook title</p>
            <p className="truncate text-lg font-bold text-white">{textbook.title}</p>
            <p className="text-base text-cyan-200/80">
              {textbook.fileName} · {(textbook.fileSizeBytes / 1024).toFixed(0)} KB · {textbook.status}
            </p>
          </div>
          <button
            type="button"
            disabled={busy === 'verify' || textbook.status === 'VERIFYING'}
            onClick={() => void verify()}
            className="td-btn-cta inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-medium disabled:opacity-60"
          >
            {busy === 'verify' ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
            Verify Document
          </button>
        </div>
      )}

      {busy === 'upload' && (
        <p className="mt-4 flex items-center gap-2 text-base font-semibold text-cyan-200/80">
          <Loader2 className="h-5 w-5 animate-spin" /> Uploading PDF…
        </p>
      )}
      {busy === 'verify' && (
        <p className="mt-4 flex items-center gap-2 text-base font-semibold text-amber-100">
          <Loader2 className="h-5 w-5 animate-spin" /> Extracting chapters &amp; curriculum from new PDF…
        </p>
      )}
      {error && <p className="mt-4 text-base font-semibold text-rose-300">{error}</p>}
    </section>
  );
}
