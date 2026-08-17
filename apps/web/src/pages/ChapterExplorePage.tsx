import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap } from 'lucide-react';
import { api } from '@/lib/api';
import VideoPlayerArena from '@/components/chapterStage/VideoPlayerArena';
import TutorTranscriptPanel from '@/components/chapterStage/TutorTranscriptPanel';
import HoldToAskMic from '@/components/chapterStage/HoldToAskMic';
import { formatClock } from '@/components/chapterStage/formatTime';

type StreamPayload = Awaited<ReturnType<typeof api.getChapterVideoStream>>;

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;

export default function ChapterExplorePage() {
  const { id = 'demo-eukaryotic-cell' } = useParams<{ id: string }>();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [data, setData] = useState<StreamPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(20);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [muted, setMuted] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [quality, setQuality] = useState('720p');
  const [speedIdx, setSpeedIdx] = useState(2); // 1.25x
  const [transcriptPage, setTranscriptPage] = useState(0);
  const [micHolding, setMicHolding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getChapterVideoStream(id)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setQuality(res.stream.defaultQuality);
        setDuration(res.stream.durationSec);
        setCurrentTime(0);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load stream');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = SPEEDS[speedIdx];
  }, [speedIdx]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !data) return;
    const tryPlay = async () => {
      try {
        await v.play();
      } catch {
        /* autoplay may be blocked until user gesture */
      }
    };
    void tryPlay();
  }, [data]);

  useEffect(() => {
    if (!micHolding) return;
    const v = videoRef.current;
    if (v && !v.paused) v.pause();
  }, [micHolding]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  }, []);

  const seek = useCallback((t: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = t;
    setCurrentTime(t);
  }, []);

  const skipIntro = useCallback(() => {
    seek(Math.min(5, duration * 0.15));
  }, [seek, duration]);

  const pageCount = 3;

  useEffect(() => {
    if (!data?.transcript.length) return;
    let idx = -1;
    for (let i = 0; i < data.transcript.length; i++) {
      if (data.transcript[i].t <= currentTime) idx = i;
      else break;
    }
    if (idx < 0) return;
    const wordsPerPage = Math.ceil(data.transcript.length / pageCount);
    const nextPage = Math.min(pageCount - 1, Math.floor(idx / wordsPerPage));
    setTranscriptPage(nextPage);
  }, [currentTime, data, pageCount]);

  const cycleSpeed = () => {
    setSpeedIdx((i) => (i + 1) % SPEEDS.length);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f172a] text-cyan-100">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <p className="mt-3 text-sm font-medium">Loading chapter stage…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#0f172a] text-white">
        <p className="text-rose-300">{error ?? 'Stream unavailable'}</p>
        <Link to="/dashboard/subjects" className="text-sm text-cyan-300 underline">
          Back to subjects
        </Link>
      </div>
    );
  }

  const chapterPct = data.progress.chapterPct;
  const timeSpent = data.progress.timeSpentSec + currentTime;
  const timeBudget = data.progress.timeBudgetSec;
  const timePct = Math.min(100, (timeSpent / timeBudget) * 100);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0f172a] text-white">
      {/* Blurred classroom backdrop */}
      <div
        className="pointer-events-none absolute inset-0 scale-105 bg-cover bg-center opacity-40"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=1600&q=60)',
          filter: 'blur(12px)',
        }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-[#0f172a]/75 backdrop-blur-[12px]" aria-hidden />

      <div className="relative z-10 flex min-h-screen flex-col px-4 pb-28 pt-3 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-4 grid grid-cols-1 items-center gap-3 sm:grid-cols-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-cyan-500/20">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight text-white sm:text-lg">
              EduQuest AI Tutor
            </span>
          </div>

          <div className="flex flex-col items-center">
            <p className="text-xs font-semibold text-slate-200 sm:text-sm">
              Chapter Progress: {chapterPct}%
            </p>
            <div className="mt-1.5 h-2 w-full max-w-[220px] overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #22d3ee, #3b82f6)',
                  width: `${chapterPct}%`,
                }}
                initial={{ width: 0 }}
                animate={{ width: `${chapterPct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>

          <div className="flex flex-col items-center sm:items-end">
            <p className="text-xs font-semibold text-slate-200 sm:text-sm">
              Time: {formatClock(timeSpent)}/{formatClock(timeBudget)}
            </p>
            <div className="mt-1.5 h-2 w-full max-w-[220px] overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #22d3ee, #3b82f6)',
                  width: `${timePct}%`,
                }}
              />
            </div>
          </div>
        </header>

        {/* Main split */}
        <div className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)] lg:gap-6">
          <VideoPlayerArena
            title={data.title}
            videoUrl={data.stream.videoUrl}
            callouts={data.callouts}
            captions={data.captions}
            quality={quality}
            qualityOptions={data.stream.qualityOptions}
            onQualityChange={setQuality}
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            volume={volume}
            muted={muted}
            captionsOn={captionsOn}
            onToggleCaptions={() => setCaptionsOn((c) => !c)}
            onTogglePlay={togglePlay}
            onSeek={seek}
            onVolume={(v) => {
              setVolume(v);
              setMuted(v === 0);
            }}
            onMuteToggle={() => setMuted((m) => !m)}
            onSkipIntro={skipIntro}
            videoRef={videoRef}
            onTimeTick={setCurrentTime}
            onDuration={(d) => {
              if (Number.isFinite(d) && d > 0) setDuration(d);
            }}
            onPlayState={setIsPlaying}
          />

          <TutorTranscriptPanel
            tutorName={data.tutor.name}
            avatarUrl={data.tutor.avatarUrl}
            transcript={data.transcript}
            currentTime={currentTime}
            isPlaying={isPlaying}
            pageIndex={transcriptPage}
            pageCount={pageCount}
            onNextPage={() => setTranscriptPage((p) => Math.min(pageCount - 1, p + 1))}
          />
        </div>
      </div>

      {/* Floating controls */}
      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex items-end justify-center px-4 sm:bottom-7">
        <div className="pointer-events-auto">
          <HoldToAskMic onRecordingChange={setMicHolding} />
        </div>
      </div>

      <div className="fixed bottom-5 right-4 z-40 flex items-center gap-2 sm:bottom-7 sm:right-8">
        <button
          type="button"
          onClick={togglePlay}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-sm font-bold text-white backdrop-blur-md hover:bg-white/20"
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? '||' : '▶'}
        </button>
        <button
          type="button"
          onClick={cycleSpeed}
          className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white backdrop-blur-md hover:bg-white/20"
        >
          {SPEEDS[speedIdx]}x
        </button>
      </div>
    </div>
  );
}
