import { useNavigate } from 'react-router-dom';
import type { AnalyticsSubjectItem } from '@brightpath/shared';

interface MySubjectsListProps {
  subjects: AnalyticsSubjectItem[];
  loading?: boolean;
  subjectFilter?: string;
}

function matchesFilter(name: string, filter?: string) {
  if (!filter || filter === 'all') return true;
  const n = name.toLowerCase();
  if (filter === 'phonics') return /phon|read|sight|letter|english|literacy/.test(n);
  if (filter === 'math') return /math|number|arith|count/.test(n);
  if (filter === 'science') return /sci|chem|nature|space/.test(n);
  return true;
}

/** Live "My Subjects" progress list driven by GET /user/analytics */
export function MySubjectsList({ subjects, loading, subjectFilter = 'all' }: MySubjectsListProps) {
  const navigate = useNavigate();
  const visible = subjects.filter((s) => matchesFilter(s.subjectName, subjectFilter));

  return (
    <section
      id="subjects"
      className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-soft backdrop-blur-md sm:p-6"
    >
      <h2 className="mb-4 text-lg font-extrabold text-slate-800">My Subjects</h2>

      {loading && (
        <p className="py-6 text-center text-sm text-slate-400">Loading subjects…</p>
      )}

      {!loading && subjects.length === 0 && (
        <p className="py-4 text-center text-sm text-slate-500">
          No subjects for this age group yet.
        </p>
      )}

      {!loading && subjects.length > 0 && visible.length === 0 && (
        <p className="py-4 text-center text-sm text-slate-500">
          No subjects match this filter.
        </p>
      )}

      <div className="grid gap-3">
        {visible.map((s) => (
          <button
            key={s.subjectId}
            type="button"
            onClick={() => navigate(`/dashboard/subjects/${s.subjectId}`)}
            className="cursor-pointer rounded-2xl border border-slate-100 bg-white p-4 text-left transition hover:border-teal-200 hover:shadow-sm"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="font-bold text-slate-800">{s.subjectName}</p>
              <span className="text-sm font-semibold text-teal-700">
                {s.masteryPercentage}% Mastered
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${s.masteryPercentage}%`, background: s.color }}
              />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

/** @deprecated use MySubjectsList */
export function SubjectsCard({
  subjects,
}: {
  subjects: { id: string; title: string; mastery: number; color: string; route?: string }[];
}) {
  const mapped: AnalyticsSubjectItem[] = subjects.map((s) => ({
    subjectId: s.id,
    subjectName: s.title,
    masteryPercentage: s.mastery,
    color: s.color,
    learnRoute: s.route ?? null,
    slug: s.id,
  }));
  return <MySubjectsList subjects={mapped} />;
}
