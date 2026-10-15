import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  Loader2,
  MessageSquareText,
  Pencil,
  Plus,
  QrCode,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ImportRosterModal } from '@/components/roster/ImportRosterModal';
import { JoinCodeModal } from '@/components/roster/JoinCodeModal';
import { StudentProfileModal } from '@/components/roster/StudentProfileModal';
import {
  rosterApi,
  type ClassInput,
  type ImportResult,
  type OrgUnit,
  type RosterClass,
  type RosterOverview,
  type RosterStudent,
} from '@/lib/rosterApi';

const field = 'w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100';
const ghostBtn =
  'inline-flex items-center gap-1.5 rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-cyan-500/50';

const errorText = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);

const UNIT_KIND_LABEL: Record<OrgUnit['kind'], string> = { grade: 'Grade', department: 'Department', course: 'Course' };

function ClassForm({
  overview,
  initial,
  onCancel,
  onSubmit,
}: {
  overview: RosterOverview;
  initial?: RosterClass;
  onCancel: () => void;
  onSubmit: (input: ClassInput) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [subject, setSubject] = useState(initial?.subject ?? '');
  const [gradeLevel, setGradeLevel] = useState(initial?.gradeLevel ?? '');
  const [orgUnitId, setOrgUnitId] = useState(initial?.orgUnitId ?? '');
  const [teacherId, setTeacherId] = useState(initial?.teacher.id ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isAcademy = overview.organization?.type === 'tutor_center';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      setError('Give the class a name.');
      return;
    }
    if (overview.canManageOrg && !teacherId) {
      setError(`Choose the ${isAcademy ? 'tutor' : 'teacher'} for this class.`);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onSubmit({
        name: name.trim(),
        subject: subject.trim() || null,
        gradeLevel: gradeLevel.trim() || null,
        orgUnitId: orgUnitId || null,
        ...(overview.canManageOrg ? { teacherId } : {}),
      });
    } catch (err) {
      setError(errorText(err, 'Could not save the class'));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-cyan-500/30 bg-slate-900/80 p-4">
      <p className="text-sm font-bold text-white">{initial ? 'Edit class' : isAcademy ? 'New batch' : 'New class'}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input className={field} placeholder={isAcademy ? 'Batch name, e.g. JEE Physics A' : 'Class name, e.g. 9B Science'} value={name} onChange={(e) => setName(e.target.value)} />
        <input className={field} placeholder="Subject (optional)" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <input className={field} placeholder="Grade (optional), e.g. Class 9" value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} />
        {overview.units.length ? (
          <select className={field} value={orgUnitId} onChange={(e) => setOrgUnitId(e.target.value)}>
            <option value="">No {isAcademy ? 'course' : 'grade or department'}</option>
            {overview.units.map((u) => (
              <option key={u.id} value={u.id}>
                {UNIT_KIND_LABEL[u.kind]}: {u.name}
              </option>
            ))}
          </select>
        ) : null}
        {overview.canManageOrg ? (
          <select className={field} value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
            <option value="">Choose {isAcademy ? 'tutor' : 'teacher'}</option>
            {overview.teachers.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name || t.email}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      {overview.canManageOrg && overview.teachers.length === 0 ? (
        <p className="text-xs text-amber-200">Invite teachers or tutors to your organization first, then assign them to classes.</p>
      ) : null}
      {error ? <p className="text-sm font-semibold text-rose-300">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <button type="button" className={ghostBtn} onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {initial ? 'Save' : 'Create'}
        </button>
      </div>
    </form>
  );
}

function StructurePanel({ overview, onChange }: { overview: RosterOverview; onChange: () => void }) {
  const isAcademy = overview.organization?.type === 'tutor_center';
  const [name, setName] = useState('');
  const [kind, setKind] = useState<OrgUnit['kind']>(isAcademy ? 'course' : 'grade');
  const [error, setError] = useState('');

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setError('');
    try {
      await rosterApi.createUnit({ name: name.trim(), kind });
      setName('');
      onChange();
    } catch (err) {
      setError(errorText(err, 'Could not add'));
    }
  };

  const remove = async (unit: OrgUnit) => {
    if (!window.confirm(`Remove "${unit.name}"? Classes in it stay, they just lose this label.`)) return;
    try {
      await rosterApi.deleteUnit(unit.id);
      onChange();
    } catch (err) {
      setError(errorText(err, 'Could not remove'));
    }
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <h2 className="flex items-center gap-2 text-lg font-bold text-white">
        <Layers className="h-5 w-5 text-cyan-400" /> {isAcademy ? 'Courses' : 'Grades & departments'}
      </h2>
      <p className="mt-1 text-sm text-slate-400">
        {isAcademy
          ? 'Group batches under courses such as "JEE 2027" or "Class 10 Maths".'
          : 'Group classes under grades (Class 6, Class 7) or departments (Science, Languages).'}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {overview.units.length === 0 ? <span className="text-sm text-slate-500">Nothing added yet.</span> : null}
        {overview.units.map((u) => (
          <span key={u.id} className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-sm text-slate-200">
            <span className="text-xs text-slate-500">{UNIT_KIND_LABEL[u.kind]}</span> {u.name}
            <button type="button" onClick={() => void remove(u)} className="text-slate-500 hover:text-rose-300" aria-label={`Remove ${u.name}`}>
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
        ))}
      </div>
      <form onSubmit={add} className="mt-3 flex flex-wrap gap-2">
        {!isAcademy ? (
          <select className={`${field} w-auto`} value={kind} onChange={(e) => setKind(e.target.value as OrgUnit['kind'])}>
            <option value="grade">Grade</option>
            <option value="department">Department</option>
          </select>
        ) : null}
        <input className={`${field} max-w-xs`} placeholder={isAcademy ? 'Course name' : 'e.g. Class 9'} value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className={ghostBtn}>
          <Plus className="h-4 w-4" /> Add
        </button>
      </form>
      {error ? <p className="mt-2 text-sm font-semibold text-rose-300">{error}</p> : null}
    </section>
  );
}

function AddStudentForm({ classBatch, onAdded }: { classBatch: RosterClass; onAdded: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter the student name and a valid email.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await rosterApi.importStudents(classBatch.id, [{ name: name.trim(), email: email.trim().toLowerCase() }], true);
      setResult(res);
      setName('');
      setEmail('');
      onAdded();
    } catch (err) {
      setError(errorText(err, 'Could not add the student'));
    } finally {
      setBusy(false);
    }
  };

  const created = result?.created[0];
  return (
    <div className="space-y-2">
      <form onSubmit={submit} className="flex flex-wrap gap-2">
        <input className={`${field} max-w-[200px]`} placeholder="Student name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={`${field} max-w-[240px]`} placeholder="Student email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button type="submit" disabled={busy} className={ghostBtn}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Add student
        </button>
      </form>
      {error ? <p className="text-sm font-semibold text-rose-300">{error}</p> : null}
      {created ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-sm text-amber-100">
          Account created for {created.email}. Temporary password (shown once): <span className="font-mono font-bold">{created.tempPassword}</span>
          {created.inviteSent ? ' · Login email sent.' : ' · Email could not be sent, share it with the student directly.'}
        </p>
      ) : null}
      {result?.enrolledExisting[0] ? (
        <p className="text-sm text-emerald-300">{result.enrolledExisting[0].email} already had an account and was added to this class.</p>
      ) : null}
      {result?.skipped[0] ? (
        <p className="text-sm text-amber-200">
          {result.skipped[0].email}: {result.skipped[0].reason}
        </p>
      ) : null}
    </div>
  );
}

