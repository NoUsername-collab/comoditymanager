import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAnafRuntimeConfig,
  isAnafSubmissionAvailable,
  shouldEnqueueAnafSubmission,
} from "@/lib/fiscal/anaf-config";

const anaf = { provider: "anaf" as const, anafEnabled: true };

describe("sending invoices to ANAF", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is not offered and queues nothing while the real upload does not exist", () => {
    vi.stubEnv("ANAF_STUB", "");
    vi.stubEnv("ANAF_CLIENT_ID", "");
    vi.stubEnv("ANAF_CLIENT_SECRET", "");
    expect(isAnafSubmissionAvailable()).toBe(false);
    expect(getAnafRuntimeConfig().stubMode).toBe(false);
    expect(shouldEnqueueAnafSubmission(anaf, "RO")).toBe(false);
  });

  it("never pretends on the live site, even when the stand-in is asked for", () => {
    vi.stubEnv("ANAF_STUB", "true");
    vi.stubEnv("VERCEL_ENV", "production");
    expect(getAnafRuntimeConfig().stubMode).toBe(false);
    expect(shouldEnqueueAnafSubmission(anaf, "RO")).toBe(false);
  });

  it("runs the stand-in only when asked for by name, outside production", () => {
    vi.stubEnv("ANAF_STUB", "true");
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(shouldEnqueueAnafSubmission(anaf, "RO")).toBe(true);
    expect(shouldEnqueueAnafSubmission(anaf, "MD")).toBe(false);
  });
});
