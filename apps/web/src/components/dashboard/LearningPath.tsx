import { Check, ArrowRight, Sparkles, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import type { LearningPathNode } from '@brightpath/shared';

interface LearningPathProps {
  nodes: LearningPathNode[];
  loading?: boolean;
  accent?: string;
  onLockedClick?: (hint: string) => void;
}

function displayTitle(node: LearningPathNode): string {
  if (node.status === 'UNLOCKED') return `Next: ${node.title}`;
  if (node.status === 'LOCKED') return `Future: ${node.title}`;
  return node.title;
}

function displayMeta(node: LearningPathNode): string {
  if (node.status === 'COMPLETED' || node.status === 'IN_PROGRESS') {
    return `(${node.masteryScore}%)`;
  }
  if (node.status === 'UNLOCKED') return '— Unlocked';
  return '';
}

export function LearningPath({
  nodes,
  loading,
  accent = '#0d9488',
  onLockedClick,
}: LearningPathProps) {
  const navigate = useNavigate();
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    onLockedClick?.(msg);
    window.setTimeout(() => setToast(null), 2800);
  };

  const onClickNode = (node: LearningPathNode) => {
    if (node.status === 'LOCKED') {
      showToast(
        node.unlockHint
          ? `Complete ${node.unlockHint} to unlock this module!`
          : 'Complete the previous module to unlock this one!',
      );
      return;
    }

    if (node.learnRoute) {
      navigate(node.learnRoute);
      return;
    }

    navigate(`/lesson/${node.id}`);
  };

  return (
    <section
      id="path"
      className="relative rounded-3xl border border-white/70 bg-white/80 p-5 shadow-soft backdrop-blur-md sm:p-6"
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

      {loading && (
        <p className="py-6 text-center text-sm text-slate-400">Loading your path…</p>
      )}

      {!loading && nodes.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-500">
          No modules yet for this age group. Try refreshing after db:push.
        </p>
      )}

      <div className="flex items-stretch gap-2 overflow-x-auto pb-2">
        {nodes.map((node, index) => {
          const clickable = node.status !== 'LOCKED';
          return (
            <div key={node.id} className="flex min-w-0 flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => onClickNode(node)}
                className={[
                  'flex min-w-[148px] flex-1 flex-col items-center rounded-2xl px-3 py-4 text-center transition',
                  clickable ? 'cursor-pointer hover:scale-[1.02]' : 'cursor-not-allowed',
                  node.status === 'COMPLETED' && 'text-white shadow-md',
                  node.status === 'IN_PROGRESS' && 'text-white shadow-md',
                  node.status === 'UNLOCKED' &&
                    'border-2 border-emerald-300 bg-emerald-50 text-emerald-800',
                  node.status === 'LOCKED' &&
                    'border border-dashed border-slate-300 bg-slate-50 text-slate-500',
                ]
                  .filter(Boolean)
                  .join(' ')}
                style={
                  node.status === 'COMPLETED' || node.status === 'IN_PROGRESS'
                    ? { background: accent }
                    : undefined
                }
              >
                <div
                  className={[
                    'mb-2 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                    node.status === 'COMPLETED' || node.status === 'IN_PROGRESS'
                      ? 'bg-white/20'
                      : 'bg-white shadow-sm',
                  ].join(' ')}
                >
                  {node.status === 'COMPLETED' ? (
                    <Check className="h-4 w-4" />
                  ) : node.status === 'LOCKED' ? (
                    <Lock className="h-3.5 w-3.5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <p className="text-sm font-bold leading-tight">
                  {displayTitle(node)}{' '}
                  {(node.status === 'COMPLETED' || node.status === 'IN_PROGRESS') && (
                    <span className="opacity-90">{displayMeta(node)}</span>
                  )}
                </p>
                {node.status === 'UNLOCKED' && (
                  <p className="mt-1 text-xs font-semibold">{displayMeta(node)}</p>
                )}
                {node.isReview && (
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide opacity-80">
                    Foundation boost
                  </p>
                )}
              </button>
              {index < nodes.length - 1 && (
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300" />
              )}
            </div>
          );
        })}
      </div>

      {toast && (
        <div className="absolute bottom-3 left-1/2 z-10 max-w-[90%] -translate-x-1/2 rounded-full bg-slate-800 px-4 py-2 text-center text-xs font-semibold text-white shadow-lg">
          {toast}
        </div>
      )}
    </section>
  );
}
