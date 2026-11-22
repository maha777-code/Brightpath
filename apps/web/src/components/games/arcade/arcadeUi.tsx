import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import type { ArcadeQuestion } from '@brightpath/shared';
import { Heart, Play } from 'lucide-react';
import { isTypingTarget } from './arcadeKit';

export interface StageSize {
  w: number;
  h: number;
}

/**
 * Runs a requestAnimationFrame loop on a canvas whose logical height is fixed and whose logical
 * width follows the stage aspect ratio, so a 4:3 phone stage shows the whole playfield.
 */
export function useCanvasStage(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  height: number,
  frame: (ctx: CanvasRenderingContext2D, dt: number, size: StageSize) => void,
): RefObject<StageSize> {
  const frameRef = useRef(frame);
  const sizeRef = useRef<StageSize>({ w: Math.round((height * 16) / 9), h: height });
  frameRef.current = frame;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const w = Math.round(Math.min(height * 2.1, Math.max(height * 1.2, (height * rect.width) / rect.height)));
      sizeRef.current = { w, h: height };
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      frameRef.current(ctx, dt, sizeRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, [canvasRef, height]);

  return sizeRef;
}

/** Hearts that can show a partly drained heart (used when a hazard drains health slowly). */
export function HeartsPill({ hearts, max }: { hearts: number; max: number }) {
  return (
    <span className="arc-pill" aria-label={`${Math.ceil(hearts)} of ${max} hearts left`}>
      {Array.from({ length: max }, (_, index) => {
        const fill = Math.max(0, Math.min(1, hearts - index));
        return (
          <span key={index} className="arc-heart">
            <Heart className="arc-pill__icon text-slate-500" />
            {fill > 0 ? (
              <span className="arc-heart__fill" style={{ width: `${fill * 100}%` }}>
                <Heart className="arc-pill__icon fill-rose-500 text-rose-500" />
              </span>
            ) : null}
          </span>
        );
      })}
    </span>
  );
}

export function ReadyModal({
  eyebrow,
  title,
  howto,
  cta,
  onStart,
}: {
  eyebrow: string;
  title: string;
  howto: ReactNode[];
  cta: string;
  onStart: () => void;
}) {
  return (
    <div className="arc-overlay">
      <div className="arc-modal">
        <p className="arc-modal__eyebrow">{eyebrow}</p>
        <h3 className="arc-modal__title">{title}</h3>
        <ul className="arc-howto">
          {howto.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
        <button type="button" className="arc-cta" onClick={onStart}>
          <Play className="h-5 w-5" /> {cta}
        </button>
      </div>
    </div>
  );
}

export function PausedModal({ onResume }: { onResume: () => void }) {
  return (
    <div className="arc-overlay">
      <div className="arc-modal">
        <h3 className="arc-modal__title">Paused</h3>
        <button type="button" className="arc-cta" onClick={onResume} autoFocus>
          <Play className="h-5 w-5" /> Resume
        </button>
      </div>
    </div>
  );
}

export function Countdown({ value }: { value: number }) {
  return (
    <div className="arc-overlay arc-overlay--clear">
      <span className="arc-count" key={value}>
        {value > 0 ? value : 'GO!'}
      </span>
    </div>
  );
}

export function CorrectToast({ title, text }: { title: string; text: string }) {
  return (
    <div className="arc-toast">
      <p className="arc-toast__title">{title}</p>
      <p className="arc-toast__text">{text}</p>
    </div>
  );
}

function useEnterKey(active: boolean, action: () => void) {
  const actionRef = useRef(action);
  actionRef.current = action;
  useEffect(() => {
    if (!active) return;
    const onKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        actionRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);
}

/** Wrong answer: shows the correct answer, the explanation and the misconception it targets. */
export function WrongFeedback({
  question,
  chosen,
  continueLabel,
  onContinue,
  eyebrow = 'Not quite!',
}: {
  question: ArcadeQuestion;
  chosen: string | null;
  continueLabel: string;
  onContinue: () => void;
  eyebrow?: string;
}) {
  useEnterKey(true, onContinue);
  return (
    <div className="arc-overlay">
      <div className="arc-modal arc-modal--feedback">
        <p className="arc-modal__eyebrow arc-modal__eyebrow--bad">{eyebrow}</p>
        <h3 className="arc-modal__title">{question.prompt}</h3>
        {chosen ? <p className="arc-answer arc-answer--bad">You chose: {chosen}</p> : null}
        <p className="arc-answer arc-answer--good">Correct answer: {question.answer}</p>
        <p className="arc-modal__text">{question.explanation}</p>
        {question.misconception ? <p className="arc-modal__note">Common mix-up: {question.misconception}</p> : null}
        <button type="button" className="arc-cta" onClick={onContinue} autoFocus>
          {continueLabel}
        </button>
      </div>
    </div>
  );
}

/**
 * Multiple-choice question card. Keys 1–4 pick an option; Enter continues after a wrong pick.
 * A right pick shows the explanation and the parent closes it after a short pause.
 */
export function QuizModal({
  eyebrow,
  question,
  options,
  picked,
  onPick,
  onContinue,
  continueLabel,
  className = '',
}: {
  eyebrow: ReactNode;
  question: ArcadeQuestion;
  options: string[];
  picked: string | null;
  onPick: (option: string) => void;
  onContinue: () => void;
  continueLabel: string;
  className?: string;
}) {
  const wrong = picked !== null && picked !== question.answer;
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  useEffect(() => {
    if (picked !== null) return;
    const onKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const index = Number(event.key) - 1;
      if (Number.isInteger(index) && index >= 0 && index < options.length) {
        event.preventDefault();
        pickRef.current(options[index]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [options, picked]);
  useEnterKey(picked !== null, onContinue);

  return (
    <div className="arc-overlay">
      <div className={`arc-modal arc-modal--quiz ${className}`}>
        <p className="arc-modal__eyebrow">{eyebrow}</p>
        <h3 className="arc-modal__title">{question.prompt}</h3>
        <div className="arc-options">
          {options.map((option, index) => {
            const state = !picked ? '' : option === question.answer ? 'good' : option === picked ? 'bad' : 'dim';
            return (
              <button
                key={option}
                type="button"
                className="arc-option"
                data-state={state}
                data-tone={index}
                disabled={picked !== null}
                onClick={() => onPick(option)}
              >
                <span className="arc-option__key">{index + 1}</span>
                {option}
              </button>
            );
          })}
        </div>
        {picked !== null ? (
          <>
            {wrong ? <p className="arc-answer arc-answer--good">Correct answer: {question.answer}</p> : null}
            <p className="arc-modal__text">{question.explanation}</p>
            {wrong && question.misconception ? (
              <p className="arc-modal__note">Common mix-up: {question.misconception}</p>
            ) : null}
            <button type="button" className={wrong ? 'arc-cta' : 'arc-cta arc-cta--ghost'} onClick={onContinue} autoFocus>
              {continueLabel}
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
