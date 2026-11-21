import '@/styles/curriculum-studio.css';
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
      <h2 className="cs-h mb-1 text-2xl font-bold">Chapter & Curriculum Overview</h2>
      <p className="cs-muted mb-6 text-base">Imported modules with class progress metrics.</p>

      {chapters.length === 0 ? (
        <div className="cs-drop cs-muted rounded-2xl px-8 py-10 text-center text-base">
          Upload & verify a textbook to extract chapters.
        </div>
      ) : (
        <ul className="cs-list space-y-4">
          {chapters.map((ch) => {
            const active = ch.id === selectedId;
            return (
              <li key={ch.id} className="cs-item rounded-2xl p-7" data-active={active ? 'true' : 'false'}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="cs-h flex items-center gap-2 text-lg font-extrabold">
                      <BookOpen className="cs-icon h-5 w-5 shrink-0" />
                      {ch.title}
                    </p>
                    <p className="cs-muted mt-2 text-base leading-relaxed">{ch.summary}</p>
                    <div className="mt-4">
                      <div className="cs-text mb-2 flex justify-between text-base font-semibold">
                        <span>Class progress</span>
                        <span>
                          {ch.completedCount}/{ch.studentCount} · {ch.classProgressPct}%
                        </span>
                      </div>
                      <div className="cs-track h-2.5 overflow-hidden rounded-full">
                        <div className="cs-fill h-full rounded-full" style={{ width: `${ch.classProgressPct}%` }} />
                      </div>
                    </div>
                    <p className="cs-muted mt-3 text-base font-medium">
                      {ch.subtopics.length} subtopics · {ch.videoCount} videos · {ch.activityCount} activities
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onExplore(ch)}
                    className="cs-btn"
                    data-tone={active ? 'primary' : 'outline'}
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
