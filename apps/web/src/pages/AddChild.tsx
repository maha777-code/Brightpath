import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SUBJECTS, type Subject, getAgeFromDOB, getAgeGroupFromDOB, AGE_GROUP_LABELS } from '@brightpath/shared';
import { api } from '@/lib/api';
import { BirthDatePicker } from '@/components/age/BirthDatePicker';

const MVP_SUBJECTS: Subject[] = ['reading', 'writing', 'math'];

export default function AddChild() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>(['reading', 'writing', 'math']);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const preview =
    dateOfBirth && /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)
      ? (() => {
          const dob = new Date(`${dateOfBirth}T12:00:00`);
          return { age: getAgeFromDOB(dob), group: getAgeGroupFromDOB(dob) };
        })()
      : null;

  const toggle = (s: Subject) => {
    setSubjects((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || subjects.length === 0) return;
    if (!dateOfBirth) {
      setError('Date of birth is required for age-based curriculum.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api.createChild({ name: name.trim(), dateOfBirth, subjects });
      navigate('/parent');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{t('parent.addChild')}</h1>
      </div>
      <form onSubmit={submit}>
        <div className="form-group">
          <label className="form-label" htmlFor="name">{t('child.name')}</label>
          <input id="name" className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>

        <BirthDatePicker value={dateOfBirth} onChange={setDateOfBirth} required />

        {preview && (
          <p style={{ fontSize: '0.875rem', color: '#0f766e', marginBottom: 16 }}>
            Age {preview.age} · {AGE_GROUP_LABELS[preview.group]}
          </p>
        )}

        <div className="form-group">
          <span className="form-label">{t('child.subjects')}</span>
          <div className="chip-grid" style={{ marginTop: 8 }}>
            {MVP_SUBJECTS.map((s) => (
              <button key={s} type="button" className={`chip ${subjects.includes(s) ? 'selected' : ''}`} onClick={() => toggle(s)}>
                {s}
              </button>
            ))}
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--slate-600)', marginTop: 8 }}>
            Age-tier subjects unlock automatically on the dashboard. Base tracks: {SUBJECTS.length} total in catalog.
          </p>
        </div>
        {error && <p style={{ color: '#dc2626', marginBottom: 12 }}>{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy}>{t('child.save')}</button>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/parent')}>{t('common.back')}</button>
      </form>
    </div>
  );
}
