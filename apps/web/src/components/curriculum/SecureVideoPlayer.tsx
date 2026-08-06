import { useEffect, useRef, useState, useCallback, type MutableRefObject } from 'react';
import { ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';

export interface WatchProgressInfo {
  pct: number;
  maxWatched: number;
  canComplete: boolean;
}

interface SecureVideoPlayerProps {
  videoId: string;
  src: string;
  durationInSeconds: number;
  initialMaxWatched?: number;
  alreadyCompleted?: boolean;
  onCompleted?: () => void;
  onWatchProgress?: (info: WatchProgressInfo) => void;
  completeRequestRef?: MutableRefObject<(() => Promise<boolean>) | null>;
  /** Kid-friendly chrome around the same anti-skip player */
  variant?: 'default' | 'kids';
}

/**
 * HTML5 video player that blocks forward seeking past the furthest watched point.
 * Heartbeats progress every 5s; marks complete at >= 95% legitimate watch.
 */
export function SecureVideoPlayer({
  videoId,
  src,
  durationInSeconds,
  initialMaxWatched = 0,
  alreadyCompleted = false,
  onCompleted,
  onWatchProgress,
  completeRequestRef,
  variant = 'default',
}: SecureVideoPlayerProps) {
  const kids = variant === 'kids';
  const videoRef = useRef<HTMLVideoElement>(null);
  const maxWatchedRef = useRef(initialMaxWatched);
  const watchAccumRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);
  const completedRef = useRef(alreadyCompleted);
  const [toast, setToast] = useState<string | null>(null);
  const [maxWatched, setMaxWatched] = useState(initialMaxWatched);
  const [pct, setPct] = useState(
    durationInSeconds > 0 ? Math.min(100, (initialMaxWatched / durationInSeconds) * 100) : 0,
  );

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  };

  const emitProgress = useCallback(
    (nextPct: number, nextMax: number) => {
      const dur = videoRef.current?.duration || durationInSeconds;
      const threshold = dur * 0.95;
      onWatchProgress?.({
        pct: nextPct,
        maxWatched: nextMax,
        canComplete: nextMax >= threshold || alreadyCompleted,
      });
    },
    [alreadyCompleted, durationInSeconds, onWatchProgress],
  );

  const tryComplete = useCallback(async () => {
    if (completedRef.current && alreadyCompleted) {
      onCompleted?.();
      return true;
    }
    const dur = videoRef.current?.duration || durationInSeconds;
    const threshold = dur * 0.95;
    if (maxWatchedRef.current < threshold) {
      showToast('Watch at least 95% without skipping to complete this video.');
      return false;
    }
    try {
      await api.completeVideo({
        videoId,
        maxWatchedTime: maxWatchedRef.current,
      });
      completedRef.current = true;
      onCompleted?.();
      return true;
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Could not mark complete');
      return false;
    }
  }, [alreadyCompleted, durationInSeconds, onCompleted, videoId]);

  useEffect(() => {
    if (completeRequestRef) {
      completeRequestRef.current = tryComplete;
    }
    return () => {
      if (completeRequestRef) completeRequestRef.current = null;
    };
  }, [completeRequestRef, tryComplete]);

  useEffect(() => {
    maxWatchedRef.current = initialMaxWatched;
    setMaxWatched(initialMaxWatched);
    completedRef.current = alreadyCompleted;
    watchAccumRef.current = 0;
    const startPct =
      durationInSeconds > 0 ? Math.min(100, (initialMaxWatched / durationInSeconds) * 100) : 0;
    setPct(startPct);
    emitProgress(startPct, initialMaxWatched);
  }, [alreadyCompleted, durationInSeconds, emitProgress, initialMaxWatched, videoId]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const onTimeUpdate = () => {
      const t = el.currentTime;
      if (t > maxWatchedRef.current) {
        maxWatchedRef.current = t;
        setMaxWatched(t);
      }
      const dur = el.duration || durationInSeconds;
      const nextPct = dur > 0 ? Math.min(100, (maxWatchedRef.current / dur) * 100) : 0;
      setPct(nextPct);
      emitProgress(nextPct, maxWatchedRef.current);

      const now = performance.now();
      if (lastTickRef.current != null && !el.paused) {
        const delta = (now - lastTickRef.current) / 1000;
        if (delta > 0 && delta < 2) watchAccumRef.current += delta;
      }
      lastTickRef.current = now;
    };

    const onSeeking = () => {
      const allowed = maxWatchedRef.current + 2;
      if (el.currentTime > allowed) {
        el.currentTime = maxWatchedRef.current;
        showToast('Fast-forwarding is disabled. Please watch the complete video to earn progress.');
      }
    };

    const onSeeked = () => {
      const allowed = maxWatchedRef.current + 2;
      if (el.currentTime > allowed) {
        el.currentTime = maxWatchedRef.current;
      }
    };

    const onPlay = () => {
      lastTickRef.current = performance.now();
    };

    const onPause = () => {
      lastTickRef.current = null;
    };

    el.addEventListener('timeupdate', onTimeUpdate);
    el.addEventListener('seeking', onSeeking);
    el.addEventListener('seeked', onSeeked);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);

    return () => {
      el.removeEventListener('timeupdate', onTimeUpdate);
      el.removeEventListener('seeking', onSeeking);
      el.removeEventListener('seeked', onSeeked);
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
    };
  }, [durationInSeconds, emitProgress, videoId]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void api
        .trackVideoProgress({
          videoId,
          watchTimeSeconds: watchAccumRef.current,
          maxWatchedTime: maxWatchedRef.current,
        })
        .catch(() => {});

      const dur = videoRef.current?.duration || durationInSeconds;
      const threshold = dur * 0.95;
      if (
        !completedRef.current &&
        maxWatchedRef.current >= threshold &&
        (videoRef.current?.currentTime ?? 0) >= threshold
      ) {
        completedRef.current = true;
        void api
          .completeVideo({ videoId, maxWatchedTime: maxWatchedRef.current })
          .then(() => onCompleted?.())
          .catch((err) => {
            completedRef.current = false;
            showToast(err instanceof Error ? err.message : 'Could not mark complete');
          });
      }
    }, 5000);

    return () => window.clearInterval(id);
  }, [durationInSeconds, onCompleted, videoId]);

  return (
    <div
      className={
        kids
          ? 'relative overflow-hidden rounded-3xl border-4 border-sky-400 bg-sky-950 shadow-[0_10px_0_#38bdf8] ring-4 ring-sky-200/60'
          : 'relative overflow-hidden rounded-2xl border border-slate-800/40 bg-slate-950 shadow-lg ring-1 ring-white/10'
      }
    >
      <div
        className={
          kids
            ? 'absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-[11px] font-extrabold text-sky-700 shadow'
            : 'absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-semibold text-teal-200 backdrop-blur-md'
        }
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        {kids ? '👀 No skipping!' : 'Secure watch · no skip'}
      </div>
      <video
        ref={videoRef}
        key={videoId}
        className="aspect-video w-full bg-black"
        src={src}
        controls
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        playsInline
        preload="metadata"
      />
      <div
        className={
          kids
            ? 'space-y-1.5 bg-gradient-to-r from-sky-500 to-emerald-400 px-4 py-3'
            : 'space-y-1.5 bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3'
        }
      >
        <div
          className={
            kids
              ? 'flex items-center justify-between gap-3 text-xs font-bold text-white'
              : 'flex items-center justify-between gap-3 text-xs text-slate-200'
          }
        >
          <span className={kids ? '' : 'font-semibold text-teal-300'}>
            {kids ? `⭐ Star power ${Math.round(pct)}%` : `Secure progress ${Math.round(pct)}%`}
          </span>
          <span className={kids ? 'text-white/90' : 'text-slate-400'}>
            {kids ? 'Watch to 95% for a star!' : `Max reached ${Math.floor(maxWatched)}s · 95% to complete`}
          </span>
        </div>
        <div className={kids ? 'h-2.5 overflow-hidden rounded-full bg-white/30' : 'h-1.5 overflow-hidden rounded-full bg-slate-700'}>
          <div
            className={
              kids
                ? 'h-full rounded-full bg-yellow-300 transition-all duration-300'
                : 'h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 transition-all duration-300'
            }
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      {toast && (
        <div className="absolute bottom-16 left-1/2 z-10 max-w-[92%] -translate-x-1/2 rounded-full bg-orange-500 px-4 py-2 text-center text-xs font-extrabold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
