import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';

type LoginMode = 'student' | 'teacher';

export default function Login() {
  const { t } = useTranslation();
  const { login, loginTeacher } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<LoginMode>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'teacher') {
        await loginTeacher(email, password);
        navigate('/teacher/dashboard');
      } else {
        await login(email, password);
        navigate('/dashboard');
      }
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
        <p className="page-subtitle">
          {mode === 'teacher' ? 'Sign in to the Teacher Dashboard' : 'Sign in to continue learning'}
        </p>
      </div>

      <div className="mb-4 flex rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setMode('student')}
          className={[
            'flex-1 rounded-lg py-2 text-sm font-bold transition',
            mode === 'student' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500',
          ].join(' ')}
        >
          Student
        </button>
        <button
          type="button"
          onClick={() => setMode('teacher')}
          className={[
            'flex-1 rounded-lg py-2 text-sm font-bold transition',
            mode === 'teacher' ? 'bg-white text-[#5B46BA] shadow-sm' : 'text-slate-500',
          ].join(' ')}
        >
          Teacher
        </button>
      </div>

      <form onSubmit={submit}>
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
            placeholder={mode === 'teacher' ? 'teacher@brightpath.ai' : undefined}
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
            minLength={mode === 'teacher' ? 6 : 8}
            autoComplete="current-password"
            placeholder={mode === 'teacher' ? 'teacher123' : undefined}
          />
        </div>
        {mode === 'teacher' && (
          <p className="mb-3 text-xs text-slate-500">
            Demo: <strong>teacher@brightpath.ai</strong> / <strong>teacher123</strong>
          </p>
        )}
        {error && <p style={{ color: '#dc2626', marginBottom: 16, fontSize: '0.9rem' }}>{error}</p>}
        <button
          type="submit"
          className="btn btn-primary"
          disabled={busy}
          style={mode === 'teacher' ? { background: '#5B46BA' } : undefined}
        >
          {t('auth.login')}
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.9rem' }}>
        {t('auth.noAccount')} <Link to="/register">{t('auth.register')}</Link>
      </p>
    </div>
  );
}
