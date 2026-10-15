import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, X } from 'lucide-react';
import { rosterApi, type RosterStudent, type StudentProfile } from '@/lib/rosterApi';

const BOARDS = ['CBSE', 'ICSE', 'State Board', 'IB', 'Cambridge (IGCSE)', 'Other'];
const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Marathi', 'Bengali', 'Gujarati'];
const ACCOMMODATIONS = [
  { id: 'iep', label: 'IEP' },
  { id: '504', label: '504 plan' },
  { id: 'dyslexia', label: 'Dyslexia support' },
  { id: 'adhd', label: 'ADHD support' },
  { id: 'extra_time', label: 'Extra time' },
  { id: 'read_aloud', label: 'Read aloud' },
  { id: 'ell', label: 'Language learner' },
];
const PREFERENCES = [
  { id: 'visual', label: 'Visual' },
  { id: 'step_by_step', label: 'Step by step' },
  { id: 'examples_first', label: 'Examples first' },
  { id: 'short_answers', label: 'Short answers' },
  { id: 'practice_heavy', label: 'Lots of practice' },
];

const field = 'w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100';

function toggle(list: string[], id: string) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function StudentProfileModal({
  student,
  onClose,
  onSaved,
}: {
  student: RosterStudent;
  onClose: () => void;
  onSaved: (profile: StudentProfile) => void;
}) {
  const [profile, setProfile] = useState<StudentProfile>(student.profile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = <K extends keyof StudentProfile>(key: K, value: StudentProfile[K]) => setProfile((p) => ({ ...p, [key]: value }));

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await rosterApi.updateProfile(student.id, profile);
      onSaved(res.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-xs font-semibold ${active ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200' : 'border-slate-700 text-slate-300'}`;

  return createPortal(
    <div className="mv-roster fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-xl overflow-auto rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-100 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{student.name || student.email}</h2>
            <p className="text-sm text-slate-400">{student.email}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-white" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-xs text-slate-400">
          Sharada uses this profile to pitch explanations at the right level and in the right language. Only teachers and
          admins of this student's classes can see it.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-300">
            Grade / class
            <input className={`${field} mt-1`} value={profile.gradeLevel ?? ''} onChange={(e) => set('gradeLevel', e.target.value || null)} placeholder="Class 8" />
          </label>
          <label className="text-sm font-semibold text-slate-300">
            Board
            <select className={`${field} mt-1`} value={profile.board ?? ''} onChange={(e) => set('board', e.target.value || null)}>
              <option value="">Not set</option>
              {BOARDS.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-300">
            Preferred language
            <select className={`${field} mt-1`} value={profile.preferredLanguage ?? ''} onChange={(e) => set('preferredLanguage', e.target.value || null)}>
              <option value="">Not set</option>
              {LANGUAGES.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-300">
            Reading level
            <select
              className={`${field} mt-1`}
              value={profile.readingLevel ?? ''}
              onChange={(e) => set('readingLevel', (e.target.value || null) as StudentProfile['readingLevel'])}
            >
              <option value="">Not set</option>
              <option value="below_grade">Below grade level</option>
              <option value="at_grade">At grade level</option>
              <option value="above_grade">Above grade level</option>
            </select>
          </label>
        </div>

        <p className="mt-4 text-sm font-semibold text-slate-300">Accommodations</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {ACCOMMODATIONS.map((a) => (
            <button key={a.id} type="button" className={chip(profile.accommodations.includes(a.id))} onClick={() => set('accommodations', toggle(profile.accommodations, a.id))}>
              {a.label}
            </button>
          ))}
        </div>

        <p className="mt-4 text-sm font-semibold text-slate-300">Learning preferences</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PREFERENCES.map((p) => (
            <button key={p.id} type="button" className={chip(profile.learningPreferences.includes(p.id))} onClick={() => set('learningPreferences', toggle(profile.learningPreferences, p.id))}>
              {p.label}
            </button>
          ))}
        </div>

        <label className="mt-4 block text-sm font-semibold text-slate-300">
          Notes for teachers
          <textarea className={`${field} mt-1 min-h-[80px]`} maxLength={2000} value={profile.notes} onChange={(e) => set('notes', e.target.value)} />
        </label>

        {error ? <p className="mt-3 text-sm font-semibold text-rose-300">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold">
            Cancel
          </button>
          <button type="button" disabled={saving} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save profile
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
