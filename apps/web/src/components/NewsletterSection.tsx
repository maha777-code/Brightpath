import { useState, type FormEvent } from 'react';
import { api } from '@/lib/api';

export function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubscribe = async (event: FormEvent) => {
    event.preventDefault();
    if (!email) return;

    setLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      await api.subscribeNewsletter(email);
      setStatus('success');
      setMessage('Subscribed successfully! Check your inbox.');
      setEmail('');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bp-newsletter space-y-3">
      <h4 className="bp-footer-news-title text-2xl font-semibold tracking-tight text-white">
        Stay updated with MindVault
      </h4>
      <p className="bp-footer-news-desc max-w-xl text-lg leading-relaxed text-slate-400">
        Get the latest AI education insights, feature updates, and classroom tools delivered to
        your inbox.
      </p>

      <form onSubmit={handleSubscribe} className="space-y-3 pt-1">
        <div className="flex max-w-lg flex-col items-stretch gap-3 sm:flex-row">
          <label htmlFor="mindvault-newsletter" className="sr-only">
            Email
          </label>
          <input
            id="mindvault-newsletter"
            type="email"
            required
            value={email}
            disabled={loading}
            placeholder="Enter your email"
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            className="bp-footer-input flex-1 rounded-xl bg-[#e8f0fe] px-4 py-3 text-lg font-medium text-slate-900 placeholder-slate-500 outline-none ring-0 transition focus:ring-2 focus:ring-cyan-400 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="bp-footer-submit flex min-w-[120px] items-center justify-center rounded-xl bg-[#00b4d8] px-6 py-3 text-lg font-bold text-slate-950 shadow-sm transition-colors hover:bg-[#0096c7] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Subscribing...' : 'Subscribe'}
          </button>
        </div>

        {status === 'success' ? (
          <p className="bp-newsletter-ok pt-1 text-sm font-medium text-emerald-400" role="status">
            ✓ {message}
          </p>
        ) : null}
        {status === 'error' ? (
          <p className="bp-newsletter-err pt-1 text-sm font-medium text-rose-400" role="alert">
            ✕ {message}
          </p>
        ) : null}
      </form>
    </div>
  );
}
