import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { Check, Copy, Download, RefreshCw, X } from 'lucide-react';
import type { RosterClass } from '@/lib/rosterApi';

export function joinLink(code: string) {
  return `${window.location.origin}/join/${code}`;
}

export function JoinCodeModal({
  classBatch,
  onClose,
  onRotate,
}: {
  classBatch: RosterClass;
  onClose: () => void;
  onRotate: () => Promise<void>;
}) {
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [rotating, setRotating] = useState(false);
  const link = joinLink(classBatch.inviteCode);

  useEffect(() => {
    QRCode.toDataURL(link, { width: 320, margin: 1, color: { dark: '#0f172a', light: '#ffffff' } })
      .then(setQr)
      .catch(() => setQr(''));
  }, [link]);

  const copy = async (what: 'code' | 'link') => {
    await navigator.clipboard.writeText(what === 'code' ? classBatch.inviteCode : link).catch(() => undefined);
    setCopied(what);
    window.setTimeout(() => setCopied(null), 1500);
  };

  return createPortal(
    <div className="mv-roster fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center text-slate-100 shadow-2xl">
        <div className="mb-2 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-white" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">Join {classBatch.name}</p>
        <p className="mt-3 font-mono text-5xl font-black tracking-[0.25em] text-white">{classBatch.inviteCode}</p>
        {qr ? (
          <img src={qr} alt={`QR code to join ${classBatch.name}`} className="mx-auto mt-5 h-56 w-56 rounded-xl bg-white p-2" />
        ) : null}
        <p className="mt-4 break-all text-sm text-slate-400">{link}</p>
        <p className="mt-2 text-xs text-slate-500">
          Students scan the code or open the link, sign in or create a student account, and are added to this class.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <button type="button" onClick={() => void copy('code')} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold">
            {copied === 'code' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />} Copy code
          </button>
          <button type="button" onClick={() => void copy('link')} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold">
            {copied === 'link' ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />} Copy link
          </button>
          {qr ? (
            <a
              href={qr}
              download={`${classBatch.name.replace(/\W+/g, '-')}-join-qr.png`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-100 no-underline"
            >
              <Download className="h-4 w-4" /> QR image
            </a>
          ) : null}
          <button
            type="button"
            disabled={rotating}
            onClick={async () => {
              if (!window.confirm('Create a new code? The old code and link will stop working.')) return;
              setRotating(true);
              await onRotate().finally(() => setRotating(false));
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 px-3 py-2 text-sm font-semibold text-amber-200 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${rotating ? 'animate-spin' : ''}`} /> New code
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
