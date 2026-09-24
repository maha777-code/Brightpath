import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CreditCard, Loader2, Palette, Upload } from 'lucide-react';
import { RAZORPAY_PLAN_AMOUNTS_INR, STRIPE_PLAN_PRICES, type OrganizationPublic } from '@brightpath/shared';
import { api } from '@/lib/api';
import { readExportWatermark, writeExportWatermark } from '@/lib/exportWatermark';
import type { AcademyStats } from '@/components/academy/AcademyHome';

type Tab = 'billing' | 'branding';

const TIERS = ['tutor_center_pro', 'school_enterprise'] as const;

function inr(paise: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function planLabel(planType: string | undefined) {
  if (!planType) return 'No plan';
  return STRIPE_PLAN_PRICES[planType]?.label ?? planType.replaceAll('_', ' ');
}

const tabButton =
  'inline-flex cursor-pointer appearance-none items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-medium transition-all duration-200';

export function AcademySettingsBilling({
  organization,
  stats,
  onChangePlan,
}: {
  organization: OrganizationPublic | null;
  stats: AcademyStats | null;
  onChangePlan: () => void;
}) {
  const [activeTab, setActiveTab] = useState<Tab>('billing');
  const [academyName, setAcademyName] = useState(organization?.name ?? '');
  const [primaryColor, setPrimaryColor] = useState(organization?.primaryColor ?? '#5B46BA');
  const [primaryHoverColor, setPrimaryHoverColor] = useState(organization?.primaryHoverColor ?? '#4A3799');
  const [accentColor, setAccentColor] = useState(organization?.accentColor ?? '#0D9488');
  const [watermarkText, setWatermarkText] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(organization?.logoUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setWatermarkText(readExportWatermark() || `${organization?.name ?? 'Academy'} — Confidential`);
    api
      .getBranding()
      .then((result) => {
        const org = result.organization;
        setAcademyName(org.name);
        setPrimaryColor(org.primaryColor ?? '#5B46BA');
        setPrimaryHoverColor(org.primaryHoverColor ?? '#4A3799');
        setAccentColor(org.accentColor ?? '#0D9488');
        setLogoUrl(org.logoUrl);
      })
      .catch(() => undefined);
  }, [organization?.name]);

  const seatsUsed = stats?.seatsUsed ?? 0;
  const seatsTotal = stats?.maxLicenses ?? organization?.maxLicenses ?? 0;
  const seatPct = seatsTotal > 0 ? Math.min(100, Math.round((seatsUsed / seatsTotal) * 100)) : 0;
  const remaining = Math.max(0, seatsTotal - seatsUsed);
  const generations = useMemo(() => {
    const subjects = stats?.subjects ?? [];
    return subjects.reduce((sum, row) => sum + row.quizzesConducted + row.assignmentsGiven, 0);
  }, [stats]);
  const status = organization?.subscriptionStatus ?? 'active';
  const interval = organization?.billingInterval ?? null;
  const displayLogo = logoUrl?.startsWith('/uploads') ? `/api${logoUrl}` : logoUrl;

  const saveBranding = async () => {
    setBusy(true);
    setMessage('');
    try {
      const result = await api.updateBranding({
        name: academyName.trim(),
        primaryColor,
        primaryHoverColor,
        accentColor,
      });
      writeExportWatermark(watermarkText);
      setLogoUrl(result.organization.logoUrl);
      setMessage('Branding saved. The watermark is added to printed quizzes, worksheets, and lesson plans on this browser.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const uploadLogo = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      setMessage('Logo must be 2 MB or smaller.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const result = await api.uploadOrgLogo(file);
      setLogoUrl(result.logoUrl);
      setMessage('Logo uploaded.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">Academy</span>
        <h2 className="mt-1 text-3xl font-extrabold text-white">Settings / Billing</h2>
        <p className="mt-1 text-sm text-slate-400">
          Manage subscription plans, seat allocations, invoices, and center branding.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 pb-4">
        <button
          type="button"
          onClick={() => setActiveTab('billing')}
          className={`${tabButton} ${
            activeTab === 'billing'
              ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400 shadow-lg shadow-cyan-950/20'
              : 'border-transparent bg-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Billing & Subscription</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('branding')}
          className={`${tabButton} ${
            activeTab === 'branding'
              ? 'border-purple-500/30 bg-purple-500/10 text-purple-400 shadow-lg shadow-purple-950/20'
              : 'border-transparent bg-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200'
          }`}
        >
          <Palette className="h-4 w-4" />
          <span>Branding Settings</span>
        </button>
      </div>

      {activeTab === 'billing' ? (
        <div className="space-y-8">
          <div className="flex flex-col justify-between gap-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl md:flex-row md:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-bold uppercase text-cyan-400">
                  {status === 'active' || status === 'trialing' ? 'Active Plan' : status.replaceAll('_', ' ')}
                </span>
                <span className="text-xs text-slate-400">
                  {interval ? `Billed ${interval}` : 'Billing interval not set'}
                </span>
              </div>
              <h3 className="mt-2 text-2xl font-bold text-white">{planLabel(organization?.planType)}</h3>
              <p className="mt-1 text-sm text-slate-400">
                {seatsTotal} seats included · AI tools for this center · Priority checkout through Stripe or Razorpay
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onChangePlan}
                className="cursor-pointer appearance-none rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700"
              >
                Change Plan
              </button>
              <button
                type="button"
                onClick={onChangePlan}
                className="cursor-pointer appearance-none rounded-xl border border-transparent bg-cyan-500 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-400"
              >
                Manage seats
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="text-base font-bold text-white">Seat Capacity Usage</h3>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Allocated Seats</span>
                  <span className="font-bold text-white">
                    {stats ? `${seatsUsed} / ${seatsTotal} Seats` : '—'}
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-cyan-400" style={{ width: `${seatPct}%` }} />
                </div>
                <p className="mt-1 text-xs text-slate-500">{remaining} seats still available.</p>
              </div>
            </section>
            <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="text-base font-bold text-white">Monthly AI Credits</h3>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Generations recorded</span>
                  <span className="font-bold text-purple-400">{generations.toLocaleString()}</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full w-0 rounded-full bg-purple-500" />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  This plan has no stored monthly credit cap. Counts come from quizzes and worksheets.
                </p>
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="mb-4 text-lg font-bold text-white">Subscription Tiers</h3>
            <div className="grid gap-4 md:grid-cols-2">
              {TIERS.map((tier) => {
                const current = organization?.planType === tier;
                const price = RAZORPAY_PLAN_AMOUNTS_INR[tier];
                return (
                  <div
                    key={tier}
                    className={`rounded-xl border p-4 ${
                      current ? 'border-cyan-500/40 bg-cyan-500/10' : 'border-slate-800 bg-[#090d16]'
                    }`}
                  >
                    <p className="text-sm font-bold text-white">{planLabel(tier)}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {price ? `${inr(price.monthly)} / month · ${inr(price.yearly)} / year` : 'Contact sales'}
                    </p>
                    {current ? (
                      <p className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-cyan-300">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Current tier
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={onChangePlan}
                        className="mt-3 cursor-pointer appearance-none rounded-lg border border-transparent bg-transparent px-0 text-xs font-bold text-cyan-400 hover:text-cyan-300"
                      >
                        Switch to this tier
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="text-lg font-bold text-white">Payment Methods</h3>
            <p className="mt-1 text-sm text-slate-400">
              Checkout opens Stripe or Razorpay for {planLabel(organization?.planType)}.
            </p>
            <button
              type="button"
              onClick={onChangePlan}
              className="mt-4 cursor-pointer appearance-none rounded-xl border border-slate-700 bg-[#090d16] px-5 py-2.5 text-sm font-semibold text-white hover:border-cyan-500/40"
            >
              Open checkout
            </button>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h3 className="mb-4 text-lg font-bold text-white">Billing History & Invoices</h3>
            <p className="text-sm text-slate-400">
              Receipts are issued by Stripe or Razorpay. This center does not have invoices stored yet.
            </p>
          </section>
        </div>
      ) : (
        <div className="max-w-3xl space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div>
            <h3 className="text-lg font-bold text-white">Academy Custom Branding</h3>
            <p className="mt-1 text-xs text-slate-400">
              Customize how your academy name, logo, and watermarks appear on AI outputs and exported PDFs.
            </p>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-300">Academy Display Name</span>
            <input
              type="text"
              value={academyName}
              onChange={(event) => setAcademyName(event.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-[#090d16] px-4 py-2.5 text-sm text-white outline-none focus:border-purple-500"
              style={{ backgroundColor: '#090d16', color: '#fff' }}
            />
          </label>

          <div className="space-y-2">
            <span className="text-sm font-semibold text-slate-300">Academy Logo</span>
            <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-slate-800 bg-[#090d16]/50 p-6 text-center hover:border-slate-700">
              {displayLogo ? (
                <img src={displayLogo} alt="" className="mx-auto mb-3 h-16 w-16 object-contain" />
              ) : (
                <Upload className="mx-auto mb-2 h-8 w-8 text-slate-500" />
              )}
              <p className="text-sm font-medium text-slate-300">Click to upload or drag logo file</p>
              <p className="mt-1 text-xs text-slate-500">PNG, SVG or JPEG (Max 2MB)</p>
              <input
                type="file"
                accept="image/png,image/svg+xml,image/jpeg"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadLogo(file);
                }}
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-2 text-sm font-semibold text-slate-300">
              Primary accent
              <input
                type="color"
                value={primaryColor}
                onChange={(event) => setPrimaryColor(event.target.value)}
                className="h-11 w-full cursor-pointer rounded-xl border border-slate-800 bg-[#090d16]"
              />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-300">
              Hover
              <input
                type="color"
                value={primaryHoverColor}
                onChange={(event) => setPrimaryHoverColor(event.target.value)}
                className="h-11 w-full cursor-pointer rounded-xl border border-slate-800 bg-[#090d16]"
              />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-300">
              Accent
              <input
                type="color"
                value={accentColor}
                onChange={(event) => setAccentColor(event.target.value)}
                className="h-11 w-full cursor-pointer rounded-xl border border-slate-800 bg-[#090d16]"
              />
            </label>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-300">Exported PDF Watermark / Footer</span>
            <input
              type="text"
              value={watermarkText}
              onChange={(event) => setWatermarkText(event.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-[#090d16] px-4 py-2.5 text-sm text-white outline-none focus:border-purple-500"
              style={{ backgroundColor: '#090d16', color: '#fff' }}
            />
          </label>

          {message ? <p className="text-sm text-slate-300">{message}</p> : null}

          <div className="flex justify-end border-t border-slate-800 pt-4">
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveBranding()}
              className="inline-flex cursor-pointer appearance-none items-center gap-2 rounded-xl border border-transparent bg-purple-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-purple-600/20 hover:bg-purple-500 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Branding Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
