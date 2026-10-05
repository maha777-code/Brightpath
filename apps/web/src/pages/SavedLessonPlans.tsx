import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, FileText } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { loadSavedLessonPlans, type LessonPlanHistoryItem } from '@/lib/lessonPlanStorage';

export default function SavedLessonPlans() {
  const navigate = useNavigate();
  const [plans] = useState<LessonPlanHistoryItem[]>(() => loadSavedLessonPlans());

  const openPlan = (item: LessonPlanHistoryItem) => {
    navigate('/teacher/tools/lesson-plan-generator', { state: { savedPlan: item } });
  };

  return (
    <DashboardLayout>
      <div className="mx-auto flex h-full w-[min(82%,100%)] flex-col gap-6 overflow-y-auto px-6 py-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">My Resources</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-white">
            <Bookmark className="h-6 w-6 text-cyan-400" /> Saved Lesson Plans
          </h1>
        </div>
        {plans.length === 0 ? (
          <p className="rounded-2xl border border-slate-800 bg-slate-900/70 px-5 py-10 text-center text-sm text-slate-400">
            Bookmark a lesson plan to keep it here.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {plans.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => openPlan(item)}
                className="cursor-pointer appearance-none rounded-2xl border border-slate-800 bg-slate-900/80 p-5 text-left text-slate-100 shadow-lg transition hover:border-cyan-500/40"
              >
                <FileText className="mb-3 h-5 w-5 text-cyan-400" />
                <p className="text-xs font-semibold text-cyan-300">{item.gradeLevel}</p>
                <p className="mt-1 line-clamp-2 text-base font-bold">{item.title || item.topicPrompt}</p>
                <p className="mt-3 text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
