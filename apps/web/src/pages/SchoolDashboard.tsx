import { useEffect, useState } from 'react';
import { Award, Layers, LogOut, Sparkles, ShieldCheck, Users } from 'lucide-react';
import { isSubscriptionActive } from '@brightpath/shared';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { PaymentUpgradeModal } from '@/components/billing/PaymentUpgradeModal';
import { useOrgTheme } from '@/context/OrgThemeProvider';
import { BrandLogo } from '@/components/Navigation/BrandLogo';
import { FeedbackMenuButton } from '@/components/FeedbackMenuButton';
import { RoleToolsPanel } from '@/components/tools/RoleToolsPanel';
import { CYBER_FONT_STYLE } from '@/lib/theme';

export default function SchoolDashboard() {
  const { user, organization, logout, planType } = useAuth();
  const theme = useOrgTheme();
  const [stats, setStats] = useState<{ memberCount: number; batchCount: number; maxLicenses: number } | null>(
    null,
  );
  const [error, setError] = useState('');
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
    <div className="flex h-screen w-full overflow-hidden bg-[#040711] text-slate-100" style={CYBER_FONT_STYLE}>
      <aside className="flex w-64 shrink-0 flex-col justify-between border-r border-slate-800/80 bg-[#060a14] p-4">
        <span className="px-2 text-base font-extrabold uppercase tracking-wider text-cyan-400">School</span>
        <FeedbackMenuButton size="lg" />
      </aside>

      <main className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-20 flex h-20 shrink-0 items-center justify-between border-b border-slate-800/80 bg-[#080d1a]/90 px-8 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {theme.logoUrl ? (
              <img
                src={theme.logoUrl.startsWith('/uploads') ? `/api${theme.logoUrl}` : theme.logoUrl}
                alt=""
                className="h-11 w-11 rounded-xl object-contain"
              />
            ) : (
              <BrandLogo variant="compact" />
            )}
            <div>
              <h1 className="text-2xl font-extrabold leading-none tracking-tight text-white">School Dashboard</h1>
              <p className="mt-1 text-sm font-medium text-slate-400">
                {organization?.name ?? 'MindVault Enterprise Portal'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <p className="hidden text-base font-medium text-slate-300 sm:block">
              Welcome, <strong className="font-bold text-white">{user?.name || user?.email || 'School admin'}</strong>
            </p>
            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/20 px-3 py-1 text-sm font-extrabold uppercase text-cyan-300">
              {plan}
            </span>
            <button
              type="button"
              onClick={logout}
              className="inline-flex cursor-pointer appearance-none items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-base font-bold text-rose-400 transition-all hover:bg-rose-500/20"
            >
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </div>
        </header>

        <div className="custom-scrollbar w-full flex-1 space-y-8 overflow-y-auto px-6 py-6">
          {!subActive ? (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-950/40 px-4 py-3 text-base font-medium text-amber-100">
              Subscription inactive — premium org features are locked.{' '}
              <button type="button" className="cursor-pointer appearance-none border-0 bg-transparent font-bold text-cyan-300 underline" onClick={() => setPayOpen(true)}>
                Renew / upgrade
              </button>
            </div>
          ) : null}
          {error ? <p className="text-base font-semibold text-rose-300">{error}</p> : null}

          <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-3">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="flex items-center justify-between rounded-2xl border border-slate-800/80 bg-[#0b101d] p-5 shadow-xl transition-all hover:border-slate-700"
                >
                  <div className="space-y-1">
                    <span className="text-base font-bold uppercase tracking-wider text-slate-400">{card.label}</span>
                    <div className="text-5xl font-black tracking-tight text-white">{card.value ?? '—'}</div>
                  </div>
                  <div className={`rounded-2xl border p-3.5 ${card.bg} ${card.border}`}>
                    <Icon className={`h-6 w-6 ${card.accent}`} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="w-full space-y-5">
            <div>
              <h2 className="flex items-center gap-2 text-3xl font-black tracking-tight text-white">
                <Sparkles className="h-7 w-7 text-cyan-400" /> AI Tools Suite
              </h2>
              <p className="mt-1 text-base text-slate-400">
                Tools available for your enterprise role. Opening one uses the same generator as the teacher workspace.
              </p>
            </div>
            <RoleToolsPanel tone="dark" showHeading={false} />
          </div>

          <div className="w-full space-y-4 rounded-2xl border border-purple-500/30 bg-[#080e1b] p-7 shadow-2xl">
            <h3 className="flex items-center gap-2 text-lg font-extrabold uppercase tracking-wider text-purple-400">
              <ShieldCheck className="h-5 w-5" /> Enterprise capabilities included
            </h3>
            <ul className="grid grid-cols-1 gap-3 text-base font-medium text-slate-200 md:grid-cols-2">
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
        </div>
      </main>

      <PaymentUpgradeModal open={payOpen} onClose={() => setPayOpen(false)} defaultPlan="school_enterprise" />
    </div>
  );
}
