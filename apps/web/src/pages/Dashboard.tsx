import { useMemo, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { loadProgress } from '@/lib/storage';
import { SUBJECT_META, type Subject } from '@/types';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { WelcomeStats } from '@/components/dashboard/WelcomeStats';
import { LearningPath } from '@/components/dashboard/LearningPath';
import { SubjectsCard, type SubjectProgressItem } from '@/components/dashboard/SubjectsCard';
import { AnalyticsCard } from '@/components/dashboard/AnalyticsCard';
import { TutorChatDrawer } from '@/components/dashboard/TutorChatDrawer';

const FALLBACK_SUBJECTS: SubjectProgressItem[] = [
  { id: 'math', title: 'Mathematics', mastery: 92, color: '#0d9488', route: '/learn/math' },
  { id: 'history', title: 'History', mastery: 65, color: '#6366f1' },
  { id: 'mandarin', title: 'Mandarin', mastery: 51, color: '#f59e0b' },
];

export default function Dashboard() {
  const { parent } = useAuth();
  const { profile } = useProfile();
  const [chatOpen, setChatOpen] = useState(false);
  const [progress] = useState(() => loadProgress());

  const learnerName = profile?.name || parent?.name?.split(' ')[0] || 'Anya';

  const subjects = useMemo(() => {
    if (!profile?.subjects?.length) return FALLBACK_SUBJECTS;
    return profile.subjects.map((subject: Subject) => {
      const meta = SUBJECT_META[subject];
      const prog = progress.find((p) => p.subject === subject);
      return {
        id: subject,
        title: meta.label,
        mastery: prog?.masteryPercent ?? 0,
        color: meta.color,
        route: `/learn/${subject}`,
      };
    });
  }, [profile, progress]);

  const streak = progress.reduce((max, p) => Math.max(max, p.streakDays), 0) || 12;
  const timeStudied = '8h 15m';

  return (
    <div className="bp-dash flex min-h-dvh flex-col bg-gradient-to-br from-slate-50 via-teal-50/20 to-indigo-50/30 text-slate-800">
      <DashboardHeader learnerName={learnerName} />

      <div className="flex min-h-0 flex-1">
        <DashboardSidebar />

        <div className="flex min-w-0 flex-1 flex-col xl:flex-row">
          <main className="min-w-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
            <WelcomeStats name={learnerName} streakDays={streak} timeStudied={timeStudied} />
            <LearningPath />
            <div className="grid gap-5 xl:grid-cols-2">
              <SubjectsCard subjects={subjects} />
              <AnalyticsCard />
            </div>
          </main>

          {/* Desktop chat drawer */}
          <div className="hidden w-80 shrink-0 p-4 pl-0 xl:block xl:w-96 xl:p-6 xl:pl-0">
            <div className="sticky top-20 h-[calc(100dvh-6.5rem)]">
              <TutorChatDrawer learnerName={learnerName} />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile chat FAB + sheet */}
      <button
        type="button"
        onClick={() => setChatOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-teal-700 text-white shadow-lg shadow-teal-700/40 xl:hidden"
        aria-label="Open AI tutor chat"
      >
        <MessageCircle className="h-6 w-6" />
      </button>

      {chatOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/30 p-3 backdrop-blur-sm xl:hidden">
          <button
            type="button"
            className="mb-2 self-end rounded-full bg-white px-3 py-1 text-sm font-semibold text-slate-600"
            onClick={() => setChatOpen(false)}
          >
            Close
          </button>
          <div className="min-h-0 flex-1">
            <TutorChatDrawer learnerName={learnerName} />
          </div>
        </div>
      )}
    </div>
  );
}
