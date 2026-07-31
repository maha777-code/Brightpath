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
import { api, loadStoredToken } from '@/lib/api';
import type { Locale, Subject } from '@brightpath/shared';
import { ageToBand } from '@brightpath/shared';

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
  const [llmAvailable, setLlmAvailable] = useState(false);
  const [llmLive, setLlmLive] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiChecking, setAiChecking] = useState(true);

  const lessons = profile ? getLessonsFor(validSubject, profile.ageBand) : [];
  const lesson = lessons.find((l) => l.id === selectedLessonId);
  const currentStep = lesson?.steps[stepIndex];
  const progressPct = lesson ? (stepIndex / lesson.steps.length) * 100 : 0;

  useEffect(() => {
    let cancelled = false;

    async function checkAi() {
      setAiChecking(true);
      try {
        const status = await api.tutorStatus();
        if (cancelled) return;
        setLlmAvailable(status.llmAvailable);

        if (!status.llmAvailable) {
          setLlmLive(false);
          setAiError(null);
          return;
        }

        if (!loadStoredToken()) {
          setLlmLive(false);
          setAiError('Not logged in — open Parent dashboard, log out, log in again, then retry.');
          return;
        }

        await api.tutorWarmup();
        if (cancelled) return;
        setLlmLive(true);
        setAiError(null);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'AI check failed';
        setLlmLive(false);
        setAiError(msg);
      } finally {
        if (!cancelled) setAiChecking(false);
      }
    }

    void checkAi();
    return () => { cancelled = true; };
  }, []);

  const tutorContext = useCallback(() => {
    if (!profile) return null;
    const locale = (localStorage.getItem('brightpath_locale') as Locale | null) ?? 'en-IN';
    return {
      childName: profile.name,
      age: profile.age,
      ageBand: ageToBand(profile.age),
      locale,
      subject: validSubject as Subject,
    };
  }, [profile, validSubject]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = useCallback((role: 'tutor' | 'learner', content: string, extra?: Partial<TutorMessage>) => {
    setMessages((prev) => [...prev, { id: uid(), role, content, timestamp: Date.now(), ...extra }]);
  }, []);

  const finishSession = useCallback(
    (finalCorrect: number) => {
      if (!profile || !lesson) return;
      const total = lesson.steps.length;
      addMessage('tutor', buildSessionSummary(profile.name, finalCorrect, total, validSubject), {
        celebrate: true,
      });
      updateProgressAfterLesson(validSubject, finalCorrect / total);
      saveSession(null);
      setPhase('done');
    },
    [addMessage, lesson, profile, validSubject],
  );

  const startLesson = async (lessonId: string) => {
    if (!profile) return;
    const l = lessons.find((x) => x.id === lessonId);
    if (!l) return;

    setSelectedLessonId(lessonId);
    setStepIndex(0);
    setCorrectCount(0);
    setShowHint(false);
    setPhase('session');
    setWaiting(true);

    const firstPrompt = l.steps[0].tutorPrompt;
    let greeting = buildTutorGreeting(profile.name, validSubject);

    if (llmAvailable) {
      try {
        const ctx = tutorContext();
        if (!ctx) return;
        const { greeting: aiGreeting } = await api.tutorGreeting({
          ...ctx,
          lessonTitle: l.title,
          firstPrompt,
        });
        greeting = aiGreeting;
        setLlmLive(true);
        setAiError(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'AI unavailable';
        console.warn('[Tutor] AI greeting failed:', msg);
        setAiError(msg);
        setLlmLive(false);
      }
    }

    setMessages([
      { id: uid(), role: 'tutor', content: greeting, timestamp: Date.now() },
      { id: uid(), role: 'tutor', content: firstPrompt, timestamp: Date.now() + 1 },
    ]);
    setWaiting(false);
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const handleSubmitScripted = async () => {
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

  const handleSubmitLlm = async () => {
    if (!input.trim() || !profile || !lesson || !currentStep || waiting) return;
    const answer = input.trim();
    setInput('');
    addMessage('learner', answer);
    setWaiting(true);

    try {
      const ctx = tutorContext();
      if (!ctx) return;
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const result = await api.tutorRespond({
        ...ctx,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        stepIndex,
        totalSteps: lesson.steps.length,
        step: {
          id: currentStep.id,
          tutorPrompt: currentStep.tutorPrompt,
          hint: currentStep.hint,
          explanation: currentStep.explanation,
          skillTag: currentStep.skillTag,
          acceptableAnswers: currentStep.acceptableAnswers,
        },
        studentAnswer: answer,
        priorHintShown: showHint,
        history,
      });

      setLlmLive(true);
      setAiError(null);

      if (result.showHint) setShowHint(true);
      addMessage('tutor', result.message, { celebrate: result.isCorrect, hint: result.showHint ? currentStep.hint : undefined });

      if (result.advanceStep) {
        const newCorrect = result.isCorrect ? correctCount + 1 : correctCount;
        if (result.isCorrect) setCorrectCount(newCorrect);

        if (result.sessionComplete) {
          finishSession(newCorrect);
        } else if (stepIndex + 1 < lesson.steps.length) {
          await new Promise((r) => setTimeout(r, 600));
          addMessage('tutor', lesson.steps[stepIndex + 1].tutorPrompt);
          setStepIndex((i) => i + 1);
          setShowHint(false);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI unavailable';
      console.warn('[Tutor] AI respond failed, using scripted fallback:', msg);
      setAiError(msg);
      setLlmLive(false);
      const correct = checkAnswer(answer, currentStep);
      const encouragement = tutorEncouragement(profile.name, correct);
      if (correct) {
        const newCorrect = correctCount + 1;
        setCorrectCount(newCorrect);
        addMessage('tutor', `${encouragement}\n\n${currentStep.explanation}`, { celebrate: true });
        if (stepIndex + 1 < lesson.steps.length) {
          addMessage('tutor', lesson.steps[stepIndex + 1].tutorPrompt);
          setStepIndex((i) => i + 1);
          setShowHint(false);
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
    }

    setWaiting(false);
    inputRef.current?.focus();
  };

  const handleSubmit = () => {
    if (llmAvailable) void handleSubmitLlm();
    else void handleSubmitScripted();
  };

  const aiBadgeLabel = aiChecking
    ? '✨ AI enabled — checking connection…'
    : llmLive
      ? '✨ AI tutor live'
      : llmAvailable
        ? '✨ AI key found — waiting for connection'
        : null;

  if (!profile || !meta) return null;

  if (phase === 'pick') {
    const recommended = getRecommendedLesson(validSubject, profile.ageBand, []);
    return (
      <div className="page">
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/dashboard')}>← Back</button>
        <div className="page-header">
          <h1 className="page-title">{meta.emoji} {meta.label}</h1>
          <p className="page-subtitle">
            Pick a lesson — your tutor will guide you through it.
            {llmAvailable && (
              <span style={{ display: 'block', marginTop: 6, color: llmLive ? 'var(--green)' : 'var(--indigo)', fontWeight: 700 }}>
                {aiBadgeLabel ?? '✨ AI tutor enabled (Phase 1)'}
              </span>
            )}
            {aiError && (
              <span style={{ display: 'block', marginTop: 6, color: '#dc2626', fontSize: '0.85rem' }}>
                AI error: {aiError.slice(0, 120)} — using backup tutor. Check API key & restart server.
              </span>
            )}
          </p>
        </div>
        <div className="lesson-picker">
          {lessons.map((l) => (
            <button key={l.id} type="button" className={`lesson-option ${l.id === recommended?.id ? 'selected' : ''}`} onClick={() => void startLesson(l.id)}>
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
          <div className="tutor-info-name">
            Ms. Bright{llmLive ? ' · AI live' : llmAvailable ? ' · backup mode' : ''}
          </div>
          <div className="tutor-info-subject">{meta.label} · {lesson?.title}</div>
          {aiError && (
            <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: 4 }}>
              AI: {aiError.slice(0, 100)}
            </div>
          )}
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
          <textarea ref={inputRef} className="tutor-input" rows={1} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }} placeholder="Type your answer..." disabled={waiting} />
          <button type="button" className="tutor-send" onClick={handleSubmit} disabled={!input.trim() || waiting}>↑</button>
        </div>
      ) : (
        <div style={{ padding: 16 }}><button type="button" className="btn btn-primary" onClick={() => navigate('/dashboard')}>Back to Dashboard</button></div>
      )}
    </div>
  );
}
