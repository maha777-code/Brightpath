import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { t } = useTranslation();
  const { parent } = useAuth();

  return (
    <div className="page">
      <section className="hero">
        <div className="hero-logo" aria-hidden="true">🌟</div>
        <h1 className="hero-title">{t('app.name')}</h1>
        <p className="hero-tagline">{t('app.tagline')}</p>
        <div className="hero-price">
          <span>💚</span>
          <span>Private tutoring quality · App-store prices</span>
        </div>
      </section>

      <ul className="feature-list">
        <li><span>👩‍🏫</span><span><strong>Personal tutor feel</strong> — one student at a time</span></li>
        <li><span>👪</span><span><strong>Parent account required</strong> — safe, COPPA-ready flow</span></li>
        <li><span>🌍</span><span><strong>India, US, UAE, Kuwait</strong> — multilingual support</span></li>
        <li><span>🔒</span><span><strong>Secure profiles</strong> — children managed by parents</span></li>
      </ul>

      <Link to={parent ? '/parent' : '/register'} className="btn btn-primary">
        {parent ? t('parent.home') : t('auth.register')}
      </Link>

      {!parent && (
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: '0.9rem' }}>
          {t('auth.hasAccount')} <Link to="/login">{t('auth.login')}</Link>
        </p>
      )}
    </div>
  );
}
