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

const PRODUCT_CHECK_TTL_MS = 5 * 60 * 1000;
const productChecks = new Map<string, { problem: string | null; checkedAt: number }>();

/**
 * Returns why a configured product can't be sold as this plan, or null if it matches.
 * Catches swapped env vars and products whose term equals their billing cycle (Dodo expires those after one charge).
 */
export async function dodoProductProblem(
  dodo: DodoPayments,
  productId: string,
  currency: BillingCurrency,
  cycle: BillingCycle,
): Promise<string | null> {
  const key = `${productId}:${currency}:${cycle}`;
  const cached = productChecks.get(key);
  if (cached && Date.now() - cached.checkedAt < PRODUCT_CHECK_TTL_MS) return cached.problem;

  const product = await dodo.products.retrieve(productId);
  const price = product.price;
  const expectedInterval = cycle === 'annual' ? 'Year' : 'Month';
  let problem: string | null = null;
  if (price.type !== 'recurring_price') {
    problem = `${product.name} is not a subscription product`;
  } else if (price.currency !== currency) {
    problem = `${product.name} is priced in ${price.currency}, expected ${currency}`;
  } else if (price.payment_frequency_count !== 1 || price.payment_frequency_interval !== expectedInterval) {
    problem = `${product.name} bills every ${price.payment_frequency_count} ${price.payment_frequency_interval}, expected 1 ${expectedInterval}`;
  } else if (
    price.subscription_period_interval === price.payment_frequency_interval &&
    price.subscription_period_count <= price.payment_frequency_count
  ) {
    problem = `${product.name} has a subscription period equal to its billing cycle, so it would expire after one charge`;
  }
  productChecks.set(key, { problem, checkedAt: Date.now() });
  return problem;
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
