import { useMemo } from 'react';

interface BirthDatePickerProps {
  value: string;
  onChange: (isoDate: string) => void;
  id?: string;
  required?: boolean;
  label?: string;
  helperText?: string;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function parseParts(value: string): { y: string; m: string; d: string } {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return { y: '', m: '', d: '' };
  const [y, m, d] = value.split('-');
  return { y, m, d };
}

export function BirthDatePicker({
  value,
  onChange,
  id = 'dob',
  required = true,
  label = 'Date of Birth',
  helperText = "We use this to tailor your AI tutor's voice, subjects, and interface to your exact learning stage.",
}: BirthDatePickerProps) {
  const parts = parseParts(value);
  const now = new Date();
  const maxYear = now.getFullYear() - 1;
  const minYear = now.getFullYear() - 18;

  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = maxYear; y >= minYear; y -= 1) list.push(y);
    return list;
  }, [maxYear, minYear]);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const yearNum = parts.y ? Number(parts.y) : maxYear - 6;
  const monthNum = parts.m ? Number(parts.m) : 1;
  const maxDay = daysInMonth(yearNum, monthNum);

  const update = (y: string, m: string, d: string) => {
    if (!y || !m || !d) {
      onChange('');
      return;
    }
    const dim = daysInMonth(Number(y), Number(m));
    const day = Math.min(Number(d), dim);
    onChange(`${y}-${m.padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  };

  return (
    <div className="form-group">
      <label className="form-label" htmlFor={`${id}-year`}>
        {label} {required && <span style={{ color: '#dc2626' }}>*</span>}
      </label>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1.4fr 0.9fr',
          gap: 8,
        }}
      >
        <select
          id={`${id}-year`}
          className="form-input"
          value={parts.y}
          required={required}
          onChange={(e) => update(e.target.value, parts.m || '01', parts.d || '01')}
          aria-label="Birth year"
        >
          <option value="">Year</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {y}
            </option>
          ))}
        </select>
        <select
          id={`${id}-month`}
          className="form-input"
          value={parts.m}
          required={required}
          onChange={(e) => update(parts.y || String(maxYear - 6), e.target.value, parts.d || '01')}
          aria-label="Birth month"
        >
          <option value="">Month</option>
          {months.map((name, i) => {
            const m = String(i + 1).padStart(2, '0');
            return (
              <option key={m} value={m}>
                {name}
              </option>
            );
          })}
        </select>
        <select
          id={`${id}-day`}
          className="form-input"
          value={parts.d}
          required={required}
          onChange={(e) => update(parts.y || String(maxYear - 6), parts.m || '01', e.target.value)}
          aria-label="Birth day"
        >
          <option value="">Day</option>
          {Array.from({ length: maxDay }, (_, i) => {
            const d = String(i + 1).padStart(2, '0');
            return (
              <option key={d} value={d}>
                {i + 1}
              </option>
            );
          })}
        </select>
      </div>
      {helperText && (
        <p style={{ fontSize: '0.8rem', color: 'var(--slate-600)', marginTop: 8, lineHeight: 1.45 }}>
          {helperText}
        </p>
      )}
    </div>
  );
}
