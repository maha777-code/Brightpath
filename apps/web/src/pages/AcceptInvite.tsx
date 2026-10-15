import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loader2, MailCheck } from 'lucide-react';
import { passwordMeetsPolicy } from '@brightpath/shared';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { BrandLogo } from '@/components/Navigation/BrandLogo';
import { PasswordRequirements } from '@/components/auth/PasswordRequirements';

type InviteInfo = Awaited<ReturnType<typeof api.getInvite>>['invite'];

const inputClass =
  'mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-base text-white outline-none focus:border-cyan-500';

export default function AcceptInvite() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const { acceptInvite } = useAuth();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loadError, setLoadError] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .getInvite(token)
      .then((res) => {
        setInvite(res.invite);
        setName(res.invite.name);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : 'This invite link is not valid.'));
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
      const result = await acceptInvite(token, { name: name.trim() || undefined, password });
      navigate(result.path);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account.');
    } finally {
      setBusy(false);
    }
  };

  const where = invite
    ? [invite.className, invite.organizationName].filter(Boolean).join(' · ') || 'MindVault'
    : '';

  return (
    <div className="mv-roster flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950/90 p-8 text-slate-100 shadow-2xl">
        <div className="mb-6 flex justify-center">
          <BrandLogo variant="full" imgClassName="h-10 w-auto object-contain" />
        </div>

        {!invite && !loadError ? <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-400" /> : null}

        {loadError ? (
          <div className="space-y-4 text-center">
            <p className="text-sm font-semibold text-rose-300">{loadError}</p>
            <Link to="/login" className="inline-block rounded-xl border border-slate-700 px-4 py-2 font-semibold text-slate-100 no-underline">
              Go to sign in
            </Link>
          </div>
        ) : null}

        {invite && invite.accountExists ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-slate-300">
              An account for <strong>{invite.email}</strong> already exists. Sign in with it, then join the class with its code.
            </p>
            <Link to="/login" className="inline-block rounded-xl bg-cyan-500 px-4 py-2 font-bold text-slate-950 no-underline">
              Sign in
            </Link>
          </div>
        ) : null}

        {invite && !invite.accountExists ? (
          <form onSubmit={(event) => void submit(event)} className="space-y-4">
            <div className="text-center">
              <MailCheck className="mx-auto h-10 w-10 text-cyan-400" />
              <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-cyan-300">
                {invite.inviterName ? `${invite.inviterName} invited you` : "You're invited"}
              </p>
              <h1 className="mt-1 text-2xl font-bold text-white">{where}</h1>
              <p className="mt-2 text-sm text-slate-400">
                Your email is confirmed. Set a password to create your {invite.role} account.
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-200" htmlFor="invite-email">Email</label>
              <input id="invite-email" className={`${inputClass} opacity-70`} value={invite.email} readOnly />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-200" htmlFor="invite-name">Your name</label>
              <input id="invite-name" className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-200" htmlFor="invite-password">Password</label>
              <input
                id="invite-password"
                type="password"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              {password.length > 0 && !passwordMeetsPolicy(password) ? <PasswordRequirements password={password} /> : null}
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-200" htmlFor="invite-confirm">Confirm password</label>
              <input
                id="invite-confirm"
                type="password"
                className={inputClass}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            {error ? <p className="text-sm font-semibold text-rose-300">{error}</p> : null}

            <button
              type="submit"
              disabled={busy || !passwordMeetsPolicy(password) || !confirm}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 font-bold text-slate-950 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create my account
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
