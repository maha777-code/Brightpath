import { useMemo, useState } from 'react';
import Papa from 'papaparse';
import { Download, FileSpreadsheet, Loader2, Upload, X } from 'lucide-react';
import { api } from '@/lib/api';

type CsvRow = {
  Name: string;
  Email: string;
  'Class/Grade'?: string;
  Role: string;
};

type PreviewRow = {
  name: string;
  email: string;
  classGrade?: string;
  role: 'student' | 'teacher';
  errors: string[];
};

const TEMPLATE = `Name,Email,Class/Grade,Role
Aisha Khan,aisha@school.edu,Class 9 Science,student
Ravi Kumar,ravi@school.edu,Class 9 Science,teacher
`;

export function BulkCsvImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const errorCount = useMemo(() => preview.filter((r) => r.errors.length).length, [preview]);

  if (!open) return null;

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'brightpath-bulk-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const parseFile = (file: File) => {
    setResult(null);
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rows: PreviewRow[] = (res.data ?? []).map((raw) => {
          const name = String(raw.Name ?? '').trim();
          const email = String(raw.Email ?? '').trim().toLowerCase();
          const classGrade = String(raw['Class/Grade'] ?? '').trim() || undefined;
          const roleRaw = String(raw.Role ?? '').trim().toLowerCase();
          const role = roleRaw === 'teacher' ? 'teacher' : roleRaw === 'student' ? 'student' : null;
          const errors: string[] = [];
          if (!name) errors.push('Missing name');
          if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Invalid email');
          if (!role) errors.push('Role must be student or teacher');
          return {
            name,
            email,
            classGrade,
            role: (role ?? 'student') as 'student' | 'teacher',
            errors,
          };
        });
        const seen = new Set<string>();
        for (const r of rows) {
          if (seen.has(r.email)) r.errors.push('Duplicate email in file');
          seen.add(r.email);
        }
        setPreview(rows);
      },
    });
  };

  const importRows = async () => {
    const valid = preview.filter((r) => r.errors.length === 0);
    if (!valid.length) return;
    setBusy(true);
    setResult(null);
    try {
      const res = await api.bulkImportUsers({
        rows: valid.map((r) => ({
          name: r.name,
          email: r.email,
          classGrade: r.classGrade,
          role: r.role,
        })),
        sendInvites: true,
      });
      setResult(
        `Imported ${res.createdCount} user(s). Skipped ${res.skippedCount}. Welcome emails sent when SMTP is configured.`,
      );
      setPreview([]);
    } catch (e) {
      setResult(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-3xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-800">Bulk CSV import</h2>
            <p className="text-sm text-slate-500">Import students and teachers into your organization.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700"
          >
            <Download className="h-4 w-4" /> Download template
          </button>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) parseFile(file);
          }}
          className={[
            'mb-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-8',
            dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-slate-50',
          ].join(' ')}
          onClick={() => document.getElementById('bulk-csv-input')?.click()}
        >
          <Upload className="mb-2 h-7 w-7 text-indigo-600" />
          <p className="text-sm font-bold text-slate-700">Drop CSV here or click to browse</p>
          <input
            id="bulk-csv-input"
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) parseFile(file);
              e.target.value = '';
            }}
          />
        </div>

        {preview.length > 0 && (
          <div className="mb-4 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Class</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Validation</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((r) => (
                  <tr key={`${r.email}-${r.name}`} className={r.errors.length ? 'bg-rose-50' : ''}>
                    <td className="px-3 py-2 font-semibold">{r.name}</td>
                    <td className="px-3 py-2">{r.email}</td>
                    <td className="px-3 py-2">{r.classGrade ?? '—'}</td>
                    <td className="px-3 py-2">{r.role}</td>
                    <td className="px-3 py-2 text-xs font-semibold text-rose-600">
                      {r.errors.length ? r.errors.join(', ') : 'OK'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {result && <p className="mb-3 text-sm font-semibold text-indigo-700">{result}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border px-4 py-2 text-sm font-bold">
            Close
          </button>
          <button
            type="button"
            disabled={busy || !preview.length || errorCount === preview.length}
            onClick={() => void importRows()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#5B46BA] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            Import {preview.filter((r) => !r.errors.length).length || ''} valid rows
          </button>
        </div>
      </div>
    </div>
  );
}
