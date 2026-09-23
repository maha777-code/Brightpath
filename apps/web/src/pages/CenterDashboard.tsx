import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  BookOpen,
  CreditCard,
  Home,
  LayoutGrid,
  LogOut,
  Menu,
  Settings,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { isSubscriptionActive } from '@brightpath/shared';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { BulkCsvImportModal } from '@/components/admin/BulkCsvImportModal';
import { PaymentUpgradeModal } from '@/components/billing/PaymentUpgradeModal';
import { AiToolsLibrary } from '@/components/tools/AiToolsLibrary';
import { BrandLogo } from '@/components/Navigation/BrandLogo';

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
  const { user, organization, logout, planType, role } = useAuth();
  const navigate = useNavigate();
  const [panel, setPanel] = useState<Panel>('tools');
  const [menuOpen, setMenuOpen] = useState(false);
  const [stats, setStats] = useState<{ memberCount: number; batchCount: number; maxLicenses: number } | null>(
    null,
  );
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

  const select = (next: Panel) => {
    setPanel(next);
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100">
      <div className="flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-800 bg-slate-950 p-4 transition-transform md:static md:translate-x-0 ${
            menuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="mb-6 flex items-center justify-between px-2">
            <BrandLogo variant="full" to="/" imgClassName="h-9 w-auto object-contain" />
            <button type="button" className="text-slate-400 md:hidden" onClick={() => setMenuOpen(false)} aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {organization?.name ?? 'Tutor Center'}
          </p>
          <nav className="space-y-1" aria-label="Academy">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = panel === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => select(item.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${
                    active
                      ? 'bg-cyan-950/50 text-cyan-300'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="mt-8 flex w-full items-center gap-2 rounded-xl border border-slate-800 px-3 py-2.5 text-sm font-semibold text-slate-300"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </aside>

        {menuOpen ? (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
        ) : null}

        <div className="min-w-0 flex-1">
          <header className="flex items-center gap-3 border-b border-slate-800 px-4 py-4 md:px-8">
            <button type="button" className="text-cyan-300 md:hidden" onClick={() => setMenuOpen(true)} aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
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

            {panel === 'home' ? (
              <section className="space-y-4">
                <p className="text-slate-300">
                  Welcome{user?.name ? `, ${user.name}` : ''}. Your academy workspace is ready.
                </p>
                <StatGrid stats={stats} />
              </section>
            ) : null}

            {panel === 'people' ? (
              <section className="space-y-4">
                <StatGrid stats={stats} />
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

            {panel === 'analytics' ? (
              <section className="space-y-4">
                <StatGrid stats={stats} />
                <p className="text-sm text-slate-400">
                  Seat use, tutor count, and batch totals update from your organization record.
                </p>
              </section>
            ) : null}

            {panel === 'settings' ? (
              <section className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setPayOpen(true)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold text-white"
                >
                  <CreditCard className="h-4 w-4" /> Billing
                </button>
                <Link
                  to="/admin/center-dashboard/settings"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold text-white"
                >
                  <Settings className="h-4 w-4" /> Branding settings
                </Link>
              </section>
            ) : null}
          </main>
        </div>
      </div>

      <BulkCsvImportModal open={csvOpen} onClose={() => setCsvOpen(false)} />
      <PaymentUpgradeModal open={payOpen} onClose={() => setPayOpen(false)} defaultPlan="tutor_center_pro" />
    </div>
  );
}

function StatGrid({
  stats,
}: {
  stats: { memberCount: number; batchCount: number; maxLicenses: number } | null;
}) {
  const items = [
    { label: 'Tutors / staff', value: stats?.memberCount },
    { label: 'Student batches', value: stats?.batchCount },
    { label: 'Seats', value: stats?.maxLicenses },
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
