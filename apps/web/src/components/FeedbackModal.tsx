import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Loader2, MessageSquare, Send, Star, X } from 'lucide-react';
import { api } from '@/lib/api';

const CATEGORIES = [
  'General Feedback',
  'Feature Request',
  'Report a Bug',
  'AI Accuracy / Content Quality',
] as const;

const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
};

export interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [category, setCategory] = useState<string>(CATEGORIES[0]);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const reset = () => {
    setRating(0);
    setHoverRating(0);
    setCategory(CATEGORIES[0]);
    setComments('');
    setError('');
    setIsSubmitted(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (rating === 0) {
      setError('Please select a star rating before submitting.');
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await api.submitFeedback({
        rating,
        category,
        comments: comments.trim(),
        pageUrl: window.location.pathname,
      });
      setIsSubmitted(true);
      setToast('Thank you for your feedback!');
      window.setTimeout(() => {
        setToast('');
        reset();
        onClose();
      }, 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send feedback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const active = hoverRating || rating;

  return createPortal(
    <>
      <div
        className="animate-fadeIn fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md"
        onClick={close}
        role="presentation"
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-dialog-title"
          className="relative w-full max-w-lg rounded-3xl border border-slate-800/90 bg-slate-900/90 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl md:max-w-xl md:p-8"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={close}
            className="absolute right-5 top-5 cursor-pointer appearance-none rounded-full border-0 bg-slate-800/50 p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            aria-label="Close feedback dialog"
          >
            <X className="h-5 w-5" />
          </button>

          {isSubmitted ? (
            <div className="space-y-3 py-8 text-center">
              <div className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-400">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <h3 className="text-xl font-extrabold text-white">Thank You for Your Feedback!</h3>
              <p className="text-xs text-slate-400">Your input helps us continuously improve MindVault.</p>
            </div>
          ) : (
            <form onSubmit={(event) => void handleSubmit(event)}>
              <div className="mb-6 flex items-center gap-4 pr-10">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-400 shadow-inner">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <div>
                  <h2 id="feedback-dialog-title" className="text-xl font-bold tracking-tight text-white md:text-2xl">
                    Share Your Feedback
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-400 md:text-sm">Help us tailor your MindVault experience.</p>
                </div>
              </div>

              <div className="mb-6 rounded-2xl border border-slate-800/80 bg-slate-950/50 p-4 text-center">
                <label className="mb-3 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  How would you rate your experience?
                </label>
                <div className="flex justify-center gap-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="cursor-pointer appearance-none border-0 bg-transparent p-0 transition-transform hover:scale-125 focus:outline-none"
                      aria-label={`${star} star${star === 1 ? '' : 's'}`}
                    >
                      <Star
                        className={`h-7 w-7 transition-colors md:h-8 md:w-8 ${
                          active >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-600 hover:text-slate-400'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <span className="mt-2 block h-4 text-[11px] font-bold text-amber-400">{RATING_LABELS[active] ?? ''}</span>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300"
                    htmlFor="feedback-category"
                  >
                    Feedback Type
                  </label>
                  <select
                    id="feedback-category"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className="w-full cursor-pointer appearance-none rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    style={{ backgroundColor: '#020617', color: '#e2e8f0' }}
                  >
                    {CATEGORIES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300"
                    htmlFor="feedback-comments"
                  >
                    Your Thoughts
                  </label>
                  <textarea
                    id="feedback-comments"
                    rows={4}
                    value={comments}
                    onChange={(event) => setComments(event.target.value)}
                    placeholder="Tell us what you love or how we can improve MindVault..."
                    className="w-full resize-none rounded-xl border border-slate-800 bg-slate-950/80 p-3.5 text-sm text-slate-200 outline-none placeholder:text-slate-500 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  />
                </div>

                {error ? <p className="text-xs font-semibold text-rose-300">{error}</p> : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-2 flex w-full cursor-pointer appearance-none items-center justify-center gap-2 rounded-xl border-0 bg-cyan-500 py-3 text-sm font-bold tracking-wide text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all hover:bg-cyan-400 hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> Submit Feedback
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-[90] -translate-x-1/2 rounded-xl border border-emerald-500/30 bg-emerald-950 px-4 py-3 text-sm font-semibold text-emerald-100 shadow-lg">
          {toast}
        </div>
      ) : null}
    </>,
    document.body,
  );
}
