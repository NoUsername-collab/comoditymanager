import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
const runPlatformAdminAction = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}));

vi.mock("@/lib/platform-admin/platform-action", () => ({
  runPlatformAdminAction: (...args: unknown[]) => runPlatformAdminAction(...args),
}));

describe("revalidatePlatformAdminCacheAction", () => {
  beforeEach(() => {
    revalidatePath.mockReset();
    runPlatformAdminAction.mockReset();
  });

  it("revalidates platform admin paths when authorized", async () => {
    runPlatformAdminAction.mockImplementation(
      async (
        handler: (session: { userId: string; email: string }) => Promise<string[]>
      ) => ({
        success: true,
        data: await handler({ userId: "u1", email: "admin@test.com" }),
      })
    );

    const { revalidatePlatformAdminCacheAction } = await import(
      "@/features/platform-admin/dev-actions"
    );

    const result = await revalidatePlatformAdminCacheAction();

    expect(result.success).toBe(true);
    expect(result.paths).toEqual([
      "/platform-admin",
      "/platform-admin/tenants",
      "/platform-admin/logs",
      "/platform-admin/tools",
    ]);
    expect(revalidatePath).toHaveBeenCalledTimes(4);
    expect(revalidatePath).toHaveBeenCalledWith("/platform-admin", "layout");
  });

  it("returns error when unauthorized", async () => {
    runPlatformAdminAction.mockResolvedValue({
      success: false,
      error: "Neautorizat.",
    });

    const { revalidatePlatformAdminCacheAction } = await import(
      "@/features/platform-admin/dev-actions"
    );

    const result = await revalidatePlatformAdminCacheAction();
    expect(result).toEqual({ success: false, error: "Neautorizat." });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
