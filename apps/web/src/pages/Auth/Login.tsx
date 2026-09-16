import { useState, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { BrandLogo } from '@/components/Navigation/BrandLogo';

const FONT: CSSProperties = {
  fontFamily: 'Cambria, Georgia, serif',
};

const FIELD_STYLE: CSSProperties = {
  ...FONT,
  color: '#f8fafc',
  backgroundColor: 'rgba(2, 6, 23, 0.9)',
};

const fieldClass =
  'mt-1.5 w-full rounded-xl border border-slate-700/80 bg-slate-950/90 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 placeholder:italic placeholder:opacity-70 outline-none transition-colors focus:border-amber-400/70 focus:ring-1 focus:ring-amber-400/40';

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
      const result = await login(email, password);
      navigate(result.path);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center overflow-y-auto bg-[#0a0f1d] px-4 py-10"
      style={FONT}
    >
      <div className="w-full max-w-md rounded-3xl border border-slate-700/60 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mb-6 flex flex-col items-center">
          <BrandLogo
            variant="full"
            to="/login"
            imgClassName="mx-auto h-auto w-full max-h-52 object-contain"
          />
        </div>

        <form onSubmit={(event) => void submit(event)} className="space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-200" style={FONT}>
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
            <label htmlFor="password" className="block text-sm font-semibold text-slate-200" style={FONT}>
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

          <p className="text-xs text-slate-400">
            Demo teacher: <span className="text-amber-200">teacher@brightpath.ai</span> /{' '}
            <span className="text-amber-200">teacher123</span>
          </p>

          {error ? (
            <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#d4af37] py-3 text-lg font-semibold text-slate-950 transition-colors hover:bg-[#e4c04a] disabled:cursor-not-allowed disabled:opacity-60"
            style={FONT}
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            {t('auth.login')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400" style={FONT}>
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="font-semibold text-amber-300 hover:text-amber-200">
            {t('auth.register')}
          </Link>
        </p>
      </div>
    </div>
  );
}
