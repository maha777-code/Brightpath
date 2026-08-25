import { useRef, useState } from 'react';
import { FileUp, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';
import type { Textbook } from '@brightpath/shared';
import { getPlanLimits, maxPdfBytes } from '@brightpath/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface DocumentUploaderProps {
  textbook: Textbook | null;
  onUploaded: (t: Textbook) => void;
  onVerified: (t: Textbook) => void;
}

export function DocumentUploader({ textbook, onUploaded, onVerified }: DocumentUploaderProps) {
  const { planType } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState<'upload' | 'verify' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('NCERT Science Class 9');

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
    try {
      const res = await api.uploadTextbook({
        title: title.trim() || file.name.replace(/\.pdf$/i, ''),
        fileName: file.name,
        file,
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
    <section className="td-card rounded-3xl p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-white">Textbook / Curriculum</h2>
          <p className="text-sm text-[#A5F3FC]">Upload a state textbook PDF, then verify for RAG indexing.</p>
          <p className="mt-1 text-xs font-semibold text-cyan-200/70">
            Plan limit: {maxMb} MB · {maxCountLabel} PDF{limits.pdfUploadCount === 1 ? '' : 's'}
            {limits.pdfUploadCount === 1 ? ' · Upgrade for unlimited' : ''}
          </p>
        </div>
        {textbook?.status === 'INDEXED' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/80 px-3 py-1 text-xs font-bold text-white shadow-[0_0_14px_rgba(6,182,212,0.35)]">
            <CheckCircle2 className="h-3.5 w-3.5" /> Indexed
          </span>
        )}
      </div>

      <label className="mb-3 block text-xs font-bold uppercase tracking-wide text-[#A5F3FC]">
        Textbook title
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="td-input mt-1 w-full rounded-xl px-3 py-2 text-sm font-semibold outline-none"
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
          dragOver
            ? 'border-[#22D3EE] bg-cyan-400/10'
            : 'border-cyan-400/45 bg-slate-950/30 hover:border-[#22D3EE] hover:bg-cyan-400/5',
        ].join(' ')}
      >
        <FileUp className="mb-2 h-8 w-8 text-[#22D3EE]" />
        <p className="text-sm font-bold text-white">Upload State Textbook (PDF)</p>
        <p className="mt-1 text-xs text-[#A5F3FC]">Drag & drop or click · Max {maxMb} MB</p>
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
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-400/20 bg-slate-950/40 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{textbook.title}</p>
            <p className="text-xs text-[#A5F3FC]">
              {textbook.fileName} · {(textbook.fileSizeBytes / 1024).toFixed(0)} KB · {textbook.status}
            </p>
          </div>
          <button
            type="button"
            disabled={busy === 'verify' || textbook.status === 'VERIFYING'}
            onClick={() => void verify()}
            className="td-btn-cta inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold disabled:opacity-60"
          >
            {busy === 'verify' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Verify Document
          </button>
        </div>
      )}

      {busy === 'upload' && (
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-[#A5F3FC]">
          <Loader2 className="h-4 w-4 animate-spin" /> Uploading PDF…
        </p>
      )}
      {error && <p className="mt-3 text-sm font-semibold text-rose-300">{error}</p>}
    </section>
  );
}
