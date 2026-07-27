import { Link } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';

export default function Home() {
  const { profile } = useProfile();

  return (
    <div className="page">
      <section className="hero">
        <div className="hero-logo" aria-hidden="true">🌟</div>
        <h1 className="hero-title">BrightPath</h1>
        <p className="hero-tagline">
          One-on-one tutoring in reading, writing &amp; math — the way a real private tutor would teach.
        </p>
        <div className="hero-price">
          <span>💚</span>
          <span>Private tutoring quality · App-store prices</span>
        </div>
      </section>

      <ul className="feature-list">
        <li>
          <span>👩‍🏫</span>
          <span><strong>Personal tutor feel</strong> — patient, step-by-step, one student at a time</span>
        </li>
        <li>
          <span>📚</span>
          <span><strong>Reading, writing &amp; math</strong> — structured lessons for ages 5–14</span>
        </li>
        <li>
          <span>📱</span>
          <span><strong>Works on any device</strong> — install on phone or tablet like an app</span>
        </li>
        <li>
          <span>🔒</span>
          <span><strong>Private &amp; safe</strong> — progress stays on your device</span>
        </li>
      </ul>

      <Link
        to={profile?.onboardingComplete ? '/dashboard' : '/onboarding'}
        className="btn btn-primary"
      >
        {profile?.onboardingComplete ? 'Continue Learning' : 'Get Started — Free'}
      </Link>

      <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.8rem', color: 'var(--slate-400)' }}>
        No account needed to start · Ages 5–14
      </p>
    </div>
  );
}
