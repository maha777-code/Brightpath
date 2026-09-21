import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';

export function NewsletterSubscribe() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubscribe = async (event: FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      await api.subscribeNewsletter(email.trim());
      setStatus('success');
      setMessage('Subscribed successfully! Check your inbox for confirmation.');
      setEmail('');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bp-newsletter space-y-3">
      <h4 className="bp-footer-news-title text-2xl font-semibold text-white">Stay updated with MindVault</h4>
      <p className="bp-footer-news-desc text-lg text-slate-400">
        Get the latest AI education insights, feature updates, and classroom tools delivered to your
        inbox.
      </p>
      <form onSubmit={handleSubscribe} className="space-y-3 pt-1">
        <div className="flex max-w-md gap-2">
          <label htmlFor="mindvault-newsletter" className="sr-only">
            School email
          </label>
          <input
            id="mindvault-newsletter"
            type="email"
            required
            autoComplete="email"
            value={email}
            disabled={loading}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your school email"
            className="bp-footer-input w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-lg text-white placeholder-slate-500 transition-colors focus:border-cyan-500 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="bp-footer-submit flex min-w-[140px] shrink-0 items-center justify-center rounded-xl bg-cyan-500 px-6 py-3 text-lg font-bold text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.2)] transition-all hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Subscribing...' : 'Subscribe'}
          </button>
        </div>
        {status === 'success' ? (
          <p className="bp-newsletter-ok rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-sm font-medium text-emerald-400" role="status">
            ✓ {message}
          </p>
        ) : null}
        {status === 'error' ? (
          <p className="bp-newsletter-err rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-sm font-medium text-rose-400" role="alert">
            ✕ {message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
