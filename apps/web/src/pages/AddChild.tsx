import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SUBJECTS, type Subject } from '@brightpath/shared';
import { api } from '@/lib/api';

const MVP_SUBJECTS: Subject[] = ['reading', 'writing', 'math'];

export default function AddChild() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [age, setAge] = useState(8);
  const [subjects, setSubjects] = useState<Subject[]>(['reading', 'writing', 'math']);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const toggle = (s: Subject) => {
    setSubjects((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || subjects.length === 0) return;
    setBusy(true);
    setError('');
    try {
      await api.createChild({ name: name.trim(), age, subjects });
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
        <div className="form-group">
          <label className="form-label">{t('child.age')}: {age}</label>
          <input type="range" min={5} max={18} value={age} onChange={(e) => setAge(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--indigo)' }} />
        </div>
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
            More subjects ({SUBJECTS.length - MVP_SUBJECTS.length}+) unlock in later phases.
          </p>
        </div>
        {error && <p style={{ color: '#dc2626', marginBottom: 12 }}>{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy}>{t('child.save')}</button>
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/parent')}>{t('common.back')}</button>
      </form>
    </div>
  );
}
