import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, LogOut, Users, Layers } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

const ACCENT = '#5B46BA';

export default function SchoolDashboard() {
  const { user, organization, logout, planType } = useAuth();
  const [stats, setStats] = useState<{ memberCount: number; batchCount: number; maxLicenses: number } | null>(
    null,
  );
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .orgMe()
      .then((r) => setStats(r.stats))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Building2 className="h-7 w-7" style={{ color: ACCENT }} />
            <div>
              <h1 className="text-lg font-extrabold text-slate-800">School Dashboard</h1>
              <p className="text-xs text-slate-500">{organization?.name ?? 'Your institution'}</p>
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
          Welcome{user?.name ? `, ${user.name}` : ''} · Plan:{' '}
          <strong>{planType ?? organization?.planType ?? 'school_enterprise'}</strong>
        </p>
        {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
            <Users className="mb-2 h-5 w-5 text-indigo-600" />
            <p className="text-2xl font-extrabold text-slate-800">{stats?.memberCount ?? '—'}</p>
            <p className="text-xs font-semibold text-slate-500">Members</p>
          </div>
          <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
            <Layers className="mb-2 h-5 w-5 text-indigo-600" />
            <p className="text-2xl font-extrabold text-slate-800">{stats?.batchCount ?? '—'}</p>
            <p className="text-xs font-semibold text-slate-500">Classes / batches</p>
          </div>
          <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
            <Building2 className="mb-2 h-5 w-5 text-indigo-600" />
            <p className="text-2xl font-extrabold text-slate-800">{stats?.maxLicenses ?? '—'}</p>
            <p className="text-xs font-semibold text-slate-500">License seats</p>
          </div>
        </div>

        <section className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40 p-5">
          <h2 className="text-sm font-extrabold text-slate-800">Enterprise capabilities</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>Bulk student CSV import (coming soon)</li>
            <li>Custom branding / logo</li>
            <li>School-wide analytics & shared RAG library</li>
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Teachers on your roster use{' '}
            <Link className="font-bold text-indigo-700" to="/teacher/dashboard">
              Teacher Dashboard
            </Link>{' '}
            after invite.
          </p>
        </section>
      </main>
    </div>
  );
}
