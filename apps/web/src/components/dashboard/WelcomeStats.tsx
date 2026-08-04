import { Flame, Clock3 } from 'lucide-react';

interface WelcomeStatsProps {
  name: string;
  streakDays: number;
  timeStudied: string;
}

export function WelcomeStats({ name, streakDays, timeStudied }: WelcomeStatsProps) {
  return (
    <section className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-soft backdrop-blur-md sm:p-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 sm:text-3xl">
        Welcome back, {name}!
      </h1>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 px-4 py-3 ring-1 ring-teal-100">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white">
            <Flame className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700/80">
              Your Learning Streak
            </p>
            <p className="text-sm font-bold text-slate-800 sm:text-base">
              {streakDays} Days 🔥🔥🔥
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-50 to-sky-50 px-4 py-3 ring-1 ring-indigo-100">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Clock3 className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600/80">
              Time Studied This Week
            </p>
            <p className="text-sm font-bold text-slate-800 sm:text-base">{timeStudied}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
