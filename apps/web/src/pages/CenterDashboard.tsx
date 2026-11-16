import { useEffect, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Home,
  LayoutGrid,
  Settings,
  Upload,
  Users,
} from 'lucide-react';
import { isSubscriptionActive } from '@brightpath/shared';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { BulkCsvImportModal } from '@/components/admin/BulkCsvImportModal';
import { PaymentUpgradeModal } from '@/components/billing/PaymentUpgradeModal';
import { AiToolsLibrary } from '@/components/tools/AiToolsLibrary';
import { AcademyHome, type AcademyStats } from '@/components/academy/AcademyHome';
import { AcademyAnalytics } from '@/components/academy/AcademyAnalytics';
import { AcademySettingsBilling } from '@/components/academy/AcademySettingsBilling';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { ClassroomLinks } from '@/components/roster/ClassroomLinks';

type Panel = 'home' | 'tools' | 'people' | 'courses' | 'analytics' | 'settings';

const NAV: { id: Panel; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'tools', label: 'AI Tools Suite', icon: LayoutGrid },
  { id: 'people', label: 'Students / Tutors', icon: Users },
  { id: 'courses', label: 'Courses / Curricula', icon: BookOpen },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings / Billing', icon: Settings },
];

export default function CenterDashboard() {
  const { user, organization, planType, role } = useAuth();
  const [panel, setPanel] = useState<Panel>('tools');
  const [stats, setStats] = useState<AcademyStats | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [subActive, setSubActive] = useState(true);

  useEffect(() => {
    api.orgMe().then((r) => setStats(r.stats)).catch(() => undefined);
    api
      .paymentStatus()
      .then((r) => setSubActive(r.active))
      .catch(() => setSubActive(isSubscriptionActive(organization?.subscriptionStatus)));
  }, [organization?.subscriptionStatus]);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100">
      <div className="flex min-h-screen">
        <AppSidebar
          title={organization?.name ?? 'Tutoring Center workspace'}
          brandTo="/"
          sections={[
            {
              items: NAV.map((item) => ({
                key: item.id,
                label: item.label,
                icon: item.icon,
                active: panel === item.id,
                onClick: () => setPanel(item.id),
              })),
            },
          ]}
          userName={user?.name || user?.email || 'Center admin'}
          userDetail="Tutoring Center"
        />

        <div className="min-w-0 flex-1 pt-16 md:pt-0">
          <header className="flex items-center gap-3 border-b border-slate-800 px-4 py-4 md:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Academy</p>
              <h1 className="text-lg font-extrabold text-white">
                {NAV.find((item) => item.id === panel)?.label}
              </h1>
            </div>
          </header>

          <main className="px-4 py-6 md:px-8">
            {!subActive ? (
              <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
                Subscription inactive.{' '}
                <button type="button" className="font-bold underline" onClick={() => setPayOpen(true)}>
                  Renew
                </button>
              </div>
            ) : null}

            {panel === 'tools' ? <AiToolsLibrary userRole={role} userPlan={planType} /> : null}

            {panel === 'home' ? <AcademyHome userName={user?.name ?? null} stats={stats} /> : null}
            {panel === 'analytics' ? <AcademyAnalytics stats={stats} /> : null}

            {panel === 'people' ? (
              <section className="space-y-4">
                <StatGrid stats={stats} />
                <ClassroomLinks academy />
                <button
                  type="button"
                  disabled={!subActive}
                  onClick={() => setCsvOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50"
                >
                  <Upload className="h-4 w-4" /> Bulk CSV import
                </button>
              </section>
            ) : null}

            {panel === 'courses' ? (
              <section className="max-w-2xl rounded-xl border border-slate-800 bg-slate-900 p-6">
                <h2 className="text-lg font-bold text-white">Shared curricula</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  Center textbooks and chapter studios live in Curriculum & Textbook Studio. Tutors
                  on Tutor Center Pro can open it from AI Tools Suite.
                </p>
              </section>
            ) : null}

            {panel === 'settings' ? (
              <AcademySettingsBilling
                organization={organization}
                stats={stats}
                onChangePlan={() => setPayOpen(true)}
              />
            ) : null}
          </main>
        </div>
      </div>

      <BulkCsvImportModal open={csvOpen} onClose={() => setCsvOpen(false)} />
      <PaymentUpgradeModal open={payOpen} onClose={() => setPayOpen(false)} defaultPlan="tutor_center_pro" />
    </div>
  );
}

function StatGrid({ stats }: { stats: AcademyStats | null }) {
  const items = [
    { label: 'Tutors / staff', value: stats?.tutorCount },
    { label: 'Student batches', value: stats?.batchCount },
    {
      label: 'Seats allocated',
      value: stats ? `${stats.seatsUsed} / ${stats.maxLicenses}` : undefined,
    },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-2xl font-extrabold text-white">{item.value ?? '—'}</p>
          <p className="text-xs font-semibold text-slate-400">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
