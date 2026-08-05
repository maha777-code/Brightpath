import { Check, ArrowRight, Sparkles } from 'lucide-react';
import type { PathNodeConfig } from '@/lib/ageGroupDashboardConfig';

interface LearningPathProps {
  steps: PathNodeConfig[];
  accent?: string;
}

export function LearningPath({ steps, accent = '#0d9488' }: LearningPathProps) {
  return (
    <section
      id="path"
      className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-soft backdrop-blur-md sm:p-6"
    >
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-lg font-extrabold text-slate-800">Your Personalized Path</h2>
        <span
          className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold"
          style={{ background: `${accent}18`, color: accent }}
        >
          <Sparkles className="h-3.5 w-3.5" /> Adaptive
        </span>
      </div>

      <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
        {steps.map((node, index) => (
          <div key={node.id} className="flex min-w-0 flex-1 items-center gap-2">
            <div
              className={[
                'flex min-w-[140px] flex-1 flex-col items-center rounded-2xl px-3 py-4 text-center',
                node.state === 'done' && 'text-white shadow-md',
                node.state === 'active' && 'text-white shadow-md',
                node.state === 'unlocked' &&
                  'border-2 border-emerald-300 bg-emerald-50 text-emerald-800',
                node.state === 'locked' &&
                  'border border-dashed border-slate-300 bg-slate-50 text-slate-500',
              ]
                .filter(Boolean)
                .join(' ')}
              style={
                node.state === 'done' || node.state === 'active'
                  ? { background: accent }
                  : undefined
              }
            >
              <div
                className={[
                  'mb-2 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                  node.state === 'done' || node.state === 'active'
                    ? 'bg-white/20'
                    : 'bg-white shadow-sm',
                ].join(' ')}
              >
                {node.state === 'done' ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <p className="text-sm font-bold leading-tight">
                {node.title}
                {node.meta && node.state !== 'unlocked' && node.state !== 'locked'
                  ? ` (${node.meta})`
                  : ''}
              </p>
              {node.state === 'unlocked' && (
                <p className="mt-1 text-xs font-semibold">{node.meta} Unlocked</p>
              )}
            </div>
            {index < steps.length - 1 && (
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
