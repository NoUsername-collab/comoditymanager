import { beforeEach, describe, expect, it, vi } from "vitest";

const { getPlatformAdminWithMfaOrNull, capturePlatformAdminError } = vi.hoisted(
  () => ({
    getPlatformAdminWithMfaOrNull: vi.fn(),
    capturePlatformAdminError: vi.fn(),
  })
);

vi.mock("@/lib/auth/require-platform-admin", () => ({
  getPlatformAdminWithMfaOrNull,
}));

vi.mock("@/services/dev-logs", () => ({
  capturePlatformAdminError,
}));

describe("hospira logs probe actions", () => {
  beforeEach(() => {
    getPlatformAdminWithMfaOrNull.mockReset();
    capturePlatformAdminError.mockReset();
    capturePlatformAdminError.mockResolvedValue(undefined);
  });

  it("probeHospiraLogsErrorAction writes dev_log then throws", async () => {
    getPlatformAdminWithMfaOrNull.mockResolvedValue({
      userId: "user-1",
      email: "admin@hospira.ro",
    });

    const { probeHospiraLogsErrorAction } = await import("../logs-actions");

    await expect(probeHospiraLogsErrorAction()).rejects.toThrow(
      /\[hospira-admin\/logs:probe\]/
    );

    expect(capturePlatformAdminError).toHaveBeenCalledOnce();
    const [probeError, extra] = capturePlatformAdminError.mock.calls[0];
    expect(probeError).toBeInstanceOf(Error);
    expect(extra).toMatchObject({
      source: "hospira-logs-probe",
      userId: "user-1",
      userEmail: "admin@hospira.ro",
      context: { probe: true, mode: "action" },
    });
  });

  it("probeHospiraLogsPageThrow uses ssr source and mode", async () => {
    getPlatformAdminWithMfaOrNull.mockResolvedValue({
      userId: "user-2",
      email: "ops@hospira.ro",
    });

    const { probeHospiraLogsPageThrow } = await import("../logs-actions");

    await expect(probeHospiraLogsPageThrow()).rejects.toThrow(
      /\[hospira-admin\/logs:probe-ssr\]/
    );

    expect(capturePlatformAdminError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        source: "hospira-logs-probe-ssr",
        context: { probe: true, mode: "ssr" },
      })
    );
  });

  it("rejects when platform admin session is missing", async () => {
    getPlatformAdminWithMfaOrNull.mockResolvedValue(null);

    const { probeHospiraLogsErrorAction } = await import("../logs-actions");

    await expect(probeHospiraLogsErrorAction()).rejects.toThrow(/Neautorizat/);
    expect(capturePlatformAdminError).not.toHaveBeenCalled();
  });
});
