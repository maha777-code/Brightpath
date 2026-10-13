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
  isPlatformOwner,
  TEACHER_TOOLS_CATALOG,
  type TeacherToolDefinition,
} from '@brightpath/shared';
import { useAuth } from '@/context/AuthContext';
import { isTeacherToolEnabled } from '@/lib/teacherToolAvailability';
import { toolVisibleToRole } from '@/config/toolsRegistry';
import { ProUpgradeDialog } from '@/components/billing/ProUpgradeDialog';

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

export function AiToolsLibrary({
  userRole,
  userPlan,
}: {
  userRole: string | null;
  userPlan: string | null;
}) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const { user, teacher, parent } = useAuth();
  const email = user?.email ?? teacher?.email ?? parent?.email ?? null;
  const owner = isPlatformOwner(userRole, email);

  const openUpgrade = () => {
    setUpgradeOpen(true);
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
        {TEACHER_TOOLS_CATALOG.filter((tool) => toolVisibleToRole(tool.id, userRole, email)).map((tool) => {
          const enabled = isTeacherToolEnabled(tool.id);
          const accessible =
            enabled &&
            hasAiToolAccess({
              role: userRole,
              email,
              planType: userPlan,
              requiredPlan: tool.requiredPlan,
            });
          return (
            <ToolCard
              key={tool.id}
              tool={tool}
              accessible={accessible}
              enabled={enabled}
              onUpgrade={openUpgrade}
            />
          );
        })}
      </div>

      <ProUpgradeDialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
    </>
  );
}

function ToolCard({
  tool,
  accessible,
  enabled,
  onUpgrade,
}: {
  tool: TeacherToolDefinition;
  accessible: boolean;
  enabled: boolean;
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
        {enabled && accessible ? (
          <Link to={tool.href} className="flex items-center gap-1 text-sm font-semibold text-cyan-400 hover:underline">
            Launch tool →
          </Link>
        ) : !enabled ? (
          <span className="text-sm font-semibold text-amber-300">Tool Under Maintenance</span>
        ) : (
          <button
            type="button"
            onClick={onUpgrade}
            className="flex cursor-pointer appearance-none items-center gap-1 border-0 bg-transparent text-sm font-semibold text-amber-300"
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
