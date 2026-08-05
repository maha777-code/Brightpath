import { useState } from 'react';
import {
  AGE_GROUPS,
  AGE_GROUP_LABELS,
  type AgeGroup,
  type CurriculumUpgradeEvent,
} from '@brightpath/shared';
import { X } from 'lucide-react';
import { BirthDatePicker } from './BirthDatePicker';
import { api } from '@/lib/api';

interface AgeSettingsModalProps {
  open: boolean;
  currentDob: string | null;
  currentGroup: AgeGroup | null;
  onClose: () => void;
  onSaved: (parent: Awaited<ReturnType<typeof api.updateAgeSettings>>['parent'], curriculum: CurriculumUpgradeEvent) => void;
}

export function AgeSettingsModal({
  open,
  currentDob,
  currentGroup,
  onClose,
  onSaved,
}: AgeSettingsModalProps) {
  const [dob, setDob] = useState(currentDob ?? '');
  const [group, setGroup] = useState<AgeGroup | ''>(currentGroup ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!dob && !group) {
      setError('Pick a birthdate or an age group.');
      return;
    }
    setBusy(true);
    try {
      const result = await api.updateAgeSettings({
        ...(dob ? { dateOfBirth: dob } : {}),
        ...(group ? { ageGroup: group } : {}),
      });
      onSaved(result.parent, result.curriculum);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update age settings');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-3xl border border-white/70 bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-xl font-extrabold text-slate-800">Age & Grade Settings</h2>
        <p className="mt-1 text-sm text-slate-500">
          Update age or date of birth to refresh the curriculum. Prior progress and streaks are kept.
        </p>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <BirthDatePicker
            value={dob}
            onChange={setDob}
            required={false}
            helperText="Optional if you choose a target age group manually."
          />

          <div className="form-group">
            <label className="form-label" htmlFor="age-group">
              Target age group (optional override)
            </label>
            <select
              id="age-group"
              className="form-input"
              value={group}
              onChange={(e) => setGroup(e.target.value as AgeGroup | '')}
            >
              <option value="">Derive from birthdate</option>
              {AGE_GROUPS.map((g) => (
                <option key={g} value={g}>
                  {AGE_GROUP_LABELS[g]}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-teal-700 px-4 py-3 text-sm font-bold text-white shadow-md disabled:opacity-60"
          >
            {busy ? 'Updating…' : 'Apply & Refresh Curriculum'}
          </button>
        </form>
      </div>
    </div>
  );
}
