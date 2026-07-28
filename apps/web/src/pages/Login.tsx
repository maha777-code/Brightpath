import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      navigate('/parent');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{t('auth.login')}</h1>
        <p className="page-subtitle">{t('auth.parentRequired')}</p>
      </div>
      <form onSubmit={submit}>
        <div className="form-group">
          <label className="form-label" htmlFor="email">{t('auth.email')}</label>
          <input id="email" type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="password">{t('auth.password')}</label>
          <input id="password" type="password" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="current-password" />
        </div>
        {error && <p style={{ color: '#dc2626', marginBottom: 16, fontSize: '0.9rem' }}>{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy}>{t('auth.login')}</button>
      </form>
      <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.9rem' }}>
        {t('auth.noAccount')} <Link to="/register">{t('auth.register')}</Link>
      </p>
    </div>
  );
}
