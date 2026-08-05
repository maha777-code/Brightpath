import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LOCALES, LOCALE_LABELS, getAgeFromDOB, getAgeGroupFromDOB, AGE_GROUP_LABELS, type Locale } from '@brightpath/shared';
import { useAuth } from '@/context/AuthContext';
import { BirthDatePicker } from '@/components/age/BirthDatePicker';

export default function Register() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [locale, setLocaleValue] = useState<Locale>('en-IN');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const preview =
    dateOfBirth && /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)
      ? (() => {
          const dob = new Date(`${dateOfBirth}T12:00:00`);
          const age = getAgeFromDOB(dob);
          const group = getAgeGroupFromDOB(dob);
          return { age, group };
        })()
      : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!dateOfBirth) {
      setError('Date of birth is required to personalize the curriculum.');
      return;
    }
    setBusy(true);
    try {
      await register({
        email,
        password,
        name: name || undefined,
        locale,
        dateOfBirth,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{t('auth.register')}</h1>
        <p className="page-subtitle">{t('auth.parentRequired')}</p>
      </div>
      <form onSubmit={submit}>
        <div className="form-group">
          <label className="form-label" htmlFor="name">{t('auth.name')}</label>
          <input id="name" className="form-input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="email">{t('auth.email')}</label>
          <input id="email" type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="password">{t('auth.password')}</label>
          <input id="password" type="password" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
        </div>

        <BirthDatePicker value={dateOfBirth} onChange={setDateOfBirth} required />

        {preview && (
          <div
            style={{
              marginBottom: 16,
              padding: '12px 14px',
              borderRadius: 12,
              background: '#ecfdf5',
              border: '1px solid #a7f3d0',
              fontSize: '0.875rem',
              color: '#065f46',
            }}
          >
            Age <strong>{preview.age}</strong> · Unlocking{' '}
            <strong>{AGE_GROUP_LABELS[preview.group]}</strong> curriculum
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="locale">Language / locale</label>
          <select id="locale" className="form-input" value={locale} onChange={(e) => setLocaleValue(e.target.value as Locale)}>
            {LOCALES.map((l) => (
              <option key={l} value={l}>{LOCALE_LABELS[l]}</option>
            ))}
          </select>
        </div>
        {error && <p style={{ color: '#dc2626', marginBottom: 16, fontSize: '0.9rem' }}>{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy}>{t('auth.register')}</button>
      </form>
      <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.9rem' }}>
        {t('auth.hasAccount')} <Link to="/login">{t('auth.login')}</Link>
      </p>
    </div>
  );
}
