import { beforeEach, describe, expect, it, vi } from "vitest";
import { captureAndThrowHospiraLogsSectionError } from "../hospira-logs-page-data";

const capturePlatformAdminError = vi.fn();

vi.mock("@/services/dev-logs", () => ({
  capturePlatformAdminError: (...args: unknown[]) =>
    capturePlatformAdminError(...args),
}));

vi.mock("@/services/platform-debug", () => ({
  getPlatformLogsBundle: vi.fn(),
  runTenantHealthChecks: vi.fn(),
}));

vi.mock("@/services/platform-admin", () => ({
  listTenantFilterOptions: vi.fn(),
}));

describe("captureAndThrowHospiraLogsSectionError", () => {
  beforeEach(() => {
    capturePlatformAdminError.mockReset();
    capturePlatformAdminError.mockResolvedValue(undefined);
  });

  it("calls capturePlatformAdminError with section source then rethrows", async () => {
    const original = new Error("db timeout");

    await expect(
      captureAndThrowHospiraLogsSectionError("platform-logs", original)
    ).rejects.toThrow("[hospira-admin/logs:platform-logs] db timeout");

    expect(capturePlatformAdminError).toHaveBeenCalledWith(original, {
      source: "hospira-logs:platform-logs",
      context: { section: "platform-logs" },
    });
  });

  it("propagates dev_log write failures instead of masking them", async () => {
    const writeFailure = new Error("dev_logs insert failed");
    capturePlatformAdminError.mockRejectedValue(writeFailure);

    await expect(
      captureAndThrowHospiraLogsSectionError("health-checks", new Error("x"))
    ).rejects.toBe(writeFailure);
  });

  it("wraps non-Error values in a thrown Error", async () => {
    await expect(
      captureAndThrowHospiraLogsSectionError("tenant-filters", "broken")
    ).rejects.toThrow("[hospira-admin/logs:tenant-filters] broken");
  });
});
