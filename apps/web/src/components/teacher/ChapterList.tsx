import type { TeacherChapter } from '@brightpath/shared';
import { BookOpen, ChevronRight } from 'lucide-react';

interface ChapterListProps {
  chapters: TeacherChapter[];
  selectedId: string | null;
  onExplore: (chapter: TeacherChapter) => void;
}

export function ChapterList({ chapters, selectedId, onExplore }: ChapterListProps) {
  return (
    <section className="rounded-3xl border border-indigo-100 bg-white p-5 shadow-soft sm:p-6">
      <h2 className="mb-1 text-lg font-extrabold text-slate-800">Chapter & Curriculum Overview</h2>
      <p className="mb-4 text-sm text-slate-500">Imported modules with class progress metrics.</p>

      {chapters.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          Upload & verify a textbook to extract chapters.
        </div>
      ) : (
        <ul className="space-y-3">
          {chapters.map((ch) => {
            const active = ch.id === selectedId;
            return (
              <li
                key={ch.id}
                className={[
                  'rounded-2xl border p-4 transition',
                  active
                    ? 'border-indigo-300 bg-indigo-50/70 ring-2 ring-indigo-100'
                    : 'border-slate-100 bg-white hover:border-indigo-200',
                ].join(' ')}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
                      <BookOpen className="h-4 w-4 text-indigo-600" />
                      {ch.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{ch.summary}</p>
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-[11px] font-bold text-slate-500">
                        <span>Class progress</span>
                        <span>
                          {ch.completedCount}/{ch.studentCount} · {ch.classProgressPct}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-[#5B46BA]"
                          style={{ width: `${ch.classProgressPct}%` }}
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] font-semibold text-slate-400">
                      {ch.subtopics.length} subtopics · {ch.videoCount} videos · {ch.activityCount} activities
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onExplore(ch)}
                    className="inline-flex items-center gap-1 rounded-xl bg-[#5B46BA] px-3 py-2 text-xs font-bold text-white shadow-sm"
                  >
                    Explore Chapter <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
