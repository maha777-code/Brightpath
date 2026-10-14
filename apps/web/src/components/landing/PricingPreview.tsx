import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { PRICING_PLANS, type PricingPlan } from '@/pages/pricingData';

const PREVIEW_PLAN_IDS = ['teacher-free', 'teacher-pro', 'tutor-center', 'school'] as const;

function formatInr(value: number | string): string {
  if (typeof value === 'string') return value;
  return value === 0 ? 'Free' : `₹${value.toLocaleString('en-IN')}`;
}

function formatUsd(value: number | string): string {
  if (typeof value === 'string') return value;
  return value === 0 ? '' : `US$${value}`;
}

function PlanCard({ plan }: { plan: PricingPlan }) {
  const free = plan.priceINR.annualMonthly === 0;
  const usd = formatUsd(plan.priceUSD.annualMonthly);

  return (
    <article
      className={`flex flex-col rounded-2xl border bg-slate-950/70 p-6 ${
        plan.isPro ? 'border-cyan-500/50 shadow-[0_0_25px_rgba(6,182,212,0.15)]' : 'border-slate-800'
      }`}
    >
      <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">{plan.roleCategory}</p>
      <h3 className="mt-2 text-xl font-bold text-white">{plan.title}</h3>
      <p className="mt-3 text-3xl font-extrabold text-white">
        {formatInr(plan.priceINR.annualMonthly)}
        {free ? null : <span className="text-base font-medium text-slate-400"> / month</span>}
      </p>
      <p className="mt-1 text-sm text-slate-400">
        {free ? 'No card needed' : `Billed yearly${usd ? ` · ${usd}/month` : ''}`}
      </p>
      <p className="mt-4 text-base text-slate-300">{plan.description}</p>
      <ul className="mt-4 flex-1 space-y-2">
        {plan.features.slice(0, 3).map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-slate-300">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
            {feature}
          </li>
        ))}
      </ul>
      <Link
        to={plan.href}
        className="mt-6 inline-flex items-center justify-center rounded-xl border border-cyan-500/50 bg-cyan-500/10 px-4 py-2.5 text-sm font-bold text-cyan-300 transition-colors hover:bg-cyan-500 hover:text-slate-950"
      >
        {plan.buttonText}
      </Link>
    </article>
  );
}

export function PricingPreview() {
  const plans = PREVIEW_PLAN_IDS.map((id) => PRICING_PLANS.find((plan) => plan.id === id)).filter(
    (plan): plan is PricingPlan => Boolean(plan),
  );

  return (
    <section id="pricing" aria-labelledby="pricing-preview-title" className="w-full px-4 py-16 sm:px-8 md:px-12 lg:px-16">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-10 max-w-3xl space-y-3">
          <h2 id="pricing-preview-title" className="text-4xl font-extrabold tracking-tight text-white">
            Simple, published pricing
          </h2>
          <p className="text-xl text-slate-300">
            Ten AI tools are free to start. Upgrade to Pro when you want your own syllabus behind every output.
            Prices shown are per month, billed yearly.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
        <p className="mt-8 text-base text-slate-300">
          Student, parent, district and enterprise plans are on the{' '}
          <Link to="/pricing" className="font-bold text-cyan-400 underline-offset-4 hover:underline">
            full pricing page
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
