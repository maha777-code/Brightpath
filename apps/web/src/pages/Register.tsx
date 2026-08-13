import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GraduationCap, Presentation } from 'lucide-react';
import {
  LOCALES,
  LOCALE_LABELS,
  getAgeFromDOB,
  getAgeGroupFromDOB,
  AGE_GROUP_LABELS,
  type Locale,
  type SignupRole,
} from '@brightpath/shared';
import { useAuth } from '@/context/AuthContext';
import { BirthDatePicker } from '@/components/age/BirthDatePicker';

const ACCENT = '#5B46BA';

export default function Register() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<SignupRole | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [locale, setLocaleValue] = useState<Locale>('en-IN');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const preview =
    role === 'student' && dateOfBirth && /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)
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
    if (!role) {
      setError('Please select whether you are a Student or a Teacher.');
      return;
    }
    if (role === 'student' && !dateOfBirth) {
      setError('Date of birth is required to personalize the curriculum.');
      return;
    }
    setBusy(true);
    try {
      const result = await register({
        email,
        password,
        name: name || undefined,
        locale,
        role,
        dateOfBirth: role === 'student' ? dateOfBirth : undefined,
        schoolName: role === 'teacher' ? schoolName || undefined : undefined,
      });
      navigate(result.role === 'teacher' ? '/teacher/dashboard' : '/dashboard');
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
        <p className="page-subtitle">Choose your role, then create your BrightPath account.</p>
      </div>
      <form onSubmit={submit}>
        <fieldset className="mb-5">
          <legend className="form-label mb-2">I am a…</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setRole('student')}
              aria-pressed={role === 'student'}
              className={[
                'rounded-2xl border-2 p-4 text-left transition',
                role === 'student'
                  ? 'border-teal-500 bg-teal-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-teal-300',
              ].join(' ')}
            >
              <GraduationCap
                className="mb-2 h-7 w-7"
                style={{ color: role === 'student' ? '#0f766e' : '#64748b' }}
              />
              <p className="text-sm font-extrabold text-slate-800">I am a Student</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Access interactive textbooks, videos, quizzes, and ask AI doubts.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setRole('teacher')}
              aria-pressed={role === 'teacher'}
              className={[
                'rounded-2xl border-2 p-4 text-left transition',
                role === 'teacher'
                  ? 'border-[#5B46BA] bg-indigo-50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-indigo-300',
              ].join(' ')}
            >
              <Presentation
                className="mb-2 h-7 w-7"
                style={{ color: role === 'teacher' ? ACCENT : '#64748b' }}
              />
              <p className="text-sm font-extrabold text-slate-800">I am a Teacher</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Upload state textbooks, enrich lessons, and manage AI answers.
              </p>
            </button>
          </div>
        </fieldset>

        <div className="form-group">
          <label className="form-label" htmlFor="name">{t('auth.name')}</label>
          <input
            id="name"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="email">{t('auth.email')}</label>
          <input
            id="email"
            type="email"
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="password">{t('auth.password')}</label>
          <input
            id="password"
            type="password"
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>

        {role === 'student' && (
          <>
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
              <label className="form-label" htmlFor="locale">
                Language / locale
              </label>
              <select
                id="locale"
                className="form-input"
                value={locale}
                onChange={(e) => setLocaleValue(e.target.value as Locale)}
              >
                {LOCALES.map((l) => (
                  <option key={l} value={l}>
                    {LOCALE_LABELS[l]}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {role === 'teacher' && (
          <div className="form-group">
            <label className="form-label" htmlFor="schoolName">
              School name (optional)
            </label>
            <input
              id="schoolName"
              className="form-input"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="Your school or institution"
            />
          </div>
        )}

        {error && <p style={{ color: '#dc2626', marginBottom: 16, fontSize: '0.9rem' }}>{error}</p>}
        <button
          type="submit"
          className="btn btn-primary"
          disabled={busy || !role}
          style={role === 'teacher' ? { background: ACCENT } : undefined}
        >
          {t('auth.register')}
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.9rem' }}>
        {t('auth.hasAccount')} <Link to="/login">{t('auth.login')}</Link>
      </p>
    </div>
  );
}
