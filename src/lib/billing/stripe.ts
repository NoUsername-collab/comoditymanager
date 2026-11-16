import type { StripePrices } from "@/domain/billing/subscription";

/*
 * A small client for the few Stripe endpoints Zalmox uses (Checkout, the
 * customer portal, reading a subscription). Stripe's API takes form-encoded
 * bodies with bracketed keys: line_items[0][price]=…
 */

const STRIPE_API = "https://api.stripe.com/v1";

export type StripeConfig = {
  secretKey: string;
  webhookSecret: string;
  prices: StripePrices;
};

/** Stripe's settings from the environment, or null while card payment is not set up. */
export function getStripeConfig(): StripeConfig | null {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const essential = process.env.STRIPE_PRICE_LIGHT?.trim();
  const professional = process.env.STRIPE_PRICE_PRO?.trim();
  if (!secretKey || !webhookSecret || !essential || !professional) return null;
  return { secretKey, webhookSecret, prices: { essential, professional } };
}

type FormValue =
  string | number | boolean | null | undefined | FormValue[] | { [key: string]: FormValue };

/** Stripe's form encoding of nested parameters. */
export function encodeStripeForm(params: Record<string, FormValue>): string {
  const pairs: string[] = [];
  const walk = (prefix: string, value: FormValue) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(`${prefix}[${index}]`, item));
      return;
    }
    if (typeof value === "object") {
      for (const [key, inner] of Object.entries(value)) walk(`${prefix}[${key}]`, inner);
      return;
    }
    pairs.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(String(value))}`);
  };
  for (const [key, value] of Object.entries(params)) walk(key, value);
  return pairs.join("&");
}

export class StripeApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null,
  ) {
    super(message);
  }
}

export async function stripeRequest<T>(
  config: StripeConfig,
  method: "GET" | "POST",
  path: string,
  params?: Record<string, FormValue>,
  idempotencyKey?: string,
): Promise<T> {
  const body = params ? encodeStripeForm(params) : undefined;
  const url = method === "GET" && body ? `${STRIPE_API}${path}?${body}` : `${STRIPE_API}${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${config.secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": "2024-06-20",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: method === "POST" ? body : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await response.json().catch(() => ({}))) as {
    error?: { message?: string; code?: string };
  } & T;
  if (!response.ok) {
    throw new StripeApiError(
      json.error?.message ?? `Stripe ${response.status}`,
      response.status,
      json.error?.code ?? null,
    );
  }
  return json;
}
