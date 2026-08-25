import { useEffect, useMemo, useState } from 'react';
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

const API_MEDIA_ORIGIN = (
  import.meta.env.VITE_API_PUBLIC_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  'http://localhost:3001'
).replace(/\/$/, '');

/** Reject demo / Google sample clips — review modal must only play pipeline output. */
function isExternalSampleVideo(url: string): boolean {
  return /commondatastorage\.googleapis\.com|gtv-videos-bucket|ForBigger(?:Fun|Joyrides|Blazes|Escapes)|interactive-examples\.mdn\.mozilla\.net/i.test(
    url,
  );
}

/** Only local pipeline MP4s under /public/videos/ on the Express API. */
function toLocalGeneratedMp4Url(
  raw: string | null | undefined,
  topicId: string,
): string | null {
  if (!raw || !String(raw).trim()) return null;
  const value = String(raw).trim();
  if (isExternalSampleVideo(value)) return null;

  if (/^https?:\/\//i.test(value)) {
    try {
      const u = new URL(value);
      if (!u.pathname.startsWith('/public/videos/')) return null;
      return `${API_MEDIA_ORIGIN}${u.pathname}${u.search}`;
    } catch {
      return null;
    }
  }

  if (value.startsWith('/public/videos/')) {
    return `${API_MEDIA_ORIGIN}${value}`;
  }
  if (value.startsWith('public/videos/')) {
    return `${API_MEDIA_ORIGIN}/${value}`;
  }
  if (/^topic_[a-z0-9-]+\.mp4$/i.test(value)) {
    return `${API_MEDIA_ORIGIN}/public/videos/${value}`;
  }
  // Relative path without leading slash
  if (value.includes(`topic_${topicId}.mp4`)) {
    const path = value.startsWith('/') ? value : `/public/videos/${value.replace(/^.*\//, '')}`;
    return path.startsWith('/public/')
      ? `${API_MEDIA_ORIGIN}${path}`
      : `${API_MEDIA_ORIGIN}/public/videos/topic_${topicId}.mp4`;
  }

  return null;
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
  const [videoLoadError, setVideoLoadError] = useState<string | null>(null);

  useEffect(() => {
    setScript(subtopic.videoScript ?? '');
  }, [subtopic.id, subtopic.videoScript]);

  /**
   * Strict binding: generatedVideoUrl first (pipeline), then published videoUrl
   * only if it is a local /public/videos asset — never Google sample fallbacks.
   */
  const targetVideoUrl = useMemo(() => {
    const fromGenerated = toLocalGeneratedMp4Url(subtopic.generatedVideoUrl, subtopic.id);
    if (fromGenerated) return fromGenerated;

    // Published local MP4 only (after approve) — still reject sample seeds
    return toLocalGeneratedMp4Url(subtopic.videoUrl, subtopic.id);
  }, [subtopic.generatedVideoUrl, subtopic.videoUrl, subtopic.id]);

  useEffect(() => {
    setVideoLoadError(null);
    console.log('Modal video URL:', targetVideoUrl);
  }, [targetVideoUrl]);

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
        className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-3 backdrop-blur-md sm:items-center sm:p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="video-review-title"
          className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-cyan-300/30 bg-[#312E81] text-white shadow-[0_0_40px_rgba(34,211,238,0.2)] backdrop-blur-xl"
          initial={{ y: 40, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 24, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-start justify-between gap-3 border-b border-cyan-300/20 px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <h2 id="video-review-title" className="text-2xl font-bold text-white">
                Review Video Explainer: {subtopic.code} {subtopic.title}
              </h2>
              <p className="mt-1 text-base text-cyan-200/80">
                Review the AI-generated video and script before publishing to students.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-[#A5F3FC] hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 sm:p-6 lg:grid-cols-2">
            <div className="flex flex-col">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#A5F3FC]">
                Video preview
              </p>
              <div className="overflow-hidden rounded-2xl border border-cyan-400/25 bg-slate-950 shadow-inner">
                {targetVideoUrl ? (
                  <video
                    key={targetVideoUrl}
                    controls
                    autoPlay
                    playsInline
                    preload="auto"
                    crossOrigin="anonymous"
                    className="aspect-video h-full w-full rounded-lg bg-black"
                    onError={() => {
                      console.error('Video failed to load from source:', targetVideoUrl);
                      setVideoLoadError(`Failed to load video from ${targetVideoUrl}`);
                    }}
                    onLoadedMetadata={(e) => {
                      const d = e.currentTarget.duration;
                      if (!Number.isFinite(d) || d <= 0) {
                        setVideoLoadError(
                          'Video metadata reports 0:00 duration — file may be empty or missing on the API server.',
                        );
                      } else {
                        setVideoLoadError(null);
                      }
                    }}
                  >
                    <source src={targetVideoUrl} type="video/mp4" />
                    Your browser cannot play this video.
                  </video>
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-slate-900 px-4 text-center text-sm text-slate-400">
                    No video file generated yet. Click Re-generate.
                  </div>
                )}
              </div>
              {videoLoadError && (
                <p className="mt-2 text-xs font-semibold text-rose-300">{videoLoadError}</p>
              )}
              {targetVideoUrl && (
                <p className="mt-1 truncate text-[11px] text-[#A5F3FC]" title={targetVideoUrl}>
                  Source: {targetVideoUrl}
                </p>
              )}
            </div>

            <div className="flex min-h-0 flex-col">
              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setTab('script')}
                  className={[
                    'rounded-xl px-3 py-1.5 text-xs font-bold',
                    tab === 'script'
                      ? 'td-btn-cta'
                      : 'bg-slate-950/40 text-[#A5F3FC] hover:bg-white/10',
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
                      ? 'td-btn-cta'
                      : 'bg-slate-950/40 text-[#A5F3FC] hover:bg-white/10',
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
                    className="td-input min-h-[220px] flex-1 resize-y rounded-2xl p-3 text-sm leading-relaxed outline-none"
                    placeholder="AI voiceover script…"
                  />
                  <button
                    type="button"
                    disabled={busy === 'save'}
                    onClick={() => void saveScript()}
                    className="td-btn-cta mt-2 self-end rounded-xl px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                  >
                    {busy === 'save' ? 'Saving…' : 'Save script edits'}
                  </button>
                </div>
              ) : (
                <ul className="min-h-[220px] space-y-2 overflow-y-auto rounded-2xl border border-cyan-400/20 bg-slate-950/40 p-3">
                  {cues.length === 0 ? (
                    <li className="text-sm text-[#A5F3FC]">No animation cues yet.</li>
                  ) : (
                    cues.map((cue, i) => (
                      <li
                        key={`${cue.timeSec}-${i}`}
                        className="flex items-start gap-3 rounded-xl bg-white/5 px-3 py-2 text-sm"
                      >
                        <span className="shrink-0 rounded-md bg-[#06B6D4]/80 px-2 py-0.5 font-mono text-xs font-bold text-white">
                          {formatCueTime(cue.timeSec)}
                        </span>
                        <span className="font-semibold text-white">{cue.label}</span>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          </div>

          {showRegenPrompt && (
            <div className="border-t border-amber-300/20 bg-[#FBBF24]/15 px-5 py-3 sm:px-6">
              <label className="text-xs font-bold text-[#FDE68A]">
                Re-generate with prompt
              </label>
              <input
                value={regenPrompt}
                onChange={(e) => setRegenPrompt(e.target.value)}
                placeholder="e.g., Make it simpler for Class 9 students"
                className="td-input mt-1 w-full rounded-xl px-3 py-2 text-sm outline-none"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRegenPrompt(false)}
                  className="rounded-lg px-3 py-1.5 text-xs font-bold text-[#A5F3FC]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy === 'regen'}
                  onClick={() => void regenerate()}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#FBBF24]/80 px-3 py-1.5 text-xs font-bold text-white"
                >
                  {busy === 'regen' ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  Re-generate with Prompt
                </button>
              </div>
            </div>
          )}

          {error && (
            <p className="px-5 text-sm font-semibold text-rose-300 sm:px-6">{error}</p>
          )}

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-cyan-300/20 bg-[#1E1B4B]/80 px-8 py-5">
            <button
              type="button"
              onClick={() => setShowRegenPrompt(true)}
              disabled={Boolean(busy)}
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-white/5 px-6 py-3 text-base font-medium text-white hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCw className="h-5 w-5" />
              Re-generate
            </button>

            <button
              type="button"
              onClick={() => void reject()}
              disabled={Boolean(busy)}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-400/40 bg-rose-500/80 px-6 py-3 text-base font-medium text-white hover:bg-rose-500 disabled:opacity-50"
            >
              {busy === 'reject' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Trash2 className="h-5 w-5" />
              )}
              Reject / Delete
            </button>

            <button
              type="button"
              onClick={() => void approve()}
              disabled={Boolean(busy) || !targetVideoUrl}
              className="ml-auto inline-flex items-center gap-2 rounded-xl bg-[#10B981]/90 px-6 py-3 text-base font-medium text-white shadow-[0_0_18px_rgba(16,185,129,0.35)] hover:bg-[#10B981] disabled:opacity-50"
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
