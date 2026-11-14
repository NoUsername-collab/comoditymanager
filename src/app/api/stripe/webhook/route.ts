/**
 * POST /api/stripe/webhook
 *
 * Stripe's notifications about subscriptions (paid, changed, cancelled, card
 * failed). The signature is checked against STRIPE_WEBHOOK_SECRET on the raw
 * body; each event is applied once, and a failure answers 500 so Stripe
 * sends it again.
 */

import { NextResponse, type NextRequest } from "next/server";
import { getStripeConfig } from "@/lib/billing/stripe";
import { verifyStripeSignature } from "@/lib/billing/stripe-signature";
import { applyStripeEvent, type StripeEvent } from "@/services/billing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const config = getStripeConfig();
  if (!config) return NextResponse.json({ error: "billing not configured" }, { status: 503 });

  const payload = await request.text();
  if (!verifyStripeSignature(payload, request.headers.get("stripe-signature"), config.webhookSecret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(payload) as StripeEvent;
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  try {
    const outcome = await applyStripeEvent(event);
    return NextResponse.json({ received: true, outcome });
  } catch (error) {
    console.error("[stripe-webhook] failed", event.type, event.id, error);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }
}
