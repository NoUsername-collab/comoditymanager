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

describe("platform logs probe actions", () => {
  beforeEach(() => {
    getPlatformAdminWithMfaOrNull.mockReset();
    capturePlatformAdminError.mockReset();
    capturePlatformAdminError.mockResolvedValue(undefined);
  });

  it("probePlatformLogsErrorAction writes dev_log then throws", async () => {
    getPlatformAdminWithMfaOrNull.mockResolvedValue({
      userId: "user-1",
      email: "admin@hospira.ro",
    });

    const { probePlatformLogsErrorAction } = await import("../logs-actions");

    await expect(probePlatformLogsErrorAction()).rejects.toThrow(
      /\[platform-admin\/logs:probe\]/
    );

    expect(capturePlatformAdminError).toHaveBeenCalledOnce();
    const [probeError, extra] = capturePlatformAdminError.mock.calls[0];
    expect(probeError).toBeInstanceOf(Error);
    expect(extra).toMatchObject({
      source: "platform-logs-probe",
      userId: "user-1",
      userEmail: "admin@hospira.ro",
      context: { probe: true, mode: "action" },
    });
  });

  it("probePlatformLogsPageThrow uses ssr source and mode", async () => {
    getPlatformAdminWithMfaOrNull.mockResolvedValue({
      userId: "user-2",
      email: "ops@hospira.ro",
    });

    const { probePlatformLogsPageThrow } = await import("../logs-actions");

    await expect(probePlatformLogsPageThrow()).rejects.toThrow(
      /\[platform-admin\/logs:probe-ssr\]/
    );

    expect(capturePlatformAdminError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        source: "platform-logs-probe-ssr",
        context: { probe: true, mode: "ssr" },
      })
    );
  });

  it("rejects when platform admin session is missing", async () => {
    getPlatformAdminWithMfaOrNull.mockResolvedValue(null);

    const { probePlatformLogsErrorAction } = await import("../logs-actions");

    await expect(probePlatformLogsErrorAction()).rejects.toThrow(/Neautorizat/);
    expect(capturePlatformAdminError).not.toHaveBeenCalled();
  });
});
