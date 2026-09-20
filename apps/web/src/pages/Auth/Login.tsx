import { useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { BrandLogo } from '@/components/Navigation/BrandLogo';
import { CYBER_FONT_STYLE } from '@/lib/theme';

const FONT: CSSProperties = CYBER_FONT_STYLE;

const FIELD_STYLE: CSSProperties = {
  ...FONT,
  color: '#ecfeff',
  backgroundColor: '#0b0f19',
};

const fieldClass =
  'bp-auth-input mt-1.5 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-5 py-3.5 text-lg tracking-tight text-white placeholder-slate-500 outline-none transition-all focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500';

const AUTH_BACK_CLASS =
  'bp-auth-back inline-flex cursor-pointer items-center gap-2.5 rounded-xl border border-cyan-500/30 bg-slate-800/60 px-4 py-2 text-lg font-bold text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all duration-200 hover:-translate-x-1 hover:border-cyan-400 hover:bg-slate-800 hover:text-cyan-300 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]';

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleGoBack = () => {
    navigate('/');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await login(email, password);
      const savedName = result.user?.name?.trim() || result.teacher?.name?.trim();
      if (savedName) localStorage.setItem('user_name', savedName);
      const savedSchool = result.teacher?.schoolName?.trim();
      if (savedSchool) localStorage.setItem('user_school', savedSchool);
      navigate(result.path);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="bp-login fixed inset-0 flex items-center justify-center overflow-y-auto bg-transparent px-4 py-10"
      style={FONT}
    >
      <button
        onClick={handleGoBack}
        type="button"
        className={`${AUTH_BACK_CLASS} absolute left-6 top-6 z-50`}
        aria-label="Go back to previous page"
      >
        <ArrowLeft className="h-5 w-5 text-cyan-400" />
        <span>Back</span>
      </button>

      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-[0_0_50px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        <div className="mb-2 flex items-center justify-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-pulse" />
          <span className="badge-cyber">[SYS_OK]</span>
        </div>
        <div className="mb-6 flex flex-col items-center">
          <BrandLogo
            variant="full"
            to="/login"
            imgClassName="mx-auto h-auto w-full max-h-52 object-contain"
          />
        </div>

        <form onSubmit={(event) => void submit(event)} className="space-y-5">
          <div>
            <label htmlFor="email" className="bp-auth-label block text-lg font-semibold tracking-tight text-white" style={FONT}>
              {t('auth.email')}
            </label>
            <input
              id="email"
              type="email"
              className={fieldClass}
              style={FIELD_STYLE}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@school.edu"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="bp-auth-label block text-lg font-semibold tracking-tight text-white" style={FONT}>
              {t('auth.password')}
            </label>
            <input
              id="password"
              type="password"
              className={fieldClass}
              style={FIELD_STYLE}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
              minLength={6}
              autoComplete="current-password"
            />
          </div>

          <p className="text-xs tracking-tight text-slate-400">
            Demo teacher: <span className="text-cyan-300">teacher@brightpath.ai</span> /{' '}
            <span className="text-cyan-300">teacher123</span>
          </p>

          {error ? (
            <p className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="bp-auth-submit inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-500/60 bg-cyan-950/60 py-4 text-xl font-bold tracking-wide text-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.25)] transition-all duration-200 hover:bg-cyan-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            style={FONT}
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            {t('auth.login')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500" style={FONT}>
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="font-semibold text-cyan-300 hover:text-cyan-200">
            {t('auth.register')}
          </Link>
        </p>
      </div>
    </div>
  );
}
