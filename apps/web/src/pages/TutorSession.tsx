import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { useSpeech } from '@/hooks/useSpeech';
import { SUBJECT_META, type LessonStep, type TutorMessage } from '@/types';
import {
  getLessonsFor,
  getRecommendedLesson,
  checkAnswer,
  tutorEncouragement,
  buildTutorGreeting,
  buildSessionSummary,
} from '@/lib/tutorEngine';
import {
  shouldTriggerFoundationRemediation,
  pickFoundationSteps,
  buildRemediationIntro,
  buildRemediationOutro,
} from '@/lib/foundationRemediation';
import { useActivityTracker } from '@/hooks/useActivityTracker';
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
  const spokenIdsRef = useRef(new Set<string>());

  // Count active lesson time toward weekly study + streak
  useActivityTracker(Boolean(profile));

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
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [sttEngine, setSttEngine] = useState<'deepgram' | null>(null);

  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [remediationSteps, setRemediationSteps] = useState<LessonStep[] | null>(null);
  const [remediationIndex, setRemediationIndex] = useState(0);

  const lessons = profile ? getLessonsFor(validSubject, profile.ageBand) : [];
  const lesson = lessons.find((l) => l.id === selectedLessonId);
  const inRemediation = Boolean(remediationSteps?.length);
  const currentStep = inRemediation
    ? remediationSteps![remediationIndex]
    : lesson?.steps[stepIndex];
  const progressPct = lesson
    ? inRemediation
      ? ((stepIndex + remediationIndex / Math.max(remediationSteps!.length, 1)) /
          lesson.steps.length) *
        100
      : (stepIndex / lesson.steps.length) * 100
    : 0;

  const speechLocale =
    (localStorage.getItem('brightpath_locale') as Locale | null) ?? 'en-IN';

  useEffect(() => {
    let cancelled = false;

    async function checkAi() {
      setAiChecking(true);
      try {
        const status = await api.tutorStatus();
        if (cancelled) return;
        setLlmAvailable(status.llmAvailable);
        setSttEngine(status.sttEngine ?? null);

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
    return () => {
      cancelled = true;
    };
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

  const addMessage = useCallback(
    (role: 'tutor' | 'learner', content: string, extra?: Partial<TutorMessage>) => {
      setMessages((prev) => [...prev, { id: uid(), role, content, timestamp: Date.now(), ...extra }]);
    },
    [],
  );

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
      setRemediationSteps(null);

      // Sync mastery into personalized learning path (non-blocking)
      const scorePercent = Math.round((finalCorrect / Math.max(total, 1)) * 100);
      void (async () => {
        try {
          if (!loadStoredToken()) return;
          const { nodes } = await api.getLearningPath();
          const route = `/learn/${validSubject}`;
          const match =
            nodes.find(
              (n) =>
                (n.status === 'IN_PROGRESS' || n.status === 'UNLOCKED') &&
                n.learnRoute === route,
            ) ??
            nodes.find((n) => n.status === 'IN_PROGRESS' && n.learnRoute === route) ??
            nodes.find((n) => n.learnRoute === route && n.status !== 'LOCKED');
          if (match) {
            await api.submitAssessment({ nodeId: match.id, scorePercent });
            await api.submitSkillAssessment({
              scorePercent,
              skillTags: [match.subjectCategory],
              correct: scorePercent >= 60,
            });
          }
        } catch (err) {
          console.warn('[learning-path] assessment sync skipped', err);
        }
      })();
    },
    [addMessage, lesson, profile, validSubject],
  );

  const enterFoundationRemediation = useCallback(
    async (skillTag: string, suggestedTag?: string) => {
      if (!profile || !lesson) return false;
      const picked = pickFoundationSteps(
        suggestedTag || skillTag,
        validSubject,
        profile.age,
        2,
      );
      if (!picked) return false;

      addMessage('tutor', buildRemediationIntro(profile.name, picked.bridgeLabel, profile.age));
      await new Promise((r) => setTimeout(r, 400));
      setRemediationSteps(picked.steps);
      setRemediationIndex(0);
      setShowHint(false);
      setConsecutiveFailures(0);
      addMessage('tutor', picked.steps[0].tutorPrompt);
      return true;
    },
    [addMessage, lesson, profile, validSubject],
  );

  const advanceAfterSuccess = useCallback(
    async (newCorrect: number) => {
      if (!profile || !lesson) return;

      if (inRemediation && remediationSteps) {
        if (remediationIndex + 1 < remediationSteps.length) {
          await new Promise((r) => setTimeout(r, 600));
          addMessage('tutor', remediationSteps[remediationIndex + 1].tutorPrompt);
          setRemediationIndex((i) => i + 1);
          setShowHint(false);
          return;
        }
        addMessage('tutor', buildRemediationOutro(profile.name));
        setRemediationSteps(null);
        setRemediationIndex(0);
        setShowHint(false);
        await new Promise((r) => setTimeout(r, 500));
        addMessage('tutor', `Back to it: ${lesson.steps[stepIndex].tutorPrompt}`);
        return;
      }

      if (stepIndex + 1 < lesson.steps.length) {
        await new Promise((r) => setTimeout(r, 600));
        addMessage('tutor', lesson.steps[stepIndex + 1].tutorPrompt);
        setStepIndex((i) => i + 1);
        setShowHint(false);
      } else {
        finishSession(newCorrect);
      }
    },
    [
      addMessage,
      finishSession,
      inRemediation,
      lesson,
      profile,
      remediationIndex,
      remediationSteps,
      stepIndex,
    ],
  );

  const {
    supported,
    sttReady,
    recording,
    transcribing,
    liveTranscript,
    speaking,
    speechError,
    speak,
    stopSpeaking,
    toggleListening,
    stopListening,
  } = useSpeech({
    locale: speechLocale,
    voiceEnabled,
    sttEnabled: llmAvailable,
    transcribeAudio: async (blob, mimeType, loc, browserTranscript, durationSec) => {
      const { text } = await api.tutorTranscribe(
        blob,
        mimeType,
        loc,
        browserTranscript,
        durationSec,
      );
      return text;
    },
    onTranscribed: (text) => setInput(text),
    onLiveTranscript: (text) => {
      if (text) setInput(text);
    },
  });

  const displayInput = recording ? liveTranscript || input : input;

  const handleSubmitScripted = useCallback(
    async (answer: string) => {
      if (!answer.trim() || !profile || !lesson || !currentStep || waiting) return;
      setInput('');
      setShowHint(false);
      addMessage('learner', answer);
      setWaiting(true);
      await new Promise((r) => setTimeout(r, 600));
      const correct = checkAnswer(answer, currentStep);
      const encouragement = tutorEncouragement(profile.name, correct);
      if (correct) {
        setConsecutiveFailures(0);
        const newCorrect = inRemediation ? correctCount : correctCount + 1;
        if (!inRemediation) setCorrectCount(newCorrect);
        addMessage('tutor', `${encouragement}\n\n${currentStep.explanation}`, { celebrate: true });
        await advanceAfterSuccess(newCorrect);
      } else {
        const nextFails = consecutiveFailures + (inRemediation ? 0 : 1);
        if (!inRemediation) setConsecutiveFailures(nextFails);
        addMessage('tutor', encouragement);

        const shouldScaffold = shouldTriggerFoundationRemediation({
          consecutiveFailures: nextFails,
          alreadyInRemediation: inRemediation,
          learnerAgeBand: profile.ageBand,
        });

        if (shouldScaffold) {
          await enterFoundationRemediation(currentStep.skillTag);
        } else if (!showHint) {
          addMessage('tutor', `💡 Hint: ${currentStep.hint}`, { hint: currentStep.hint });
          setShowHint(true);
        }
      }
      setWaiting(false);
      inputRef.current?.focus();
    },
    [
      addMessage,
      advanceAfterSuccess,
      consecutiveFailures,
      correctCount,
      currentStep,
      enterFoundationRemediation,
      inRemediation,
      lesson,
      profile,
      showHint,
      waiting,
    ],
  );

  const handleSubmitLlm = useCallback(
    async (answer: string) => {
      if (!answer.trim() || !profile || !lesson || !currentStep || waiting) return;
      setInput('');
      addMessage('learner', answer);
      setWaiting(true);

      try {
        const ctx = tutorContext();
        if (!ctx) return;
        const history = messages.map((m) => ({ role: m.role, content: m.content }));
        const activeSteps = inRemediation && remediationSteps ? remediationSteps : lesson.steps;
        const activeIndex = inRemediation ? remediationIndex : stepIndex;

        const result = await api.tutorRespond({
          ...ctx,
          lessonId: inRemediation ? `foundation:${lesson.id}` : lesson.id,
          lessonTitle: inRemediation ? `${lesson.title} · foundation review` : lesson.title,
          stepIndex: activeIndex,
          totalSteps: activeSteps.length,
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
        addMessage('tutor', result.message, {
          celebrate: result.isCorrect,
          hint: result.showHint ? currentStep.hint : undefined,
        });

        if (result.isCorrect || result.advanceStep) {
          setConsecutiveFailures(0);
          const newCorrect =
            result.isCorrect && !inRemediation ? correctCount + 1 : correctCount;
          if (result.isCorrect && !inRemediation) setCorrectCount(newCorrect);

          if (result.sessionComplete && !inRemediation) {
            finishSession(newCorrect);
          } else if (result.advanceStep || result.isCorrect) {
            await advanceAfterSuccess(newCorrect);
          }
        } else {
          const nextFails = consecutiveFailures + (inRemediation ? 0 : 1);
          if (!inRemediation) setConsecutiveFailures(nextFails);

          const shouldScaffold = shouldTriggerFoundationRemediation({
            consecutiveFailures: nextFails,
            misconceptionDetected: result.misconceptionDetected,
            alreadyInRemediation: inRemediation,
            learnerAgeBand: profile.ageBand,
          });

          if (shouldScaffold) {
            await enterFoundationRemediation(
              currentStep.skillTag,
              result.suggestedFoundationSkillTag,
            );
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
          setConsecutiveFailures(0);
          const newCorrect = inRemediation ? correctCount : correctCount + 1;
          if (!inRemediation) setCorrectCount(newCorrect);
          addMessage('tutor', `${encouragement}\n\n${currentStep.explanation}`, {
            celebrate: true,
          });
          await advanceAfterSuccess(newCorrect);
        } else {
          const nextFails = consecutiveFailures + (inRemediation ? 0 : 1);
          if (!inRemediation) setConsecutiveFailures(nextFails);
          addMessage('tutor', encouragement);

          const shouldScaffold = shouldTriggerFoundationRemediation({
            consecutiveFailures: nextFails,
            alreadyInRemediation: inRemediation,
            learnerAgeBand: profile.ageBand,
          });

          if (shouldScaffold) {
            await enterFoundationRemediation(currentStep.skillTag);
          } else if (!showHint) {
            addMessage('tutor', `💡 Hint: ${currentStep.hint}`, { hint: currentStep.hint });
            setShowHint(true);
          }
        }
      }

      setWaiting(false);
      inputRef.current?.focus();
    },
    [
      addMessage,
      advanceAfterSuccess,
      consecutiveFailures,
      correctCount,
      currentStep,
      enterFoundationRemediation,
      finishSession,
      inRemediation,
      lesson,
      messages,
      profile,
      remediationIndex,
      remediationSteps,
      showHint,
      stepIndex,
      tutorContext,
      waiting,
    ],
  );

  const submitAnswer = useCallback(
    (answer: string) => {
      stopListening();
      if (llmAvailable) void handleSubmitLlm(answer);
      else void handleSubmitScripted(answer);
    },
    [handleSubmitLlm, handleSubmitScripted, llmAvailable, stopListening],
  );

  const handleSubmit = () => {
    const answer = (recording ? liveTranscript || input : input).trim();
    if (!answer) return;
    if (recording) stopListening();
    submitAnswer(answer);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (phase !== 'session') return;
    for (const msg of messages) {
      if (msg.role === 'tutor' && !spokenIdsRef.current.has(msg.id)) {
        spokenIdsRef.current.add(msg.id);
        if (voiceEnabled) speak(msg.content);
      }
    }
  }, [messages, phase, speak, voiceEnabled]);

  const startLesson = async (lessonId: string) => {
    if (!profile) return;
    const l = lessons.find((x) => x.id === lessonId);
    if (!l) return;

    spokenIdsRef.current.clear();
    setSelectedLessonId(lessonId);
    setStepIndex(0);
    setCorrectCount(0);
    setShowHint(false);
    setConsecutiveFailures(0);
    setRemediationSteps(null);
    setRemediationIndex(0);
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

  const aiBadgeLabel = aiChecking
    ? '✨ AI enabled — checking connection…'
    : llmLive
      ? '✨ AI tutor live'
      : llmAvailable
        ? '✨ AI key found — waiting for connection'
        : null;

  const inputPlaceholder = recording
    ? liveTranscript
      ? 'Keep speaking… tap 🎤 when done'
      : '🔴 Recording… speak now, tap 🎤 when done'
    : transcribing
      ? 'Transcribing your speech…'
      : supported.stt
        ? 'Type or tap 🎤 → speak → tap 🎤 again'
        : 'Type your answer…';

  if (!profile || !meta) return null;

  if (phase === 'pick') {
    const recommended = getRecommendedLesson(validSubject, profile.ageBand, []);
    return (
      <div className="page">
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
          ← Back
        </button>
        <div className="page-header">
          <h1 className="page-title">
            {meta.emoji} {meta.label}
          </h1>
          <p className="page-subtitle">
            Pick a lesson — your tutor will guide you through it.
            {llmAvailable && (
              <span
                style={{
                  display: 'block',
                  marginTop: 6,
                  color: llmLive ? 'var(--green)' : 'var(--indigo)',
                  fontWeight: 700,
                }}
              >
                {aiBadgeLabel ?? '✨ AI tutor enabled (Phase 1)'}
              </span>
            )}
            {supported.stt && (
              <span
                style={{
                  display: 'block',
                  marginTop: 6,
                  color: 'var(--slate-600)',
                  fontSize: '0.85rem',
                }}
              >
                Voice: tap 🔇 to mute Ms. Bright (or use headphones), then 🎤 → speak → 🎤 → ↑
                {sttEngine !== 'deepgram' && (
                  <span style={{ display: 'block', color: '#b45309', marginTop: 4 }}>
                    Add DEEPGRAM_API_KEY to .env and apps/api/.env, then restart
                  </span>
                )}
              </span>
            )}
            {aiError && (
              <span style={{ display: 'block', marginTop: 6, color: '#dc2626', fontSize: '0.85rem' }}>
                AI error: {aiError.slice(0, 120)} — using backup tutor.
              </span>
            )}
          </p>
        </div>
        <div className="lesson-picker">
          {lessons.map((l) => (
            <button
              key={l.id}
              type="button"
              className={`lesson-option ${l.id === recommended?.id ? 'selected' : ''}`}
              onClick={() => void startLesson(l.id)}
            >
              <div className="lesson-option-title">
                {l.id === recommended?.id && '⭐ '}
                {l.title}
              </div>
              <div className="lesson-option-meta">
                {l.durationMin} min · {l.steps.length} questions
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="tutor-layout">
      <div className="progress-bar-wrap">
        <div
          className="progress-bar-fill"
          style={{ width: `${phase === 'done' ? 100 : progressPct}%` }}
        />
      </div>
      <header className="tutor-header">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => navigate('/dashboard')}
        >
          ←
        </button>
        <div className="tutor-avatar">👩‍🏫</div>
        <div className="tutor-info">
          <div className="tutor-info-name">
            Ms. Bright{llmLive ? ' · AI live' : llmAvailable ? ' · backup mode' : ''}
            {speaking && voiceEnabled && (
              <span className="tutor-speaking-badge"> 🔊 speaking</span>
            )}
          </div>
          <div className="tutor-info-subject">
            {meta.label} · {lesson?.title}
            {inRemediation && (
              <span style={{ marginLeft: 8, color: '#0d9488', fontWeight: 700 }}>
                · Foundation boost
              </span>
            )}
          </div>
          {aiError && (
            <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: 4 }}>
              AI: {aiError.slice(0, 100)}
            </div>
          )}
        </div>
        {supported.tts && (
          <button
            type="button"
            className={`tutor-voice-toggle ${voiceEnabled ? 'on' : 'muted'}`}
            onClick={() => {
              setVoiceEnabled((v) => {
                if (v) stopSpeaking();
                return !v;
              });
            }}
            title={voiceEnabled ? 'Mute tutor voice' : 'Enable tutor voice'}
            aria-label={voiceEnabled ? 'Mute tutor voice' : 'Enable tutor voice'}
          >
            {voiceEnabled ? '🔊' : '🔇'}
          </button>
        )}
      </header>
      <div className="tutor-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message message-${msg.role}`}>
            <div className="message-content">{msg.content}</div>
            {msg.role === 'tutor' && supported.tts && voiceEnabled && (
              <button
                type="button"
                className="message-replay"
                onClick={() => speak(msg.content)}
                title="Listen again"
                aria-label="Listen again"
              >
                🔊
              </button>
            )}
            {msg.celebrate && <div className="message-celebrate">✨</div>}
          </div>
        ))}
        {waiting && (
          <div
            className="message message-tutor"
            style={{ fontStyle: 'italic', color: 'var(--slate-400)' }}
          >
            Ms. Bright is thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      {phase === 'session' ? (
        <div className="tutor-input-bar">
          {supported.stt && (
            <button
              type="button"
              className={`tutor-mic ${recording ? 'listening' : ''}`}
              onClick={toggleListening}
              disabled={waiting || transcribing || (!sttReady && !recording)}
              title={recording ? 'Stop recording & transcribe' : 'Record your answer'}
              aria-label={recording ? 'Stop recording' : 'Record answer'}
            >
              🎤
            </button>
          )}
          <div className="tutor-input-wrap">
            <textarea
              ref={inputRef}
              className={`tutor-input ${recording ? 'tutor-input-listening' : ''}`}
              rows={1}
              value={displayInput}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder={inputPlaceholder}
              disabled={waiting || transcribing}
            />
            {speechError && <div className="tutor-speech-error">{speechError}</div>}
            {transcribing && !speechError && (
              <div className="tutor-speech-status">Transcribing with AI…</div>
            )}
          </div>
          <button
            type="button"
            className="tutor-send"
            onClick={handleSubmit}
            disabled={!displayInput.trim() || waiting || transcribing || recording}
          >
            ↑
          </button>
        </div>
      ) : (
        <div style={{ padding: 16 }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/dashboard')}
          >
            Back to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
