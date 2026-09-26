import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { CATEGORY_PLANS_DATA, type AccountCategory } from '@brightpath/shared';
import { BrandLogo } from '@/components/Navigation/BrandLogo';

type PricingTab = 'all' | AccountCategory;

const TABS: { id: PricingTab; label: string }[] = [
  { id: 'all', label: 'All Plans' },
  { id: 'student', label: 'Students' },
  { id: 'teacher', label: 'Teachers' },
  { id: 'tutor_center', label: 'Tutor Centers' },
  { id: 'school', label: 'Schools' },
  { id: 'parent', label: 'Parents' },
];

function rupees(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

const buttonClass =
  'inline-flex w-full cursor-pointer appearance-none items-center justify-center gap-2 rounded-xl border-2 px-4 py-3.5 text-base font-extrabold transition-all';

const ctaClass: Record<AccountCategory, string> = {
  student: 'border-transparent bg-cyan-400 text-slate-950 hover:bg-cyan-300',
  teacher: 'border-transparent bg-purple-500 text-white hover:bg-purple-400',
  tutor_center: 'border-transparent bg-emerald-400 text-slate-950 hover:bg-emerald-300',
  school: 'border-transparent bg-blue-500 text-white hover:bg-blue-400',
  parent: 'border-transparent bg-amber-400 text-slate-950 hover:bg-amber-300',
};

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [tab, setTab] = useState<PricingTab>('all');
  const plans = useMemo(
    () => (tab === 'all' ? CATEGORY_PLANS_DATA : CATEGORY_PLANS_DATA.filter((plan) => plan.category === tab)),
    [tab],
  );

  return (
    <div id="pricing" className="flex min-h-screen w-full flex-col bg-[#090d16] px-6 py-10 text-slate-100 sm:px-10 lg:px-16">
      <header className="flex w-full items-center justify-between pb-8">
        <BrandLogo variant="full" to="/" imgClassName="h-12 w-auto object-contain" />
        <Link to="/login" className="text-base font-semibold text-slate-300 underline underline-offset-4 hover:text-white">
          Log in
        </Link>
      </header>

      <div className="mb-8 w-full space-y-4 text-center">
        <span className="inline-block rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3.5 py-1.5 text-sm font-bold uppercase tracking-widest text-cyan-400">
          Flexible Pricing
        </span>
        <h1 className="text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">
          A plan for every role.
        </h1>
        <p className="mx-auto max-w-3xl text-lg text-slate-400">
          Students, teachers, tutor centers, schools, and parents each get a catalog built for how they use MindVault.
        </p>

        <div className="flex items-center justify-center gap-4 pt-2">
          <span className={`text-xl font-medium ${!isAnnual ? 'text-white' : 'text-slate-300'}`}>Monthly</span>
          <button
            type="button"
            aria-pressed={isAnnual}
            aria-label={isAnnual ? 'Show monthly prices' : 'Show annual prices'}
            onClick={() => setIsAnnual((value) => !value)}
            className="relative h-9 w-16 cursor-pointer appearance-none rounded-full border border-slate-700 bg-slate-800 p-1"
          >
            <span
              className="block h-7 w-7 rounded-full bg-cyan-400 transition-transform"
              style={{ transform: isAnnual ? 'translateX(1.75rem)' : 'translateX(0px)' }}
            />
          </button>
          <span className={`flex items-center gap-3 text-xl font-bold ${isAnnual ? 'text-white' : 'text-slate-300'}`}>
            Billed annually
            <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-sm font-extrabold uppercase tracking-wide text-cyan-400">
              2 months included
            </span>
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-2" role="tablist" aria-label="Plan categories">
          {TABS.map((item) => {
            const selected = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(item.id)}
                className={`cursor-pointer appearance-none rounded-full border px-4 py-2 text-sm font-bold ${
                  selected
                    ? 'border-cyan-400/60 bg-cyan-400 text-slate-950'
                    : 'border-slate-700 bg-[#101422] text-slate-300 hover:border-slate-500 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <main className="w-full flex-1 rounded-3xl border border-slate-800/80 bg-[#0d1322] p-6 sm:p-8 lg:p-10">
        <div className={`grid w-full grid-cols-1 items-stretch gap-6 ${plans.length > 1 ? 'md:grid-cols-2 xl:grid-cols-3' : 'mx-auto max-w-md'}`}>
          {plans.map((plan) => {
            const shown = isAnnual ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice;
            return (
              <article
                key={plan.category}
                className="flex h-full flex-col justify-between rounded-2xl border border-slate-800/90 bg-[#0b0f1a] p-8 shadow-xl"
              >
                <div>
                  <span className={`inline-block rounded-full border px-3 py-1 text-xs font-extrabold uppercase tracking-wider ${plan.badgeColor}`}>
                    {plan.badge}
                  </span>
                  <h2 className="mt-4 text-2xl font-black text-white">{plan.categoryLabel}</h2>
                  <div className="mt-6 text-5xl font-black text-white">{rupees(shown)}</div>
                  <p className="mb-6 mt-2 text-sm text-slate-400">
                    {isAnnual ? `${rupees(plan.yearlyPrice)} billed yearly` : 'INR / month'}
                  </p>
                  <p className="mb-8 min-h-[72px] text-base leading-normal text-slate-300">{plan.description}</p>
                  <Link to={plan.ctaHref} className={`${buttonClass} ${ctaClass[plan.category]}`}>
                    {plan.cta} <ArrowUpRight className="h-5 w-5" />
                  </Link>
                  <div className="mt-10 space-y-4">
                    <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Key features include:</p>
                    {plan.features.map((item) => (
                      <div key={item} className="flex items-start gap-3 text-base text-slate-200">
                        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        <p className="mt-8 text-center text-base text-slate-400">
          Need custom seat counts?{' '}
          <Link to="/contact" className="font-bold text-cyan-400 hover:underline">
            Contact our sales team
          </Link>
        </p>
      </main>
    </div>
  );
}
