import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { canUserAccessTool, getRegistryTool } from '@/config/toolsRegistry';
import { TeacherWorkspaceLayout } from '@/components/teacher/TeacherWorkspaceLayout';

/** Blocks a tool route unless the signed-in user is the platform owner or listed on the tool. */
export function ToolAccessGate({ toolId, children }: { toolId: string; children: ReactNode }) {
  const { role, user, teacher, parent } = useAuth();
  const email = user?.email ?? teacher?.email ?? parent?.email ?? null;
  const allowed = canUserAccessTool({ role, email }, getRegistryTool(toolId)?.allowedRoles ?? []);

  if (allowed) return children;

  return (
    <TeacherWorkspaceLayout>
      <main className="w-full max-w-lg px-6 py-10">
        <div className="rounded-3xl border border-rose-500/30 bg-slate-900 p-8 text-white">
          <h1 className="text-2xl font-bold">{getRegistryTool(toolId)?.title ?? 'AI tool'}</h1>
          <p className="mt-2 text-sm font-semibold text-rose-300">Teacher access required</p>
          <Link to="/teacher/tools" className="mt-5 inline-block text-sm font-bold text-cyan-300 underline">
            Back to teacher tools
          </Link>
        </div>
      </main>
    </TeacherWorkspaceLayout>
  );
}
