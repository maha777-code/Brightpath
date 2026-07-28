import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { SUBJECT_META, type TutorMessage } from '@/types';
import {
  getLessonsFor,
  getRecommendedLesson,
  checkAnswer,
  tutorEncouragement,
  buildTutorGreeting,
  buildSessionSummary,
} from '@/lib/tutorEngine';
import { updateProgressAfterLesson, saveSession } from '@/lib/storage';

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function TutorSession() {
  const { subject } = useParams<{ subject: string }>();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const validSubject = subject as 'reading' | 'writing' | 'math';
  const meta = SUBJECT_META[validSubject];

  const [phase, setPhase] = useState<'pick' | 'session' | 'done'>('pick');
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [messages, setMessages] = useState<TutorMessage[]>([]);
  const [input, setInput] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [waiting, setWaiting] = useState(false);

  const lessons = profile ? getLessonsFor(validSubject, profile.ageBand) : [];
  const lesson = lessons.find((l) => l.id === selectedLessonId);
  const currentStep = lesson?.steps[stepIndex];
  const progressPct = lesson ? (stepIndex / lesson.steps.length) * 100 : 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = useCallback((role: 'tutor' | 'learner', content: string, extra?: Partial<TutorMessage>) => {
    setMessages((prev) => [...prev, { id: uid(), role, content, timestamp: Date.now(), ...extra }]);
  }, []);

  const startLesson = (lessonId: string) => {
    if (!profile) return;
    const l = lessons.find((x) => x.id === lessonId);
    if (!l) return;
    setSelectedLessonId(lessonId);
    setStepIndex(0);
    setCorrectCount(0);
    setShowHint(false);
    setPhase('session');
    setMessages([
      { id: uid(), role: 'tutor', content: buildTutorGreeting(profile.name, validSubject), timestamp: Date.now() },
      { id: uid(), role: 'tutor', content: l.steps[0].tutorPrompt, timestamp: Date.now() + 1 },
    ]);
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const finishSession = (finalCorrect: number) => {
    if (!profile || !lesson) return;
    const total = lesson.steps.length;
    addMessage('tutor', buildSessionSummary(profile.name, finalCorrect, total, validSubject), { celebrate: true });
    updateProgressAfterLesson(validSubject, finalCorrect / total);
    saveSession(null);
    setPhase('done');
  };

  const handleSubmit = async () => {
    if (!input.trim() || !profile || !lesson || !currentStep || waiting) return;
    const answer = input.trim();
    setInput('');
    setShowHint(false);
    addMessage('learner', answer);
    setWaiting(true);
    await new Promise((r) => setTimeout(r, 600));
    const correct = checkAnswer(answer, currentStep);
    const encouragement = tutorEncouragement(profile.name, correct);
    if (correct) {
      const newCorrect = correctCount + 1;
      setCorrectCount(newCorrect);
      addMessage('tutor', `${encouragement}\n\n${currentStep.explanation}`, { celebrate: true });
      if (stepIndex + 1 < lesson.steps.length) {
        await new Promise((r) => setTimeout(r, 800));
        addMessage('tutor', lesson.steps[stepIndex + 1].tutorPrompt);
        setStepIndex((i) => i + 1);
      } else {
        finishSession(newCorrect);
      }
    } else {
      addMessage('tutor', encouragement);
      if (!showHint) {
        addMessage('tutor', `💡 Hint: ${currentStep.hint}`, { hint: currentStep.hint });
        setShowHint(true);
      }
    }
    setWaiting(false);
    inputRef.current?.focus();
  };

  if (!profile || !meta) return null;

  if (phase === 'pick') {
    const recommended = getRecommendedLesson(validSubject, profile.ageBand, []);
    return (
      <div className="page">
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/dashboard')}>← Back</button>
        <div className="page-header">
          <h1 className="page-title">{meta.emoji} {meta.label}</h1>
          <p className="page-subtitle">Pick a lesson — your tutor will guide you through it.</p>
        </div>
        <div className="lesson-picker">
          {lessons.map((l) => (
            <button key={l.id} type="button" className={`lesson-option ${l.id === recommended?.id ? 'selected' : ''}`} onClick={() => startLesson(l.id)}>
              <div className="lesson-option-title">{l.id === recommended?.id && '⭐ '}{l.title}</div>
              <div className="lesson-option-meta">{l.durationMin} min · {l.steps.length} questions</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="tutor-layout">
      <div className="progress-bar-wrap"><div className="progress-bar-fill" style={{ width: `${phase === 'done' ? 100 : progressPct}%` }} /></div>
      <header className="tutor-header">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')}>←</button>
        <div className="tutor-avatar">👩‍🏫</div>
        <div>
          <div className="tutor-info-name">Ms. Bright</div>
          <div className="tutor-info-subject">{meta.label} · {lesson?.title}</div>
        </div>
      </header>
      <div className="tutor-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message message-${msg.role}`}>{msg.content}{msg.celebrate && <div className="message-celebrate">✨</div>}</div>
        ))}
        {waiting && <div className="message message-tutor" style={{ fontStyle: 'italic', color: 'var(--slate-400)' }}>Ms. Bright is thinking...</div>}
        <div ref={messagesEndRef} />
      </div>
      {phase === 'session' ? (
        <div className="tutor-input-bar">
          <textarea ref={inputRef} className="tutor-input" rows={1} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSubmit(); } }} placeholder="Type your answer..." disabled={waiting} />
          <button type="button" className="tutor-send" onClick={() => void handleSubmit()} disabled={!input.trim() || waiting}>↑</button>
        </div>
      ) : (
        <div style={{ padding: 16 }}><button type="button" className="btn btn-primary" onClick={() => navigate('/dashboard')}>Back to Dashboard</button></div>
      )}
    </div>
  );
}
