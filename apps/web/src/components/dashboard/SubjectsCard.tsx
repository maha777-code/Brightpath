import { useNavigate } from 'react-router-dom';

export interface SubjectProgressItem {
  id: string;
  title: string;
  mastery: number;
  color: string;
  route?: string;
}

interface SubjectsCardProps {
  subjects: SubjectProgressItem[];
}

export function SubjectsCard({ subjects }: SubjectsCardProps) {
  const navigate = useNavigate();

  return (
    <section
      id="subjects"
      className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-soft backdrop-blur-md sm:p-6"
    >
      <h2 className="mb-4 text-lg font-extrabold text-slate-800">My Subjects</h2>
      <div className="grid gap-3">
        {subjects.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => s.route && navigate(s.route)}
            className="rounded-2xl border border-slate-100 bg-white p-4 text-left transition hover:border-teal-200 hover:shadow-sm"
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="font-bold text-slate-800">{s.title}</p>
              <span className="text-sm font-semibold text-teal-700">{s.mastery}% Mastered</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${s.mastery}%`, background: s.color }}
              />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
