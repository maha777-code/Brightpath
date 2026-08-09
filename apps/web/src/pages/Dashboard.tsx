import { useEffect, useMemo, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import {
  PERSONA_BY_AGE_GROUP,
  AGE_GROUP_LABELS,
  type AgeGroup,
  type CurriculumUpgradeEvent,
  type ParentUser,
} from '@brightpath/shared';
import { useAuth } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import { useLearningPath } from '@/hooks/useLearningPath';
import { useAnalytics } from '@/hooks/useAnalytics';
import { getAgeGroupDashboardConfig } from '@/lib/ageGroupDashboardConfig';
import { DashboardHeader, type SubjectFilter } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { WelcomeStats } from '@/components/dashboard/WelcomeStats';
import { LearningPath } from '@/components/dashboard/LearningPath';
import { MySubjectsList } from '@/components/dashboard/SubjectsCard';
import { AnalyticsAndMastery } from '@/components/dashboard/AnalyticsCard';
import { TutorChatDrawer } from '@/components/dashboard/TutorChatDrawer';
import { DashboardSettingsDrawer } from '@/components/dashboard/DashboardSettingsDrawer';
import { AgeUpgradeModal } from '@/components/age/AgeUpgradeModal';

export default function Dashboard() {
  const { parent, pendingUpgrade, clearPendingUpgrade, updateParent } = useAuth();
  const { profile } = useProfile();
  const [chatOpen, setChatOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState<SubjectFilter>('all');
  const [localUpgrade, setLocalUpgrade] = useState<CurriculumUpgradeEvent | null>(null);

  const activity = useActivityTracker(Boolean(parent));

  const learnerName = profile?.name || parent?.name?.split(' ')[0] || 'Anya';
  const ageGroup: AgeGroup = parent?.calculatedAgeGroup ?? 'EARLY_4_7';
  const persona = PERSONA_BY_AGE_GROUP[ageGroup];
  const activeConfig = useMemo(() => getAgeGroupDashboardConfig(ageGroup), [ageGroup]);
  const learningPath = useLearningPath(Boolean(parent), ageGroup);
  const analytics = useAnalytics(Boolean(parent), ageGroup);

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;
    const id = window.setTimeout(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
    return () => window.clearTimeout(id);
  }, []);

  const bumpActiveModuleFromChat = () => {
    const active = learningPath.nodes.find((n) => n.status === 'IN_PROGRESS');
    if (!active) return;
    const nextScore = Math.min(79, Math.max(active.masteryScore, active.masteryScore + 5));
    if (nextScore === active.masteryScore) return;
    void learningPath.submitAssessment(active.id, nextScore).catch(() => {});
    void analytics
      .submitSkillAssessment({
        scorePercent: nextScore,
        skillTags: [active.subjectCategory],
        correct: nextScore >= 60,
      })
      .catch(() => {});
  };

  const celebration = localUpgrade ?? pendingUpgrade;

  const handleCurriculumUpdated = (next: ParentUser, curriculum: CurriculumUpgradeEvent) => {
    updateParent(next);
    setLocalUpgrade(curriculum);
  };

  const touchPad =
    persona.touchScale === 'xl'
      ? '[&_button]:min-h-14 [&_button]:text-base'
      : persona.touchScale === 'lg'
        ? '[&_button]:min-h-12'
        : '';

  return (
    <div
      className={[
        'bp-dash flex min-h-dvh flex-col text-slate-800',
        persona.themeClass,
        touchPad,
        ageGroup === 'TODDLER_1_3' && 'bg-gradient-to-br from-pink-50 via-fuchsia-50/40 to-sky-50',
        ageGroup === 'EARLY_4_7' && 'bg-gradient-to-br from-indigo-50 via-violet-50/30 to-emerald-50/40',
        ageGroup === 'UPPER_ELEM_8_10' && 'bg-gradient-to-br from-slate-50 via-teal-50/20 to-indigo-50/30',
        ageGroup === 'MIDDLE_11_14' && 'bg-gradient-to-br from-slate-100 via-indigo-50/40 to-violet-50/30',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <DashboardHeader
        learnerName={learnerName}
        ageGroup={ageGroup}
        subjectFilter={subjectFilter}
        onSubjectFilterChange={setSubjectFilter}
        onOpenSettings={() => setSettingsOpen(true)}
        onCurriculumUpdated={handleCurriculumUpdated}
      />

      <div className="flex min-h-0 flex-1">
        <DashboardSidebar onOpenSettings={() => setSettingsOpen(true)} />

        <div className="flex min-w-0 flex-1 flex-col xl:flex-row">
          <main className="min-w-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
            <div className="rounded-2xl border border-white/70 bg-white/70 px-4 py-3 text-sm shadow-soft backdrop-blur-md">
              <span className="font-bold" style={{ color: persona.accent }}>
                {AGE_GROUP_LABELS[ageGroup]}
              </span>
              <span className="mx-2 text-slate-300">·</span>
              <span className="text-slate-600">{persona.headline}</span>
              <span className="mx-2 text-slate-300">·</span>
              <span className="text-slate-500">{persona.mode}</span>
              {parent?.currentAge != null && (
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  Age {parent.currentAge}
                </span>
              )}
              {subjectFilter !== 'all' && (
                <span className="ml-2 rounded-full bg-teal-50 px-2 py-0.5 text-xs font-semibold capitalize text-teal-700">
                  Filter: {subjectFilter}
                </span>
              )}
            </div>

            <WelcomeStats
              name={learnerName}
              streakDays={activity.currentStreak}
              timeStudied={activity.timeStudiedFormatted}
            />

            <LearningPath
              nodes={learningPath.nodes}
              loading={learningPath.loading}
              accent={activeConfig.theme.accent}
              subjectFilter={subjectFilter}
            />

            <div className="grid gap-5 xl:grid-cols-2">
              <MySubjectsList
                subjects={analytics.data?.subjects ?? []}
                loading={analytics.loading}
                subjectFilter={subjectFilter}
              />
              <AnalyticsAndMastery
                radar={analytics.data?.radar ?? []}
                skillTree={analytics.data?.skillTree ?? null}
                goals={analytics.data?.goals ?? []}
                loading={analytics.loading}
                accent={activeConfig.theme.accent}
                onCompleteGoal={async (id) => {
                  await analytics.completeGoal(id);
                }}
              />
            </div>
          </main>

          <div className="hidden w-80 shrink-0 p-4 pl-0 xl:block xl:w-96 xl:p-6 xl:pl-0">
            <div className="sticky top-20 h-[calc(100dvh-6.5rem)]">
              <TutorChatDrawer
                learnerName={learnerName}
                persona={activeConfig.aiChat}
                accent={activeConfig.theme.accent}
                ageGroupKey={ageGroup}
                onPracticeInteraction={bumpActiveModuleFromChat}
              />
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setChatOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg xl:hidden"
        style={{ background: activeConfig.theme.accent }}
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
            <TutorChatDrawer
              learnerName={learnerName}
              persona={activeConfig.aiChat}
              accent={activeConfig.theme.accent}
              ageGroupKey={ageGroup}
              onPracticeInteraction={bumpActiveModuleFromChat}
            />
          </div>
        </div>
      )}

      <DashboardSettingsDrawer
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <AgeUpgradeModal
        open={Boolean(celebration?.upgraded && celebration.newGroup)}
        newGroup={(celebration?.newGroup ?? ageGroup) as AgeGroup}
        previousGroup={celebration?.previousGroup}
        message={celebration?.message}
        onClose={() => {
          setLocalUpgrade(null);
          clearPendingUpgrade();
        }}
      />
    </div>
  );
}
