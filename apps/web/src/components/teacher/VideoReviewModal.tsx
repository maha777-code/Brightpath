import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  Clapperboard,
  Loader2,
  RefreshCw,
  Rocket,
  Trash2,
  X,
} from 'lucide-react';
import type { TeacherSubtopic } from '@brightpath/shared';
import { api } from '@/lib/api';

type Tab = 'script' | 'cues';

interface VideoReviewModalProps {
  subtopic: TeacherSubtopic;
  onClose: () => void;
  onUpdated: (subtopic: TeacherSubtopic) => void;
}

export default function VideoReviewModal({
  subtopic,
  onClose,
  onUpdated,
}: VideoReviewModalProps) {
  const [tab, setTab] = useState<Tab>('script');
  const [script, setScript] = useState(subtopic.videoScript ?? '');
  const [busy, setBusy] = useState<'save' | 'approve' | 'reject' | 'regen' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRegenPrompt, setShowRegenPrompt] = useState(false);
  const [regenPrompt, setRegenPrompt] = useState('');

  useEffect(() => {
    setScript(subtopic.videoScript ?? '');
  }, [subtopic.id, subtopic.videoScript]);

  const previewUrl = subtopic.generatedVideoUrl || subtopic.videoUrl || '';

  const saveScript = async () => {
    setBusy('save');
    setError(null);
    try {
      const res = await api.updateTopicVideoScript(subtopic.id, script);
      onUpdated(res.subtopic);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save script');
    } finally {
      setBusy(null);
    }
  };

  const approve = async () => {
    setBusy('approve');
    setError(null);
    try {
      if (script !== (subtopic.videoScript ?? '')) {
        await api.updateTopicVideoScript(subtopic.id, script);
      }
      const res = await api.approveTopicVideo(subtopic.id);
      onUpdated(res.subtopic);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Approve failed');
    } finally {
      setBusy(null);
    }
  };

  const reject = async () => {
    setBusy('reject');
    setError(null);
    try {
      const res = await api.rejectTopicVideo(subtopic.id);
      onUpdated(res.subtopic);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reject failed');
    } finally {
      setBusy(null);
    }
  };

  const regenerate = async () => {
    setBusy('regen');
    setError(null);
    try {
      const res = await api.generateTopicVideo(subtopic.id, {
        prompt: regenPrompt.trim() || undefined,
      });
      onUpdated(res.subtopic);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Re-generate failed');
    } finally {
      setBusy(null);
      setShowRegenPrompt(false);
    }
  };

  const cues = subtopic.animationCues ?? [];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-3 backdrop-blur-md sm:items-center sm:p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="video-review-title"
          className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-white/90 shadow-2xl backdrop-blur-xl"
          initial={{ y: 40, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 24, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-start justify-between gap-3 border-b border-slate-200/80 px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <h2 id="video-review-title" className="text-lg font-extrabold text-slate-900 sm:text-xl">
                Review Video Explainer: {subtopic.code} {subtopic.title}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Review the AI-generated video and script before publishing to students.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 sm:p-6 lg:grid-cols-2">
            <div className="flex flex-col">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                Video preview
              </p>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-inner">
                {previewUrl ? (
                  <video
                    key={previewUrl}
                    src={previewUrl}
                    controls
                    playsInline
                    className="aspect-video w-full bg-black"
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center text-sm text-slate-400">
                    No preview available
                  </div>
                )}
              </div>
            </div>

            <div className="flex min-h-0 flex-col">
              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setTab('script')}
                  className={[
                    'rounded-xl px-3 py-1.5 text-xs font-bold',
                    tab === 'script'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  ].join(' ')}
                >
                  AI Voiceover Script
                </button>
                <button
                  type="button"
                  onClick={() => setTab('cues')}
                  className={[
                    'inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold',
                    tab === 'cues'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  ].join(' ')}
                >
                  <Clapperboard className="h-3.5 w-3.5" />
                  3D Animation Cues
                </button>
              </div>

              {tab === 'script' ? (
                <div className="flex min-h-[220px] flex-1 flex-col">
                  <textarea
                    value={script}
                    onChange={(e) => setScript(e.target.value)}
                    className="min-h-[220px] flex-1 resize-y rounded-2xl border border-slate-200 bg-white/80 p-3 text-sm leading-relaxed text-slate-800 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
                    placeholder="AI voiceover script…"
                  />
                  <button
                    type="button"
                    disabled={busy === 'save'}
                    onClick={() => void saveScript()}
                    className="mt-2 self-end rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                  >
                    {busy === 'save' ? 'Saving…' : 'Save script edits'}
                  </button>
                </div>
              ) : (
                <ul className="min-h-[220px] space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-white/80 p-3">
                  {cues.length === 0 ? (
                    <li className="text-sm text-slate-500">No animation cues yet.</li>
                  ) : (
                    cues.map((cue, i) => (
                      <li
                        key={`${cue.timeSec}-${i}`}
                        className="flex items-start gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm"
                      >
                        <span className="shrink-0 rounded-md bg-indigo-100 px-2 py-0.5 font-mono text-xs font-bold text-indigo-700">
                          {formatCueTime(cue.timeSec)}
                        </span>
                        <span className="font-semibold text-slate-700">{cue.label}</span>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          </div>

          {showRegenPrompt && (
            <div className="border-t border-amber-100 bg-amber-50/80 px-5 py-3 sm:px-6">
              <label className="text-xs font-bold text-amber-900">
                Re-generate with prompt
              </label>
              <input
                value={regenPrompt}
                onChange={(e) => setRegenPrompt(e.target.value)}
                placeholder="e.g., Make it simpler for Class 9 students"
                className="mt-1 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRegenPrompt(false)}
                  className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy === 'regen'}
                  onClick={() => void regenerate()}
                  className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white"
                >
                  {busy === 'regen' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Re-generate with Prompt
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="px-5 text-sm font-semibold text-rose-600 sm:px-6">{error}</p>
          )}

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 bg-white/70 px-5 py-4 sm:px-6">
            <button
              type="button"
              onClick={() => setShowRegenPrompt(true)}
              disabled={Boolean(busy)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Re-generate
            </button>

            <button
              type="button"
              onClick={() => void reject()}
              disabled={Boolean(busy)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
            >
              {busy === 'reject' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Reject / Delete
            </button>

            <button
              type="button"
              onClick={() => void approve()}
              disabled={Boolean(busy)}
              className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-600 disabled:opacity-50 sm:text-sm"
            >
              {busy === 'approve' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
              Approve & Publish to Students
              <Check className="h-3.5 w-3.5 opacity-80" />
            </button>
          </footer>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function formatCueTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
