import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

interface SecureVideoPlayerProps {
  videoId: string;
  src: string;
  durationInSeconds: number;
  initialMaxWatched?: number;
  onCompleted?: () => void;
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
  onCompleted,
}: SecureVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const maxWatchedRef = useRef(initialMaxWatched);
  const watchAccumRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const [toast, setToast] = useState<string | null>(null);
  const [maxWatched, setMaxWatched] = useState(initialMaxWatched);
  const [pct, setPct] = useState(0);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  };

  useEffect(() => {
    maxWatchedRef.current = initialMaxWatched;
    setMaxWatched(initialMaxWatched);
  }, [initialMaxWatched, videoId]);

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
      setPct(dur > 0 ? Math.min(100, (maxWatchedRef.current / dur) * 100) : 0);

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
  }, [durationInSeconds, videoId]);

  // Heartbeat every 5 seconds
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
    <div className="relative overflow-hidden rounded-2xl bg-slate-900 shadow-lg">
      <video
        ref={videoRef}
        className="aspect-video w-full bg-black"
        src={src}
        controls
        controlsList="nodownload"
        playsInline
        preload="metadata"
      />
      <div className="flex items-center justify-between gap-3 bg-slate-800 px-4 py-2 text-xs text-slate-200">
        <span>
          Watched securely: {Math.round(pct)}% (max {Math.floor(maxWatched)}s)
        </span>
        <span>No fast-forward · 95% required</span>
      </div>
      {toast && (
        <div className="absolute bottom-14 left-1/2 z-10 max-w-[90%] -translate-x-1/2 rounded-full bg-amber-500 px-4 py-2 text-center text-xs font-bold text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
