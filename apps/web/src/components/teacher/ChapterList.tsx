import type { TeacherChapter } from '@brightpath/shared';
import { BookOpen, ChevronRight } from 'lucide-react';

interface ChapterListProps {
  chapters: TeacherChapter[];
  selectedId: string | null;
  onExplore: (chapter: TeacherChapter) => void;
}

export function ChapterList({ chapters, selectedId, onExplore }: ChapterListProps) {
  return (
    <section id="td-chapters" className="td-card w-full rounded-3xl p-8">
      <h2 className="mb-1 text-2xl font-bold text-white">Chapter & Curriculum Overview</h2>
      <p className="mb-6 text-base text-cyan-200/80">Imported modules with class progress metrics.</p>

      {chapters.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cyan-400/35 bg-slate-950/30 px-8 py-10 text-center text-base text-cyan-200/80">
          Upload & verify a textbook to extract chapters.
        </div>
      ) : (
        <ul className="space-y-4">
          {chapters.map((ch) => {
            const active = ch.id === selectedId;
            return (
              <li
                key={ch.id}
                className={[
                  'rounded-2xl border p-8 transition',
                  active
                    ? 'border-[#22D3EE] bg-cyan-400/10 ring-2 ring-cyan-400/25'
                    : 'border-white/10 bg-slate-950/35 hover:border-cyan-400/40',
                ].join(' ')}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-lg font-extrabold text-white">
                      <BookOpen className="h-5 w-5 text-[#22D3EE]" />
                      {ch.title}
                    </p>
                    <p className="mt-2 text-base text-cyan-200/80">{ch.summary}</p>
                    <div className="mt-4">
                      <div className="mb-2 flex justify-between text-base font-bold text-[#A5F3FC]">
                        <span>Class progress</span>
                        <span>
                          {ch.completedCount}/{ch.studentCount} · {ch.classProgressPct}%
                        </span>
                      </div>
                      <div className="td-progress-track h-3 overflow-hidden rounded-full">
                        <div
                          className="td-progress-fill h-full rounded-full"
                          style={{ width: `${ch.classProgressPct}%` }}
                        />
                      </div>
                    </div>
                    <p className="mt-3 text-base font-semibold text-cyan-200/80">
                      {ch.subtopics.length} subtopics · {ch.videoCount} videos · {ch.activityCount} activities
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onExplore(ch)}
                    className="td-btn-cta inline-flex items-center gap-2 rounded-xl px-6 py-3 text-base font-medium"
                  >
                    Explore Chapter <ChevronRight className="h-5 w-5" />
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
