import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { OrganizationPublic } from '@brightpath/shared';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export default function BrandingSettingsPage() {
  const { organization, refresh } = useAuth();
  const [org, setOrg] = useState<OrganizationPublic | null>(organization);
  const [primaryColor, setPrimaryColor] = useState(organization?.primaryColor ?? '#5B46BA');
  const [primaryHoverColor, setPrimaryHoverColor] = useState(
    organization?.primaryHoverColor ?? '#4A3799',
  );
  const [accentColor, setAccentColor] = useState(organization?.accentColor ?? '#0D9488');
  const [name, setName] = useState(organization?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api
      .getBranding()
      .then((r) => {
        setOrg(r.organization);
        setPrimaryColor(r.organization.primaryColor ?? '#5B46BA');
        setPrimaryHoverColor(r.organization.primaryHoverColor ?? '#4A3799');
        setAccentColor(r.organization.accentColor ?? '#0D9488');
        setName(r.organization.name);
      })
      .catch(() => undefined);
  }, []);

  const save = async () => {
    setBusy(true);
    setMsg('');
    try {
      const res = await api.updateBranding({ name, primaryColor, primaryHoverColor, accentColor });
      setOrg(res.organization);
      await refresh();
      setMsg('Branding saved — theme variables applied across the app.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const uploadLogo = async (file: File) => {
    setBusy(true);
    setMsg('');
    try {
      const res = await api.uploadOrgLogo(file);
      setOrg(res.organization);
      await refresh();
      setMsg('Logo uploaded.');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const logoSrc = org?.logoUrl
    ? org.logoUrl.startsWith('http')
      ? org.logoUrl
      : `${API_BASE.replace(/\/api$/, '')}${org.logoUrl.startsWith('/') ? '' : '/'}${org.logoUrl.replace(/^\/api/, '')}`
    : null;

  // Prefer proxied uploads path
  const displayLogo = org?.logoUrl
    ? org.logoUrl.startsWith('/uploads')
      ? `/api${org.logoUrl}`
      : logoSrc
    : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white px-4 py-4 sm:px-8">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link to="/admin/school-dashboard" className="rounded-lg p-2 hover:bg-slate-100">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-extrabold text-slate-800">Branding & theme</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-8 sm:px-8">
        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-extrabold text-slate-800">School logo</h2>
          <div className="mt-3 flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border bg-slate-50">
              {displayLogo ? (
                <img src={displayLogo} alt="Logo" className="h-full w-full object-contain" />
              ) : (
                <Upload className="h-6 w-6 text-slate-400" />
              )}
            </div>
            <label className="cursor-pointer rounded-xl bg-[#5B46BA] px-3 py-2 text-sm font-bold text-white">
              Upload PNG/SVG
              <input
                type="file"
                accept="image/png,image/svg+xml,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadLogo(f);
                }}
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-extrabold text-slate-800">Colors</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-slate-500">
              Organization name
              <input
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-semibold"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="text-xs font-bold text-slate-500">
              Primary
              <input
                type="color"
                className="mt-1 h-10 w-full cursor-pointer rounded-xl border"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
              />
            </label>
            <label className="text-xs font-bold text-slate-500">
              Primary hover
              <input
                type="color"
                className="mt-1 h-10 w-full cursor-pointer rounded-xl border"
                value={primaryHoverColor}
                onChange={(e) => setPrimaryHoverColor(e.target.value)}
              />
            </label>
            <label className="text-xs font-bold text-slate-500">
              Accent / sidebar
              <input
                type="color"
                className="mt-1 h-10 w-full cursor-pointer rounded-xl border"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
              />
            </label>
          </div>
          <div
            className="mt-4 rounded-xl p-4 text-white"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}
          >
            Live preview — headers and CTAs use these tokens via CSS variables.
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white"
            style={{ background: primaryColor }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save branding
          </button>
        </section>

        {msg && <p className="text-sm font-semibold text-indigo-700">{msg}</p>}
      </main>
    </div>
  );
}
