import { describe, expect, it } from "vitest";
import {
  isTenantBlocked,
  isTenantOperational,
  normalizeTenantLifecycleStatus,
} from "@/domain/tenant/operational";

describe("tenant operational status", () => {
  it("treats active and trial as operational", () => {
    expect(isTenantOperational("active")).toBe(true);
    expect(isTenantOperational("trial")).toBe(true);
    expect(isTenantBlocked("active")).toBe(false);
  });

  it("blocks suspended and cancelled", () => {
    expect(isTenantOperational("suspended")).toBe(false);
    expect(isTenantOperational("cancelled")).toBe(false);
    expect(isTenantBlocked("suspended")).toBe(true);
    expect(isTenantBlocked("cancelled")).toBe(true);
  });

  it("defaults unknown values to active", () => {
    expect(normalizeTenantLifecycleStatus(undefined)).toBe("active");
    expect(normalizeTenantLifecycleStatus("weird")).toBe("active");
  });
});
