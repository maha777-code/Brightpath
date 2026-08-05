import { useCallback, useEffect, useRef, useState } from 'react';
import {
  formatStudyTime,
  streakFlames,
  toLocalDateString,
  type ParentUser,
  type TrackActivityResponse,
} from '@brightpath/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const IDLE_MS = 2 * 60 * 1000;
const TICK_MS = 1000;
const HEARTBEAT_SECONDS = 60;

interface ActivityStats {
  currentStreak: number;
  longestStreak: number;
  timeStudiedThisWeek: number;
  timeStudiedFormatted: string;
  flames: string;
}

function statsFromParent(p: ParentUser | null): ActivityStats {
  const seconds = p?.timeStudiedThisWeek ?? 0;
  const streak = p?.currentStreak ?? 0;
  return {
    currentStreak: streak,
    longestStreak: p?.longestStreak ?? 0,
    timeStudiedThisWeek: seconds,
    timeStudiedFormatted: formatStudyTime(seconds),
    flames: streakFlames(streak),
  };
}

/**
 * Tracks active study time on dashboard / lesson pages.
 * Pauses after 2 minutes idle; heartbeats every 60 active seconds.
 */
export function useActivityTracker(enabled: boolean) {
  const { parent, updateParent } = useAuth();
  const [stats, setStats] = useState<ActivityStats>(() => statsFromParent(parent));
  const [liveSeconds, setLiveSeconds] = useState(0);

  const accruedRef = useRef(0);
  const idleRef = useRef(false);
  const lastActivityRef = useRef(Date.now());
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  useEffect(() => {
    setStats(statsFromParent(parent));
  }, [parent]);

  const flush = useCallback(
    async (seconds: number) => {
      if (seconds < 1 || !enabledRef.current) return;
      try {
        const now = new Date();
        const res: TrackActivityResponse = await api.trackActivity({
          durationInSeconds: seconds,
          timestamp: now.toISOString(),
          localDate: toLocalDateString(now, Intl.DateTimeFormat().resolvedOptions().timeZone),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        updateParent(res.parent);
        setStats({
          currentStreak: res.currentStreak,
          longestStreak: res.longestStreak,
          timeStudiedThisWeek: res.timeStudiedThisWeek,
          timeStudiedFormatted: res.timeStudiedFormatted,
          flames: streakFlames(res.currentStreak),
        });
        setLiveSeconds(0);
      } catch (err) {
        console.warn('[Activity] heartbeat failed:', err);
      }
    },
    [updateParent],
  );

  // Activity listeners
  useEffect(() => {
    if (!enabled) return;

    const markActive = () => {
      lastActivityRef.current = Date.now();
      idleRef.current = false;
    };

    const events: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'click',
    ];
    for (const ev of events) window.addEventListener(ev, markActive, { passive: true });
    markActive();

    return () => {
      for (const ev of events) window.removeEventListener(ev, markActive);
    };
  }, [enabled]);

  // 1s tick + idle check + heartbeat
  useEffect(() => {
    if (!enabled) return;

    const id = window.setInterval(() => {
      const idle = Date.now() - lastActivityRef.current > IDLE_MS;
      idleRef.current = idle;
      if (idle) return;
      if (document.visibilityState === 'hidden') return;

      accruedRef.current += 1;
      setLiveSeconds((s) => s + 1);

      if (accruedRef.current >= HEARTBEAT_SECONDS) {
        const chunk = accruedRef.current;
        accruedRef.current = 0;
        void flush(chunk);
      }
    }, TICK_MS);

    return () => window.clearInterval(id);
  }, [enabled, flush]);

  // Flush on unmount / hide / unload
  useEffect(() => {
    if (!enabled) return;

    const sendPending = () => {
      const pending = accruedRef.current;
      if (pending < 1) return;
      accruedRef.current = 0;

      const now = new Date();
      const body = JSON.stringify({
        durationInSeconds: pending,
        timestamp: now.toISOString(),
        localDate: toLocalDateString(now, Intl.DateTimeFormat().resolvedOptions().timeZone),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      const token = localStorage.getItem('brightpath_token');
      const base = import.meta.env.VITE_API_URL ?? '/api';

      // Prefer sendBeacon for unload; fall back to sync flush
      if (navigator.sendBeacon && token) {
        try {
          void fetch(`${base}/user/track-activity`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body,
            keepalive: true,
          });
          return;
        } catch {
          /* fall through */
        }
      }
      void flush(pending);
    };

    const onVis = () => {
      if (document.visibilityState === 'hidden') sendPending();
    };

    window.addEventListener('pagehide', sendPending);
    window.addEventListener('beforeunload', sendPending);
    document.addEventListener('visibilitychange', onVis);

    return () => {
      sendPending();
      window.removeEventListener('pagehide', sendPending);
      window.removeEventListener('beforeunload', sendPending);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [enabled, flush]);

  const displaySeconds = stats.timeStudiedThisWeek + liveSeconds;

  return {
    ...stats,
    timeStudiedThisWeek: displaySeconds,
    timeStudiedFormatted: formatStudyTime(displaySeconds),
    isIdle: idleRef.current,
  };
}
