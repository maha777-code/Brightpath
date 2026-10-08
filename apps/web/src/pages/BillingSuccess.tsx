import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
import { CHECKOUT_PLANS, isCheckoutPlanId } from '@brightpath/shared';
import { BrandLogo } from '@/components/Navigation/BrandLogo';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

type Phase = 'confirming' | 'active' | 'failed' | 'delayed';

const POLL_MS = 3000;
const MAX_POLLS = 20;
const FAILED_STATUSES = ['failed', 'cancelled', 'expired'];

export default function BillingSuccess() {
  const [params] = useSearchParams();
  const { refresh, homePath, role, loading } = useAuth();
  const planId = params.get('plan');
  const plan = isCheckoutPlanId(planId) ? CHECKOUT_PLANS[planId] : null;
  const subscriptionId = params.get('subscription_id');
  const returnedFailed = FAILED_STATUSES.includes(params.get('status') ?? '');
  const [phase, setPhase] = useState<Phase>(returnedFailed ? 'failed' : plan ? 'confirming' : 'delayed');

  useEffect(() => {
    if (!plan || returnedFailed || loading) return;
    if (!role) {
      setPhase('delayed');
      return;
    }
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      attempts += 1;
      try {
        const { status } = await api.dodoSubscription(plan.id, subscriptionId);
        if (cancelled) return;
        if (status === 'active' || status === 'past_due') {
          await refresh();
          if (!cancelled) setPhase('active');
          return;
        }
        if (FAILED_STATUSES.includes(status)) {
          setPhase('failed');
          return;
        }
      } catch {
        /* keep polling: the webhook may not have landed yet */
      }
      if (cancelled) return;
      if (attempts >= MAX_POLLS) setPhase('delayed');
      else timer = setTimeout(poll, POLL_MS);
    };

    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [plan, subscriptionId, returnedFailed, role, loading, refresh]);

  const title = plan?.title ?? 'your plan';
  const content: Record<Phase, { icon: React.ReactNode; heading: string; body: string }> = {
    confirming: {
      icon: <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />,
      heading: 'Confirming your payment…',
      body: `We're activating ${title}. This usually takes a few seconds.`,
    },
    active: {
      icon: <CheckCircle2 className="h-10 w-10 text-emerald-400" />,
      heading: `${title} is active`,
      body: 'Thanks for subscribing to MindVault. Your new features are ready to use.',
    },
    failed: {
      icon: <XCircle className="h-10 w-10 text-rose-400" />,
      heading: 'Payment not completed',
      body: 'No subscription was started. You can try again from the pricing page.',
    },
    delayed: {
      icon: <Clock className="h-10 w-10 text-amber-400" />,
      heading: 'Still processing',
      body: `Your payment is being confirmed. ${title} will switch on automatically once it clears — you can safely leave this page.`,
    },
  };
  const current = content[phase];

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-slate-950 px-4 py-10 text-slate-100">
      <BrandLogo variant="full" to="/" imgClassName="mb-12 h-12 w-auto object-contain" />
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center">
        {current.icon}
        <h1 className="text-2xl font-extrabold text-white">{current.heading}</h1>
        <p className="text-sm text-slate-400">{current.body}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          {phase === 'failed' ? (
            <Link
              to="/pricing"
              className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-5 py-2.5 text-sm font-bold text-cyan-300 hover:bg-cyan-500/20"
            >
              Back to pricing
            </Link>
          ) : null}
          <Link
            to={role ? homePath : '/login'}
            className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-bold text-slate-100 hover:border-slate-500"
          >
            {role ? 'Go to dashboard' : 'Log in'}
          </Link>
        </div>
      </div>
    </div>
  );
}
