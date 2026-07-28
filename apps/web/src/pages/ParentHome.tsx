import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ChildProfile } from '@brightpath/shared';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { useProfile } from '@/hooks/useProfile';
import type { LearnerProfile } from '@/types';

export default function ParentHome() {
  const { t } = useTranslation();
  const { parent, logout } = useAuth();
  const { updateProfile } = useProfile();
  const navigate = useNavigate();
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.listChildren()
      .then(({ children: c }) => setChildren(c))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const selectChild = (child: ChildProfile) => {
    const profile: LearnerProfile = {
      name: child.name,
      age: child.age,
      ageBand: child.ageBand as LearnerProfile['ageBand'],
      subjects: child.subjects.filter((s) => ['reading', 'writing', 'math'].includes(s)) as LearnerProfile['subjects'],
      onboardingComplete: true,
    };
    updateProfile(profile);
    navigate('/dashboard');
  };

  if (!parent) return null;

  return (
    <div className="page">
      <div className="greeting-banner">
        <h2>{t('parent.welcome', { name: parent.name ?? parent.email })}</h2>
        <p>{t('parent.selectChild')}</p>
      </div>

      {loading && <p>{t('common.loading')}</p>}
      {error && <p style={{ color: '#dc2626' }}>{error}</p>}

      <div className="card-grid">
        {children.map((child) => (
          <button key={child.id} type="button" className="subject-card" onClick={() => selectChild(child)}>
            <div className="subject-card-icon" style={{ background: '#eef2ff' }}>👤</div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div className="subject-card-title">{child.name}</div>
              <div className="subject-card-desc">{child.age} yrs · {child.subjects.length} subjects</div>
            </div>
            <span style={{ color: 'var(--slate-400)' }}>→</span>
          </button>
        ))}
      </div>

      <Link to="/parent/children/new" className="btn btn-primary" style={{ marginTop: 16 }}>
        {t('parent.addChild')}
      </Link>

      <button type="button" className="btn btn-ghost" style={{ marginTop: 8 }} onClick={() => { logout(); navigate('/'); }}>
        {t('auth.logout')}
      </button>
    </div>
  );
}
