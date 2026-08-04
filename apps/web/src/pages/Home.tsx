import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

const SUBJECTS = [
  { name: 'Mathematics', icon: '📐', color: '#0d9488', progress: 72 },
  { name: 'Reading', icon: '📖', color: '#6366f1', progress: 58 },
  { name: 'Writing', icon: '✏️', color: '#ec4899', progress: 45 },
  { name: 'Languages', icon: '🌍', color: '#f59e0b', progress: 33 },
  { name: 'Sciences', icon: '🔬', color: '#8b5cf6', progress: 61 },
];

const TESTIMONIALS = [
  {
    quote: 'Brightpath AI doubled my confidence in just two weeks!',
    name: 'Emily',
    grade: '11th Grade',
    avatar: 'E',
    color: '#6366f1',
  },
  {
    quote: 'My daughter finally enjoys math — she asks to practice every day.',
    name: 'Priya',
    grade: 'Parent, 4th Grade',
    avatar: 'P',
    color: '#0d9488',
  },
  {
    quote: 'It feels like a real tutor who knows exactly where I struggle.',
    name: 'Marcus',
    grade: '8th Grade',
    avatar: 'M',
    color: '#ec4899',
  },
];

function HeroIllustration() {
  return (
    <div className="landing-hero-art" aria-hidden="true">
      <div className="landing-hero-glass">
        <div className="landing-hero-scene">
          <div className="landing-float-card landing-float-card--math">
            <span className="landing-float-eq">x² + 5x + 6 = 0</span>
            <span className="landing-float-eq landing-float-eq--sm">(x + 2)(x + 3)</span>
          </div>
          <div className="landing-hero-boy">
            <div className="landing-boy-head" />
            <div className="landing-boy-body" />
            <div className="landing-boy-headphones" />
          </div>
          <div className="landing-hero-robot">
            <div className="landing-robot-face">
              <span className="landing-robot-eye" />
              <span className="landing-robot-eye" />
            </div>
            <div className="landing-robot-body" />
            <div className="landing-robot-glow" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { parent } = useAuth();
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const startHref = parent ? '/parent' : '/register';

  const prevTestimonial = () =>
    setTestimonialIdx((i) => (i === 0 ? TESTIMONIALS.length - 1 : i - 1));
  const nextTestimonial = () =>
    setTestimonialIdx((i) => (i === TESTIMONIALS.length - 1 ? 0 : i + 1));

  const t = TESTIMONIALS[testimonialIdx];

  return (
    <div className="landing">
      <div className="landing-bg" aria-hidden="true">
        <div className="landing-bg-blob landing-bg-blob--pink" />
        <div className="landing-bg-blob landing-bg-blob--blue" />
        <div className="landing-bg-blob landing-bg-blob--purple" />
      </div>

      <header className="landing-nav">
        <Link to="/" className="landing-logo">
          <span className="landing-logo-icon" aria-hidden="true" />
          <span>Brightpath AI</span>
        </Link>

        <nav className="landing-nav-links" aria-label="Main">
          <a href="#subjects">Subjects</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#pricing">Pricing</a>
          <a href="#schools">For Schools</a>
        </nav>

        <div className="landing-nav-actions">
          {parent ? (
            <Link to="/parent" className="landing-btn landing-btn--primary landing-btn--sm">
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="landing-btn landing-btn--ghost landing-btn--sm">
                Log In
              </Link>
              <Link to="/register" className="landing-btn landing-btn--primary landing-btn--sm">
                Get Started For Free
              </Link>
            </>
          )}
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-content">
            <h1 className="landing-hero-title">
              Unlock Your Full Potential with Your Personal AI Tutor
            </h1>
            <p className="landing-hero-sub">
              Adaptive, 24/7 learning that evolves with you. Master any subject, from Math to
              Mandarin.
            </p>
            <Link to={startHref} className="landing-btn landing-btn--primary landing-btn--lg">
              Start Your Personalized Journey
            </Link>
          </div>
          <HeroIllustration />
        </section>

        <section className="landing-benefits" aria-label="Key benefits">
          <div className="landing-benefits-inner">
            <div className="landing-benefit">
              <span className="landing-benefit-icon" aria-hidden="true">📈</span>
              <div>
                <strong>Adaptive Learning</strong>
                <p>Lessons adjust to your pace and skill level</p>
              </div>
            </div>
            <div className="landing-benefit">
              <span className="landing-benefit-icon" aria-hidden="true">🕐</span>
              <div>
                <strong>24/7 Support</strong>
                <p>Your tutor is always ready when you are</p>
              </div>
            </div>
            <div className="landing-benefit">
              <span className="landing-benefit-icon" aria-hidden="true">🛤️</span>
              <div>
                <strong>Personalized Path</strong>
                <p>A roadmap built just for you</p>
              </div>
            </div>
          </div>
        </section>

        <section id="subjects" className="landing-section">
          <h2 className="landing-section-title">Subjects</h2>
          <div className="landing-subjects-grid">
            {SUBJECTS.map((subject) => (
              <article key={subject.name} className="landing-subject-card">
                <div
                  className="landing-subject-icon"
                  style={{ background: `${subject.color}18`, color: subject.color }}
                >
                  {subject.icon}
                </div>
                <h3>{subject.name}</h3>
                <div className="landing-subject-progress">
                  <div
                    className="landing-subject-progress-fill"
                    style={{ width: `${subject.progress}%`, background: subject.color }}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="landing-section landing-chat-section">
          <h2 className="landing-section-title">Meet Your Brightpath AI</h2>
          <div className="landing-chat-card">
            <div className="landing-chat-header">
              <div className="landing-chat-avatar" aria-hidden="true">🤖</div>
              <div>
                <strong>Brightpath AI</strong>
                <span>Your personal tutor</span>
              </div>
            </div>
            <div className="landing-chat-messages">
              <div className="landing-chat-bubble landing-chat-bubble--student">
                <span className="landing-chat-label">Student</span>
                I need help with quadratic equations.
              </div>
              <div className="landing-chat-bubble landing-chat-bubble--ai">
                <span className="landing-chat-label">Brightpath AI</span>
                Let&apos;s start with a simple one. Can you factor this? x² + 5x + 6 = 0
              </div>
              <div className="landing-chat-bubble landing-chat-bubble--student">
                <span className="landing-chat-label">Student</span>
                Is it (x + 2)(x + 3)?
              </div>
              <div className="landing-chat-bubble landing-chat-bubble--ai">
                <span className="landing-chat-label">Brightpath AI</span>
                Exactly right! 🎉 You&apos;re getting the hang of factoring.
              </div>
            </div>
            <div className="landing-chat-input">
              <span>Type or speak your answer…</span>
              <button type="button" className="landing-chat-mic" aria-label="Voice input">
                🎤
              </button>
            </div>
          </div>
        </section>

        <section className="landing-section landing-testimonials-section">
          <h2 className="landing-section-title">Testimonials</h2>
          <div className="landing-testimonial-carousel">
            <button
              type="button"
              className="landing-carousel-btn"
              onClick={prevTestimonial}
              aria-label="Previous testimonial"
            >
              ‹
            </button>
            <article className="landing-testimonial-card">
              <div
                className="landing-testimonial-avatar"
                style={{ background: `linear-gradient(135deg, ${t.color}, ${t.color}99)` }}
              >
                {t.avatar}
              </div>
              <div className="landing-testimonial-body">
                <blockquote>&ldquo;{t.quote}&rdquo;</blockquote>
                <footer>
                  <strong>{t.name}</strong>
                  <span>{t.grade}</span>
                </footer>
              </div>
            </article>
            <button
              type="button"
              className="landing-carousel-btn"
              onClick={nextTestimonial}
              aria-label="Next testimonial"
            >
              ›
            </button>
          </div>
          <div className="landing-carousel-dots" role="tablist" aria-label="Testimonials">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === testimonialIdx}
                aria-label={`Testimonial ${i + 1}`}
                className={`landing-carousel-dot${i === testimonialIdx ? ' active' : ''}`}
                onClick={() => setTestimonialIdx(i)}
              />
            ))}
          </div>
        </section>

        <section id="pricing" className="landing-section landing-cta-section">
          <div className="landing-cta-card">
            <h2>Ready to learn smarter?</h2>
            <p>Private tutoring quality at app-store prices. Start free today.</p>
            <Link to={startHref} className="landing-btn landing-btn--primary landing-btn--lg">
              Get Started For Free
            </Link>
          </div>
        </section>

        <section id="schools" className="landing-section landing-schools-section">
          <div className="landing-schools-card">
            <h2>For Schools</h2>
            <p>
              Bring adaptive AI tutoring to your classroom. COPPA-ready, parent-managed accounts,
              and progress tracking built in.
            </p>
            <a href="mailto:hello@brightpath.ai" className="landing-btn landing-btn--secondary">
              Contact Us
            </a>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <nav className="landing-footer-links" aria-label="Footer">
          <a href="#how-it-works">About Us</a>
          <a href="#schools">Careers</a>
          <a href="mailto:support@brightpath.ai">Support</a>
          <a href="#pricing">Privacy Policy</a>
        </nav>
        <div className="landing-footer-social" aria-label="Social media">
          <a href="#" aria-label="Facebook">f</a>
          <a href="#" aria-label="Twitter">𝕏</a>
          <a href="#" aria-label="Instagram">◎</a>
        </div>
      </footer>
    </div>
  );
}
