import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Eye, Gamepad2, Loader2, PlayCircle, Plus } from 'lucide-react';
import type { TeacherChapter, TeacherSubtopic, TopicVideoStatus } from '@brightpath/shared';
import { api } from '@/lib/api';
import VideoReviewModal from './VideoReviewModal';

interface SubtopicManagerProps {
  chapter: TeacherChapter | null;
  onUpdated: (chapterId: string) => void;
  onPreviewVideo: (subtopic: TeacherSubtopic) => void;
  onAssignActivity: (subtopic: TeacherSubtopic) => void;
}

function resolveStatus(sub: TeacherSubtopic): TopicVideoStatus {
  if (sub.videoStatus === 'failed') return 'failed';
  if (sub.videoStatus && sub.videoStatus !== 'none') return sub.videoStatus;
  if (sub.hasVideoExplainer && sub.videoUrl) return 'published';
  return 'none';
}

export function SubtopicManager({
  chapter,
  onUpdated,
  onPreviewVideo,
  onAssignActivity,
}: SubtopicManagerProps) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [localSubs, setLocalSubs] = useState<TeacherSubtopic[]>([]);
  const [reviewSub, setReviewSub] = useState<TeacherSubtopic | null>(null);
  const pollRef = useRef<number | null>(null);
  const onUpdatedRef = useRef(onUpdated);
  onUpdatedRef.current = onUpdated;

  useEffect(() => {
    setLocalSubs(chapter?.subtopics ?? []);
  }, [chapter]);

  // Poll generating topics every 3s until pending_review / failed
  useEffect(() => {
    const generatingIds = localSubs
      .filter((s) => resolveStatus(s) === 'generating')
      .map((s) => s.id);

    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }

    if (generatingIds.length === 0) return;

    const tick = async () => {
      for (const id of generatingIds) {
        try {
          const res = await api.getTopicVideoStatus(id);
          const next = res.subtopic
            ? {
                ...res.subtopic,
                videoProgress: res.progress ?? res.subtopic.videoProgress,
                videoError: res.error ?? res.subtopic.videoError,
                generatedVideoUrl: res.videoUrl ?? res.subtopic.generatedVideoUrl,
                videoStatus:
                  res.status === 'failed'
                    ? ('failed' as const)
                    : res.status === 'pending_review'
                      ? ('pending_review' as const)
                      : ('generating' as const),
              }
            : null;

          if (!next) continue;

          setLocalSubs((prev) => prev.map((p) => (p.id === next.id ? { ...p, ...next } : p)));

          if (res.status === 'pending_review' || res.status === 'failed') {
            if (chapter?.id) onUpdatedRef.current(chapter.id);
          }
        } catch {
          /* keep polling */
        }
      }
    };

    void tick();
    pollRef.current = window.setInterval(() => void tick(), 3000);

    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [
    chapter?.id,
    localSubs
      .filter((s) => resolveStatus(s) === 'generating')
      .map((s) => s.id)
      .sort()
      .join(','),
  ]);

  if (!chapter) {
    return (
      <section className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-soft sm:p-6">
        <h2 className="text-lg font-extrabold text-slate-800">Lesson & Content Enrichment</h2>
        <p className="mt-2 text-sm text-slate-500">Select a chapter to manage subtopics, videos, and games.</p>
      </section>
    );
  }

  const patchSub = (sub: TeacherSubtopic) => {
    setLocalSubs((prev) => prev.map((p) => (p.id === sub.id ? sub : p)));
  };

  const startGenerate = async (sub: TeacherSubtopic) => {
    setBusyId(sub.id);
    try {
      const res = await api.generateTopicVideo(sub.id);
      patchSub(res.subtopic);
      onUpdated(chapter.id);
    } catch (e) {
      patchSub({
        ...sub,
        videoStatus: 'failed',
        videoProgress: 0,
        videoError: e instanceof Error ? e.message : 'Failed to start generation',
      });
    } finally {
      setBusyId(null);
    }
  };

  /** Refresh status before opening modal — demotes empty/missing MP4 to failed. */
  const openReview = async (sub: TeacherSubtopic) => {
    setBusyId(sub.id);
    try {
      const res = await api.getTopicVideoStatus(sub.id);
      const reconciledStatus =
        res.subtopic?.videoStatus ??
        (res.status === 'failed'
          ? 'failed'
          : res.status === 'pending_review'
            ? 'pending_review'
            : sub.videoStatus);

      const next: TeacherSubtopic = {
        ...sub,
        ...(res.subtopic ?? {}),
        videoProgress: res.progress ?? res.subtopic?.videoProgress ?? sub.videoProgress,
        videoError: res.error ?? res.subtopic?.videoError ?? null,
        generatedVideoUrl: res.videoUrl ?? res.subtopic?.generatedVideoUrl ?? sub.generatedVideoUrl,
        videoStatus: reconciledStatus,
      };
      patchSub(next);

      if (next.videoStatus === 'failed') {
        if (chapter?.id) onUpdated(chapter.id);
        return;
      }

      setReviewSub(next);
      if (resolveStatus(next) === 'published') onPreviewVideo(next);
    } catch (e) {
      patchSub({
        ...sub,
        videoError: e instanceof Error ? e.message : 'Could not load video status',
      });
    } finally {
      setBusyId(null);
    }
  };

  const attachDefaults = async (sub: TeacherSubtopic) => {
    setBusyId(sub.id);
    try {
      await api.updateSubtopicMedia(sub.id, {
        hasGamifiedActivity: true,
        activityTitle: sub.activityTitle || `${sub.code} Gamified Activity`,
      });
      onUpdated(chapter.id);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-soft sm:p-6">
      <h2 className="text-lg font-extrabold text-slate-800">Lesson & Content Enrichment</h2>
      <p className="mb-4 text-sm text-slate-500">{chapter.title}</p>

      <ul className="space-y-3">
        {localSubs.map((sub) => {
          const status = resolveStatus(sub);
          return (
            <li key={sub.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-slate-800">
                    <span className="mr-2 rounded-md bg-indigo-100 px-1.5 py-0.5 text-xs text-indigo-700">
                      {sub.code}
                    </span>
                    {sub.title}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold">
                    <VideoStatusBadge status={status} error={sub.videoError} progress={sub.videoProgress} />
                    {sub.hasGamifiedActivity ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">
                        Activity ready
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-600">
                        No activity
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex max-w-full flex-wrap justify-end gap-2">
                  <GenerateVideoButton
                    sub={sub}
                    status={status}
                    busy={busyId === sub.id}
                    onGenerate={() => void startGenerate(sub)}
                    onReview={() => void openReview(sub)}
                  />

                  <button
                    type="button"
                    onClick={() => onAssignActivity(sub)}
                    disabled={!sub.hasGamifiedActivity}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-amber-200 bg-white px-2.5 py-2 text-[11px] font-bold text-amber-800 sm:px-3 sm:text-xs disabled:opacity-40"
                  >
                    <Gamepad2 className="h-3.5 w-3.5 shrink-0" />
                    Generate Gamified Activity
                  </button>
                  <button
                    type="button"
                    onClick={() => void attachDefaults(sub)}
                    disabled={busyId === sub.id}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-[#5B46BA] px-2.5 py-2 text-[11px] font-bold text-white sm:px-3 sm:text-xs disabled:opacity-60"
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                    {busyId === sub.id ? 'Attaching…' : 'Attach media'}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {reviewSub && (
        <VideoReviewModal
          subtopic={reviewSub}
          onClose={() => setReviewSub(null)}
          onUpdated={(s) => {
            patchSub(s);
            onUpdated(chapter.id);
            if (resolveStatus(s) === 'pending_review') setReviewSub(s);
            else setReviewSub(null);
          }}
        />
      )}
    </section>
  );
}

function VideoStatusBadge({
  status,
  error,
  progress,
}: {
  status: TopicVideoStatus;
  error?: string | null;
  progress?: number;
}) {
  if (status === 'generating') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-indigo-700">
        <Loader2 className="h-3 w-3 animate-spin" /> Generating… {progress ?? 0}%
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-rose-700" title={error ?? undefined}>
        Generation Failed
      </span>
    );
  }
  if (status === 'pending_review') {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800 ring-2 ring-amber-300/60">
        Video Pending Review
      </span>
    );
  }
  if (status === 'published') {
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800">
        Video Published to Students
      </span>
    );
  }
  return (
    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-600">No video</span>
  );
}

function GenerateVideoButton({
  sub,
  status,
  busy,
  onGenerate,
  onReview,
}: {
  sub: TeacherSubtopic;
  status: TopicVideoStatus;
  busy: boolean;
  onGenerate: () => void;
  onReview: () => void;
}) {
  if (status === 'generating') {
    const stageLabel =
      sub.videoJobStage === 'retrieving'
        ? 'Retrieving context'
        : sub.videoJobStage === 'scripting'
          ? 'Writing script'
          : sub.videoJobStage === 'tts'
            ? 'Synthesizing voice'
            : sub.videoJobStage === 'rendering'
              ? 'Rendering Remotion'
              : sub.videoJobStage === 'queued'
                ? 'Queued'
                : 'Generating';
    return (
      <button
        type="button"
        disabled
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-2 text-[11px] font-bold text-indigo-700 sm:px-3 sm:text-xs disabled:opacity-80"
        title={stageLabel}
      >
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
        Generating Video… {Math.max(0, Math.min(100, sub.videoProgress ?? 0))}%
      </button>
    );
  }

  if (status === 'failed') {
    return (
      <button
        type="button"
        onClick={onGenerate}
        disabled={busy}
        title={sub.videoError ?? 'Generation failed'}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-rose-300 bg-rose-50 px-2.5 py-2 text-[11px] font-bold text-rose-800 hover:bg-rose-100 sm:px-3 sm:text-xs disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
        ) : (
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        )}
        Generation Failed - Retry
      </button>
    );
  }

  if (status === 'pending_review') {
    return (
      <button
        type="button"
        onClick={onReview}
        className="inline-flex animate-pulse items-center gap-1.5 whitespace-nowrap rounded-xl border-2 border-amber-400 bg-amber-50 px-2.5 py-2 text-[11px] font-bold text-amber-900 shadow-[0_0_0_3px_rgba(251,191,36,0.25)] sm:px-3 sm:text-xs"
      >
        <Eye className="h-3.5 w-3.5 shrink-0" />
        Review Video
      </button>
    );
  }

  if (status === 'published') {
    return (
      <button
        type="button"
        onClick={onReview}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 sm:px-3 sm:text-xs"
      >
        <PlayCircle className="h-3.5 w-3.5 shrink-0" />
        Video Ready / Re-generate
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onGenerate}
      disabled={busy}
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-indigo-300 bg-white px-2.5 py-2 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 sm:px-3 sm:text-xs disabled:opacity-50"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
      ) : (
        <PlayCircle className="h-3.5 w-3.5 shrink-0" />
      )}
      Generate Video Explainer
    </button>
  );
}
