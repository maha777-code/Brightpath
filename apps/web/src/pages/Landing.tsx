import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, GitFork, TrendingUp, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { BrandLogo } from '@/components/Navigation/BrandLogo';
import { Footer } from '@/components/Footer';

const SUBJECTS = [
  {
    name: 'Mathematics',
    icon: '%',
    description: 'Algebra, geometry, and problem-solving at every grade.',
  },
  {
    name: 'Computer Science',
    icon: '🖥',
    description: 'Coding, logic, and computational thinking.',
  },
  {
    name: 'Languages',
    icon: '💬',
    description: 'Reading, writing, and conversation practice.',
  },
  {
    name: 'Sciences',
    icon: '⚗',
    description: 'Physics, chemistry, and biology made visual.',
  },
  {
    name: 'Test Prep',
    icon: '⚙',
    description: 'Exam strategies and targeted practice sets.',
  },
  {
    name: 'Study Skills',
    icon: '📋',
    description: 'Notes, revision, and exam-day confidence.',
  },
];

const FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: TrendingUp,
    title: 'Adaptive Learning',
    description: 'Graphs learning and points',
  },
  {
    icon: Clock,
    title: '24/7 Support',
    description: 'Checkout 24/7 support',
  },
  {
    icon: GitFork,
    title: 'Personalized Path',
    description: 'Uniquely branching roadmap',
  },
];

