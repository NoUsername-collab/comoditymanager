import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  probeHospiraLogsErrorAction,
  probeHospiraLogsPageThrow,
} from "../logs-actions";

const getPlatformAdminOrNull = vi.fn();
const capturePlatformAdminError = vi.fn();

vi.mock("@/lib/auth/require-platform-admin", () => ({
  getPlatformAdminOrNull: () => getPlatformAdminOrNull(),
}));

vi.mock("@/services/dev-logs", () => ({
  capturePlatformAdminError: (...args: unknown[]) =>
    capturePlatformAdminError(...args),
}));

describe("hospira logs probe actions", () => {
  beforeEach(() => {
    getPlatformAdminOrNull.mockReset();
    capturePlatformAdminError.mockReset();
    capturePlatformAdminError.mockResolvedValue(undefined);
  });

  it("probeHospiraLogsErrorAction writes dev_log then throws", async () => {
    getPlatformAdminOrNull.mockResolvedValue({
      userId: "user-1",
      email: "admin@hospira.ro",
    });

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
    getPlatformAdminOrNull.mockResolvedValue({
      userId: "user-2",
      email: "ops@hospira.ro",
    });

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
    getPlatformAdminOrNull.mockResolvedValue(null);

    await expect(probeHospiraLogsErrorAction()).rejects.toThrow(/Neautorizat/);
    expect(capturePlatformAdminError).not.toHaveBeenCalled();
  });
});
