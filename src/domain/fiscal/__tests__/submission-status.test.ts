import { describe, expect, it } from "vitest";
import {
  buildIdempotencyKey,
  buildPayloadHash,
  canTransitionFiscalStatus,
  computeRetryBackoffMs,
  isFiscalRetryEligible,
  resolveStatusAfterSubmit,
} from "../submission-status";

describe("fiscal submission idempotency", () => {
  it("builds stable keys per tenant and invoice", () => {
    const tenant = "11111111-1111-1111-1111-111111111111";
    const invoice = "22222222-2222-2222-2222-222222222222";
    expect(buildIdempotencyKey(tenant, invoice)).toBe(
      `fiscal:${tenant}:${invoice}`
    );
    expect(buildIdempotencyKey(tenant, invoice)).toBe(
      buildIdempotencyKey(tenant, invoice)
    );
    expect(buildIdempotencyKey(tenant, "other")).not.toBe(
      buildIdempotencyKey(tenant, invoice)
    );
  });

  it("hashes payload deterministically", () => {
    const payload = { b: 2, a: 1 };
    expect(buildPayloadHash(payload)).toBe(buildPayloadHash({ a: 1, b: 2 }));
    expect(buildPayloadHash({ a: 1 })).not.toBe(buildPayloadHash({ a: 2 }));
  });
});

describe("fiscal submission status transitions", () => {
  it("allows pending to submitted and terminal states", () => {
    expect(canTransitionFiscalStatus("pending", "submitted")).toBe(true);
    expect(canTransitionFiscalStatus("pending", "accepted")).toBe(true);
    expect(canTransitionFiscalStatus("pending", "rejected")).toBe(false);
    expect(canTransitionFiscalStatus("submitted", "accepted")).toBe(true);
    expect(canTransitionFiscalStatus("accepted", "pending")).toBe(false);
  });

  it("allows failed to retry via pending", () => {
    expect(canTransitionFiscalStatus("failed", "pending")).toBe(true);
  });

  it("maps submit results to status", () => {
    expect(resolveStatusAfterSubmit({ status: "submitted" })).toBe("submitted");
    expect(resolveStatusAfterSubmit({ status: "accepted" })).toBe("accepted");
  });
});

describe("fiscal submission retry eligibility", () => {
  it("uses exponential backoff", () => {
    expect(computeRetryBackoffMs(1)).toBe(60_000);
    expect(computeRetryBackoffMs(2)).toBe(120_000);
    expect(computeRetryBackoffMs(10)).toBe(15 * 60_000);
  });

  it("requires backoff elapsed before retry", () => {
    const updatedAt = new Date("2026-01-01T12:00:00Z");
    expect(
      isFiscalRetryEligible({
        status: "failed",
        attemptCount: 1,
        maxAttempts: 5,
        updatedAt,
        now: new Date("2026-01-01T12:00:30Z"),
      })
    ).toBe(false);
    expect(
      isFiscalRetryEligible({
        status: "failed",
        attemptCount: 1,
        maxAttempts: 5,
        updatedAt,
        now: new Date("2026-01-01T12:02:00Z"),
      })
    ).toBe(true);
  });

  it("blocks retry when max attempts reached", () => {
    expect(
      isFiscalRetryEligible({
        status: "failed",
        attemptCount: 5,
        maxAttempts: 5,
        updatedAt: new Date("2020-01-01"),
        now: new Date("2030-01-01"),
      })
    ).toBe(false);
  });
});
