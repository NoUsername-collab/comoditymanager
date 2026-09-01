import { beforeEach, describe, expect, it, vi } from "vitest";

const mfa = {
  listFactors: vi.fn(),
  enroll: vi.fn(),
  unenroll: vi.fn(),
  challenge: vi.fn(),
  verify: vi.fn(),
};
const refreshSession = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { mfa, refreshSession },
  }),
}));

import {
  confirmTotpEnrollment,
  getTotpEnrollmentStatus,
  refreshBrowserAuthSession,
  startTotpEnrollment,
  unenrollAllTotpFactors,
  verifyTotpChallenge,
} from "@/lib/auth/mfa-browser";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getTotpEnrollmentStatus", () => {
  it("reports verified TOTP as enrolled", async () => {
    mfa.listFactors.mockResolvedValue({
      data: { totp: [{ status: "verified" }] },
      error: null,
    });
    await expect(getTotpEnrollmentStatus()).resolves.toEqual({
      ok: true,
      enrolled: true,
    });
  });

  it("fails closed when listing factors errors", async () => {
    mfa.listFactors.mockResolvedValue({ data: null, error: { message: "nope" } });
    await expect(getTotpEnrollmentStatus()).resolves.toEqual({ ok: false });
  });
});

describe("startTotpEnrollment", () => {
  it("returns secret and uri after enroll", async () => {
    mfa.listFactors.mockResolvedValue({ data: { totp: [] }, error: null });
    mfa.enroll.mockResolvedValue({
      data: { id: "fac-1", totp: { secret: "ABCD", uri: "otpauth://x" } },
      error: null,
    });
    await expect(startTotpEnrollment()).resolves.toEqual({
      ok: true,
      factorId: "fac-1",
      secret: "ABCD",
      uri: "otpauth://x",
    });
  });
});

describe("verifyTotpChallenge", () => {
  it("returns no_factor when nothing is verified", async () => {
    mfa.listFactors.mockResolvedValue({
      data: { totp: [{ id: "x", status: "unverified" }] },
      error: null,
    });
    await expect(verifyTotpChallenge("123456")).resolves.toEqual({
      ok: false,
      reason: "no_factor",
    });
  });

  it("verifies a verified factor", async () => {
    mfa.listFactors.mockResolvedValue({
      data: { totp: [{ id: "fac-1", status: "verified" }] },
      error: null,
    });
    mfa.challenge.mockResolvedValue({ data: { id: "ch-1" }, error: null });
    mfa.verify.mockResolvedValue({ error: null });
    await expect(verifyTotpChallenge("123456")).resolves.toEqual({ ok: true });
    expect(mfa.verify).toHaveBeenCalledWith({
      factorId: "fac-1",
      challengeId: "ch-1",
      code: "123456",
    });
  });
});

describe("confirmTotpEnrollment", () => {
  it("maps verify errors to invalid_code", async () => {
    mfa.challenge.mockResolvedValue({ data: { id: "ch-1" }, error: null });
    mfa.verify.mockResolvedValue({ error: { message: "bad" } });
    await expect(
      confirmTotpEnrollment({ factorId: "fac-1", code: "000000" })
    ).resolves.toEqual({ ok: false, reason: "invalid_code" });
  });
});

describe("unenrollAllTotpFactors", () => {
  it("unenrolls each listed factor", async () => {
    mfa.listFactors.mockResolvedValue({
      data: { totp: [{ id: "a" }, { id: "b" }] },
      error: null,
    });
    mfa.unenroll.mockResolvedValue({ error: null });
    await expect(unenrollAllTotpFactors()).resolves.toEqual({ ok: true });
    expect(mfa.unenroll).toHaveBeenCalledTimes(2);
  });
});

describe("refreshBrowserAuthSession", () => {
  it("refreshes the browser session", async () => {
    refreshSession.mockResolvedValue({ data: {}, error: null });
    await refreshBrowserAuthSession();
    expect(refreshSession).toHaveBeenCalledTimes(1);
  });
});
