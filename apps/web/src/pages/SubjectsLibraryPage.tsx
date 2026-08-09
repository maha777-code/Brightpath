import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  PERSONA_BY_AGE_GROUP,
  type AgeGroup,
  type CurriculumUpgradeEvent,
  type ParentUser,
} from '@brightpath/shared';
import { useAuth } from '@/context/AuthContext';
import { useAnalytics } from '@/hooks/useAnalytics';
import { DashboardHeader, type SubjectFilter } from '@/components/dashboard/DashboardHeader';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { MySubjectsList } from '@/components/dashboard/SubjectsCard';
import { DashboardSettingsDrawer } from '@/components/dashboard/DashboardSettingsDrawer';
import { useProfile } from '@/hooks/useProfile';

export default function SubjectsLibraryPage() {
  const { parent, updateParent } = useAuth();
  const { profile } = useProfile();
  const ageGroup: AgeGroup = parent?.calculatedAgeGroup ?? 'EARLY_4_7';
  const analytics = useAnalytics(Boolean(parent), ageGroup);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState<SubjectFilter>('all');
  const learnerName = profile?.name || parent?.name?.split(' ')[0] || 'Learner';
  const persona = useMemo(() => PERSONA_BY_AGE_GROUP[ageGroup], [ageGroup]);

  const handleCurriculumUpdated = (next: ParentUser, _curriculum: CurriculumUpgradeEvent) => {
    updateParent(next);
  };

  return (
    <div className={['bp-dash flex min-h-dvh flex-col text-slate-800', persona.themeClass].join(' ')}>
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
        <main className="min-w-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-teal-700"
          >
            <ArrowLeft className="h-4 w-4" /> Back to dashboard
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-800">Course Library</h1>
          <p className="text-sm text-slate-500">All enrolled subjects for {learnerName}.</p>
          <MySubjectsList
            subjects={analytics.data?.subjects ?? []}
            loading={analytics.loading}
            subjectFilter={subjectFilter}
          />
        </main>
      </div>
      <DashboardSettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
