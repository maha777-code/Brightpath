import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, LogOut, RefreshCw, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const ACCENT = '#5B46BA';

export default function ParentPortalDashboard() {
  const { user, logout, planType } = useAuth();
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [students, setStudents] = useState<
    { id: string; email: string; name: string | null; planType: string }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    try {
      const [codeRes, listRes] = await Promise.all([api.parentLinkCode(), api.linkedStudents()]);
      setLinkCode(codeRes.parentLinkCode);
      setStudents(listRes.students);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to load');
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const rotate = async () => {
    setBusy(true);
    try {
      const res = await api.rotateParentLinkCode();
      setLinkCode(res.parentLinkCode);
      setMsg('New link code generated');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!linkCode) return;
    await navigator.clipboard.writeText(linkCode);
    setMsg('Copied link code');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Users className="h-7 w-7" style={{ color: ACCENT }} />
            <div>
              <h1 className="text-lg font-extrabold text-slate-800">Parent Portal</h1>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600"
          >
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-8 sm:px-8">
        <p className="text-sm text-slate-600">
          Plan: <strong>{planType ?? 'parent_free'}</strong>
        </p>
        {msg && <p className="text-sm font-semibold text-indigo-700">{msg}</p>}

        <section className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-extrabold text-slate-800">Child link code</h2>
          <p className="mt-1 text-xs text-slate-500">
            Share this 6-character code so your child can connect their student account at signup.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="rounded-xl bg-slate-100 px-4 py-3 font-mono text-2xl font-extrabold tracking-widest text-slate-800">
              {linkCode ?? '······'}
            </span>
            <button
              type="button"
              onClick={() => void copy()}
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-white"
              style={{ background: ACCENT }}
            >
              <Copy className="h-4 w-4" /> Copy
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void rotate()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600"
            >
              <RefreshCw className="h-4 w-4" /> New code
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-extrabold text-slate-800">Linked students</h2>
          {students.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No linked students yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {students.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm"
                >
                  <span className="font-semibold text-slate-800">{s.name || s.email}</span>
                  <span className="text-xs text-slate-500">{s.planType}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-slate-500">
            View learning progress in the{' '}
            <Link className="font-bold text-indigo-700" to="/student/dashboard">
              study workspace
            </Link>{' '}
            when signed in as the student.
          </p>
        </section>
      </main>
    </div>
  );
}
