import { useState, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  ClipboardList,
  FileText,
  ListChecks,
  Lock,
  Mail,
  MessageSquare,
  Mic,
  Music,
  Pencil,
  Presentation,
  Youtube,
} from 'lucide-react';
import {
  hasAiToolAccess,
  isOwnerAccess,
  TEACHER_TOOLS_CATALOG,
  type AiToolPlan,
  type TeacherToolDefinition,
} from '@brightpath/shared';
import { PaymentUpgradeModal } from '@/components/billing/PaymentUpgradeModal';

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  'book-open': BookOpen,
  music: Music,
  mic: Mic,
  'file-text': FileText,
  pencil: Pencil,
  'clipboard-list': ClipboardList,
  'list-checks': ListChecks,
  presentation: Presentation,
  'message-square': MessageSquare,
  youtube: Youtube,
  mail: Mail,
};

const PLAN_LABEL: Record<AiToolPlan, string> = {
  free: 'Free',
  pro: 'Pro',
  center_pro: 'Tutor Center Pro',
};

export function AiToolsLibrary({
  userRole,
  userPlan,
}: {
  userRole: string | null;
  userPlan: string | null;
}) {
  const [upgradePlan, setUpgradePlan] = useState<AiToolPlan | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const owner = isOwnerAccess(userRole);

  const openUpgrade = (requiredPlan: AiToolPlan) => {
    setCheckoutOpen(false);
    setUpgradePlan(requiredPlan);
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">AI Tools Suite</h2>
          <p className="mt-1 text-sm text-slate-400">Launch classroom generators for your academy.</p>
        </div>
        {owner ? (
          <span className="rounded-full border border-cyan-500/40 bg-cyan-950/60 px-3 py-1 text-xs font-bold uppercase tracking-wide text-cyan-300">
            Owner Access
          </span>
        ) : (
          <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-semibold text-slate-300">
            Plan: {userPlan ?? 'free'}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {TEACHER_TOOLS_CATALOG.map((tool) => {
          const accessible = hasAiToolAccess({
            role: userRole,
            planType: userPlan,
            requiredPlan: tool.requiredPlan,
          });
          return (
            <ToolCard
              key={tool.id}
              tool={tool}
              accessible={accessible}
              onUpgrade={() => openUpgrade(tool.requiredPlan)}
            />
          );
        })}
      </div>

      {upgradePlan && !checkoutOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-100 shadow-2xl">
            <h3 className="text-xl font-extrabold text-white">Upgrade Plan</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              This tool needs the {PLAN_LABEL[upgradePlan]} plan. Compare plans on the landing page, or
              start checkout now.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href="/pricing#pricing"
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-purple-700"
              >
                View pricing
              </a>
              <button
                type="button"
                className="rounded-xl border border-cyan-500/40 px-4 py-2.5 text-sm font-bold text-cyan-300"
                onClick={() => setCheckoutOpen(true)}
              >
                Upgrade now
              </button>
              <button
                type="button"
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-400"
                onClick={() => setUpgradePlan(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <PaymentUpgradeModal
        open={checkoutOpen && upgradePlan !== null}
        onClose={() => setCheckoutOpen(false)}
        defaultPlan={upgradePlan === 'center_pro' ? 'tutor_center_pro' : 'teacher_pro'}
      />
    </>
  );
}

function ToolCard({
  tool,
  accessible,
  onUpgrade,
}: {
  tool: TeacherToolDefinition;
  accessible: boolean;
  onUpgrade: () => void;
}) {
  const Icon = ICONS[tool.icon] ?? SparkFallback;

  return (
    <article className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900 p-5 transition-all hover:border-cyan-500/50">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="rounded-lg bg-slate-800 p-2.5 text-cyan-400">
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex items-center gap-2">
            {!accessible ? <Lock className="h-4 w-4 text-slate-500" aria-label="Locked" /> : null}
            {tool.badge ? (
              <span className="rounded border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-xs font-bold text-cyan-400">
                {tool.badge}
              </span>
            ) : null}
          </div>
        </div>
        <h3 className="text-lg font-bold text-white">{tool.title}</h3>
        <p className="mt-1 text-sm text-slate-400">{tool.description}</p>
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-slate-800/80 pt-3">
        {accessible ? (
          <Link to={tool.href} className="flex items-center gap-1 text-sm font-semibold text-cyan-400 hover:underline">
            Launch tool →
          </Link>
        ) : (
          <button
            type="button"
            onClick={onUpgrade}
            className="flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-purple-400"
          >
            <Lock className="h-3.5 w-3.5" /> Upgrade to unlock
          </button>
        )}
      </div>
    </article>
  );
}

function SparkFallback({ className }: { className?: string }) {
  return <BookOpen className={className} />;
}
