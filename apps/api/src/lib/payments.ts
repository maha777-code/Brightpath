import Stripe from 'stripe';
import Razorpay from 'razorpay';

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export function getRazorpay(): Razorpay | null {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) return null;
  return new Razorpay({ key_id, key_secret });
}

export function stripePriceId(planType: string, interval: 'monthly' | 'yearly'): string | null {
  const map: Record<string, { monthly: string; yearly: string }> = {
    teacher_pro: {
      monthly: process.env.STRIPE_PRICE_TEACHER_PRO_MONTHLY ?? '',
      yearly: process.env.STRIPE_PRICE_TEACHER_PRO_YEARLY ?? '',
    },
    tutor_center_pro: {
      monthly: process.env.STRIPE_PRICE_CENTER_PRO_MONTHLY ?? '',
      yearly: process.env.STRIPE_PRICE_CENTER_PRO_YEARLY ?? '',
    },
    family_plan: {
      monthly: process.env.STRIPE_PRICE_FAMILY_MONTHLY ?? '',
      yearly: process.env.STRIPE_PRICE_FAMILY_YEARLY ?? '',
    },
    school_enterprise: {
      monthly: process.env.STRIPE_PRICE_SCHOOL_MONTHLY ?? '',
      yearly: process.env.STRIPE_PRICE_SCHOOL_YEARLY ?? '',
    },
  };
  const entry = map[planType];
  if (!entry) return null;
  const id = interval === 'yearly' ? entry.yearly : entry.monthly;
  return id || null;
}
