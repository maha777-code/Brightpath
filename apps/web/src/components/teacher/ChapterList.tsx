import type { TeacherChapter } from '@brightpath/shared';
import { BookOpen, ChevronRight } from 'lucide-react';

interface ChapterListProps {
  chapters: TeacherChapter[];
  selectedId: string | null;
  onExplore: (chapter: TeacherChapter) => void;
}

export function ChapterList({ chapters, selectedId, onExplore }: ChapterListProps) {
  return (
    <section id="td-chapters" className="td-card rounded-3xl p-5 sm:p-6">
      <h2 className="mb-1 text-lg font-extrabold text-white">Chapter & Curriculum Overview</h2>
      <p className="mb-4 text-sm text-[#A5F3FC]">Imported modules with class progress metrics.</p>

      {chapters.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cyan-400/35 bg-slate-950/30 px-4 py-8 text-center text-sm text-[#A5F3FC]">
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
                    ? 'border-[#22D3EE] bg-cyan-400/10 ring-2 ring-cyan-400/25'
                    : 'border-white/10 bg-slate-950/35 hover:border-cyan-400/40',
                ].join(' ')}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-extrabold text-white">
                      <BookOpen className="h-4 w-4 text-[#22D3EE]" />
                      {ch.title}
                    </p>
                    <p className="mt-1 text-xs text-[#A5F3FC]">{ch.summary}</p>
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-[11px] font-bold text-[#A5F3FC]">
                        <span>Class progress</span>
                        <span>
                          {ch.completedCount}/{ch.studentCount} · {ch.classProgressPct}%
                        </span>
                      </div>
                      <div className="td-progress-track h-2 overflow-hidden rounded-full">
                        <div
                          className="td-progress-fill h-full rounded-full"
                          style={{ width: `${ch.classProgressPct}%` }}
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] font-semibold text-cyan-200/70">
                      {ch.subtopics.length} subtopics · {ch.videoCount} videos · {ch.activityCount} activities
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onExplore(ch)}
                    className="td-btn-cta inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold"
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
