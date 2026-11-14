import { createHmac, timingSafeEqual } from "node:crypto";

/** How old a signed webhook may be before it is refused (Stripe's own default). */
const TOLERANCE_SECONDS = 300;

/**
 * Checks a Stripe webhook's `Stripe-Signature` header against the raw body:
 * t=<unix time>,v1=<HMAC-SHA256 of "t.body" with the endpoint secret>. Any v1
 * may match (Stripe sends several while a secret is being rolled).
 */
export function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  if (!header || !secret) return false;
  let timestamp: number | null = null;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const [key, value] = part.split("=", 2);
    if (key === "t") timestamp = Number(value);
    else if (key === "v1" && value) signatures.push(value);
  }
  if (timestamp == null || !Number.isFinite(timestamp) || signatures.length === 0) return false;
  if (Math.abs(nowSeconds - timestamp) > TOLERANCE_SECONDS) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`, "utf8").digest();
  return signatures.some((signature) => {
    if (!/^[0-9a-f]{64}$/i.test(signature)) return false;
    const given = Buffer.from(signature, "hex");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

/** Builds a header as Stripe does; for tests. */
export function signStripePayload(payload: string, secret: string, timestamp: number): string {
  const v1 = createHmac("sha256", secret).update(`${timestamp}.${payload}`, "utf8").digest("hex");
  return `t=${timestamp},v1=${v1}`;
}
