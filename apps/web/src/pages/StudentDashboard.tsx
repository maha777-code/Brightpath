import { useState } from 'react';
import { Link } from 'react-router-dom';
import Dashboard from '@/pages/Dashboard';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

/** Student home: join-class strip + existing learning dashboard. */
export default function StudentDashboard() {
  const { planType } = useAuth();
  const [classCode, setClassCode] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classCode.trim()) return;
    setBusy(true);
    setMsg('');
    try {
      const res = await api.joinClass(classCode.trim());
      setMsg(`Joined ${res.classBatch.name} (${res.classBatch.inviteCode})`);
      setClassCode('');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Could not join class');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="border-b border-indigo-100 bg-indigo-50/60 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-extrabold text-slate-800">Student workspace</p>
            <p className="text-xs text-slate-500">
              Plan: <strong>{planType ?? 'student_free'}</strong>
              {planType === 'student_free' ? ' · Limited AI doubts/day — upgrade for unlimited' : ''}
            </p>
          </div>
          <form onSubmit={join} className="flex flex-wrap items-center gap-2">
            <input
              value={classCode}
              onChange={(e) => setClassCode(e.target.value.toUpperCase())}
              placeholder="Class code"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-[#5B46BA] px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
            >
              Join class
            </button>
            <Link to="/dashboard/ai-tutor" className="text-sm font-bold text-indigo-700">
              AI Tutor →
            </Link>
          </form>
        </div>
        {msg && <p className="mx-auto mt-2 max-w-6xl text-xs font-semibold text-indigo-700">{msg}</p>}
      </div>
      <Dashboard />
    </div>
  );
}
