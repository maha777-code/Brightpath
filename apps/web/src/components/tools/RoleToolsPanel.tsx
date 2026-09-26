import { useState, type ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ClipboardList,
  Eye,
  FileText,
  ListChecks,
  Mail,
  MessageSquare,
  Mic,
  Monitor,
  Music,
  Pencil,
  Sparkles,
  Star,
  Youtube,
} from 'lucide-react';
import { TEACHER_TOOLS_CATALOG } from '@brightpath/shared';
import { useAuth } from '@/context/AuthContext';
import { toolsForAppRole, type ToolDefinition } from '@/config/toolsRegistry';
import { ToolRenderer } from '@/components/tools/ToolRenderer';
import { CURRICULUM_STUDIO_PATH } from '@/pages/tools/CurriculumTextbookStudio';

function planPill(plan: ToolDefinition['targetPlan']): string {
  if (plan === 'Pro') return 'Teacher Pro';
  if (plan === 'Enterprise') return 'Enterprise';
  return 'Free';
}

const TOOL_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  'book-open': BookOpen,
  music: Music,
  mic: Mic,
  'file-text': FileText,
  pencil: Pencil,
  'clipboard-list': ClipboardList,
  'list-checks': ListChecks,
  presentation: Monitor,
  'message-square': MessageSquare,
  youtube: Youtube,
  mail: Mail,
  sparkles: Sparkles,
};

/** Lists registry tools this role may open and renders the same production component. */
export function RoleToolsPanel({
  tone = 'light',
  showHeading = true,
  hideOuterClose = false,
}: {
  tone?: 'light' | 'dark';
  showHeading?: boolean;
  hideOuterClose?: boolean;
}) {
  const { role } = useAuth();
  const navigate = useNavigate();
  const tools = toolsForAppRole(role);
  const [active, setActive] = useState<ToolDefinition | null>(null);
  const dark = tone === 'dark';

  if (!tools.length) return null;

  return (
    <section className={dark ? 'space-y-3' : 'rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm'}>
      {showHeading ? (
        <>
          <h2 className={dark ? 'text-lg font-extrabold tracking-tight text-white' : 'text-sm font-extrabold text-slate-800'}>AI Tools</h2>
          <p className={dark ? 'text-xs font-medium text-slate-400 sm:text-sm' : 'text-xs text-slate-500'}>
            Tools available for your role. Opening one uses the same generator as the teacher workspace.
          </p>
        </>
      ) : null}
      {dark ? (
        <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {tools.map((tool) => {
            const Icon = TOOL_ICONS[tool.icon] ?? Sparkles;
            const badge = TEACHER_TOOLS_CATALOG.find((item) => item.id === tool.id)?.badge;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => {
                  if (tool.id === 'curriculum-studio') {
                    navigate(CURRICULUM_STUDIO_PATH);
                    return;
                  }
                  setActive(tool);
                }}
                className="group flex cursor-pointer appearance-none flex-col justify-between rounded-2xl border border-slate-800/80 bg-[#090e1a] p-5 text-left text-white shadow-lg transition-all duration-200 hover:border-cyan-500/40 hover:bg-[#0c1426]"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="rounded-xl border border-cyan-500/20 bg-[#0e172a] p-2.5 text-cyan-400 transition-colors group-hover:border-cyan-500/40">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      {badge ? (
                        <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-sm font-extrabold uppercase tracking-wider text-cyan-400">
                          {badge}
                        </span>
                      ) : null}
                      <Star className="h-4 w-4 text-slate-600 transition-colors group-hover:text-amber-400" />
                    </div>
                  </div>
                  <h3 className="mt-3 line-clamp-1 text-lg font-bold tracking-tight text-white transition-colors group-hover:text-cyan-300">
                    {tool.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 min-h-[3.25rem] text-base leading-relaxed text-slate-400">{tool.description}</p>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-slate-800/60 pt-4">
                  <span className="inline-flex items-center gap-1.5 text-base font-bold text-cyan-400 group-hover:underline">
                    <Eye className="h-4 w-4" /> Open Tool
                  </span>
                  <span className="rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 text-sm font-extrabold uppercase text-slate-400">
                    {planPill(tool.targetPlan)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {tools.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => {
                if (tool.id === 'curriculum-studio') {
                  navigate(CURRICULUM_STUDIO_PATH);
                  return;
                }
                setActive(tool);
              }}
              className="cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-indigo-300"
            >
              <span className="block text-sm font-bold">{tool.title}</span>
              <span className="mt-1 block text-xs text-slate-500">{tool.description}</span>
            </button>
          ))}
        </div>
      )}
      {active ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="flex h-[88vh] w-full max-w-7xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-[#040711] shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <p className="text-sm font-bold text-white">{active.title}</p>
              {hideOuterClose ? null : (
                <button
                  type="button"
                  onClick={() => setActive(null)}
                  className="cursor-pointer appearance-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200"
                >
                  Close
                </button>
              )}
            </div>
            <ToolRenderer tool={active} embed onClose={() => setActive(null)} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
