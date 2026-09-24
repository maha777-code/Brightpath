import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toolsForAppRole, type ToolDefinition } from '@/config/toolsRegistry';
import { ToolRenderer } from '@/components/tools/ToolRenderer';

/** Lists registry tools this role may open and renders the same production component. */
export function RoleToolsPanel({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { role } = useAuth();
  const tools = toolsForAppRole(role);
  const [active, setActive] = useState<ToolDefinition | null>(null);
  const dark = tone === 'dark';

  if (!tools.length) return null;

  return (
    <section className={dark ? 'space-y-3' : 'rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm'}>
      <h2 className={dark ? 'text-lg font-bold text-white' : 'text-sm font-extrabold text-slate-800'}>AI Tools</h2>
      <p className={dark ? 'text-sm text-slate-400' : 'text-xs text-slate-500'}>
        Tools available for your role. Opening one uses the same generator as the teacher workspace.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {tools.map((tool) => (
          <button
            key={tool.id}
            type="button"
            onClick={() => setActive(tool)}
            className={
              dark
                ? 'cursor-pointer appearance-none rounded-xl border border-slate-800 bg-[#0c1220] p-4 text-left text-white hover:border-cyan-500/40'
                : 'cursor-pointer appearance-none rounded-xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-indigo-300'
            }
          >
            <span className="block text-sm font-bold">{tool.title}</span>
            <span className={dark ? 'mt-1 block text-xs text-slate-400' : 'mt-1 block text-xs text-slate-500'}>
              {tool.description}
            </span>
          </button>
        ))}
      </div>
      {active ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-[#060911]">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <p className="text-sm font-bold text-white">{active.title}</p>
              <button
                type="button"
                onClick={() => setActive(null)}
                className="cursor-pointer appearance-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200"
              >
                Close
              </button>
            </div>
            <ToolRenderer tool={active} embed />
          </div>
        </div>
      ) : null}
    </section>
  );
}
