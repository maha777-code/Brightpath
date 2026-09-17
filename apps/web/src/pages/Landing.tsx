import { Link } from 'react-router-dom';
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

      <header className="bp-nav">
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
      </header>

      <main>
        <section className="bp-hero grid w-full grid-cols-1 items-center gap-8 lg:grid-cols-12">
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

        <section className="bp-features" aria-label="Key features">
          <div className="bp-features-glass">
            <div className="bp-feature">
              <span className="bp-feature-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 17l6-6 4 4 8-8" />
                  <path d="M14 7h7v7" />
                </svg>
              </span>
              <div>
                <strong>Adaptive Learning</strong>
                <span>Grapho learning and points</span>
              </div>
            </div>
            <div className="bp-feature-divider" aria-hidden="true" />
            <div className="bp-feature">
              <span className="bp-feature-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </span>
              <div>
                <strong>24/7 Support</strong>
                <span>Chekwsout 24/7 support</span>
              </div>
            </div>
            <div className="bp-feature-divider" aria-hidden="true" />
            <div className="bp-feature">
              <span className="bp-feature-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 3v6" />
                  <path d="M12 9l-5 8" />
                  <path d="M12 9l5 8" />
                  <circle cx="7" cy="19" r="1.5" fill="currentColor" stroke="none" />
                  <circle cx="17" cy="19" r="1.5" fill="currentColor" stroke="none" />
                  <circle cx="12" cy="3" r="1.5" fill="currentColor" stroke="none" />
                </svg>
              </span>
              <div>
                <strong>Personalized Path</strong>
                <span>Unickly branching roadmap</span>
              </div>
            </div>
          </div>
        </section>

        <section id="subjects" className="w-full max-w-7xl mx-auto px-6 py-12 lg:px-12">
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

        <section id="how-it-works" className="bp-section bp-testimonial-section">
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

        <section id="pricing" className="bp-section bp-cta-wrap">
          <div className="bp-cta-glass">
            <h2>Ready to unlock your potential?</h2>
            <p>Private tutoring quality at app-store prices. Start free today.</p>
            <Link to={startHref} className="bp-btn bp-btn--primary bp-btn--lg">
              Get Started For Free
            </Link>
          </div>
        </section>

        <section id="schools" className="bp-section bp-cta-wrap">
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
