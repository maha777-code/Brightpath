import { Link } from 'react-router-dom';
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
                <p className="mt-0.5 text-xs text-slate-400">{feature.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HeroArt() {
  return (
    <div className="bp-art bp-art--hero" aria-hidden="true">
      <div className="bp-art-glass">
        <div className="bp-holo">
          <span className="bp-holo-eq">x² + 5x + 6</span>
          <span className="bp-holo-eq bp-holo-eq--sm">(x+2)(x+3)</span>
          <span className="bp-holo-eq bp-holo-eq--sm">y = mx + b</span>
        </div>
        <div className="bp-student">
          <div className="bp-student-head" />
          <div className="bp-student-headphones" />
          <div className="bp-student-body" />
        </div>
        <div className="bp-glow-orb" />
      </div>
    </div>
  );
}

function TestimonialArt() {
  return (
    <div className="bp-art bp-art--testimonial" aria-hidden="true">
      <div className="bp-art-glass">
        <div className="bp-robot">
          <div className="bp-robot-glow" />
          <div className="bp-robot-head">
            <span className="bp-robot-eye" />
            <span className="bp-robot-eye" />
          </div>
          <div className="bp-robot-body" />
        </div>
        <div className="bp-student bp-student--small">
          <div className="bp-student-head" />
          <div className="bp-student-body" />
        </div>
      </div>
    </div>
  );
}

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

          <nav className="bp-nav-center" aria-label="Main">
            <a href="#subjects">Subjects</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#pricing">Pricing</a>
            <a href="#schools">For Schools</a>
            <Link to={loginHref}>Log In</Link>
          </nav>

          <Link to={startHref} className="bp-btn bp-btn--primary bp-btn--nav">
            Get Started For Free
          </Link>
        </div>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-[96rem] grid-cols-1 items-center gap-8 px-6 py-10 lg:grid-cols-12 lg:px-12">
          <div className="bp-hero-copy lg:col-span-7">
            <h1>Unlock Your Full Potential with Your Personal AI Tutor</h1>
            <p>
              Adaptive, 24/7 learning that evolves with you. Master any subject, from Math to
              Mandarin.
            </p>
            <Link to={startHref} className="bp-btn bp-btn--primary bp-btn--lg">
              Start Your Personalized Journey
            </Link>
          </div>
          <div className="w-full lg:col-span-5">
            <HeroArt />
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
                  <p className="mt-1 text-sm text-slate-400">{s.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="bp-section bp-testimonial-section mx-auto w-full max-w-[96rem] px-6 lg:px-12">
          <div className="bp-testimonial-layout">
            <div className="bp-testimonial-card">
              <p className="bp-quote">
                &ldquo;MindVault doubled my confidence in just two weeks! The tutor explains
                concepts until they finally click.&rdquo;
              </p>
              <div className="bp-quote-author">
                <div className="bp-quote-avatar">E</div>
                <div>
                  <strong>Emily</strong>
                  <span>11th Grade</span>
                </div>
              </div>
            </div>
            <TestimonialArt />
          </div>
        </section>

        <section id="pricing" className="bp-section bp-cta-wrap mx-auto w-full max-w-[96rem] px-6 lg:px-12">
          <div className="bp-cta-glass">
            <h2>Ready to unlock your potential?</h2>
            <p>Private tutoring quality at app-store prices. Start free today.</p>
            <Link to={startHref} className="bp-btn bp-btn--primary bp-btn--lg">
              Get Started For Free
            </Link>
          </div>
        </section>

        <section id="schools" className="bp-section bp-cta-wrap mx-auto w-full max-w-[96rem] px-6 lg:px-12">
          <div className="bp-cta-glass bp-cta-glass--soft">
            <h2>For Schools</h2>
            <p>
              Bring adaptive AI tutoring to your classroom. Parent-managed, COPPA-ready accounts
              with progress tracking built in.
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
