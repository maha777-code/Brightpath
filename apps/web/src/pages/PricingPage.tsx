import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CheckSquare } from 'lucide-react';
import { RAZORPAY_PLAN_AMOUNTS_INR } from '@brightpath/shared';
import { BrandLogo } from '@/components/Navigation/BrandLogo';

function inr(paise: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function monthlyEquivalent(yearlyPaise: number) {
  return inr(Math.round(yearlyPaise / 12));
}

const buttonClass =
  'inline-flex w-full cursor-pointer appearance-none items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all';

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);
  const teacher = RAZORPAY_PLAN_AMOUNTS_INR.teacher_pro;
  const center = RAZORPAY_PLAN_AMOUNTS_INR.tutor_center_pro;

  return (
    <div id="pricing" className="min-h-screen bg-[#0b0f19] px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
      <header className="mx-auto mb-10 flex max-w-7xl items-center justify-between">
        <BrandLogo variant="full" to="/" imgClassName="h-10 w-auto object-contain" />
        <Link to="/login" className="text-sm font-semibold text-slate-300 hover:text-cyan-400">
          Log in
        </Link>
      </header>

      <div className="mx-auto mb-12 max-w-7xl space-y-4 text-center">
        <span className="inline-block rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-cyan-400">
          Flexible Pricing
        </span>
        <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
          Find the plan that fits your academy best.
        </h1>
        <p className="mx-auto max-w-2xl text-base text-slate-400">
          Unlock full access to AI tool generators, custom branding, and multi-tutor management.
        </p>

        <div className="flex items-center justify-center gap-3 pt-4">
          <span className={`text-sm font-medium ${!isAnnual ? 'text-white' : 'text-slate-400'}`}>Monthly</span>
          <button
            type="button"
            aria-pressed={isAnnual}
            onClick={() => setIsAnnual((value) => !value)}
            className="relative h-8 w-14 cursor-pointer appearance-none rounded-full border border-slate-700 bg-slate-800 p-1"
          >
            <span
              className={`block h-6 w-6 rounded-full bg-cyan-400 transition-transform ${
                isAnnual ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${isAnnual ? 'text-white' : 'text-slate-400'}`}>
            Billed annually{' '}
            <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-xs font-bold text-cyan-400">
              2 months included
            </span>
          </span>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 rounded-3xl border border-slate-800/80 bg-slate-900/40 p-6 backdrop-blur-xl md:grid-cols-4">
        <div className="flex flex-col justify-between p-4">
          <div>
            <h2 className="mb-2 text-2xl font-bold text-white">Compare plans</h2>
            <p className="text-sm text-slate-400">
              Find the plan that fits your school, tutoring center, or enterprise district best.
            </p>
          </div>
          <p className="hidden pt-8 text-xs text-slate-500 md:block">
            Need custom seat counts?
            <br />
            <Link to="/contact" className="text-cyan-400 hover:underline">
              Contact our sales team →
            </Link>
          </p>
        </div>

        <article className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition-all hover:border-slate-700">
          <div>
            <div className="mb-4 inline-block rounded-md border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-xs font-bold text-cyan-400">
              FREE
            </div>
            <div className="mb-1 text-4xl font-extrabold text-white">{inr(0)}</div>
            <p className="mb-4 text-xs text-slate-400">Forever free</p>
            <p className="mb-6 min-h-[36px] text-xs text-slate-300">For individual teachers exploring AI tools.</p>
            <Link to="/register" className={`${buttonClass} border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800`}>
              Try it free <ArrowUpRight className="h-4 w-4" />
            </Link>
            <FeatureList
              items={[
                'Lesson plans, quizzes, worksheets, and the text rewriter',
                '20 MB PDF upload',
                '5 AI doubts a day',
              ]}
            />
          </div>
        </article>

        <article className="flex flex-col justify-between rounded-2xl border border-purple-500/40 bg-slate-900/60 p-6 shadow-lg shadow-purple-950/30">
          <div>
            <div className="mb-4 inline-block rounded-md border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-xs font-bold text-purple-300">
              TEACHER PRO
            </div>
            <div className="mb-1 text-4xl font-extrabold text-white">
              {isAnnual ? monthlyEquivalent(teacher.yearly) : inr(teacher.monthly)}
            </div>
            <p className="mb-4 text-xs text-slate-400">
              {isAnnual ? `${inr(teacher.yearly)} billed yearly` : 'INR / month'}
            </p>
            <p className="mb-6 min-h-[36px] text-xs text-slate-300">
              For tutors who need the pro generators and unlimited doubts.
            </p>
            <Link to="/register" className={`${buttonClass} border-transparent bg-[#7c3aed] text-white hover:bg-purple-500`}>
              Start Teacher Pro <ArrowUpRight className="h-4 w-4" />
            </Link>
            <FeatureList
              items={[
                'Songs, podcasts, slides, and writing feedback',
                'Unlimited AI doubts and 80 MB uploads',
                'Everything in the free teacher tools',
              ]}
            />
          </div>
        </article>

        <article className="flex flex-col justify-between rounded-2xl border border-cyan-500/30 bg-slate-900/60 p-6 shadow-lg shadow-cyan-950/20">
          <div>
            <div className="mb-4 inline-block rounded-md border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-xs font-bold text-cyan-400">
              CENTER PRO
            </div>
            <div className="mb-1 text-4xl font-extrabold text-white">
              {isAnnual ? monthlyEquivalent(center.yearly) : inr(center.monthly)}
            </div>
            <p className="mb-4 text-xs text-slate-400">
              {isAnnual ? `${inr(center.yearly)} billed yearly` : 'INR / month'}
            </p>
            <p className="mb-6 min-h-[36px] text-xs text-slate-300">
              For tutoring academies managing tutors, seats, and branding.
            </p>
            <Link to="/register" className={`${buttonClass} border-transparent bg-[#00b4d8] text-slate-950 hover:bg-cyan-300`}>
              Start Center Pro <ArrowUpRight className="h-4 w-4" />
            </Link>
            <FeatureList
              items={[
                'Curriculum studio and every teacher tool',
                'Multi-tutor seats and bulk CSV import',
                'Custom academy name, logo, and colors',
              ]}
            />
          </div>
        </article>
      </div>

      <p className="mx-auto mt-8 max-w-7xl text-center text-sm text-slate-500 md:hidden">
        Need custom seat counts?{' '}
        <Link to="/contact" className="text-cyan-400 hover:underline">
          Contact our sales team →
        </Link>
      </p>
    </div>
  );
}

function FeatureList({ items }: { items: string[] }) {
  return (
    <div className="mt-8 space-y-3">
      <p className="text-xs font-semibold uppercase text-slate-400">Key features include:</p>
      {items.map((item) => (
        <div key={item} className="flex items-start gap-2 text-sm text-slate-300">
          <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}
