import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const SUBJECTS = [
  { name: 'Mathematics', icon: '%', accent: '#0d9488' },
  { name: 'Computer Science', icon: '🖥', accent: '#5eead4' },
  { name: 'Languages', icon: '💬', accent: '#a78bfa' },
  { name: 'Sciences', icon: '⚗', accent: '#22c55e' },
  { name: 'Test Prep', icon: '⚙', accent: '#f97316' },
  { name: 'Test Prep', icon: '📋', accent: '#8b5cf6' },
];

function LogoMark() {
  return <span className="bp-logo-mark" aria-hidden="true" />;
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

export default function Home() {
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

      {/* 1. Top Navigation */}
      <header className="bp-nav">
        <Link to="/" className="bp-logo">
          <LogoMark />
          <span>Brightpath AI Tutor</span>
        </Link>

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
        {/* 2. Hero */}
        <section className="bp-hero">
          <div className="bp-hero-copy">
            <h1>Unlock Your Full Potential with Your Personal AI Tutor</h1>
            <p>
              Adaptive, 24/7 learning that evolves with you. Master any subject, from Math to
              Mandarin.
            </p>
            <Link to={startHref} className="bp-btn bp-btn--primary bp-btn--lg">
              Start Your Personalized Journey
            </Link>
          </div>
          <HeroArt />
        </section>

        {/* 3. Features Row */}
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

        {/* 4. Subjects Grid */}
        <section id="subjects" className="bp-section">
          <h2 className="bp-section-title">Subjects</h2>
          <div className="bp-subjects">
            {SUBJECTS.map((s, i) => (
              <article key={`${s.name}-${i}`} className="bp-subject-card">
                <div className="bp-subject-icon" style={{ color: s.accent }}>
                  {s.icon}
                </div>
                <h3>{s.name}</h3>
                <div className="bp-subject-line" style={{ background: s.accent }} />
              </article>
            ))}
          </div>
        </section>

        {/* 5. Testimonials */}
        <section id="how-it-works" className="bp-section bp-testimonial-section">
          <div className="bp-testimonial-layout">
            <div className="bp-testimonial-card">
              <p className="bp-quote">
                &ldquo;Brightpath AI doubled my confidence in just two weeks! The tutor explains
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

        {/* Pricing / CTA anchor */}
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

      {/* 6. Footer */}
      <footer className="bp-footer">
        <nav className="bp-footer-links" aria-label="Footer">
          <a href="#how-it-works">About Us</a>
          <a href="#schools">Careers</a>
          <a href="mailto:support@brightpath.ai">Support</a>
          <a href="#pricing">Privacy Policy</a>
        </nav>
        <div className="bp-footer-social">
          <a href="#" aria-label="Facebook" className="bp-social">
            f
          </a>
          <a href="#" aria-label="Twitter" className="bp-social">
            𝕏
          </a>
          <a href="#" aria-label="Instagram" className="bp-social">
           ◎
          </a>
        </div>
      </footer>
    </div>
  );
}
