import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { X, UserRound, Shield, Volume2, Cake } from 'lucide-react';

interface DashboardSettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  onOpenAgeSettings?: () => void;
}

export function DashboardSettingsDrawer({
  open,
  onClose,
  onOpenAgeSettings,
}: DashboardSettingsDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        aria-label="Close settings"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-800">Settings</h2>
            <p className="text-xs text-slate-500">Account, parent controls & audio</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
              <UserRound className="h-3.5 w-3.5" /> Account
            </h3>
            <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
              <Link
                to="/parent"
                onClick={onClose}
                className="block rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:border-teal-200"
              >
                Manage children & profile
              </Link>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAgeSettings?.();
                }}
                className="flex w-full items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-left text-sm font-semibold text-slate-700 shadow-sm"
              >
                <Cake className="h-4 w-4 text-teal-600" /> Age & grade settings
              </button>
            </div>
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
              <Shield className="h-3.5 w-3.5" /> Parent controls
            </h3>
            <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <label className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-700">
                Screen time reminders
                <input type="checkbox" defaultChecked className="h-4 w-4 accent-teal-600" />
              </label>
              <label className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-700">
                Require PIN for settings
                <input type="checkbox" className="h-4 w-4 accent-teal-600" />
              </label>
              <label className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-700">
                Weekly progress email
                <input type="checkbox" defaultChecked className="h-4 w-4 accent-teal-600" />
              </label>
            </div>
          </section>

          <section>
            <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
              <Volume2 className="h-3.5 w-3.5" /> Audio
            </h3>
            <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <label className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-700">
                Tutor voice
                <input type="checkbox" defaultChecked className="h-4 w-4 accent-teal-600" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Voice volume
                <input type="range" min={0} max={100} defaultValue={75} className="mt-2 w-full accent-teal-600" />
              </label>
              <label className="flex items-center justify-between gap-3 text-sm font-semibold text-slate-700">
                Sound effects
                <input type="checkbox" defaultChecked className="h-4 w-4 accent-teal-600" />
              </label>
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
