import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Lock, X } from 'lucide-react';
import type {
  CurriculumChapterItem,
  CurriculumVideoItem,
  SubjectCurriculumResponse,
} from '@brightpath/shared';
import { api } from '@/lib/api';
import {
  SecureVideoPlayer,
  type WatchProgressInfo,
} from '@/components/curriculum/SecureVideoPlayer';
import { AdventureMapPath } from '@/components/curriculum/AdventureMapPath';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useProfile';

function findDefaultVideo(data: SubjectCurriculumResponse): {
  chapter: CurriculumChapterItem;
  video: CurriculumVideoItem;
} | null {
  for (const ch of data.chapters) {
    if (ch.status === 'LOCKED') continue;
    const active =
      ch.videos.find((v) => !v.isCompleted && !v.isLocked) ??
      ch.videos.find((v) => !v.isLocked) ??
      ch.videos[0];
    if (active) return { chapter: ch, video: active };
  }
  const first = data.chapters[0];
  if (first?.videos[0]) return { chapter: first, video: first.videos[0] };
  return null;
}

function computeStars(data: SubjectCurriculumResponse) {
  const videosDone = data.chapters.reduce(
    (n, ch) => n + ch.videos.filter((v) => v.isCompleted).length,
    0,
  );
  const quizzesPassed = data.chapters.filter((ch) => ch.quizPassed).length;
  return videosDone * 50 + quizzesPassed * 100;
}

