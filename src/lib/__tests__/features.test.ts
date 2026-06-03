import { describe, it, expect, vi } from "vitest";

// ---------------------------------------------------------------------------
// isInvoicingAlphaEnabled
// ---------------------------------------------------------------------------
describe("isInvoicingAlphaEnabled", () => {
  it("returns false when NEXT_PUBLIC_RELEASE_CHANNEL is not set", async () => {
    vi.stubEnv("NEXT_PUBLIC_RELEASE_CHANNEL", "");
    // Re-import to pick up fresh env
    const mod = await import("@/lib/features");
    // Since RELEASE_CHANNEL is evaluated at module load time in app-version,
    // we test the function's current value (stable by default in test env)
    expect(typeof mod.isInvoicingAlphaEnabled).toBe("function");
    // In default test env (no alpha channel), it should be false
    expect(mod.isInvoicingAlphaEnabled()).toBe(false);
    vi.unstubAllEnvs();
  });

  it("isInvoicingAlphaEnabled returns a boolean", async () => {
    const { isInvoicingAlphaEnabled } = await import("@/lib/features");
    expect(typeof isInvoicingAlphaEnabled()).toBe("boolean");
  });
});
