/*
 * Cloudflare Turnstile: a check that a form was sent by a person, without a
 * puzzle for most visitors. The public booking request and the sign-up carry
 * its token ("cf-turnstile-response"); the server asks Cloudflare whether it
 * is valid. With no keys set the check is off, as in development.
 */

import { turnstileCoversHost, turnstilePlatformDomain } from "@/lib/security/turnstile-hosts";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
export const TURNSTILE_FIELD = "cf-turnstile-response";

export function isTurnstileEnabled(): boolean {
  return Boolean(
    process.env.TURNSTILE_SECRET_KEY?.trim() && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim(),
  );
}

export type TurnstileOutcome = "passed" | "off" | "missing" | "rejected" | "unavailable";

/**
 * Checks the token a form carried. "unavailable" (Cloudflare did not answer)
 * lets the form through: the rate limits still apply, and a guest's booking
 * must not fail because a third party is down. A missing or rejected token
 * does not pass.
 */
export async function verifyTurnstileToken(
  token: string | null,
  remoteIp: string | null,
  host: string | null,
): Promise<TurnstileOutcome> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret || !isTurnstileEnabled()) return "off";
  // Only where the widget can load (see turnstile-hosts.ts).
  if (!turnstileCoversHost(host, turnstilePlatformDomain())) return "off";
  if (!token?.trim()) return "missing";

  const body = new URLSearchParams({ secret, response: token.trim() });
  if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);
  try {
    const response = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return "unavailable";
    const result = (await response.json()) as { success?: boolean; "error-codes"?: string[] };
    if (result.success) return "passed";
    // Cloudflare's own failure, not the visitor's: let it through.
    if (result["error-codes"]?.includes("internal-error")) return "unavailable";
    return "rejected";
  } catch {
    return "unavailable";
  }
}

/** Whether the outcome lets the form be processed. */
export function turnstileAllows(outcome: TurnstileOutcome): boolean {
  if (outcome === "unavailable")
    console.error("[turnstile] Cloudflare did not answer; form let through");
  return outcome === "passed" || outcome === "off" || outcome === "unavailable";
}
