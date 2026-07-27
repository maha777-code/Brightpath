import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { SUBJECT_META, type Subject } from '@/types';
import { getLessonsFor } from '@/lib/tutorEngine';
import { loadProgress } from '@/lib/storage';
import InstallPrompt from '@/components/InstallPrompt';
import BottomNav from '@/components/BottomNav';

export default function Dashboard() {
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [progress] = useState(() => loadProgress());

  if (!profile) return null;

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="page" style={{ paddingBottom: 0 }}>
      <InstallPrompt />

      <div className="greeting-banner">
        <h2>{greeting()}, {profile.name}! 👋</h2>
        <p>Ready for today's lesson? Your tutor is waiting.</p>
      </div>

      <h2 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: 12, color: 'var(--slate-800)' }}>
        Choose a subject
      </h2>

      <div className="card-grid">
        {profile.subjects.map((subject) => {
          const meta = SUBJECT_META[subject];
          const lessons = getLessonsFor(subject, profile.ageBand);
          const prog = progress.find((p) => p.subject === subject);

          return (
            <button
              key={subject}
              type="button"
              className="subject-card"
              onClick={() => navigate(`/learn/${subject}`)}
            >
              <div
                className="subject-card-icon"
                style={{ background: `${meta.color}18` }}
              >
                {meta.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <div className="subject-card-title">{meta.label}</div>
                <div className="subject-card-desc">
                  {lessons.length} lessons · {prog ? `${prog.masteryPercent}% mastery` : 'Not started'}
                </div>
                {prog && prog.streakDays > 0 && (
                  <div className="streak-badge" style={{ marginTop: 6 }}>
                    🔥 {prog.streakDays}-day streak
                  </div>
                )}
              </div>
              <span style={{ color: 'var(--slate-400)', fontSize: '1.25rem' }}>→</span>
            </button>
          );
        })}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <p style={{ fontSize: '0.9rem', color: 'var(--slate-600)' }}>
          💡 <strong>Tip:</strong> A real tutor meets you where you are. BrightPath does the same —
          one question at a time, with hints when you need them.
        </p>
      </div>

      <BottomNav active="home" />
    </div>
  );
}
