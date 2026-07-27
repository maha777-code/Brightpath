import { Link } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { SUBJECT_META } from '@/types';
import { loadProgress } from '@/lib/storage';
import BottomNav from '@/components/BottomNav';

export default function ProgressPage() {
  const { profile } = useProfile();
  const progress = loadProgress();

  if (!profile) return null;

  const totalLessons = progress.reduce((s, p) => s + p.lessonsCompleted, 0);
  const avgMastery = progress.length
    ? Math.round(progress.reduce((s, p) => s + p.masteryPercent, 0) / progress.length)
    : 0;
  const maxStreak = progress.reduce((m, p) => Math.max(m, p.streakDays), 0);

  return (
    <div className="page" style={{ paddingBottom: 0 }}>
      <div className="page-header">
        <h1 className="page-title">Your Progress</h1>
        <p className="page-subtitle">Every session counts — here's how far you've come.</p>
      </div>

      <div className="progress-stat-grid">
        <div className="card stat-card">
          <div className="stat-value">{totalLessons}</div>
          <div className="stat-label">Lessons done</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{avgMastery}%</div>
          <div className="stat-label">Avg mastery</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{maxStreak}</div>
          <div className="stat-label">Best streak</div>
        </div>
        <div className="card stat-card">
          <div className="stat-value">{profile.subjects.length}</div>
          <div className="stat-label">Subjects</div>
        </div>
      </div>

      <h2 style={{ fontWeight: 800, fontSize: '1rem', margin: '24px 0 12px', color: 'var(--slate-800)' }}>
        By subject
      </h2>

      {profile.subjects.map((subject) => {
        const meta = SUBJECT_META[subject];
        const prog = progress.find((p) => p.subject === subject);

        return (
          <Link
            key={subject}
            to={`/learn/${subject}`}
            className="card subject-card"
            style={{ marginBottom: 12, textDecoration: 'none' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
              <span style={{ fontSize: '1.5rem' }}>{meta.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800 }}>{meta.label}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--slate-600)' }}>
                  {prog ? `${prog.lessonsCompleted} lessons · ${prog.masteryPercent}% mastery` : 'Not started yet — tap to begin'}
                </div>
                {prog && (
                  <div className="mastery-bar">
                    <div
                      className="mastery-fill"
                      style={{ width: `${prog.masteryPercent}%`, background: meta.color }}
                    />
                  </div>
                )}
              </div>
              {prog && prog.streakDays > 0 ? (
                <div className="streak-badge">🔥 {prog.streakDays}d</div>
              ) : (
                <span style={{ color: 'var(--slate-400)', fontSize: '1.25rem' }}>→</span>
              )}
            </div>
          </Link>
        );
      })}

      <div className="card" style={{ marginTop: 20 }}>
        <p style={{ fontSize: '0.9rem', color: 'var(--slate-600)' }}>
          🎯 A private tutor costs $40–80/hour. You're building the same skills here —
          one lesson at a time, on your schedule.
        </p>
      </div>

      <BottomNav active="progress" />
    </div>
  );
}