function FeatureBanner() {
  return (
    <div className="w-full rounded-2xl border border-cyan-500/30 bg-[#0b0f19]/80 p-6 shadow-[0_0_20px_rgba(6,182,212,0.1)] backdrop-blur-md">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-0 md:divide-x md:divide-slate-800">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <div key={feature.title} className="flex items-center gap-4 px-4 first:pl-0 last:pr-0 md:px-6 md:first:pl-0 md:last:pr-0">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-950/60 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.2)]">
                <Icon className="h-6 w-6 stroke-[2.2]" />
              </div>
              <div>
                <h4 className="text-base font-bold tracking-tight text-slate-100">{feature.title}</h4>
                <p className="mt-1 text-base font-normal leading-normal text-slate-300">{feature.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HeroAITutorCard() {
  return (
    <div className="group relative mx-auto w-full max-w-[540px] lg:mx-0">
      <div className="absolute -inset-1 -z-10 animate-pulse rounded-2xl bg-cyan-500/10 blur-xl" />
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
        className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-slate-900/80 shadow-[0_0_40px_rgba(6,182,212,0.15)]"
      >
        <img
          src="/ai-tutor.png?v=3"
          alt="AI Tutor Dynamic Knowledge Model"
          className="h-auto w-full rounded-2xl object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </motion.div>
    </div>
  );
}

const SCHOOL_FEATURES = [
  'Safe & secure from day one',
  'Built to fit your school',
  'Clear progress at a glance',
  'Easy setup & hands-on teacher support',
];

export default function Landing() {
  const { parent } = useAuth();
  const startHref = parent ? '/dashboard' : '/register';
  const loginHref = parent ? '/dashboard' : '/login';

  return (
    <div className="bp-landing">
      <div className="bp-bg" aria-hidden="true">
        <div className="bp-blob bp-blob--blue" />
        <div className="bp-blob bp-blob--purple" />
        <div className="bp-blob bp-blob--pink" />
      </div>

      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-[#030712]/80 px-6 backdrop-blur-md lg:px-12">
        <div className="bp-nav mx-auto w-full max-w-[96rem]">
          <BrandLogo variant="full" to="/" imgClassName="h-12 w-auto object-contain" />

          <nav className="bp-nav-center flex items-center space-x-8" aria-label="Main">
            <a
              href="#subjects"
              className="text-lg font-semibold tracking-normal text-white transition-colors duration-200 hover:text-cyan-400"
            >
              Subjects
            </a>
            <a
              href="#how-it-works"
              className="text-lg font-semibold tracking-normal text-white transition-colors duration-200 hover:text-cyan-400"
            >
              How It Works
            </a>
            <a
              href="#pricing"
              className="text-lg font-semibold tracking-normal text-white transition-colors duration-200 hover:text-cyan-400"
            >
              Pricing
            </a>
            <a
              href="#schools"
              className="text-lg font-semibold tracking-normal text-white transition-colors duration-200 hover:text-cyan-400"
            >
              For Schools
            </a>
            <Link
              to={loginHref}
              className="text-lg font-semibold tracking-normal text-white transition-colors duration-200 hover:text-cyan-400"
            >
              Log In
            </Link>
          </nav>

          <Link to={startHref} className="bp-btn bp-btn--primary bp-btn--nav">
            Get Started For Free
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-[96rem] grid-cols-1 items-center gap-12 px-6 py-10 md:grid-cols-12 lg:px-12">
          <div className="order-2 flex justify-center md:col-span-5 md:order-1 lg:justify-start">
            <HeroAITutorCard />
          </div>
          <div className="bp-hero-copy order-1 flex flex-col items-start text-left md:col-span-7 md:order-2">
            <h1 className="mb-4 text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl">
              Unlock Your Full Potential with Your Personal AI Tutor
            </h1>
            <p className="mb-8 max-w-xl text-base font-normal leading-relaxed text-slate-100 md:text-lg">
              Adaptive, 24/7 learning that evolves with you. Master any subject, from Math to
              Mandarin.
            </p>
            <Link to={startHref} className="bp-btn bp-btn--primary bp-btn--lg">
              Start Your Personalized Journey
            </Link>
          </div>
        </section>

        <section className="mx-auto mt-2 w-full max-w-[96rem] px-6 lg:px-12" aria-label="Key features">
          <FeatureBanner />
        </section>

        <section id="subjects" className="mx-auto w-full max-w-[96rem] px-6 py-12 lg:px-12">
          <h2 className="mb-6 text-2xl font-bold tracking-tight text-slate-100">Subjects</h2>
          <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {SUBJECTS.map((s) => (
              <article
                key={s.name}
                className="group relative flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/90 p-6 transition-all duration-300 hover:border-cyan-500/60 hover:bg-slate-900 hover:shadow-[0_0_25px_rgba(6,182,212,0.15)]"
              >
                <div>
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-950/80 text-lg font-bold text-cyan-400">
                    {s.icon}
                  </div>
                  <h3 className="text-lg font-bold tracking-tight text-slate-100 transition-colors group-hover:text-cyan-300">
                    {s.name}
                  </h3>
                  <p className="mt-2 text-base font-normal leading-relaxed text-slate-300">{s.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="mx-auto w-full max-w-[96rem] bg-[#030712] px-6 py-16 lg:px-12">
          <h2 className="mx-auto mb-12 max-w-4xl text-center text-3xl font-extrabold leading-tight tracking-tight text-white md:text-4xl">
            Transforming education for every student and classroom through AI
          </h2>

          <div className="mx-auto max-w-6xl rounded-3xl border border-slate-800 bg-slate-950/80 p-8 shadow-[0_0_50px_rgba(6,182,212,0.1)] backdrop-blur-md md:p-12">
            <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
              <div className="space-y-6 lg:col-span-6">
                <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
                  AI FOR SCHOOLS
                </span>

                <h2 className="mb-4 text-2xl font-extrabold leading-tight text-white md:text-3xl lg:text-4xl">
                  Bring safe, personalized AI to your school with zero hassle, total privacy, and
                  complete teacher support.
                </h2>

                <div className="grid grid-cols-1 gap-4 py-2 sm:grid-cols-2">
                  {SCHOOL_FEATURES.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-2.5 text-sm font-medium text-slate-300"
                    >
                      <div className="flex h-5 w-5 items-center justify-center rounded-full border border-cyan-400/50 bg-cyan-500/20 text-xs font-bold text-cyan-300">
                        ✓
                      </div>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <div>
                  <a
                    href="#schools"
                    className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/40 px-6 py-3 text-sm font-semibold text-cyan-300 transition-all hover:border-cyan-400 hover:bg-cyan-500/10"
                  >
                    District solutions →
                  </a>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl border border-slate-800 lg:col-span-6">
                <img
                  src="/ai-tutor.png?v=3"
                  alt="AI Tutor Model"
                  className="aspect-[4/3] h-full w-full object-cover"
                />
                <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-cyan-500/30 bg-slate-900/90 p-4 shadow-lg backdrop-blur-md sm:right-auto sm:max-w-xs">
                  <p className="text-2xl font-extrabold text-cyan-400">28%</p>
                  <p className="text-xs font-medium leading-snug text-slate-300">
                    improvement in students meeting literacy grade-level expectations
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="bp-section bp-cta-wrap mx-auto w-full max-w-[96rem] px-6 lg:px-12">
          <div className="bp-cta-glass">
            <h2>Ready to unlock your potential?</h2>
            <p className="mt-2 text-sm font-normal text-slate-100 md:text-base">
              Private tutoring quality at app-store prices. Start free today.
            </p>
            <Link to={startHref} className="bp-btn bp-btn--primary bp-btn--lg">
              Get Started For Free
            </Link>
          </div>
        </section>

        <section id="schools" className="bp-section bp-cta-wrap mx-auto w-full max-w-[96rem] px-6 lg:px-12">
          <div className="bp-cta-glass bp-cta-glass--soft">
            <h2>For Schools</h2>
            <p className="mt-2 text-sm font-normal leading-relaxed text-slate-100 md:text-base">
              Bring AI tutoring to your classroom. Safe for students, private by design, and easy
              for teachers to use.
            </p>
            <a href="mailto:hello@brightpath.ai" className="bp-btn bp-btn--outline">
              Contact Us
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
