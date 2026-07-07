import { beforeEach, describe, expect, it, vi } from "vitest";
import { captureAndThrowPlatformLogsSectionError } from "../platform-logs-page-data";

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

describe("captureAndThrowPlatformLogsSectionError", () => {
  beforeEach(() => {
    capturePlatformAdminError.mockReset();
    capturePlatformAdminError.mockResolvedValue(undefined);
  });

  it("calls capturePlatformAdminError with section source then rethrows", async () => {
    const original = new Error("db timeout");

    await expect(
      captureAndThrowPlatformLogsSectionError("platform-logs", original)
    ).rejects.toThrow("[platform-admin/logs:platform-logs] db timeout");

    expect(capturePlatformAdminError).toHaveBeenCalledWith(original, {
      source: "platform-logs:platform-logs",
      context: { section: "platform-logs" },
    });
  });

  it("propagates dev_log write failures instead of masking them", async () => {
    const writeFailure = new Error("dev_logs insert failed");
    capturePlatformAdminError.mockRejectedValue(writeFailure);

    await expect(
      captureAndThrowPlatformLogsSectionError("health-checks", new Error("x"))
    ).rejects.toBe(writeFailure);
  });

  it("wraps non-Error values in a thrown Error", async () => {
    await expect(
      captureAndThrowPlatformLogsSectionError("tenant-filters", "broken")
    ).rejects.toThrow("[platform-admin/logs:tenant-filters] broken");
  });
});
