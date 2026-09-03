import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Eye, LayoutTemplate, Loader2, PlayCircle, Plus } from 'lucide-react';
import {
  getGenerationTemplate,
  isActivityPlayable,
  type GenerationTemplateId,
  type TeacherChapter,
  type TeacherSubtopic,
  type TopicVideoStatus,
} from '@brightpath/shared';
import { api } from '@/lib/api';
import VideoReviewModal from './VideoReviewModal';
import ActivityReviewModal from './ActivityReviewModal';
import AttachMediaModal from './AttachMediaModal';
import TemplateSelectorModal from './TemplateSelectorModal';

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
  const [isGenerating, setIsGenerating] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; message: string } | null>(null);
  const [reviewActivitySub, setReviewActivitySub] = useState<TeacherSubtopic | null>(null);
  const [attachSub, setAttachSub] = useState<TeacherSubtopic | null>(null);
  const [templatePick, setTemplatePick] = useState<{
    kind: 'video' | 'activity';
    sub: TeacherSubtopic;
    openReview?: boolean;
  } | null>(null);
  const [templateBySub, setTemplateBySub] = useState<Record<string, GenerationTemplateId>>({});
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

          setLocalSubs((prev) =>
            prev.map((p) =>
              p.id === next.id
                ? {
                    ...p,
                    ...next,
                    activity: next.activity ?? p.activity,
                    attachments:
                      next.attachments && next.attachments.length > 0
                        ? next.attachments
                        : (p.attachments ?? next.attachments),
                    attachmentCount: Math.max(
                      next.attachmentCount ?? 0,
                      p.attachmentCount ?? 0,
                      next.attachments?.length ?? 0,
                      p.attachments?.length ?? 0,
                    ),
                  }
                : p,
            ),
          );

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
      <section
        id="td-enrichment"
        className="td-card max-h-[calc(100vh-250px)] w-full overflow-y-auto rounded-3xl p-8"
      >
        <h2 className="text-2xl font-bold text-white">Lesson & Content Enrichment</h2>
        <p className="mt-2 text-base text-cyan-200/80">Select a chapter to manage subtopics, videos, and games.</p>
      </section>
    );
  }

  const patchSub = (sub: TeacherSubtopic) => {
    setLocalSubs((prev) =>
      prev.map((p) =>
        p.id === sub.id
          ? {
              ...p,
              ...sub,
              activity: sub.activity ?? p.activity,
              attachments:
                sub.attachments && sub.attachments.length > 0
                  ? sub.attachments
                  : (p.attachments ?? sub.attachments),
              attachmentCount: Math.max(
                sub.attachmentCount ?? 0,
                p.attachmentCount ?? 0,
                sub.attachments?.length ?? 0,
                p.attachments?.length ?? 0,
              ),
            }
          : p,
      ),
    );
  };

  const showToast = (kind: 'ok' | 'err', message: string) => {
    setToast({ kind, message });
    window.setTimeout(() => setToast(null), 4500);
  };

  const generateActivity = async (
    sub: TeacherSubtopic,
    openReview = false,
    templateId?: GenerationTemplateId,
  ) => {
    if (!chapter) return;
    const chosen = templateId ?? templateBySub[sub.id] ?? 'tom_and_jerry';
    setIsGenerating((prev) => ({ ...prev, [sub.id]: true }));
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 60_000);
    try {
      const res = await api.generateActivity(
        {
          subtopicId: sub.id,
          chapterId: chapter.id,
          type: getGenerationTemplate(chosen).activityType,
          templateId: chosen,
        },
        { signal: ctrl.signal },
      );
      const next: TeacherSubtopic = { ...res.subtopic, activity: res.activity };
      patchSub(next);
      onUpdated(chapter.id);
      onAssignActivity(next);
      showToast('ok', `${getGenerationTemplate(chosen).title} generated!`);
      if (openReview) setReviewActivitySub(next);
    } catch {
      showToast('err', 'Failed to generate activity. Please try again.');
    } finally {
      window.clearTimeout(timer);
      setIsGenerating((prev) => {
        const next = { ...prev };
        delete next[sub.id];
        return next;
      });
    }
  };

  const startGenerate = async (sub: TeacherSubtopic, templateId?: GenerationTemplateId) => {
    const chosen = templateId ?? templateBySub[sub.id] ?? 'tom_and_jerry';
    setBusyId(sub.id);
    try {
      const res = await api.generateTopicVideo(sub.id, { templateId: chosen });
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

  return (
    <section
      id="td-enrichment"
      className="td-card max-h-[calc(100vh-250px)] w-full overflow-y-auto rounded-3xl p-8"
    >
      <h2 className="text-2xl font-bold text-white">Lesson & Content Enrichment</h2>
      <p className="mb-6 text-base text-cyan-200/80">{chapter.title}</p>

      {toast && (
        <div
          className={[
            'mb-4 rounded-xl px-4 py-3 text-sm font-semibold',
            toast.kind === 'ok'
              ? 'border border-emerald-400/40 bg-emerald-950/70 text-emerald-100'
              : 'border border-rose-400/40 bg-rose-950/70 text-rose-100',
          ].join(' ')}
          role="status"
        >
          {toast.message}
        </div>
      )}

      <ul className="space-y-4">
        {localSubs.map((sub) => {
          const status = resolveStatus(sub);
          const generating = Boolean(isGenerating[sub.id]);
          const activityReady = isActivityPlayable(sub.activity);
          return (
            <li key={sub.id} className="rounded-2xl border border-white/10 bg-slate-950/40 p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-lg font-extrabold text-white">
                    <span className="mr-2 rounded-md bg-cyan-500/20 px-2 py-0.5 text-sm text-[#A5F3FC] ring-1 ring-cyan-400/30">
                      {sub.code}
                    </span>
                    {sub.title}
                    {(sub.attachmentCount ?? sub.attachments?.length ?? 0) > 0 ? (
                      <span className="ml-2 align-middle rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-cyan-100">
                        📎 {sub.attachmentCount ?? sub.attachments?.length}{' '}
                        {(sub.attachmentCount ?? sub.attachments?.length) === 1 ? 'file' : 'files'}{' '}
                        attached
                      </span>
                    ) : null}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-base font-medium">
                    <VideoStatusBadge status={status} error={sub.videoError} progress={sub.videoProgress} />
                    {activityReady ? (
                      <span className="rounded-full bg-[#FBBF24]/80 px-4 py-1.5 text-[#FEF3C7]">
                        Activity ready
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-700/80 px-4 py-1.5 text-[#A5F3FC]">
                        No activity
                      </span>
                    )}
                    {templateBySub[sub.id] ? (
                      <span className="rounded-full bg-white/10 px-4 py-1.5 text-cyan-100">
                        {getGenerationTemplate(templateBySub[sub.id]).icon}{' '}
                        {getGenerationTemplate(templateBySub[sub.id]).title}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex max-w-full flex-wrap justify-end gap-3">
                  <GenerateVideoButton
                    sub={sub}
                    status={status}
                    busy={busyId === sub.id}
                    onGenerate={() => setTemplatePick({ kind: 'video', sub })}
                    onReview={() => void openReview(sub)}
                  />

                  {activityReady && !generating && (
                    <button
                      type="button"
                      onClick={() => {
                        onAssignActivity(sub);
                        setReviewActivitySub(sub);
                      }}
                      className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-amber-400/40 bg-amber-500/20 px-6 py-3 text-base font-medium text-[#FEF3C7]"
                    >
                      <Eye className="h-5 w-5 shrink-0" />
                      Review Activity
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setTemplatePick({ kind: 'activity', sub, openReview: activityReady })}
                    disabled={generating}
                    className={[
                      'inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-amber-400/40 px-6 py-3 text-base font-medium text-white disabled:cursor-wait',
                      generating ? 'bg-amber-900/50' : 'bg-[#FBBF24]/80',
                    ].join(' ')}
                  >
                    {generating ? (
                      <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
                    ) : (
                      <LayoutTemplate className="h-5 w-5 shrink-0" />
                    )}
                    {generating
                      ? 'Generating Activity...'
                      : activityReady
                        ? 'Select Template / Regenerate'
                        : 'Select Template'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttachSub(sub)}
                    className="td-btn-cta inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-6 py-3 text-base font-medium"
                  >
                    <Plus className="h-5 w-5 shrink-0" />
                    Attach media
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
      {reviewActivitySub?.activity && (
        <ActivityReviewModal
          subtopic={reviewActivitySub}
          activity={reviewActivitySub.activity}
          regenerating={Boolean(isGenerating[reviewActivitySub.id])}
          onClose={() => setReviewActivitySub(null)}
          onRegenerate={() => void generateActivity(reviewActivitySub, true)}
        />
      )}
      {templatePick && (
        <TemplateSelectorModal
          kind={templatePick.kind}
          title={
            templatePick.kind === 'video'
              ? `Video template · ${templatePick.sub.code}`
              : `Activity template · ${templatePick.sub.code}`
          }
          subtitle={templatePick.sub.title}
          confirmLabel="Generate with Selected Template"
          initialTemplateId={templateBySub[templatePick.sub.id]}
          submitting={
            templatePick.kind === 'video'
              ? busyId === templatePick.sub.id
              : Boolean(isGenerating[templatePick.sub.id])
          }
          onClose={() => setTemplatePick(null)}
          onConfirm={(templateId) => {
            setTemplateBySub((prev) => ({ ...prev, [templatePick.sub.id]: templateId }));
            const target = templatePick.sub;
            const openReview = templatePick.openReview;
            setTemplatePick(null);
            if (templatePick.kind === 'video') {
              void startGenerate(target, templateId);
            } else {
              void generateActivity(target, Boolean(openReview), templateId);
            }
          }}
        />
      )}
      {attachSub && (
        <AttachMediaModal
          subtopicId={attachSub.id}
          subtopicLabel={`${attachSub.code} ${attachSub.title}`}
          onClose={() => setAttachSub(null)}
          onAttached={(incoming) => {
            const merged = [...(attachSub.attachments ?? []), ...incoming];
            patchSub({
              ...attachSub,
              attachments: merged,
              attachmentCount: merged.length,
            });
            showToast(
              'ok',
              `📎 ${incoming.length} file${incoming.length === 1 ? '' : 's'} attached`,
            );
            setAttachSub(null);
            onUpdated(chapter.id);
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
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#06B6D4]/80 px-4 py-1.5 text-[#A5F3FC]">
        <Loader2 className="h-4 w-4 animate-spin" /> Generating… {progress ?? 0}%
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="rounded-full bg-rose-500/80 px-4 py-1.5 text-rose-50" title={error ?? undefined}>
        Generation Failed
      </span>
    );
  }
  if (status === 'pending_review') {
    return (
      <span className="rounded-full bg-[#06B6D4]/80 px-4 py-1.5 text-[#A5F3FC] ring-2 ring-cyan-200/40">
        Video ready
      </span>
    );
  }
  if (status === 'published') {
    return (
      <span className="rounded-full bg-[#10B981]/80 px-4 py-1.5 text-[#A7F3D0]">
        Video Published
      </span>
    );
  }
  return (
    <span className="rounded-full bg-slate-700/80 px-4 py-1.5 text-[#A5F3FC]">No video</span>
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
        className="inline-flex min-w-[180px] flex-col items-stretch gap-1.5 whitespace-nowrap rounded-xl border border-cyan-400/40 bg-[#06B6D4]/20 px-6 py-3 text-base font-medium text-[#A5F3FC] disabled:opacity-80"
        title={stageLabel}
      >
        <span className="inline-flex items-center gap-1.5">
          <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
          Generating Video… {Math.max(0, Math.min(100, sub.videoProgress ?? 0))}%
        </span>
        <span className="td-progress-track h-1.5 overflow-hidden rounded-full">
          <span
            className="td-progress-fill block h-full rounded-full"
            style={{ width: `${Math.max(0, Math.min(100, sub.videoProgress ?? 0))}%` }}
          />
        </span>
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
        className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-rose-400/50 bg-rose-500/80 px-6 py-3 text-base font-medium text-white hover:bg-rose-500 disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
        ) : (
          <AlertTriangle className="h-5 w-5 shrink-0" />
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
        className="td-btn-cta inline-flex animate-pulse items-center gap-2 whitespace-nowrap rounded-xl px-6 py-3 text-base font-medium"
      >
        <Eye className="h-5 w-5 shrink-0" />
        Review Video
      </button>
    );
  }

  if (status === 'published') {
    return (
      <button
        type="button"
        onClick={onReview}
        className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-[#10B981]/80 px-6 py-3 text-base font-medium text-white hover:bg-[#10B981]"
      >
        <PlayCircle className="h-5 w-5 shrink-0" />
        Video Ready / Re-generate
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onGenerate}
      disabled={busy}
      className="td-btn-cta inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-6 py-3 text-base font-medium disabled:opacity-50"
    >
      {busy ? (
        <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
      ) : (
        <LayoutTemplate className="h-5 w-5 shrink-0" />
      )}
      Select Template
    </button>
  );
}
