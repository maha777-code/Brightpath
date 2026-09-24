import { useState, type FormEvent } from 'react';
import { CheckCircle2, Loader2, MessageSquareHeart, Send, Star, X } from 'lucide-react';
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

  if (!isOpen) return null;

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
      setToast('Feedback sent. Thank you.');
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

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
        <div className="relative w-full max-w-md space-y-6 rounded-3xl border border-slate-800/90 bg-[#0b101d] p-6 shadow-2xl sm:p-8">
          <button
            type="button"
            onClick={close}
            className="absolute right-5 top-5 cursor-pointer appearance-none border-0 bg-transparent text-slate-400 hover:text-white"
            aria-label="Close feedback"
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
            <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-3 text-cyan-400">
                  <MessageSquareHeart className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Share Your Feedback</h2>
                  <p className="text-xs text-slate-400">Help us tailor your MindVault experience.</p>
                </div>
              </div>

              <div className="space-y-2 rounded-2xl border border-slate-800/80 bg-[#060911] p-4 text-center">
                <span className="block text-xs font-semibold text-slate-300">How would you rate your experience?</span>
                <div className="flex justify-center gap-2 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="cursor-pointer appearance-none border-0 bg-transparent p-0 transition-transform hover:scale-110"
                      aria-label={`${star} star${star === 1 ? '' : 's'}`}
                    >
                      <Star
                        className={`h-7 w-7 ${active >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`}
                      />
                    </button>
                  ))}
                </div>
                <span className="block h-4 text-[11px] font-bold text-amber-400">{RATING_LABELS[active] ?? ''}</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300" htmlFor="feedback-category">
                  Feedback Type
                </label>
                <select
                  id="feedback-category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="w-full cursor-pointer appearance-none rounded-xl border border-slate-800 bg-[#060911] px-3.5 py-2.5 text-xs text-slate-200 focus:border-cyan-400 focus:outline-none"
                  style={{ backgroundColor: '#060911', color: '#e2e8f0' }}
                >
                  {CATEGORIES.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300" htmlFor="feedback-comments">
                  Your Thoughts
                </label>
                <textarea
                  id="feedback-comments"
                  value={comments}
                  onChange={(event) => setComments(event.target.value)}
                  placeholder="Tell us what you love or how we can improve MindVault..."
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-800 bg-[#060911] p-3 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              {error ? <p className="text-xs font-semibold text-rose-300">{error}</p> : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full cursor-pointer appearance-none items-center justify-center gap-2 rounded-xl border border-cyan-400 bg-cyan-500 py-3 text-xs font-extrabold text-black shadow-lg shadow-cyan-500/20 hover:bg-cyan-400 disabled:opacity-50"
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
            </form>
          )}
        </div>
      </div>
      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl border border-emerald-500/30 bg-emerald-950 px-4 py-3 text-sm font-semibold text-emerald-100 shadow-lg">
          {toast}
        </div>
      ) : null}
    </>
  );
}
