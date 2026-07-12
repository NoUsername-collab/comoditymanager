import { describe, it, expect } from "vitest";
import {
  breakdownTenantModules,
  defaultModulesForPlan,
} from "@/core/config/plan-catalog";

describe("plan-catalog", () => {
  it("breaks down included vs addon modules", () => {
    const breakdown = breakdownTenantModules("essential", ["whatsapp"]);
    expect(breakdown.includedInPlan).toContain("ical_sync");
    expect(breakdown.activeAddons).toEqual(["whatsapp"]);
    expect(breakdown.effective).toContain("whatsapp");
  });

  it("defaults modules from professional plan", () => {
    const modules = defaultModulesForPlan("professional");
    expect(modules).toContain("invoicing");
    expect(modules).not.toContain("whatsapp");
  });
});
