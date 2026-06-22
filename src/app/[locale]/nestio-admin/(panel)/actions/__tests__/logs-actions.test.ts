import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  probeNestioLogsErrorAction,
  probeNestioLogsPageThrow,
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

  it("probeNestioLogsErrorAction writes dev_log then throws", async () => {
    getPlatformAdminOrNull.mockResolvedValue({
      userId: "user-1",
      email: "admin@nestio.ro",
    });

    await expect(probeNestioLogsErrorAction()).rejects.toThrow(
      /\[nestio-admin\/logs:probe\]/
    );

    expect(capturePlatformAdminError).toHaveBeenCalledOnce();
    const [probeError, extra] = capturePlatformAdminError.mock.calls[0];
    expect(probeError).toBeInstanceOf(Error);
    expect(extra).toMatchObject({
      source: "nestio-logs-probe",
      userId: "user-1",
      userEmail: "admin@nestio.ro",
      context: { probe: true, mode: "action" },
    });
  });

  it("probeNestioLogsPageThrow uses ssr source and mode", async () => {
    getPlatformAdminOrNull.mockResolvedValue({
      userId: "user-2",
      email: "ops@nestio.ro",
    });

    await expect(probeNestioLogsPageThrow()).rejects.toThrow(
      /\[nestio-admin\/logs:probe-ssr\]/
    );

    expect(capturePlatformAdminError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        source: "nestio-logs-probe-ssr",
        context: { probe: true, mode: "ssr" },
      })
    );
  });

  it("rejects when platform admin session is missing", async () => {
    getPlatformAdminOrNull.mockResolvedValue(null);

    await expect(probeNestioLogsErrorAction()).rejects.toThrow(/Neautorizat/);
    expect(capturePlatformAdminError).not.toHaveBeenCalled();
  });
});
