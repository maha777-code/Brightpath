import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, KeyRound, Loader2, MailCheck } from 'lucide-react';
import { passwordMeetsPolicy } from '@brightpath/shared';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { BrandLogo } from '@/components/Navigation/BrandLogo';
import { PasswordRequirements } from '@/components/auth/PasswordRequirements';
import { CYBER_FONT_STYLE } from '@/lib/theme';

const FONT: CSSProperties = CYBER_FONT_STYLE;

const fieldClass =
  'bp-auth-input mt-1.5 w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-5 py-3.5 text-lg tracking-tight text-white placeholder-slate-500 outline-none transition-all focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500';

const labelClass = 'bp-auth-label block text-lg font-semibold tracking-tight text-white';

const submitClass =
  'bp-auth-submit inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-cyan-500/60 bg-cyan-950/60 py-4 text-xl font-bold tracking-wide text-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.25)] transition-all duration-200 hover:bg-cyan-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60';

const linkClass = 'font-bold text-cyan-400 underline underline-offset-4 transition-colors hover:text-cyan-300';

function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div
      className="bp-login fixed inset-0 flex items-center justify-center overflow-y-auto bg-transparent px-4 py-10"
      style={FONT}
    >
      <Link
        to="/login"
        className="bp-auth-back absolute left-6 top-6 z-50 inline-flex items-center gap-2.5 rounded-xl border border-cyan-500/30 bg-slate-800/60 px-4 py-2 text-lg font-bold text-cyan-400 no-underline transition-all duration-200 hover:border-cyan-400 hover:bg-slate-800 hover:text-cyan-300"
      >
        <ArrowLeft className="h-5 w-5 text-cyan-400" />
        <span>Back to sign in</span>
      </Link>
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-slate-800/80 bg-slate-900/80 p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-xl md:p-10">
        <div className="bp-login-logo flex justify-center">
          <BrandLogo variant="full" to="/" imgClassName="h-12 w-auto object-contain" />
        </div>
        {children}
      </div>
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-sm text-rose-200">{message}</p>
  );
}

export function ForgotPassword() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [sentMessage, setSentMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api.forgotPassword(email.trim());
      setSentMessage(res.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the reset email. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  if (sentMessage) {
    return (
      <AuthCard>
        <div className="space-y-4 text-center">
          <MailCheck className="mx-auto h-12 w-12 text-cyan-400" />
          <h1 className="text-2xl font-bold text-white">Check your email</h1>
          <p className="text-base text-slate-300">{sentMessage}</p>
          <p className="text-sm text-slate-400">The link expires in 30 minutes.</p>
          <button
            type="button"
            className={`${linkClass} border-0 bg-transparent p-0 text-base shadow-none hover:bg-transparent`}
            onClick={() => setSentMessage('')}
          >
            Use a different email
          </button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <div className="text-center">
        <KeyRound className="mx-auto h-10 w-10 text-cyan-400" />
        <h1 className="mt-3 text-2xl font-bold text-white">Forgot your password?</h1>
        <p className="mt-2 text-base text-slate-400">
          Enter the email you sign in with and we will send you a link to choose a new password.
        </p>
      </div>
      <form onSubmit={(event) => void submit(event)} className="space-y-5">
        <div>
          <label htmlFor="reset-email" className={labelClass} style={FONT}>
            Email
          </label>
          <input
            id="reset-email"
            type="email"
            className={fieldClass}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@school.edu"
            required
            autoComplete="email"
            autoFocus
          />
        </div>
        {error ? <ErrorNote message={error} /> : null}
        <button type="submit" disabled={busy} className={submitClass} style={FONT}>
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          Send reset link
        </button>
      </form>
    </AuthCard>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState<string | null>(null);
  const [linkError, setLinkError] = useState(token ? '' : 'This reset link is not valid. Ask for a new one.');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    api
      .checkPasswordReset(token)
      .then((res) => setEmail(res.email ?? ''))
      .catch((err) => setLinkError(err instanceof Error ? err.message : 'This reset link is not valid.'));
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const res = await api.resetPassword(token, password);
      try {
        const result = await login(res.email, password);
        navigate(result.path, { replace: true });
      } catch {
        navigate(`/login?reset=1`, { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset your password.');
      setBusy(false);
    }
  };

  if (linkError) {
    return (
      <AuthCard>
        <div className="space-y-4 text-center">
          <h1 className="text-2xl font-bold text-white">Link not valid</h1>
          <ErrorNote message={linkError} />
          <Link to="/forgot-password" className={`${linkClass} inline-block text-base`}>
            Send a new reset link
          </Link>
        </div>
      </AuthCard>
    );
  }

  if (email === null) {
    return (
      <AuthCard>
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-400" />
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <div className="text-center">
        <KeyRound className="mx-auto h-10 w-10 text-cyan-400" />
        <h1 className="mt-3 text-2xl font-bold text-white">Choose a new password</h1>
        {email ? <p className="mt-2 text-base text-slate-400">for {email}</p> : null}
      </div>
      <form onSubmit={(event) => void submit(event)} className="space-y-5">
        <div>
          <label htmlFor="new-password" className={labelClass} style={FONT}>
            New password
          </label>
          <input
            id="new-password"
            type="password"
            className={fieldClass}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
            autoFocus
          />
          {password.length > 0 && !passwordMeetsPolicy(password) ? <PasswordRequirements password={password} /> : null}
        </div>
        <div>
          <label htmlFor="confirm-password" className={labelClass} style={FONT}>
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type="password"
            className={fieldClass}
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
            required
          />
        </div>
        {error ? <ErrorNote message={error} /> : null}
        <button
          type="submit"
          disabled={busy || !passwordMeetsPolicy(password) || !confirm}
          className={submitClass}
          style={FONT}
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
          Save new password
        </button>
      </form>
    </AuthCard>
  );
}
