import { describe, expect, it } from "vitest";
import {
  aggregateRowsByTenant,
  getTenantResourceCounts,
} from "../tenant-resource-counts";
import { EMPTY_TENANT_RESOURCE_COUNTS } from "../platform-scale";

describe("tenant-resource-counts", () => {
  it("aggregates rows by tenant_id", () => {
    const counts = aggregateRowsByTenant([
      { tenant_id: "a" },
      { tenant_id: "a" },
      { tenant_id: "b" },
      { tenant_id: null },
    ]);

    expect(counts.get("a")).toBe(2);
    expect(counts.get("b")).toBe(1);
    expect(counts.size).toBe(2);
  });

  it("returns empty counts for unknown tenant", () => {
    const counts = getTenantResourceCounts(new Map(), "missing");
    expect(counts).toEqual(EMPTY_TENANT_RESOURCE_COUNTS);
  });
});
