import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Papa from 'papaparse';
import { Download, FileSpreadsheet, Loader2, Upload, X } from 'lucide-react';
import { rosterApi, type ImportResult, type ImportRow, type RosterClass } from '@/lib/rosterApi';

type PreviewRow = ImportRow & { errors: string[] };

const TEMPLATE = `Name,Email,Grade,Board,Language
Aisha Khan,aisha@example.com,Class 9,CBSE,English
Ravi Kumar,ravi@example.com,Class 9,CBSE,Hindi
`;

const HEADER_ALIASES: Record<keyof ImportRow, string[]> = {
  name: ['name', 'student name', 'full name', 'student'],
  email: ['email', 'email address', 'e-mail', 'student email'],
  gradeLevel: ['grade', 'class', 'grade level', 'class/grade', 'standard'],
  board: ['board', 'curriculum', 'curriculum board'],
  preferredLanguage: ['language', 'preferred language'],
};

function columnIndex(headers: string[], key: keyof ImportRow): number {
  const normalized = headers.map((h) => h.trim().toLowerCase());
  return normalized.findIndex((h) => HEADER_ALIASES[key].includes(h));
}

function rowsFromTable(table: unknown[][]): PreviewRow[] {
  const [headerRow, ...body] = table;
  const headers = (headerRow ?? []).map((cell) => String(cell ?? ''));
  const idx = {
    name: columnIndex(headers, 'name'),
    email: columnIndex(headers, 'email'),
    gradeLevel: columnIndex(headers, 'gradeLevel'),
    board: columnIndex(headers, 'board'),
    preferredLanguage: columnIndex(headers, 'preferredLanguage'),
  };
  const cell = (row: unknown[], i: number) => (i >= 0 ? String(row[i] ?? '').trim() : '');
  const seen = new Set<string>();
  return body
    .filter((row) => row.some((value) => String(value ?? '').trim()))
    .map((row) => {
      const email = cell(row, idx.email).toLowerCase();
      const preview: PreviewRow = {
        name: cell(row, idx.name),
        email,
        gradeLevel: cell(row, idx.gradeLevel) || undefined,
        board: cell(row, idx.board) || undefined,
        preferredLanguage: cell(row, idx.preferredLanguage) || undefined,
        errors: [],
      };
      if (idx.name < 0 || idx.email < 0) preview.errors.push('File needs Name and Email columns');
      if (!preview.name) preview.errors.push('Missing name');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) preview.errors.push('Invalid email');
      if (seen.has(email)) preview.errors.push('Duplicate in file');
      seen.add(email);
      return preview;
    });
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportRosterModal({
  classBatch,
  onClose,
  onImported,
}: {
  classBatch: RosterClass;
  onClose: () => void;
  onImported: () => void;
}) {
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sendInvites, setSendInvites] = useState(true);
  const [result, setResult] = useState<ImportResult | null>(null);
  const valid = useMemo(() => preview.filter((r) => r.errors.length === 0), [preview]);

  const parseFile = async (file: File) => {
    setFileError(null);
    setResult(null);
    try {
      if (/\.xlsx$/i.test(file.name)) {
        const { readSheet } = await import('read-excel-file/browser');
        const table = (await readSheet(file)) as unknown[][];
        setPreview(rowsFromTable(table));
        return;
      }
      if (/\.xls$/i.test(file.name)) {
        setFileError('Old .xls files are not supported. Save the sheet as .xlsx or .csv and try again.');
        return;
      }
      Papa.parse<string[]>(file, {
        skipEmptyLines: true,
        complete: (res) => setPreview(rowsFromTable(res.data ?? [])),
        error: () => setFileError('Could not read that file.'),
      });
    } catch {
      setFileError('Could not read that file. Check it is a .csv or .xlsx spreadsheet.');
    }
  };

  const runImport = async () => {
    if (!valid.length) return;
    setBusy(true);
    setFileError(null);
    try {
      const res = await rosterApi.importStudents(
        classBatch.id,
        valid.map(({ errors: _errors, ...row }) => row),
        sendInvites,
      );
      setResult(res);
      setPreview([]);
      onImported();
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  const downloadLogins = () => {
    if (!result) return;
    const lines = ['Name,Email,Temporary password', ...result.created.map((c) => `${c.name},${c.email},${c.tempPassword}`)];
    download(`${classBatch.name.replace(/\W+/g, '-')}-logins.csv`, `${lines.join('\n')}\n`);
  };

  return createPortal(
    <div className="mv-roster fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-slate-800 bg-slate-950 p-6 text-slate-100 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">Import students into {classBatch.name}</h2>
            <p className="mt-1 text-sm text-slate-400">
              Upload a .csv or .xlsx file with Name and Email columns. Grade, Board and Language are optional.
              Students who already have an account are added to the class.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:text-white" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!result ? (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => download('mindvault-student-roster.csv', TEMPLATE)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-cyan-500/50"
              >
                <Download className="h-4 w-4" /> Download template
              </button>
              <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={sendInvites} onChange={(e) => setSendInvites(e.target.checked)} />
                Email each new student their login
              </label>
            </div>

            <label className="mb-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/60 px-4 py-8 text-center hover:border-cyan-500/50">
              <Upload className="mb-2 h-7 w-7 text-cyan-400" />
              <span className="text-sm font-bold text-slate-200">Choose a .csv or .xlsx file</span>
              <input
                type="file"
                accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void parseFile(file);
                  e.target.value = '';
                }}
              />
            </label>

            {preview.length > 0 ? (
              <div className="mb-4 max-h-72 overflow-auto rounded-xl border border-slate-800">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-900 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Grade</th>
                      <th className="px-3 py-2">Board</th>
                      <th className="px-3 py-2">Check</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {preview.map((r, i) => (
                      <tr key={`${r.email}-${i}`} className={r.errors.length ? 'bg-rose-950/40' : ''}>
                        <td className="px-3 py-2 font-semibold">{r.name || '—'}</td>
                        <td className="px-3 py-2">{r.email || '—'}</td>
                        <td className="px-3 py-2">{r.gradeLevel ?? '—'}</td>
                        <td className="px-3 py-2">{r.board ?? '—'}</td>
                        <td className={`px-3 py-2 text-xs font-semibold ${r.errors.length ? 'text-rose-300' : 'text-emerald-300'}`}>
                          {r.errors.join(', ') || 'OK'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        ) : (
          <div className="mb-4 space-y-3">
            <p className="text-sm font-semibold text-emerald-300">
              {result.created.length} new account(s) created, {result.enrolledExisting.length} existing student(s) added
              {result.skipped.length ? `, ${result.skipped.length} skipped` : ''}.
            </p>
            {result.created.length > 0 ? (
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-4 text-sm text-amber-100">
                <p className="font-semibold">
                  Temporary passwords are shown only once. Download them now if emails could not be sent.
                </p>
                <button
                  type="button"
                  onClick={downloadLogins}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-400 px-3 py-2 text-sm font-bold text-slate-950"
                >
                  <Download className="h-4 w-4" /> Download logins (.csv)
                </button>
                <p className="mt-2 text-xs text-amber-200/80">
                  Emails sent: {result.created.filter((c) => c.inviteSent).length} of {result.created.length}
                </p>
              </div>
            ) : null}
            {result.skipped.length > 0 ? (
              <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
                {result.skipped.map((s) => (
                  <li key={s.email}>
                    {s.email}: {s.reason}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}

        {fileError ? <p className="mb-3 text-sm font-semibold text-rose-300">{fileError}</p> : null}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200">
            {result ? 'Done' : 'Cancel'}
          </button>
          {!result ? (
            <button
              type="button"
              disabled={busy || valid.length === 0}
              onClick={() => void runImport()}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-bold text-slate-950 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              Import {valid.length || ''} student{valid.length === 1 ? '' : 's'}
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
