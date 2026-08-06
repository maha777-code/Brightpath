import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { SubjectCurriculumResponse } from '@brightpath/shared';
import { api } from '@/lib/api';
import { SecureVideoPlayer } from '@/components/curriculum/SecureVideoPlayer';

export default function VideoLessonPage() {
  const { subjectId, videoId } = useParams<{ subjectId: string; videoId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<SubjectCurriculumResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!subjectId) return;
    try {
      const res = await api.getSubjectCurriculum(subjectId);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load video');
    }
  }, [subjectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const video = data?.chapters.flatMap((c) => c.videos).find((v) => v.id === videoId);
  const chapter = data?.chapters.find((c) => c.videos.some((v) => v.id === videoId));
  const chapterComplete =
    chapter != null && chapter.videos.length > 0 && chapter.videos.every((v) => v.isCompleted);

  if (error) {
    return (
      <div className="page">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!data || !video || !chapter) {
    return (
      <div className="page">
        <p className="text-slate-500">Loading video…</p>
      </div>
    );
  }

  if (video.isLocked) {
    return (
      <div className="page">
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <p className="mt-4 font-semibold text-slate-700">
          This video is locked. Complete the previous video first.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh max-w-3xl px-4 py-6">
      <button
        type="button"
        className="mb-4 text-sm font-semibold text-slate-600 hover:text-slate-900"
        onClick={() => navigate(`/dashboard/subjects/${subjectId}`)}
      >
        ← Back to chapters
      </button>
      <h1 className="mb-1 text-xl font-extrabold text-slate-900">{video.title}</h1>
      <p className="mb-4 text-sm text-slate-500">
        {data.subjectName} · Chapter {chapter.sequenceOrder}
        {video.isCompleted ? ' · Completed ✓' : ''}
      </p>

      <SecureVideoPlayer
        videoId={video.id}
        src={video.videoUrl}
        durationInSeconds={video.durationInSeconds}
        initialMaxWatched={video.maxWatchedTime}
        onCompleted={() => {
          void load();
        }}
      />

      {video.isCompleted && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          Video complete!{' '}
          {video.sequenceOrder < 5
            ? 'The next lesson is unlocked.'
            : 'All videos done — you can take the chapter test.'}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => navigate(`/dashboard/subjects/${subjectId}`)}
            >
              Back to chapter
            </button>
            {chapterComplete && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate(`/dashboard/chapters/${chapter.id}/test`)}
              >
                Take chapter test
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
