import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, GraduationCap, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { rosterApi } from '@/lib/rosterApi';
import { BrandLogo } from '@/components/Navigation/BrandLogo';

type JoinInfo = Awaited<ReturnType<typeof rosterApi.joinInfo>>;

export default function JoinClass() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const { role } = useAuth();
  const [info, setInfo] = useState<JoinInfo | null>(null);
  const [error, setError] = useState('');
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const normalized = code.trim().toUpperCase();

  useEffect(() => {
    rosterApi
      .joinInfo(normalized)
      .then(setInfo)
      .catch(() => setError('This class code is not valid. Ask your teacher for a new link or code.'));
  }, [normalized]);

  const join = async () => {
    setJoining(true);
    setError('');
    try {
      await api.joinClass(normalized);
      setJoined(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join the class');
    } finally {
      setJoining(false);
    }
  };

  const next = encodeURIComponent(`/join/${normalized}`);

  return (
    <div className="mv-roster flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-950/90 p-8 text-center text-slate-100 shadow-2xl">
        <div className="mb-6 flex justify-center">
          <BrandLogo variant="full" imgClassName="h-10 w-auto object-contain" />
        </div>
        {!info && !error ? (
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-cyan-400" />
        ) : null}
        {info ? (
          <>
            <GraduationCap className="mx-auto h-10 w-10 text-cyan-400" />
            <p className="mt-3 text-sm font-semibold uppercase tracking-wide text-cyan-300">You're invited to join</p>
            <h1 className="mt-1 text-3xl font-bold text-white">{info.className}</h1>
            <p className="mt-2 text-sm text-slate-400">
              {[info.subject, info.teacherName && `with ${info.teacherName}`, info.organizationName].filter(Boolean).join(' · ')}
            </p>
            <p className="mt-4 font-mono text-2xl font-black tracking-[0.25em] text-slate-200">{info.code}</p>

            {joined ? (
              <div className="mt-6 space-y-3">
                <p className="flex items-center justify-center gap-2 font-semibold text-emerald-300">
                  <CheckCircle2 className="h-5 w-5" /> You joined {info.className}
                </p>
                <button type="button" onClick={() => navigate('/student/sharada')} className="w-full rounded-xl bg-cyan-500 px-4 py-3 font-bold text-slate-950">
                  Ask Sharada a question
                </button>
                <button type="button" onClick={() => navigate('/student/dashboard')} className="w-full rounded-xl border border-slate-700 px-4 py-3 font-semibold">
                  Go to my dashboard
                </button>
              </div>
            ) : role === 'student' ? (
              <button
                type="button"
                disabled={joining}
                onClick={() => void join()}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-3 font-bold text-slate-950 disabled:opacity-50"
              >
                {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Join this class
              </button>
            ) : role ? (
              <p className="mt-6 text-sm text-amber-200">
                Class codes are for student accounts. Log out and sign in with the student's account to join.
              </p>
            ) : (
              <div className="mt-6 space-y-3">
                <Link
                  to={`/register?role=student&classCode=${info.code}`}
                  className="block w-full rounded-xl bg-cyan-500 px-4 py-3 font-bold text-slate-950 no-underline"
                >
                  Create a student account
                </Link>
                <Link to={`/login?next=${next}`} className="block w-full rounded-xl border border-slate-700 px-4 py-3 font-semibold text-slate-100 no-underline">
                  I already have an account
                </Link>
              </div>
            )}
          </>
        ) : null}
        {error ? <p className="mt-4 text-sm font-semibold text-rose-300">{error}</p> : null}
      </div>
    </div>
  );
}