function ClassDetail({
  overview,
  classBatch,
  onChanged,
  onDeleted,
}: {
  overview: RosterOverview;
  classBatch: RosterClass;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [students, setStudents] = useState<RosterStudent[] | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [importing, setImporting] = useState(false);
  const [profileFor, setProfileFor] = useState<RosterStudent | null>(null);
  const unit = overview.units.find((u) => u.id === classBatch.orgUnitId);

  const load = useCallback(() => {
    rosterApi
      .classStudents(classBatch.id)
      .then((r) => setStudents(r.students))
      .catch((err) => setError(errorText(err, 'Could not load students')));
  }, [classBatch.id]);

  useEffect(() => {
    setStudents(null);
    setError('');
    setEditing(false);
    load();
  }, [load]);

  const refresh = () => {
    load();
    onChanged();
  };

  const remove = async (s: RosterStudent) => {
    if (!window.confirm(`Remove ${s.name || s.email} from ${classBatch.name}? Their account is kept.`)) return;
    try {
      await rosterApi.removeStudent(classBatch.id, s.id);
      refresh();
    } catch (err) {
      setError(errorText(err, 'Could not remove'));
    }
  };

  const deleteClass = async () => {
    if (!window.confirm(`Delete ${classBatch.name}? Students keep their accounts but leave this class.`)) return;
    try {
      await rosterApi.deleteClass(classBatch.id);
      onDeleted();
    } catch (err) {
      setError(errorText(err, 'Could not delete'));
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      {editing ? (
        <ClassForm
          overview={overview}
          initial={classBatch}
          onCancel={() => setEditing(false)}
          onSubmit={async (input) => {
            await rosterApi.updateClass(classBatch.id, input);
            setEditing(false);
            onChanged();
          }}
        />
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">{classBatch.name}</h2>
            <p className="mt-1 text-sm text-slate-400">
              {[classBatch.subject, classBatch.gradeLevel, unit?.name].filter(Boolean).join(' · ') || 'No subject or grade set'}
              {overview.canManageOrg ? ` · ${classBatch.teacher.name || classBatch.teacher.email}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCode(true)}
            className="flex items-center gap-3 rounded-2xl border border-cyan-500/40 bg-cyan-950/30 px-4 py-2 text-left"
            title="Show join code, link and QR"
          >
            <QrCode className="h-6 w-6 text-cyan-300" />
            <span>
              <span className="block text-xs font-semibold uppercase text-cyan-300">Join code</span>
              <span className="font-mono text-xl font-black tracking-[0.2em] text-white">{classBatch.inviteCode}</span>
            </span>
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button type="button" className={ghostBtn} onClick={() => setImporting(true)}>
          <FileSpreadsheet className="h-4 w-4" /> Import CSV / Excel
        </button>
        <Link to={`/sharada-oversight?classId=${classBatch.id}`} className={`${ghostBtn} no-underline`}>
          <MessageSquareText className="h-4 w-4" /> Sharada conversations
        </Link>
        {!editing ? (
          <button type="button" className={ghostBtn} onClick={() => setEditing(true)}>
            <Pencil className="h-4 w-4" /> Edit
          </button>
        ) : null}
        <button type="button" className={`${ghostBtn} text-rose-300`} onClick={() => void deleteClass()}>
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      </div>

      <AddStudentForm classBatch={classBatch} onAdded={refresh} />

      {error ? <p className="text-sm font-semibold text-rose-300">{error}</p> : null}

      {students === null ? (
        <p className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading students…
        </p>
      ) : students.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-400">
          No students yet. Share the join code, import a spreadsheet, or add students one by one.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-slate-950 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-3 py-2">Student</th>
                <th className="px-3 py-2">Grade · board · language</th>
                <th className="px-3 py-2">Support</th>
                <th className="px-3 py-2">Last Sharada chat</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {students.map((s) => (
                <tr key={s.id}>
                  <td className="px-3 py-2">
                    <p className="font-semibold text-slate-100">{s.name || '—'}</p>
                    <p className="text-xs text-slate-500">{s.email}</p>
                  </td>
                  <td className="px-3 py-2 text-slate-300">
                    {[s.profile.gradeLevel, s.profile.board, s.profile.preferredLanguage].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {s.profile.accommodations.map((a) => (
                        <span key={a} className="rounded-full bg-purple-500/15 px-2 py-0.5 text-xs font-semibold uppercase text-purple-200">
                          {a.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {s.openAlerts > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2 py-0.5 text-xs font-bold text-rose-200">
                          <AlertTriangle className="h-3 w-3" /> {s.openAlerts} alert{s.openAlerts > 1 ? 's' : ''}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-400">
                    {s.lastSharadaAt ? new Date(s.lastSharadaAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'Never'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <button type="button" className="rounded-lg px-2 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/10" onClick={() => setProfileFor(s)}>
                        Profile
                      </button>
                      <Link
                        to={`/sharada-oversight?studentId=${s.id}`}
                        className="rounded-lg px-2 py-1 text-xs font-semibold text-cyan-300 no-underline hover:bg-cyan-500/10"
                      >
                        Chats
                      </Link>
                      <button type="button" className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/10" onClick={() => void remove(s)}>
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCode ? (
        <JoinCodeModal
          classBatch={classBatch}
          onClose={() => setShowCode(false)}
          onRotate={async () => {
            await rosterApi.rotateCode(classBatch.id);
            onChanged();
          }}
        />
      ) : null}
      {importing ? <ImportRosterModal classBatch={classBatch} onClose={() => setImporting(false)} onImported={refresh} /> : null}
      {profileFor ? (
        <StudentProfileModal
          student={profileFor}
          onClose={() => setProfileFor(null)}
          onSaved={(profile) => {
            setStudents((list) => list?.map((s) => (s.id === profileFor.id ? { ...s, profile } : s)) ?? null);
            setProfileFor(null);
          }}
        />
      ) : null}
    </section>
  );
}

export default function ClassesRoster() {
  const [overview, setOverview] = useState<RosterOverview | null>(null);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [unitFilter, setUnitFilter] = useState('');

  const load = useCallback(() => {
    rosterApi
      .overview()
      .then((data) => {
        setOverview(data);
        setSelectedId((current) => (current && data.classes.some((c) => c.id === current) ? current : data.classes[0]?.id ?? null));
      })
      .catch((err) => setError(errorText(err, 'Could not load classes')));
  }, []);

  useEffect(load, [load]);

  const visibleClasses = useMemo(
    () => (overview?.classes ?? []).filter((c) => !unitFilter || c.orgUnitId === unitFilter),
    [overview, unitFilter],
  );
  const selected = overview?.classes.find((c) => c.id === selectedId) ?? null;
  const isAcademy = overview?.organization?.type === 'tutor_center';
  const totalStudents = overview?.classes.reduce((n, c) => n + c.studentCount, 0) ?? 0;

  return (
    <DashboardLayout>
      <div className="mv-roster h-full overflow-y-auto px-4 py-6 md:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">{overview?.organization?.name ?? 'My classes'}</p>
              <h1 className="mt-1 flex items-center gap-2 text-3xl font-bold text-white">
                <Users className="h-7 w-7 text-cyan-400" /> {isAcademy ? 'Batches & Students' : 'Classes & Students'}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                {overview
                  ? `${overview.classes.length} ${isAcademy ? 'batch' : 'class'}${overview.classes.length === 1 ? '' : 'es'} · ${totalStudents} enrolment${totalStudents === 1 ? '' : 's'}`
                  : 'Loading…'}
                {overview?.organization && overview.canManageOrg && overview.organization.seatsUsed !== null
                  ? ` · ${overview.organization.seatsUsed} of ${overview.organization.maxLicenses} seats used`
                  : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCreating(true)}
              disabled={!overview}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> {isAcademy ? 'New batch' : 'New class'}
            </button>
          </header>

          {error ? <p className="text-sm font-semibold text-rose-300">{error}</p> : null}

          {overview?.canManageOrg ? <StructurePanel overview={overview} onChange={load} /> : null}

          {creating && overview ? (
            <ClassForm
              overview={overview}
              onCancel={() => setCreating(false)}
              onSubmit={async (input) => {
                const res = await rosterApi.createClass(input);
                setCreating(false);
                setSelectedId(res.classBatch.id);
                load();
              }}
            />
          ) : null}

          {overview && overview.classes.length === 0 && !creating ? (
            <div className="rounded-2xl border border-dashed border-slate-700 px-6 py-12 text-center">
              <p className="text-lg font-bold text-white">No {isAcademy ? 'batches' : 'classes'} yet</p>
              <p className="mt-1 text-sm text-slate-400">
                Create one to get a 6-character join code, a link and a QR code students can scan.
              </p>
            </div>
          ) : null}

          {overview && overview.classes.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
              <aside className="space-y-2">
                {overview.units.length ? (
                  <select className={field} value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)} aria-label="Filter classes">
                    <option value="">All {isAcademy ? 'courses' : 'grades & departments'}</option>
                    {overview.units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                ) : null}
                {visibleClasses.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full rounded-2xl border p-3 text-left transition ${
                      c.id === selectedId ? 'border-cyan-400 bg-cyan-950/40' : 'border-slate-800 bg-slate-900/70 hover:border-slate-600'
                    }`}
                  >
                    <p className="font-bold text-slate-100">{c.name}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {[c.subject, c.gradeLevel].filter(Boolean).join(' · ') || 'General'} · {c.studentCount} student{c.studentCount === 1 ? '' : 's'}
                    </p>
                    {overview.canManageOrg ? <p className="mt-0.5 truncate text-xs text-slate-500">{c.teacher.name || c.teacher.email}</p> : null}
                  </button>
                ))}
                {visibleClasses.length === 0 ? <p className="px-1 text-sm text-slate-500">No classes in this group.</p> : null}
              </aside>
              {selected ? (
                <ClassDetail
                  key={selected.id}
                  overview={overview}
                  classBatch={selected}
                  onChanged={load}
                  onDeleted={() => {
                    setSelectedId(null);
                    load();
                  }}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </DashboardLayout>
  );
}
