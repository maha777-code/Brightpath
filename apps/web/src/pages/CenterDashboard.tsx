import { useEffect, useState } from 'react';
import { LogOut, School, Users, Layers, Upload, CreditCard } from 'lucide-react';
import { isSubscriptionActive } from '@brightpath/shared';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { BulkCsvImportModal } from '@/components/admin/BulkCsvImportModal';
import { PaymentUpgradeModal } from '@/components/billing/PaymentUpgradeModal';
import { useOrgTheme } from '@/context/OrgThemeProvider';

export default function CenterDashboard() {
  const { user, organization, logout, planType } = useAuth();
  const theme = useOrgTheme();
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

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <School className="h-7 w-7" style={{ color: theme.primary }} />
            <div>
              <h1 className="text-lg font-extrabold text-slate-800">Tutor Center Dashboard</h1>
              <p className="text-xs text-slate-500">{organization?.name ?? 'Your academy'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-8 sm:px-8">
        {!subActive && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
            Subscription inactive.{' '}
            <button type="button" className="underline" onClick={() => setPayOpen(true)}>
              Renew with Stripe / Razorpay
            </button>
          </div>
        )}
        <p className="text-sm text-slate-600">
          Welcome{user?.name ? `, ${user.name}` : ''} · Plan:{' '}
          <strong>{planType ?? 'tutor_center_pro'}</strong>
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
            <Users className="mb-2 h-5 w-5" style={{ color: theme.primary }} />
            <p className="text-2xl font-extrabold text-slate-800">{stats?.memberCount ?? '—'}</p>
            <p className="text-xs font-semibold text-slate-500">Tutors / staff</p>
          </div>
          <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
            <Layers className="mb-2 h-5 w-5" style={{ color: theme.primary }} />
            <p className="text-2xl font-extrabold text-slate-800">{stats?.batchCount ?? '—'}</p>
            <p className="text-xs font-semibold text-slate-500">Student batches</p>
          </div>
          <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
            <School className="mb-2 h-5 w-5" style={{ color: theme.primary }} />
            <p className="text-2xl font-extrabold text-slate-800">{stats?.maxLicenses ?? '—'}</p>
            <p className="text-xs font-semibold text-slate-500">Seats</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!subActive}
            onClick={() => setCsvOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            style={{ background: theme.primary }}
          >
            <Upload className="h-4 w-4" /> Bulk CSV import
          </button>
          <button
            type="button"
            onClick={() => setPayOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 text-sm font-bold text-slate-700"
          >
            <CreditCard className="h-4 w-4" /> Billing
          </button>
        </div>

        <section className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-extrabold text-slate-800">Center Pro features</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>Multi-tutor management & CSV onboarding</li>
            <li>Batch creation with invite codes</li>
            <li>Shared RAG library for center textbooks</li>
          </ul>
        </section>
      </main>

      <BulkCsvImportModal open={csvOpen} onClose={() => setCsvOpen(false)} />
      <PaymentUpgradeModal
        open={payOpen}
        onClose={() => setPayOpen(false)}
        defaultPlan="tutor_center_pro"
      />
    </div>
  );
}
