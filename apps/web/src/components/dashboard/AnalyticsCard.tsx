import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts';
import { Target, GitBranch } from 'lucide-react';
import type { AnalyticsConfig } from '@/lib/ageGroupDashboardConfig';

interface AnalyticsCardProps {
  data: AnalyticsConfig;
  goals: string[];
  accent?: string;
}

export function AnalyticsCard({ data, goals, accent = '#0d9488' }: AnalyticsCardProps) {
  return (
    <section className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-soft backdrop-blur-md sm:p-6">
      <h2 className="mb-4 text-lg font-extrabold text-slate-800">Analytics & Mastery</h2>

      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-600">
        <Target className="h-4 w-4" style={{ color: accent }} />
        Strength & Growth Areas
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <div className="h-52 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-teal-50/50 p-2 ring-1 ring-emerald-100">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data.radar} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="#cbd5e1" />
              <PolarAngleAxis dataKey="skill" tick={{ fill: '#475569', fontSize: 11 }} />
              <Radar
                name="Mastery"
                dataKey="value"
                stroke={accent}
                fill={accent}
                fillOpacity={0.35}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col justify-center rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <GitBranch className="h-4 w-4 text-indigo-600" />
            Skill branching
          </div>
          <div className="flex flex-col items-center gap-2 text-xs font-semibold">
            <span
              className="rounded-full px-3 py-1.5 text-white"
              style={{ background: accent }}
            >
              {data.treeRoot}
            </span>
            <span className="text-slate-300">▾</span>
            <div className="flex w-full flex-wrap justify-center gap-2">
              {data.treeMid.map((label) => (
                <span
                  key={label}
                  className="rounded-full bg-emerald-100 px-2.5 py-1 text-emerald-800"
                >
                  {label}
                </span>
              ))}
            </div>
            <span className="text-slate-300">▾</span>
            <div className="flex w-full flex-wrap justify-center gap-2">
              {data.treeLeaves.map((label, i) => (
                <span
                  key={label}
                  className={
                    i === data.treeLeaves.length - 1
                      ? 'rounded-full border border-dashed border-emerald-300 bg-emerald-50 px-2.5 py-1 text-emerald-700'
                      : 'rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-600'
                  }
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <h3 className="mb-3 text-sm font-bold text-slate-700">Upcoming Goals</h3>
      <div className="grid gap-2">
        {goals.map((goal) => (
          <div
            key={goal}
            className="rounded-xl border px-3 py-2.5 text-sm font-semibold text-slate-700"
            style={{
              borderColor: `${accent}33`,
              background: `linear-gradient(90deg, ${accent}14, #fff)`,
            }}
          >
            {goal}
          </div>
        ))}
      </div>
    </section>
  );
}
