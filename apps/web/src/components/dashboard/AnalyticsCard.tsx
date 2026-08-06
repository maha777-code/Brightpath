import { useState, type CSSProperties } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Target, GitBranch, Check } from 'lucide-react';
import type {
  AnalyticsRadarPoint,
  SkillBranchNode,
  UserGoalItem,
} from '@brightpath/shared';

interface AnalyticsAndMasteryProps {
  radar: AnalyticsRadarPoint[];
  skillTree: SkillBranchNode | null;
  goals: UserGoalItem[];
  loading?: boolean;
  accent?: string;
  onCompleteGoal?: (goalId: string) => Promise<void> | void;
}

function RadarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: AnalyticsRadarPoint }[];
}) {
  if (!active || !payload?.[0]) return null;
  const p = payload[0].payload;
  const label =
    p.score > 75 ? 'Strong Area' : p.score < 50 ? 'Needs Review' : 'Growing';
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-bold text-slate-800">
        {p.skill}: {p.score}%
      </p>
      <p className="text-slate-500">{label}</p>
    </div>
  );
}

function nodeBadgeClass(status: SkillBranchNode['status'], accent: string) {
  if (status === 'mastered') {
    return { className: 'rounded-full px-2.5 py-1 text-white', style: { background: accent } };
  }
  if (status === 'in_progress') {
    return {
      className: 'rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-emerald-800',
      style: undefined as CSSProperties | undefined,
    };
  }
  return {
    className: 'rounded-full border border-dashed border-slate-300 bg-slate-50 px-2.5 py-1 text-slate-500',
    style: undefined as CSSProperties | undefined,
  };
}

function SkillTreeView({ tree, accent }: { tree: SkillBranchNode; accent: string }) {
  const mid = tree.children;
  const leaves = mid.flatMap((m) => m.children);

  const rootStyle = nodeBadgeClass(tree.status, accent);

  return (
    <div className="flex flex-col items-center gap-2 text-xs font-semibold">
      <span className={rootStyle.className} style={rootStyle.style}>
        {tree.name}
      </span>
      {mid.length > 0 && (
        <>
          <span className="text-slate-300">▾</span>
          <div className="flex w-full flex-wrap justify-center gap-2">
            {mid.map((n) => {
              const s = nodeBadgeClass(n.status, accent);
              return (
                <span key={n.id} className={s.className} style={s.style} title={`${n.masteryScore}%`}>
                  {n.name}
                </span>
              );
            })}
          </div>
        </>
      )}
      {leaves.length > 0 && (
        <>
          <span className="text-slate-300">▾</span>
          <div className="flex w-full flex-wrap justify-center gap-2">
            {leaves.map((n) => {
              const s = nodeBadgeClass(n.status, accent);
              return (
                <span key={n.id} className={s.className} style={s.style} title={`${n.masteryScore}%`}>
                  {n.name}
                </span>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function AnalyticsAndMastery({
  radar,
  skillTree,
  goals,
  loading,
  accent = '#0d9488',
  onCompleteGoal,
}: AnalyticsAndMasteryProps) {
  const [celebrating, setCelebrating] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const toggleGoal = async (goal: UserGoalItem) => {
    if (goal.isCompleted || !onCompleteGoal) return;
    setBusyId(goal.id);
    try {
      await onCompleteGoal(goal.id);
      setCelebrating(goal.id);
      window.setTimeout(() => setCelebrating(null), 2200);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="relative rounded-3xl border border-white/70 bg-white/80 p-5 shadow-soft backdrop-blur-md sm:p-6">
      <h2 className="mb-4 text-lg font-extrabold text-slate-800">Analytics & Mastery</h2>

      {loading && (
        <p className="mb-4 text-center text-sm text-slate-400">Updating analytics…</p>
      )}

      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-600">
        <Target className="h-4 w-4" style={{ color: accent }} />
        Strength & Growth Areas
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <div className="h-52 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-teal-50/50 p-2 ring-1 ring-emerald-100">
          {radar.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="#cbd5e1" />
                <PolarAngleAxis dataKey="skill" tick={{ fill: '#475569', fontSize: 11 }} />
                <Tooltip content={<RadarTooltip />} />
                <Radar
                  name="Mastery"
                  dataKey="value"
                  stroke={accent}
                  fill={accent}
                  fillOpacity={0.35}
                />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <p className="flex h-full items-center justify-center text-sm text-slate-400">
              No radar data yet
            </p>
          )}
        </div>

        <div className="flex flex-col justify-center rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-100">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <GitBranch className="h-4 w-4 text-indigo-600" />
            Skill branching
          </div>
          {skillTree ? (
            <SkillTreeView tree={skillTree} accent={accent} />
          ) : (
            <p className="text-center text-xs text-slate-400">Skill tree unlocks as you practice</p>
          )}
        </div>
      </div>

      <h3 className="mb-3 text-sm font-bold text-slate-700">Upcoming Goals</h3>
      <div className="grid gap-2">
        {goals.length === 0 && (
          <p className="text-sm text-slate-400">Goals will appear as you practice.</p>
        )}
        {goals.map((goal) => (
          <button
            key={goal.id}
            type="button"
            disabled={goal.isCompleted || busyId === goal.id}
            onClick={() => void toggleGoal(goal)}
            className="flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:shadow-sm disabled:opacity-70"
            style={{
              borderColor: `${accent}33`,
              background:
                celebrating === goal.id
                  ? `linear-gradient(90deg, ${accent}33, #fef9c3)`
                  : `linear-gradient(90deg, ${accent}14, #fff)`,
            }}
          >
            <span
              className={[
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2',
                goal.isCompleted ? 'border-transparent text-white' : 'border-slate-300 bg-white',
              ].join(' ')}
              style={goal.isCompleted ? { background: accent } : undefined}
            >
              {(goal.isCompleted || celebrating === goal.id) && <Check className="h-3 w-3" />}
            </span>
            <span className={goal.isCompleted ? 'line-through opacity-60' : ''}>{goal.title}</span>
            {celebrating === goal.id && (
              <span className="ml-auto text-xs font-bold text-amber-600">Nice work! 🎉</span>
            )}
          </button>
        ))}
      </div>
    </section>
  );
}

/** @deprecated prefer AnalyticsAndMastery */
export function AnalyticsCard(props: {
  data: { radar: { skill: string; value: number }[]; treeRoot: string; treeMid: string[]; treeLeaves: string[] };
  goals: string[];
  accent?: string;
}) {
  const radar: AnalyticsRadarPoint[] = props.data.radar.map((r) => ({
    subject: r.skill,
    skill: r.skill,
    score: r.value,
    value: r.value,
    fullMark: 100,
  }));
  const goals: UserGoalItem[] = props.goals.map((title, i) => ({
    id: `mock-${i}`,
    title,
    isCompleted: false,
    dueDate: null,
  }));
  return (
    <AnalyticsAndMastery
      radar={radar}
      skillTree={null}
      goals={goals}
      accent={props.accent}
    />
  );
}
