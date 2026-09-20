import { useEffect, useState } from 'react';
import { PolicyLayout } from '@/components/PolicyLayout';

const STORAGE_KEY = 'mindvault-cookie-prefs';

type CookiePrefs = {
  analytics: boolean;
  marketing: boolean;
};

function readPrefs(): CookiePrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { analytics: true, marketing: false };
    const parsed = JSON.parse(raw) as Partial<CookiePrefs>;
    return {
      analytics: parsed.analytics !== false,
      marketing: parsed.marketing === true,
    };
  } catch {
    return { analytics: true, marketing: false };
  }
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-8 w-14 rounded-full border transition-colors ${
        checked ? 'border-cyan-400 bg-cyan-500' : 'border-slate-700 bg-slate-800'
      }`}
    >
      <span
        className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-transform ${
          checked ? 'left-7' : 'left-1'
        }`}
      />
    </button>
  );
}

export default function CookiePreferences() {
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const prefs = readPrefs();
    setAnalytics(prefs.analytics);
    setMarketing(prefs.marketing);
  }, []);

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ analytics, marketing }));
    setSaved(true);
  };

  return (
    <PolicyLayout lastUpdated="September 2026" title="Cookie Preferences">
      <p>
        Manage how MindVault uses cookies on this device. Essential cookies stay on so you can sign in
        and move through the app. Analytics and marketing choices are stored in this browser only.
      </p>
      <div className="space-y-6 pt-2">
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <div>
            <h3 className="text-lg font-bold text-white">Essential Cookies</h3>
            <p className="text-base text-slate-400">Required for authentication and core navigation.</p>
          </div>
          <span className="shrink-0 rounded-full border border-cyan-500/30 bg-cyan-950/60 px-3 py-1 text-sm font-bold text-cyan-400">
            Always Active
          </span>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <div>
            <h3 className="text-lg font-bold text-white">Analytics Cookies</h3>
            <p className="text-base text-slate-400">Helps us analyze platform performance and improve features.</p>
          </div>
          <Toggle checked={analytics} label="Analytics cookies" onChange={setAnalytics} />
        </div>

        <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
          <div>
            <h3 className="text-lg font-bold text-white">Marketing Cookies</h3>
            <p className="text-base text-slate-400">Used for measuring update relevance.</p>
          </div>
          <Toggle checked={marketing} label="Marketing cookies" onChange={setMarketing} />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={save}
            className="rounded-xl bg-cyan-500 px-6 py-3 text-lg font-bold text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all hover:bg-cyan-400"
          >
            Save Preferences
          </button>
          {saved ? (
            <p className="text-base font-semibold text-cyan-300" role="status">
              Preferences saved on this device.
            </p>
          ) : null}
        </div>
      </div>
    </PolicyLayout>
  );
}
