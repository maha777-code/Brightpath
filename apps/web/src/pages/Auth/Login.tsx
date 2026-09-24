import { useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { BrandLogo } from '@/components/Navigation/BrandLogo';
import { CYBER_FONT_STYLE } from '@/lib/theme';

const FONT: CSSProperties = CYBER_FONT_STYLE;

const fieldClass =
  'bp-auth-input h-12 w-full rounded-xl border border-slate-700/60 bg-[#1d1b26] px-4 text-sm text-white placeholder-slate-400 outline-none transition-colors focus:border-purple-400';

const oauthClass =
  'flex h-11 w-full cursor-pointer appearance-none items-center justify-center gap-2 rounded-xl border border-slate-700/50 bg-[#1d1b26] text-sm font-semibold text-white transition-colors hover:bg-[#262332]';

const AUTH_BACK_CLASS =
  'bp-auth-back inline-flex cursor-pointer items-center gap-2.5 rounded-xl border border-cyan-500/30 bg-slate-800/60 px-4 py-2 text-lg font-bold text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] transition-all duration-200 hover:-translate-x-1 hover:border-cyan-400 hover:bg-slate-800 hover:text-cyan-300 hover:shadow-[0_0_20px_rgba(6,182,212,0.3)]';

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const unavailable = (provider: string) => {
    setError(`${provider} sign-in is not connected yet. Use your email and password.`);
  };

  return (
    <div
      className="bp-login fixed inset-0 flex items-center justify-center overflow-y-auto bg-[#121118] p-4 text-white"
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

      <div className="mx-auto w-full max-w-[400px] space-y-6 text-center">
        <div className="space-y-3">
          <div className="bp-login-logo flex justify-center">
            <BrandLogo variant="full" to="/" imgClassName="h-14 w-auto object-contain" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Educator Sign in</h1>
        </div>

        <form onSubmit={(event) => void submit(event)} className="space-y-3 text-left">
          <input
            id="email"
            type="email"
            className={fieldClass}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            required
            autoComplete="email"
            aria-label="Email"
          />

          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className={`${fieldClass} pr-16`}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              required
              minLength={6}
              autoComplete="current-password"
              aria-label="Password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer appearance-none border-0 bg-transparent text-xs font-semibold text-slate-300 hover:text-white"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          {error ? (
            <p className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="bp-auth-submit mt-1 flex h-11 w-full cursor-pointer appearance-none items-center justify-center gap-2 rounded-xl border border-transparent bg-[#b490f5] text-sm font-bold text-slate-950 transition-all hover:bg-[#a379f3] disabled:cursor-not-allowed disabled:opacity-60"
            style={FONT}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Sign in
          </button>
        </form>

        <div className="space-y-2.5 pt-2">
          <button type="button" className={oauthClass} onClick={() => unavailable('Google')}>
            Sign in with Google
          </button>
          <button type="button" className={oauthClass} onClick={() => unavailable('Microsoft')}>
            Sign in with Microsoft
          </button>
          <button type="button" className={oauthClass} onClick={() => unavailable('SSO')}>
            Sign in with SSO
          </button>
        </div>

        <p className="px-2 text-[11px] leading-relaxed text-slate-400">
          By continuing, you confirm that you have read and agree to the{' '}
          <Link to="/terms" className="underline hover:text-slate-200">
            Terms and Conditions
          </Link>
          ,{' '}
          <Link to="/security" className="underline hover:text-slate-200">
            Data Protection Addendum
          </Link>
          , and{' '}
          <Link to="/privacy" className="underline hover:text-slate-200">
            Privacy Policy
          </Link>
          .
        </p>

        <div className="space-y-2 pt-2 text-xs text-slate-300">
          <div className="flex items-center justify-center gap-4">
            <Link to="/register" className="hover:underline">
              Create an account
            </Link>
            <Link to="/contact" className="hover:underline">
              Forgot password
            </Link>
          </div>
          <p className="text-xs text-slate-500">
            Demo teacher: teacher@brightpath.ai / teacher123
          </p>
          <Link to="/register" className="text-slate-400 hover:text-white">
            Not an educator?
          </Link>
        </div>
      </div>
    </div>
  );
}
