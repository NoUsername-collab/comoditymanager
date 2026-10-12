import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createPublicAdminClient: () => ({ rpc }),
}));

import { enforceRateLimit } from "@/lib/rate-limit";

describe("enforceRateLimit", () => {
  beforeEach(() => rpc.mockReset());
  afterEach(() => vi.restoreAllMocks());

  it("blocks when the shared counter is over the limit", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    const result = await enforceRateLimit("shared-over", 5, 60_000);
    expect(result.allowed).toBe(false);
    expect(rpc).toHaveBeenCalledWith("rate_limit_hit", {
      p_key: "shared-over",
      p_limit: 5,
      p_window_seconds: 60,
    });
  });

  it("lets the request through and logs when the database cannot answer", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    rpc.mockResolvedValue({ data: null, error: { message: "relation does not exist" } });
    const result = await enforceRateLimit("shared-down", 5, 60_000);
    expect(result.allowed).toBe(true);
    expect(log).toHaveBeenCalled();
  });

  it("stops a local burst without asking the database", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    await enforceRateLimit("burst", 1, 60_000);
    rpc.mockClear();
    const second = await enforceRateLimit("burst", 1, 60_000);
    expect(second.allowed).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
});
