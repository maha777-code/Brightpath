import { useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getTeacherToolById, hasAiToolAccess, type AiToolPlan, type TeacherToolDefinition } from '@brightpath/shared';
import { useAuth } from '@/context/AuthContext';
import { isTeacherToolEnabled } from '@/lib/teacherToolAvailability';
import { PaymentUpgradeModal } from '@/components/billing/PaymentUpgradeModal';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { TeacherWorkspaceLayout } from '@/components/teacher/TeacherWorkspaceLayout';
import { ToolRenderer } from '@/components/tools/ToolRenderer';
import { getRegistryTool, toToolDefinition } from '@/config/toolsRegistry';

export function TeacherToolLauncher({
  tool,
  embedded,
  favorited,
  onToggleFavorite,
}: {
  tool: TeacherToolDefinition;
  embedded?: boolean;
  favorited?: boolean;
  onToggleFavorite?: () => void;
}) {
  void favorited;
  void onToggleFavorite;

  const entry = getRegistryTool(tool.id) ?? toToolDefinition(tool);
  const rendered = <ToolRenderer tool={entry} mode="production" />;

  if (tool.id === 'quiz-generator') {
    const quiz = rendered;
    if (embedded) return quiz;
    return (
      <TeacherWorkspaceLayout>
        <main className="w-full max-w-7xl px-6 py-6 lg:px-10 lg:py-8">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Link
              to="/teacher/tools"
              className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Back to AI Tools Suite
            </Link>
          </div>
          <div className="card-cyber p-5 sm:p-8">{quiz}</div>
        </main>
      </TeacherWorkspaceLayout>
    );
  }

  if (tool.id === 'worksheet-generator') {
    const worksheet = rendered;
    if (embedded) return worksheet;
    return <DashboardLayout>{worksheet}</DashboardLayout>;
  }

  if (tool.id === 'song-generator' || tool.id === 'lesson-plan') {
    return rendered;
  }

  const body = (
    <div className="space-y-5">
      {!embedded && (
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/teacher/tools"
            className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to AI Tools Suite
          </Link>
        </div>
      )}
      {rendered}
    </div>
  );

  if (embedded) return body;

  return (
    <TeacherWorkspaceLayout>
      <main className="w-full max-w-3xl space-y-6 px-6 py-6 lg:px-10 lg:py-8">{body}</main>
    </TeacherWorkspaceLayout>
  );
}

export default function TeacherToolPage() {
  const { toolId = '' } = useParams<{ toolId: string }>();
  const tool = useMemo(() => getTeacherToolById(toolId), [toolId]);
  const { role, planType } = useAuth();
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  if (toolId === 'curriculum-studio') {
    return <Navigate to="/tools/curriculum-textbook-studio" replace />;
  }

  if (!tool) {
    return (
      <TeacherWorkspaceLayout>
        <main className="px-8 py-10">
          <p className="td-card rounded-2xl p-6 text-cyan-100">That tool was not found.</p>
          <Link to="/teacher/tools" className="mt-4 inline-block text-cyan-200 underline">
            Return to the tools hub
          </Link>
        </main>
      </TeacherWorkspaceLayout>
    );
  }

  const requiredPlan: AiToolPlan = tool.requiredPlan ?? 'pro';
  if (!isTeacherToolEnabled(tool.id)) {
    return (
      <TeacherWorkspaceLayout>
        <main className="w-full max-w-lg px-6 py-10">
          <div className="rounded-3xl border border-amber-500/30 bg-slate-900 p-8 text-white">
            <h1 className="text-2xl font-bold">{tool.title}</h1>
            <p className="mt-2 text-sm font-semibold text-amber-300">Tool Under Maintenance</p>
            <p className="mt-2 text-sm text-slate-300">A school admin has turned this generator off. It cannot run until it is active again.</p>
            <Link to="/teacher/tools" className="mt-5 inline-block text-sm font-bold text-cyan-300 underline">
              Back to teacher tools
            </Link>
          </div>
        </main>
      </TeacherWorkspaceLayout>
    );
  }
  if (!hasAiToolAccess({ role, planType, requiredPlan })) {
    return (
      <TeacherWorkspaceLayout>
        <main className="w-full max-w-lg px-6 py-10">
          <div className="rounded-3xl border border-slate-700 bg-slate-900 p-8 text-white">
            <h1 className="text-2xl font-bold">{tool.title}</h1>
            <p className="mt-2 text-sm text-slate-300">🔒 Upgrade to unlock this tool.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/pricing#pricing" className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950">
                View pricing
              </Link>
              <button
                type="button"
                className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-semibold"
                onClick={() => setCheckoutOpen(true)}
              >
                Upgrade now
              </button>
            </div>
          </div>
          <PaymentUpgradeModal
            open={checkoutOpen}
            onClose={() => setCheckoutOpen(false)}
            defaultPlan={requiredPlan === 'center_pro' ? 'tutor_center_pro' : 'teacher_pro'}
          />
        </main>
      </TeacherWorkspaceLayout>
    );
  }

  return <TeacherToolLauncher tool={tool} />;
}
