import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { BrandLogo } from '@/components/Navigation/BrandLogo';
import { PRICING_FILTERS, PRICING_PLANS, buttonVariantClass, type PricingPlan } from '@/pages/pricingData';

function formatPrice(plan: PricingPlan, currency: 'INR' | 'USD', isAnnual: boolean) {
  const priceObj = currency === 'INR' ? plan.priceINR : plan.priceUSD;
  const rawPrice = isAnnual ? priceObj.annualMonthly : priceObj.monthly;

  if (typeof rawPrice === 'string') return rawPrice;
  if (rawPrice === 0) return 'Free';

  return currency === 'INR' ? `₹${rawPrice.toLocaleString('en-IN')}` : `$${rawPrice}`;
}

function billingCaption(plan: PricingPlan, currency: 'INR' | 'USD', isAnnual: boolean) {
  const rawPrice = isAnnual
    ? (currency === 'INR' ? plan.priceINR.annualMonthly : plan.priceUSD.annualMonthly)
    : (currency === 'INR' ? plan.priceINR.monthly : plan.priceUSD.monthly);
  if (typeof rawPrice === 'string') return 'Tailored quote';
  if (rawPrice === 0) return 'No charge';
  return isAnnual ? 'Per month, billed annually' : 'Billed monthly';
}

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [activeRole, setActiveRole] = useState<string>('All Plans');
  const filteredPlans = useMemo(
    () =>
      activeRole === 'All Plans'
        ? PRICING_PLANS
        : PRICING_PLANS.filter((plan) => plan.roleCategory === activeRole || plan.roleCategory === 'Enterprise'),
    [activeRole],
  );

  return (
    <div id="pricing" className="flex min-h-screen w-full flex-col items-center bg-slate-950 px-4 py-10 text-slate-100 md:px-8">
      <header className="mb-8 flex w-full max-w-[1400px] items-center justify-between">
        <BrandLogo variant="full" to="/" imgClassName="h-12 w-auto object-contain" />
        <Link to="/login" className="text-sm font-semibold text-slate-300 underline underline-offset-4 hover:text-white">
          Log in
        </Link>
      </header>

      <div className="mb-8 max-w-3xl space-y-3 text-center">
        <span className="inline-block rounded-full border border-cyan-800 bg-cyan-950 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-cyan-400">
          Flexible Pricing
        </span>
        <h1 className="text-4xl font-extrabold text-white md:text-5xl">A plan for every role.</h1>
        <p className="text-sm text-slate-400">
          Students, teachers, tutor centers, schools, and parents each get a catalog built for how they use MindVault.
        </p>
      </div>

      <div className="mb-8 flex flex-wrap items-center justify-center gap-6">
        <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900 p-1" role="group" aria-label="Currency">
          <button
            type="button"
            onClick={() => setCurrency('INR')}
            aria-pressed={currency === 'INR'}
            className={`cursor-pointer appearance-none rounded-lg border-0 px-3 py-1.5 text-xs font-bold transition-all ${
              currency === 'INR' ? 'bg-cyan-500 text-slate-950 shadow' : 'bg-transparent text-slate-400 hover:text-white'
            }`}
          >
            🇮🇳 INR (₹)
          </button>
          <button
            type="button"
            onClick={() => setCurrency('USD')}
            aria-pressed={currency === 'USD'}
            className={`cursor-pointer appearance-none rounded-lg border-0 px-3 py-1.5 text-xs font-bold transition-all ${
              currency === 'USD' ? 'bg-cyan-500 text-slate-950 shadow' : 'bg-transparent text-slate-400 hover:text-white'
            }`}
          >
            🌐 USD ($)
          </button>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-2">
          <span className={`text-xs font-semibold ${!isAnnual ? 'text-white' : 'text-slate-400'}`}>Monthly</span>
          <button
            type="button"
            onClick={() => setIsAnnual((current) => !current)}
            aria-pressed={isAnnual}
            aria-label={isAnnual ? 'Annual billing selected' : 'Monthly billing selected'}
            className={`h-6 w-12 cursor-pointer appearance-none rounded-full border-0 p-1 transition-colors ${isAnnual ? 'bg-cyan-500' : 'bg-slate-700'}`}
          >
            <span className={`block h-4 w-4 rounded-full bg-slate-950 transition-transform ${isAnnual ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
          <div className="flex items-center gap-1.5">
            <span className={`text-xs font-semibold ${isAnnual ? 'text-white' : 'text-slate-400'}`}>Annual</span>
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-extrabold text-emerald-400">
              SAVE 20%
            </span>
          </div>
        </div>
      </div>

      <div className="mb-10 flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-1.5" role="tablist" aria-label="Plan categories">
        {PRICING_FILTERS.map((category) => {
          const selected = activeRole === category;
          return (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveRole(category)}
              className={`cursor-pointer appearance-none rounded-xl border-0 px-4 py-2 text-xs font-semibold transition-all ${
                selected ? 'bg-cyan-500 text-slate-950 shadow-md' : 'bg-transparent text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>

      <div className="grid w-full max-w-[1400px] grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredPlans.map((plan) => {
          const priceLabel = formatPrice(plan, currency, isAnnual);
          const showPeriod = priceLabel !== 'Free' && priceLabel !== 'Custom';
          return (
          <article
            key={plan.id}
            className={`relative flex flex-col justify-between rounded-3xl border bg-slate-900/90 p-6 shadow-xl backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] ${
              plan.isPro ? 'border-cyan-500/50 shadow-[0_0_25px_rgba(6,182,212,0.15)]' : 'border-slate-800 hover:border-slate-700'
            }`}
          >
            <div>
              <div className="mb-4 flex items-center justify-between">
                <span
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest ${
                    plan.isPro ? 'border border-cyan-500/40 bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {plan.badge}
                </span>
                {plan.isPro ? (
                  <span className="rounded-full border border-amber-800/60 bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                    PRO TIER
                  </span>
                ) : null}
              </div>

              <h2 className="mb-2 text-xl font-bold text-white">{plan.title}</h2>

              <div className="mb-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white md:text-4xl">{priceLabel}</span>
                  {showPeriod ? <span className="text-xs font-medium text-slate-400">/ month</span> : null}
                </div>
                <p className="mt-0.5 text-[11px] text-slate-500">{billingCaption(plan, currency, isAnnual)}</p>
              </div>

              <p className="mb-6 min-h-[48px] text-xs leading-relaxed text-slate-300">{plan.description}</p>

              <Link
                to={plan.href}
                className={`mb-6 flex w-full cursor-pointer appearance-none items-center justify-center gap-1.5 rounded-xl border py-3 text-xs font-bold shadow-md transition-all ${buttonVariantClass[plan.buttonVariant]}`}
              >
                {plan.buttonText}
                <ArrowUpRight className="h-4 w-4" />
              </Link>

              <div className="space-y-2.5 border-t border-slate-800/80 pt-4">
                <span className="mb-3 block text-[11px] font-bold uppercase tracking-wider text-slate-400">Key Features Include:</span>
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2.5 text-xs text-slate-300">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>
          );
        })}
      </div>
    </div>
  );
}
