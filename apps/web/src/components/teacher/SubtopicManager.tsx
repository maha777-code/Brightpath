import { useState } from 'react';
import { Gamepad2, PlayCircle, Plus } from 'lucide-react';
import type { TeacherChapter, TeacherSubtopic } from '@brightpath/shared';
import { api } from '@/lib/api';

interface SubtopicManagerProps {
  chapter: TeacherChapter | null;
  onUpdated: (chapterId: string) => void;
  onPreviewVideo: (subtopic: TeacherSubtopic) => void;
  onAssignActivity: (subtopic: TeacherSubtopic) => void;
}

export function SubtopicManager({
  chapter,
  onUpdated,
  onPreviewVideo,
  onAssignActivity,
}: SubtopicManagerProps) {
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!chapter) {
    return (
      <section className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-soft sm:p-6">
        <h2 className="text-lg font-extrabold text-slate-800">Lesson & Content Enrichment</h2>
        <p className="mt-2 text-sm text-slate-500">Select a chapter to manage subtopics, videos, and games.</p>
      </section>
    );
  }

  const attachDefaults = async (sub: TeacherSubtopic) => {
    setBusyId(sub.id);
    try {
      await api.updateSubtopicMedia(sub.id, {
        hasVideoExplainer: true,
        hasGamifiedActivity: true,
        videoTitle: sub.videoTitle || `${sub.code} Video Explainer`,
        activityTitle: sub.activityTitle || `${sub.code} Gamified Activity`,
        videoUrl: sub.videoUrl || 'https://www.youtube.com/embed/8kL5eGgK2gE',
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
        {chapter.subtopics.map((sub) => (
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
                  {sub.hasVideoExplainer ? (
                    <span className="rounded-full bg-violet-100 px-2 py-0.5 text-violet-700">Video ready</span>
                  ) : (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-600">No video</span>
                  )}
                  {sub.hasGamifiedActivity ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-800">Activity ready</span>
                  ) : (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-600">No activity</span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onPreviewVideo(sub)}
                  disabled={!sub.hasVideoExplainer}
                  className="inline-flex items-center gap-1 rounded-xl border border-violet-200 bg-white px-3 py-2 text-xs font-bold text-violet-700 disabled:opacity-40"
                >
                  <PlayCircle className="h-3.5 w-3.5" /> Video Explainer
                </button>
                <button
                  type="button"
                  onClick={() => onAssignActivity(sub)}
                  disabled={!sub.hasGamifiedActivity}
                  className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-amber-800 disabled:opacity-40"
                >
                  <Gamepad2 className="h-3.5 w-3.5" /> Gamified Activity
                </button>
                <button
                  type="button"
                  onClick={() => void attachDefaults(sub)}
                  disabled={busyId === sub.id}
                  className="inline-flex items-center gap-1 rounded-xl bg-[#5B46BA] px-3 py-2 text-xs font-bold text-white"
                >
                  <Plus className="h-3.5 w-3.5" /> Attach media
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
