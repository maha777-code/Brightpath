import DodoPayments from 'dodopayments';
import {
  CHECKOUT_PLAN_IDS,
  dodoProductEnvKey,
  type BillingCurrency,
  type BillingCycle,
  type CheckoutPlanId,
} from '@brightpath/shared';

const CURRENCIES: BillingCurrency[] = ['INR', 'USD'];
const CYCLES: BillingCycle[] = ['monthly', 'annual'];

let client: DodoPayments | null | undefined;

/** Anything other than an explicit live setting stays in test mode so real cards are never charged by accident. */
export function dodoEnvironment(): 'live_mode' | 'test_mode' {
  const env = process.env.DODO_PAYMENTS_ENVIRONMENT?.trim();
  const mode = process.env.DODO_PAYMENTS_MODE?.trim();
  return env === 'live_mode' || mode === 'live' ? 'live_mode' : 'test_mode';
}

export function dodoWebhookKey(): string | null {
  return process.env.DODO_PAYMENTS_WEBHOOK_KEY?.trim() || process.env.DODO_PAYMENTS_WEBHOOK_SECRET?.trim() || null;
}

export function getDodo(): DodoPayments | null {
  if (client !== undefined) return client;
  const bearerToken = process.env.DODO_PAYMENTS_API_KEY?.trim();
  client = bearerToken
    ? new DodoPayments({ bearerToken, environment: dodoEnvironment(), webhookKey: dodoWebhookKey() })
    : null;
  return client;
}

export function dodoProductId(planId: CheckoutPlanId, currency: BillingCurrency, cycle: BillingCycle): string | null {
  return process.env[dodoProductEnvKey(planId, currency, cycle)]?.trim() || null;
}

export interface DodoProductRef {
  planId: CheckoutPlanId;
  currency: BillingCurrency;
  cycle: BillingCycle;
}

/** Maps a Dodo product id back to the MindVault plan it was configured for. */
export function planForDodoProduct(productId: string): DodoProductRef | null {
  for (const planId of CHECKOUT_PLAN_IDS) {
    for (const currency of CURRENCIES) {
      for (const cycle of CYCLES) {
        if (dodoProductId(planId, currency, cycle) === productId) return { planId, currency, cycle };
      }
    }
  }
  return null;
}
