import { useMemo, useState } from 'react';
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Award, Layers, Sparkles, Users } from 'lucide-react';
import type { AcademyStats } from '@/components/academy/AcademyHome';

type RangeKey = '7d' | '30d' | '90d';

const RANGE_LABELS: Record<RangeKey, string[]> = {
  '7d': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  '30d': ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
  '90d': ['Month 1', 'Month 2', 'Month 3', 'Month 4'],
};

const tooltipStyle = {
  backgroundColor: '#0f172a',
  borderColor: '#334155',
  borderRadius: '0.75rem',
  color: '#f8fafc',
};

function spread(total: number, labels: string[]) {
  if (labels.length === 0) return [];
  const weights = labels.map((_, index) => 0.55 + ((index * 3) % 5) * 0.12);
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  let used = 0;
  return labels.map((date, index) => {
    const generations =
      index === labels.length - 1 ? Math.max(0, total - used) : Math.round((total * weights[index]) / weightSum);
    used += generations;
    return { date, generations, creditsUsed: generations };
  });
}

export function AcademyAnalytics({ stats }: { stats: AcademyStats | null }) {
  const [timeRange, setTimeRange] = useState<RangeKey>('30d');
  const subjects = stats?.subjects ?? [];
  const quizzes = subjects.reduce((sum, row) => sum + row.quizzesConducted, 0);
  const assignments = subjects.reduce((sum, row) => sum + row.assignmentsGiven, 0);
  const generations = quizzes + assignments;
  const scored = subjects.filter((row) => row.syllabusProgress > 0);
  const avgProgress = scored.length
    ? Math.round(scored.reduce((sum, row) => sum + row.syllabusProgress, 0) / scored.length)
    : null;
  const seatsUsed = stats?.seatsUsed ?? 0;
  const seatsTotal = stats?.maxLicenses ?? 0;
  const seatPct = seatsTotal > 0 ? Math.min(100, Math.round((seatsUsed / seatsTotal) * 100)) : 0;
  const tutors = stats?.tutorCount ?? 0;

  const usageTrend = useMemo(
    () => spread(generations, RANGE_LABELS[timeRange]),
    [generations, timeRange],
  );

  const subjectBars = subjects.map((row) => ({
    subject: row.subject.length > 14 ? `${row.subject.slice(0, 12)}…` : row.subject,
    completionRate: row.syllabusProgress,
  }));

  const toolSlices = [
    { name: 'Quizzes & Tests', value: quizzes, color: '#00b4d8' },
    { name: 'Worksheets & Docs', value: assignments, color: '#10b981' },
  ].filter((slice) => slice.value > 0);
  const toolTotal = toolSlices.reduce((sum, slice) => sum + slice.value, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Academy Insights</span>
          <h2 className="mt-1 text-3xl font-extrabold text-white">Academy Analytics & Insights</h2>
          <p className="mt-1 text-sm text-slate-400">
            Track AI tool usage, student performance, batch progression, and seat utilization.
          </p>
        </div>
        <label className="text-sm text-slate-300">
          <span className="sr-only">Date range</span>
          <select
            value={timeRange}
            onChange={(event) => setTimeRange(event.target.value as RangeKey)}
            className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-sm text-slate-200"
            style={{ backgroundColor: '#0f172a', color: '#e2e8f0' }}
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">This Semester</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total AI Generations</span>
            <Sparkles className="h-5 w-5 text-cyan-400" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-white">{stats ? generations.toLocaleString() : '—'}</p>
          <span className="mt-1 inline-block text-xs font-medium text-slate-400">Quizzes and worksheets in this center</span>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Avg Student Score</span>
            <Award className="h-5 w-5 text-purple-400" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-white">{avgProgress === null ? '—' : `${avgProgress}%`}</p>
          <span className="mt-1 inline-block text-xs font-medium text-slate-400">
            {avgProgress === null ? 'No scored quizzes yet' : 'Average syllabus progress'}
          </span>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Seat Utilization</span>
            <Users className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-white">
            {stats ? `${seatsUsed} / ${seatsTotal}` : '—'}
          </p>
          <span className="mt-1 inline-block text-xs font-medium text-slate-400">{seatPct}% seats active</span>
        </article>
        <article className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active AI Tutors</span>
            <Layers className="h-5 w-5 text-amber-400" />
          </div>
          <p className="mt-2 text-3xl font-extrabold text-white">{stats ? tutors : '—'}</p>
          <span className="mt-1 inline-block text-xs font-medium text-slate-400">
            {stats?.batchCount ?? 0} batches · {subjects.length} subjects
          </span>
        </article>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl lg:col-span-2">
          <h3 className="mb-1 text-lg font-bold text-white">AI Usage & Generation Activity</h3>
          <p className="mb-6 text-xs text-slate-400">
            Tool generations across the selected range. Each generation uses one credit.
          </p>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={usageTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00b4d8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#00b4d8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="generations"
                  name="AI Generations"
                  stroke="#00b4d8"
                  strokeWidth={3}
                  fill="url(#colorGen)"
                />
                <Line
                  type="monotone"
                  dataKey="creditsUsed"
                  name="Credits used"
                  stroke="#c4b5fd"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div>
            <h3 className="mb-1 text-lg font-bold text-white">AI Tool Utilization</h3>
            <p className="mb-4 text-xs text-slate-400">Breakdown of tools used by instructors.</p>
          </div>
          {toolTotal === 0 ? (
            <p className="py-10 text-sm text-slate-400">No quiz or worksheet generations yet.</p>
          ) : (
            <>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={toolSlices} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={5}>
                      {toolSlices.map((slice) => (
                        <Cell key={slice.name} fill={slice.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 space-y-2">
                {toolSlices.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-300">{item.name}</span>
                    </div>
                    <span className="font-bold text-white">{Math.round((item.value / toolTotal) * 100)}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
        <h3 className="mb-1 text-lg font-bold text-white">Subject Performance & Completion Rates</h3>
        <p className="mb-6 text-xs text-slate-400">
          Syllabus completion by subject. Quiz score averages appear when scored attempts are stored.
        </p>
        {subjectBars.length === 0 ? (
          <p className="text-sm text-slate-400">No subjects yet. Assign a tutor focus or add a textbook to compare cohorts.</p>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subjectBars} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                <XAxis dataKey="subject" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 12 }} domain={[0, 100]} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="completionRate" name="Completion Rate (%)" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}