export default function SubjectCurriculumPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const { parent } = useAuth();
  const { profile } = useProfile();
  const learnerName =
    profile?.name?.split(' ')[0] || parent?.name?.split(' ')[0] || 'Maha';

  const [data, setData] = useState<SubjectCurriculumResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [watchInfo, setWatchInfo] = useState<WatchProgressInfo | null>(null);
  const [busyNext, setBusyNext] = useState(false);
  const [celebrateNodeId, setCelebrateNodeId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatDraft, setChatDraft] = useState('');
  const [chatMessages, setChatMessages] = useState<
    { id: string; role: 'tutor' | 'user'; text: string }[]
  >([]);
  const [buddyBounce, setBuddyBounce] = useState(false);
  const completeRef = useRef<(() => Promise<boolean>) | null>(null);

  const load = useCallback(
    async (opts?: { keepVideoId?: string | null; silent?: boolean }) => {
      if (!subjectId) return;
      if (!opts?.silent) setLoading(true);
      setError(null);
      try {
        const res = await api.getSubjectCurriculum(subjectId);
        setData(res);

        const keep = opts?.keepVideoId;
        const stillValid =
          keep &&
          res.chapters.some((c) => c.videos.some((v) => v.id === keep && !v.isLocked));

        if (stillValid) {
          setActiveVideoId(keep);
        } else {
          setActiveVideoId((prev) => {
            const still =
              prev &&
              res.chapters.some((c) => c.videos.some((v) => v.id === prev && !v.isLocked));
            if (still) return prev;
            return findDefaultVideo(res)?.video.id ?? null;
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load subject');
      } finally {
        setLoading(false);
      }
    },
    [subjectId],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => setBuddyBounce((b) => !b), 1800);
    return () => window.clearInterval(id);
  }, []);

  const active = useMemo(() => {
    if (!data || !activeVideoId) return null;
    for (const chapter of data.chapters) {
      const video = chapter.videos.find((v) => v.id === activeVideoId);
      if (video) return { chapter, video };
    }
    return null;
  }, [activeVideoId, data]);

  const stars = data ? computeStars(data) : 0;

  useEffect(() => {
    if (!active) return;
    setChatMessages([
      {
        id: 'seed',
        role: 'tutor',
        text: `Hi ${learnerName}! 🐥 Ask me anything about this quest video — I'll help with fun hints!`,
      },
    ]);
  }, [active?.video.id, learnerName]);

  const selectVideo = (chapter: CurriculumChapterItem, video: CurriculumVideoItem) => {
    if (video.isLocked || chapter.status === 'LOCKED') return;
    setActiveVideoId(video.id);
    setWatchInfo(null);
  };

  const selectQuiz = (chapter: CurriculumChapterItem) => {
    if (!chapter.quizUnlocked && !chapter.quizPassed) return;
    navigate(`/dashboard/chapters/${chapter.id}/test`);
  };

  const onVideoCompleted = async (videoId: string) => {
    setCelebrateNodeId(videoId);
    window.setTimeout(() => setCelebrateNodeId(null), 1600);
    await load({ keepVideoId: videoId, silent: true });
  };

  const goNext = async () => {
    if (!data || !active) return;
    setBusyNext(true);
    try {
      if (!active.video.isCompleted) {
        const ok = (await completeRef.current?.()) ?? false;
        if (!ok) return;
        setCelebrateNodeId(active.video.id);
        window.setTimeout(() => setCelebrateNodeId(null), 1600);
      }
      const refreshed = await api.getSubjectCurriculum(data.subjectId);
      setData(refreshed);
      const ch = refreshed.chapters.find((c) => c.id === active.chapter.id);
      if (!ch) return;
      const idx = ch.videos.findIndex((v) => v.id === active.video.id);
      const nextVid = ch.videos[idx + 1];
      if (nextVid && !nextVid.isLocked) {
        setActiveVideoId(nextVid.id);
        setWatchInfo(null);
        return;
      }
      if (ch.quizUnlocked) {
        navigate(`/dashboard/chapters/${ch.id}/test`);
      }
    } finally {
      setBusyNext(false);
    }
  };

  const sendChat = () => {
    const text = chatDraft.trim();
    if (!text) return;
    setChatMessages((prev) => [
      ...prev,
      { id: `${Date.now()}`, role: 'user', text },
      {
        id: `${Date.now()}-r`,
        role: 'tutor',
        text: `Awesome question, ${learnerName}! 🌟 Watch carefully and tell me one thing you learned. Want a silly practice prompt next?`,
      },
    ]);
    setChatDraft('');
  };

  if (loading && !data) {
    return (
      <div className="fixed inset-0 z-20 flex h-screen w-full items-center justify-center overflow-hidden bg-white">
        <p className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-extrabold text-slate-700 shadow-sm">
          🗺️ Loading adventure map…
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 z-20 h-screen w-full overflow-hidden bg-white p-6">
        <button
          type="button"
          className="rounded-full bg-sky-500 px-5 py-2.5 text-sm font-extrabold text-white shadow-md"
          onClick={() => navigate('/dashboard')}
        >
          ← Back
        </button>
        <p className="mt-4 font-bold text-rose-600">{error ?? 'Subject not found'}</p>
      </div>
    );
  }

  const canGoNext = active?.video.isCompleted || Boolean(watchInfo?.canComplete);
  const nextLocked = !canGoNext;

  return (
    <div className="fixed inset-0 z-20 flex h-screen w-full flex-col overflow-hidden bg-white text-slate-800">
      {/* Compact header */}
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-sky-500 px-4 py-2 text-sm font-extrabold text-white shadow-sm transition hover:brightness-105"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="truncate text-lg font-black tracking-tight text-slate-900 md:text-xl">
            📖 {data.subjectName} Quest!
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-extrabold text-amber-600">
            <span>⭐</span>
            {stars}
          </div>
          <div className="hidden min-w-[120px] rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 sm:block">
            <div className="mb-0.5 flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wide text-emerald-700">
              <span>Quest</span>
              <span>{data.masteryPercentage}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-emerald-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-lime-400 to-emerald-500 transition-all duration-700"
                style={{ width: `${data.masteryPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Full-height 2-column stage */}
      <div className="grid h-[calc(100vh-4rem)] w-full grid-cols-12 gap-4 overflow-hidden p-4 md:gap-6 md:p-6">
        {/* Left: Adventure Map */}
        <aside className="col-span-12 flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-emerald-50/30 lg:col-span-4">
          <AdventureMapPath
            chapters={data.chapters}
            subjectName={data.subjectName}
            activeVideoId={activeVideoId}
            learnerName={learnerName}
            celebrateNodeId={celebrateNodeId}
            onSelectVideo={selectVideo}
            onSelectQuiz={selectQuiz}
          />
        </aside>

        {/* Right: Video cinema */}
        <section className="col-span-12 flex h-full min-h-0 flex-col gap-3 overflow-y-auto lg:col-span-8">
          <div className="min-h-0 shrink-0 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm sm:p-3">
            {active && !active.video.isLocked ? (
              <SecureVideoPlayer
                variant="kids"
                videoId={active.video.id}
                src={active.video.videoUrl}
                durationInSeconds={active.video.durationInSeconds}
                initialMaxWatched={active.video.maxWatchedTime}
                alreadyCompleted={active.video.isCompleted}
                completeRequestRef={completeRef}
                onWatchProgress={setWatchInfo}
                onCompleted={() => {
                  void onVideoCompleted(active.video.id);
                }}
              />
            ) : (
              <div className="flex aspect-video flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-center">
                <span className="text-4xl">🗺️</span>
                <p className="mt-2 font-extrabold text-slate-700">
                  Tap a glowing node on the map to start!
                </p>
              </div>
            )}
          </div>

          <div className="shrink-0 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-extrabold text-orange-800">
            👀 Watch nicely without skipping to unlock your Star Reward!
          </div>

          {active && (
            <div className="mt-auto shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-extrabold uppercase tracking-wide text-fuchsia-600">
                Chapter {active.chapter.sequenceOrder} · Level {active.video.sequenceOrder}
              </p>
              <h2 className="mt-1 text-lg font-black text-slate-800">
                {active.video.title}
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {active.video.isCompleted
                  ? '⭐⭐⭐ Stage cleared! Ready for the next node?'
                  : `Watched ${Math.round(watchInfo?.pct ?? 0)}% — keep going for 3 stars!`}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={busyNext || nextLocked}
                  onClick={() => void goNext()}
                  className={[
                    'inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-black text-white transition',
                    nextLocked || busyNext
                      ? 'cursor-not-allowed bg-slate-300'
                      : 'bg-emerald-500 shadow-sm hover:brightness-105',
                  ].join(' ')}
                >
                  {nextLocked ? (
                    <>
                      Next Video <Lock className="h-4 w-4" />
                    </>
                  ) : active.video.isCompleted ? (
                    'Next Node 🚀'
                  ) : (
                    'Finish & Next Node ⭐'
                  )}
                </button>

                {active.chapter.quizUnlocked && (
                  <button
                    type="button"
                    onClick={() => selectQuiz(active.chapter)}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 px-5 py-3 text-sm font-black text-amber-950 shadow-sm"
                  >
                    🏆 Chapter Boss Quiz
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Floating Buddy */}
      <button
        type="button"
        onClick={() => setChatOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-end gap-2"
        aria-label="Ask Buddy for help"
      >
        <span
          className={[
            'mb-2 max-w-[9rem] rounded-3xl rounded-br-md bg-white px-3 py-2 text-xs font-extrabold text-sky-700 shadow-lg ring-2 ring-sky-200 transition',
            buddyBounce ? '-translate-y-1' : 'translate-y-0',
          ].join(' ')}
        >
          Need Help? 💬
        </span>
        <span
          className={[
            'flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 to-orange-300 text-3xl shadow-[0_6px_0_#ea580c] ring-4 ring-white transition',
            buddyBounce ? '-translate-y-1' : 'translate-y-0',
          ].join(' ')}
        >
          🐥
        </span>
      </button>

      {chatOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-sky-900/25 backdrop-blur-[1px]">
          <button
            type="button"
            className="h-full flex-1"
            aria-label="Close help"
            onClick={() => setChatOpen(false)}
          />
          <div className="flex h-full w-full max-w-md flex-col border-l-4 border-sky-300 bg-sky-50 shadow-2xl">
            <div className="flex items-center justify-between bg-gradient-to-r from-sky-500 to-emerald-400 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🐥</span>
                <div>
                  <p className="text-sm font-black">Buddy the Tutor</p>
                  <p className="text-xs font-semibold text-white/90">Map helper!</p>
                </div>
              </div>
              <button
                type="button"
                className="rounded-full bg-white/20 p-1.5 hover:bg-white/30"
                onClick={() => setChatOpen(false)}
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {chatMessages.map((m) => (
                <div
                  key={m.id}
                  className={[
                    'max-w-[90%] rounded-3xl px-3.5 py-2.5 text-sm font-semibold',
                    m.role === 'user'
                      ? 'ml-auto rounded-br-md bg-sky-500 text-white'
                      : 'rounded-bl-md bg-white text-slate-700 shadow ring-2 ring-amber-100',
                  ].join(' ')}
                >
                  {m.text}
                </div>
              ))}
            </div>
            <div className="flex gap-2 border-t-2 border-sky-100 bg-white p-3">
              <input
                value={chatDraft}
                onChange={(e) => setChatDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendChat()}
                placeholder="Ask Buddy about this quest…"
                className="min-w-0 flex-1 rounded-full border-2 border-sky-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-sky-400"
              />
              <button
                type="button"
                onClick={sendChat}
                className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-black text-white shadow-[0_3px_0_#059669]"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
