import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Subject } from '@/types';
import { ageToBand, SUBJECT_META } from '@/types';
import { useProfile } from '@/hooks/useProfile';

const SUBJECTS: Subject[] = ['reading', 'writing', 'math'];

export default function Onboarding() {
  const navigate = useNavigate();
  const { updateProfile } = useProfile();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [age, setAge] = useState(8);
  const [subjects, setSubjects] = useState<Subject[]>(['reading', 'writing', 'math']);

  const toggleSubject = (s: Subject) => {
    setSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  };

  const finish = () => {
    if (!name.trim() || subjects.length === 0) return;
    updateProfile({
      name: name.trim(),
      age,
      ageBand: ageToBand(age),
      subjects,
      onboardingComplete: true,
    });
    navigate('/dashboard');
  };

  const canNext = step === 0 ? name.trim().length > 0 : subjects.length > 0;

  return (
    <div className="page">
      <div className="step-indicator">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`step-dot ${i <= step ? 'active' : ''}`} />
        ))}
      </div>

      {step === 0 && (
        <>
          <div className="page-header">
            <h1 className="page-title">What's your name?</h1>
            <p className="page-subtitle">Your tutor will use this to cheer you on.</p>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="name">First name</label>
            <input
              id="name"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sam"
              autoFocus
              autoComplete="given-name"
            />
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <div className="page-header">
            <h1 className="page-title">How old are you, {name}?</h1>
            <p className="page-subtitle">We'll pick lessons that fit your level.</p>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="age">Age</label>
            <input
              id="age"
              type="range"
              min={5}
              max={14}
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--indigo)' }}
            />
            <p style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 600, color: 'var(--indigo)', marginTop: 8 }}>
              {age} years old
            </p>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="page-header">
            <h1 className="page-title">What do you want to learn?</h1>
            <p className="page-subtitle">Pick one or more — you can always change later.</p>
          </div>
          <div className="chip-grid">
            {SUBJECTS.map((s) => {
              const meta = SUBJECT_META[s];
              return (
                <button
                  key={s}
                  type="button"
                  className={`chip ${subjects.includes(s) ? 'selected' : ''}`}
                  onClick={() => toggleSubject(s)}
                >
                  {meta.emoji} {meta.label}
                </button>
              );
            })}
          </div>
        </>
      )}

      <div style={{ marginTop: 'auto', paddingTop: 32, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {step < 2 ? (
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canNext}
            onClick={() => setStep((s) => s + 1)}
          >
            Continue
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canNext}
            onClick={finish}
          >
            Meet Your Tutor 🎉
          </button>
        )}
        {step > 0 && (
          <button type="button" className="btn btn-ghost" onClick={() => setStep((s) => s - 1)}>
            ← Back
          </button>
        )}
      </div>
    </div>
  );
}
