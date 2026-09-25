import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, CreditCard, Layers, LogOut, Palette, Sparkles, ShieldCheck, Upload, Users } from 'lucide-react';
import { isSubscriptionActive } from '@brightpath/shared';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { BulkCsvImportModal } from '@/components/admin/BulkCsvImportModal';
import { PaymentUpgradeModal } from '@/components/billing/PaymentUpgradeModal';
import { useOrgTheme } from '@/context/OrgThemeProvider';
import { BrandLogo } from '@/components/Navigation/BrandLogo';
import { FeedbackMenuButton } from '@/components/FeedbackMenuButton';
import { RoleToolsPanel } from '@/components/tools/RoleToolsPanel';
import { CYBER_FONT_STYLE } from '@/lib/theme';

const primaryBtn =
  'inline-flex cursor-pointer appearance-none items-center gap-2 rounded-xl border border-transparent bg-cyan-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-lg shadow-cyan-500/10 hover:bg-cyan-400 disabled:opacity-50';
const secondaryBtn =
  'inline-flex cursor-pointer appearance-none items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-800/60 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-800';

export default function SchoolDashboard() {
  const { user, organization, logout, planType } = useAuth();
  const theme = useOrgTheme();
  const [stats, setStats] = useState<{ memberCount: number; batchCount: number; maxLicenses: number } | null>(
    null,
  );
  const [error, setError] = useState('');
  const [csvOpen, setCsvOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [subActive, setSubActive] = useState(true);

  useEffect(() => {
    api
      .orgMe()
      .then((r) => setStats(r.stats))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
    api
      .paymentStatus()
      .then((r) => setSubActive(r.active))
      .catch(() => setSubActive(isSubscriptionActive(organization?.subscriptionStatus)));
  }, [organization?.subscriptionStatus]);

  const plan = planType ?? organization?.planType ?? 'school_enterprise';
  const cards = [
    { label: 'Members', value: stats?.memberCount, icon: Users, accent: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    { label: 'Classes / Batches', value: stats?.batchCount, icon: Layers, accent: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    { label: 'License Seats', value: stats?.maxLicenses, icon: Award, accent: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#030712] text-slate-100" style={CYBER_FONT_STYLE}>
      <aside className="flex w-56 shrink-0 flex-col border-r border-slate-800/80 bg-[#080d1a] p-4">
        <p className="px-2 text-[11px] font-bold uppercase tracking-wider text-cyan-400">School</p>
        <div className="mt-auto">
          <FeedbackMenuButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-20 flex h-16 shrink-0 items-center justify-between border-b border-slate-800/80 bg-[#080d1a]/90 px-6 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {theme.logoUrl ? (
              <img
                src={theme.logoUrl.startsWith('/uploads') ? `/api${theme.logoUrl}` : theme.logoUrl}
                alt=""
                className="h-9 w-9 rounded-xl object-contain"
              />
            ) : (
              <BrandLogo variant="compact" />
            )}
            <div>
              <h1 className="text-base font-extrabold leading-none tracking-tight text-white">School Dashboard</h1>
              <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                {organization?.name ?? 'MindVault Enterprise Portal'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-xs sm:flex">
              <span className="font-medium text-slate-400">Welcome,</span>
              <span className="font-bold text-white">{user?.name || user?.email || 'School admin'}</span>
              <span className="ml-1 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-cyan-400">
                {plan}
              </span>
            </div>
            <button
              type="button"
              onClick={logout}
              className="inline-flex cursor-pointer appearance-none items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3.5 py-1.5 text-xs font-bold text-rose-400 hover:bg-rose-500/20"
            >
              <LogOut className="h-3.5 w-3.5" /> Log out
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 space-y-8 overflow-y-auto p-6 lg:p-8">
          {!subActive ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/40 px-4 py-3 text-sm font-medium text-amber-100">
              Subscription inactive — premium org features are locked.{' '}
              <button type="button" className="cursor-pointer appearance-none border-0 bg-transparent font-bold text-cyan-300 underline" onClick={() => setPayOpen(true)}>
                Renew / upgrade
              </button>
            </div>
          ) : null}
          {error ? <p className="text-sm font-semibold text-rose-300">{error}</p> : null}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="flex items-center justify-between rounded-2xl border border-slate-800/80 bg-[#0b101d] p-5 shadow-xl transition-all hover:border-slate-700"
                >
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{card.label}</span>
                    <div className="text-3xl font-black tracking-tight text-white">{card.value ?? '—'}</div>
                  </div>
                  <div className={`rounded-2xl border p-3.5 ${card.bg} ${card.border}`}>
                    <Icon className={`h-6 w-6 ${card.accent}`} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" disabled={!subActive} onClick={() => setCsvOpen(true)} className={primaryBtn}>
              <Upload className="h-4 w-4" /> Bulk CSV import
            </button>
            <Link to="/admin/school-dashboard/settings" className={secondaryBtn}>
              <Palette className="h-4 w-4 text-cyan-400" /> Branding settings
            </Link>
            <button type="button" onClick={() => setPayOpen(true)} className={secondaryBtn}>
              <CreditCard className="h-4 w-4 text-emerald-400" /> Billing
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-white">
                <Sparkles className="h-5 w-5 text-cyan-400" /> AI Tools Suite
              </h2>
              <p className="mt-1 text-xs font-medium text-slate-400 sm:text-sm">
                Tools available for your enterprise role. Opening one uses the same generator as the teacher workspace.
              </p>
            </div>
            <RoleToolsPanel tone="dark" showHeading={false} />
          </div>

          <div className="space-y-3 rounded-2xl border border-purple-500/20 bg-[#080e1b] p-6 shadow-2xl">
            <h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-purple-400">
              <ShieldCheck className="h-4 w-4" /> Enterprise capabilities included
            </h3>
            <ul className="grid grid-cols-1 gap-2 text-xs font-medium text-slate-300 md:grid-cols-2">
              {[
                'Bulk student/teacher CSV import with validation and welcome emails',
                'Custom logo and color theme across student and teacher UI',
                'School-wide shared library from verified textbooks',
                'Stripe and Razorpay subscription billing',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </main>
      </div>

      <BulkCsvImportModal open={csvOpen} onClose={() => setCsvOpen(false)} />
      <PaymentUpgradeModal open={payOpen} onClose={() => setPayOpen(false)} defaultPlan="school_enterprise" />
    </div>
  );
}
