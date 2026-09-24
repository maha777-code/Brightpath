import { useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { BrandLogo } from '@/components/Navigation/BrandLogo';
import { CYBER_FONT_STYLE } from '@/lib/theme';

const FONT: CSSProperties = CYBER_FONT_STYLE;

const fieldClass =
  'bp-auth-input mt-2 w-full rounded-2xl border-0 bg-[#e8f0fe] px-5 py-4 text-lg font-medium tracking-tight text-slate-900 placeholder-slate-500 outline-none transition-all focus:ring-2 focus:ring-cyan-400';

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

      <div className="mx-auto w-full space-y-8 rounded-3xl border border-slate-800/80 bg-[#0c1220] p-10 shadow-2xl backdrop-blur-2xl sm:p-14 md:w-[50vw] md:max-w-[50vw]">
        <div className="bp-login-logo mb-2 flex justify-center">
          <BrandLogo
            variant="full"
            to="/"
            imgClassName="h-20 w-auto object-contain sm:h-24"
          />
        </div>

        <form onSubmit={(event) => void submit(event)} className="space-y-6">
          <div>
            <label htmlFor="email" className="bp-auth-label block text-lg font-semibold tracking-tight text-white" style={FONT}>
              {t('auth.email')}
            </label>
            <input
              id="email"
              type="email"
              className={fieldClass}
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
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
              minLength={6}
              autoComplete="current-password"
            />
          </div>

          <p className="text-base tracking-tight text-slate-400">
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
            className="bp-auth-submit inline-flex w-full cursor-pointer appearance-none items-center justify-center gap-2 rounded-2xl border border-transparent bg-cyan-400 py-4 text-lg font-bold tracking-wide text-slate-950 shadow-[0_0_25px_rgba(6,182,212,0.25)] transition-all duration-200 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            style={FONT}
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            {t('auth.login')}
          </button>
        </form>

        <p className="bp-login-foot pt-2 text-center text-lg font-medium text-slate-400" style={FONT}>
          {t('auth.noAccount')}{' '}
          <Link
            to="/register"
            className="bp-login-register text-lg font-bold text-cyan-400 underline underline-offset-4 transition-colors hover:text-cyan-300 visited:text-cyan-400"
          >
            {t('auth.register')}
          </Link>
        </p>
      </div>
    </div>
  );
}
