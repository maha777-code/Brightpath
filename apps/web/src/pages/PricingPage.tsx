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
  'inline-flex w-full cursor-pointer appearance-none items-center justify-center gap-2 rounded-xl border-2 px-4 py-3.5 text-base font-extrabold transition-all';

const cardClass =
  'flex h-full min-h-[620px] flex-col justify-between rounded-2xl bg-[#0b0f1a] p-8 shadow-xl transition-all sm:p-10';

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);
  const teacher = RAZORPAY_PLAN_AMOUNTS_INR.teacher_pro;
  const center = RAZORPAY_PLAN_AMOUNTS_INR.tutor_center_pro;

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
          Find the plan that fits your academy best.
        </h1>
        <p className="mx-auto max-w-3xl text-lg text-slate-400">
          Unlock full access to AI tool generators, custom branding, and multi-tutor management.
        </p>

        <div className="flex items-center justify-center gap-4 pt-2">
          <span className={`text-xl font-medium ${!isAnnual ? 'text-white' : 'text-slate-300'}`}>Monthly</span>
          <button
            type="button"
            aria-pressed={isAnnual}
            onClick={() => setIsAnnual((value) => !value)}
            className="relative h-9 w-16 cursor-pointer appearance-none rounded-full border border-slate-700 bg-slate-800 p-1"
          >
            <span
              className={`block h-7 w-7 rounded-full bg-cyan-400 transition-transform ${
                isAnnual ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </button>
          <span className={`flex items-center gap-3 text-xl font-bold ${isAnnual ? 'text-white' : 'text-slate-300'}`}>
            Billed annually
            <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-sm font-extrabold uppercase tracking-wide text-cyan-400">
              2 months included
            </span>
          </span>
        </div>
      </div>

      <main className="flex w-full flex-1 items-stretch rounded-3xl border border-slate-800/80 bg-[#0d1322] p-8 backdrop-blur-xl sm:p-10 lg:p-12">
      <div className="grid w-full grid-cols-1 items-stretch gap-8 md:grid-cols-4">
        <div className="flex h-full min-h-[620px] flex-col justify-between p-4">
          <div>
            <h2 className="mb-4 text-4xl font-extrabold tracking-tight text-white">Compare plans</h2>
            <p className="text-lg leading-relaxed text-slate-300">
              Find the plan that fits your school, tutoring center, or enterprise district best.
            </p>
          </div>
          <div className="pt-12 text-base text-slate-400">
            <p className="font-medium">Need custom seat counts?</p>
            <Link to="/contact" className="mt-1 inline-block font-bold text-cyan-400 hover:underline">
              Contact our sales team →
            </Link>
          </div>
        </div>

        <article className={`${cardClass} border border-slate-800/90 hover:border-slate-700`}>
          <div>
            <div className="inline-block rounded-md border border-cyan-500/20 bg-cyan-500/10 px-3.5 py-1.5 text-sm font-extrabold uppercase tracking-wider text-cyan-400">
              FREE
            </div>
            <div className="mt-6 text-5xl font-black text-white">{inr(0)}</div>
            <p className="mb-6 mt-2 text-sm text-slate-400">Forever free</p>
            <p className="mb-8 min-h-[48px] text-base leading-normal text-slate-300">For individual teachers exploring AI tools.</p>
            <Link to="/register" className={`${buttonClass} border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800`}>
              Try it free <ArrowUpRight className="h-5 w-5" />
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

        <article className={`${cardClass} border border-purple-500/30 shadow-purple-950/30 hover:border-purple-500/60`}>
          <div>
            <div className="inline-block rounded-md border border-purple-500/20 bg-purple-500/10 px-3.5 py-1.5 text-sm font-extrabold uppercase tracking-wider text-purple-400">
              TEACHER PRO
            </div>
            <div className="mt-6 text-5xl font-black text-white">
              {isAnnual ? monthlyEquivalent(teacher.yearly) : inr(teacher.monthly)}
            </div>
            <p className="mb-6 mt-2 text-sm text-slate-400">
              {isAnnual ? `${inr(teacher.yearly)} billed yearly` : 'INR / month'}
            </p>
            <p className="mb-8 min-h-[48px] text-base leading-normal text-slate-300">
              For tutors who need the pro generators and unlimited doubts.
            </p>
            <Link to="/register" className={`${buttonClass} border-transparent bg-[#7c3aed] text-white hover:bg-purple-500`}>
              Start Teacher Pro <ArrowUpRight className="h-5 w-5" />
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

        <article className={`${cardClass} border border-cyan-500/40 shadow-cyan-950/20 hover:border-cyan-500/70`}>
          <div>
            <div className="inline-block rounded-md border border-cyan-500/20 bg-cyan-500/10 px-3.5 py-1.5 text-sm font-extrabold uppercase tracking-wider text-cyan-400">
              CENTER PRO
            </div>
            <div className="mt-6 text-5xl font-black text-white">
              {isAnnual ? monthlyEquivalent(center.yearly) : inr(center.monthly)}
            </div>
            <p className="mb-6 mt-2 text-sm text-slate-400">
              {isAnnual ? `${inr(center.yearly)} billed yearly` : 'INR / month'}
            </p>
            <p className="mb-8 min-h-[48px] text-base leading-normal text-slate-300">
              For tutoring academies managing tutors, seats, and branding.
            </p>
            <Link to="/register" className={`${buttonClass} border-transparent bg-[#00b4d8] text-slate-950 hover:bg-cyan-300`}>
              Start Center Pro <ArrowUpRight className="h-5 w-5" />
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
      </main>
    </div>
  );
}

function FeatureList({ items }: { items: string[] }) {
  return (
    <div className="mt-10 space-y-4">
      <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Key features include:</p>
      {items.map((item) => (
        <div key={item} className="flex items-start gap-3 text-base text-slate-200">
          <CheckSquare className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}
