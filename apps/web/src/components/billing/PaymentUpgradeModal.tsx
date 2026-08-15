import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { PlanType } from '@brightpath/shared';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

type Interval = 'monthly' | 'yearly';
type BillablePlan = Extract<
  PlanType,
  'teacher_pro' | 'tutor_center_pro' | 'family_plan' | 'school_enterprise'
>;

async function loadRazorpayScript() {
  if (window.Razorpay) return;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
    document.body.appendChild(s);
  });
}

export function PaymentUpgradeModal({
  open,
  onClose,
  defaultPlan = 'teacher_pro',
}: {
  open: boolean;
  onClose: () => void;
  defaultPlan?: BillablePlan;
}) {
  const [planType, setPlanType] = useState<BillablePlan>(defaultPlan);
  const [interval, setInterval] = useState<Interval>('monthly');
  const [busy, setBusy] = useState<'stripe' | 'razorpay' | null>(null);
  const [error, setError] = useState('');

  if (!open) return null;

  const startStripe = async () => {
    setBusy('stripe');
    setError('');
    try {
      const res = await api.createStripeCheckout({ planType, interval });
      if (res.url) window.location.href = res.url;
      else setError('No checkout URL returned');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Stripe checkout failed');
    } finally {
      setBusy(null);
    }
  };

  const startRazorpay = async () => {
    setBusy('razorpay');
    setError('');
    try {
      await loadRazorpayScript();
      const order = await api.createRazorpayOrder({ planType, interval });
      if (!window.Razorpay) throw new Error('Razorpay SDK unavailable');
      const rzp = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'BrightPath',
        description: `${planType} (${interval})`,
        order_id: order.orderId,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await api.verifyRazorpayPayment({
              ...response,
              planType,
              interval,
            });
            onClose();
            window.location.reload();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Payment verification failed');
          }
        },
      });
      rzp.open();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Razorpay failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-slate-800">Upgrade plan</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="mb-3 block text-xs font-bold text-slate-500">
          Plan
          <select
            className="mt-1 w-full rounded-xl border px-3 py-2 text-sm font-semibold"
            value={planType}
            onChange={(e) => setPlanType(e.target.value as BillablePlan)}
          >
            <option value="teacher_pro">Teacher Pro</option>
            <option value="tutor_center_pro">Tutor Center Pro</option>
            <option value="family_plan">Family Plan</option>
            <option value="school_enterprise">School Enterprise</option>
          </select>
        </label>

        <div className="mb-4 flex rounded-xl bg-slate-100 p-1">
          {(['monthly', 'yearly'] as const).map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setInterval(i)}
              className={[
                'flex-1 rounded-lg py-2 text-sm font-bold',
                interval === i ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500',
              ].join(' ')}
            >
              {i === 'monthly' ? 'Monthly' : 'Yearly'}
            </button>
          ))}
        </div>

        {error && <p className="mb-3 text-sm font-semibold text-rose-600">{error}</p>}

        <div className="grid gap-2">
          <button
            type="button"
            disabled={!!busy}
            onClick={() => void startStripe()}
            className="rounded-xl bg-[#635BFF] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {busy === 'stripe' ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Pay with Stripe'}
          </button>
          <button
            type="button"
            disabled={!!busy}
            onClick={() => void startRazorpay()}
            className="rounded-xl bg-[#0C2454] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {busy === 'razorpay' ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            ) : (
              'Pay with Razorpay'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
