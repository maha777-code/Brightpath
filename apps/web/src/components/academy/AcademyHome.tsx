import { Award, Layers, Users } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type AcademySubjectStat = {
  subject: string;
  instructor: string;
  syllabusProgress: number;
  quizzesConducted: number;
  assignmentsGiven: number;
  nextTestDate: string | null;
};

export type AcademyStats = {
  memberCount: number;
  tutorCount: number;
  batchCount: number;
  seatsUsed: number;
  maxLicenses: number;
  subjects: AcademySubjectStat[];
};

export function AcademyHome({
  userName,
  stats,
}: {
  userName: string | null;
  stats: AcademyStats | null;
}) {
  const tutors = stats?.tutorCount ?? 0;
  const batches = stats?.batchCount ?? 0;
  const used = stats?.seatsUsed ?? 0;
  const total = stats?.maxLicenses ?? 0;
  const seatPct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const subjects = stats?.subjects ?? [];

  return (
    <div className="space-y-8">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Academy Dashboard</span>
        <h2 className="mt-1 text-3xl font-extrabold text-white">Welcome{userName ? `, ${userName}` : ''}</h2>
        <p className="mt-1 text-sm text-slate-400">Your academy workspace overview and subject analytics.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Tutors / Staff</span>
            <Users className="h-5 w-5 text-cyan-400" />
          </div>
          <p className="mt-3 text-4xl font-extrabold text-white">{stats ? tutors : '—'}</p>
          <p className="mt-2 text-xs text-slate-500">Active teaching faculty</p>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Student Batches</span>
            <Layers className="h-5 w-5 text-purple-400" />
          </div>
          <p className="mt-3 text-4xl font-extrabold text-white">{stats ? batches : '—'}</p>
          <p className="mt-2 text-xs text-slate-500">Active learning cohorts</p>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Seats Capacity</span>
            <Award className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="mt-3 text-4xl font-extrabold text-white">
            {stats ? used : '—'}{' '}
            <span className="text-lg font-normal text-slate-400">/ {stats ? total : '—'}</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">Seats allocated</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-emerald-400" style={{ width: `${seatPct}%` }} />
          </div>
        </article>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <h3 className="text-xl font-bold text-white">Subject Progress & Assessment Tracker</h3>
        <p className="mt-1 text-xs text-slate-400">
          Syllabus completion, quizzes and internals, and assignments issued per subject.
        </p>
        {subjects.length === 0 ? (
          <p className="mt-8 text-sm text-slate-400">
            No subject curriculum yet. Upload a textbook in Curriculum Studio to track syllabus progress.
          </p>
        ) : (
          <div className="mt-6 h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjects} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="subject" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#f8fafc',
                  }}
                />
                <Legend />
                <Bar dataKey="syllabusProgress" fill="#00b4d8" name="Syllabus Progress (%)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="quizzesConducted" fill="#7c3aed" name="Quizzes & Internals" radius={[6, 6, 0, 0]} />
                <Bar dataKey="assignmentsGiven" fill="#10b981" name="Assignments Given" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-bold text-white">Subject Syllabus Status</h3>
        {subjects.length === 0 ? (
          <p className="text-sm text-slate-400">Subjects appear here after tutors are assigned a focus or a textbook is added.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-slate-800 bg-slate-950 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Instructor</th>
                  <th className="px-4 py-3">Syllabus completed</th>
                  <th className="px-4 py-3 text-center">Quizzes</th>
                  <th className="px-4 py-3 text-center">Assignments</th>
                  <th className="px-4 py-3">Next test</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {subjects.map((row) => (
                  <tr key={row.subject} className="transition-colors hover:bg-slate-800/40">
                    <td className="px-4 py-3.5 font-semibold text-white">{row.subject}</td>
                    <td className="px-4 py-3.5">{row.instructor}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-2.5 w-32 overflow-hidden rounded-full bg-slate-800">
                          <div className="h-full rounded-full bg-cyan-400" style={{ width: `${row.syllabusProgress}%` }} />
                        </div>
                        <span className="text-xs font-medium text-slate-400">{row.syllabusProgress}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center font-medium text-purple-400">{row.quizzesConducted}</td>
                    <td className="px-4 py-3.5 text-center font-medium text-emerald-400">{row.assignmentsGiven}</td>
                    <td className="px-4 py-3.5 text-slate-400">
                      {row.nextTestDate ? new Date(row.nextTestDate).toLocaleDateString() : 'Not scheduled'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
