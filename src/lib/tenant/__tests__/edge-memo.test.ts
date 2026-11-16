import { describe, expect, it, vi } from "vitest";
import { createEdgeMemo } from "@/lib/tenant/edge-memo";

describe("the proxy's memory of which property a host is", () => {
  it("keeps a found property for a minute and a missing one for ten seconds", async () => {
    const memo = createEdgeMemo<string>({ foundTtlMs: 60_000, missingTtlMs: 10_000 });
    let now = 0;
    const clock = () => now;
    const found = vi.fn(async () => "casa");
    const missing = vi.fn(async () => null);

    expect(await memo("slug:casa", found, clock)).toBe("casa");
    expect(await memo("slug:none", missing, clock)).toBeNull();
    now = 9_000;
    await memo("slug:casa", found, clock);
    await memo("slug:none", missing, clock);
    expect(found).toHaveBeenCalledTimes(1);
    expect(missing).toHaveBeenCalledTimes(1);

    now = 11_000;
    await memo("slug:none", missing, clock);
    expect(missing).toHaveBeenCalledTimes(2);
    now = 61_000;
    await memo("slug:casa", found, clock);
    expect(found).toHaveBeenCalledTimes(2);
  });

  it("does not remember a failed lookup", async () => {
    const memo = createEdgeMemo<string>({ foundTtlMs: 60_000, missingTtlMs: 10_000 });
    const load = vi
      .fn(async () => undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce("casa" as never);
    expect(await memo("slug:casa", load)).toBeUndefined();
    expect(await memo("slug:casa", load)).toBe("casa");
  });

  it("asks once for requests arriving together", async () => {
    const memo = createEdgeMemo<string>({ foundTtlMs: 60_000, missingTtlMs: 10_000 });
    let release!: (value: string) => void;
    const load = vi.fn(() => new Promise<string>((resolve) => (release = resolve)));
    const both = Promise.all([memo("slug:casa", load), memo("slug:casa", load)]);
    release("casa");
    expect(await both).toEqual(["casa", "casa"]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("forgets the oldest entry when full", async () => {
    const memo = createEdgeMemo<string>({
      foundTtlMs: 60_000,
      missingTtlMs: 10_000,
      maxEntries: 2,
    });
    const load = vi.fn(async () => "x");
    await memo("a", load);
    await memo("b", load);
    await memo("c", load);
    await memo("a", load);
    expect(load).toHaveBeenCalledTimes(4);
  });
});
