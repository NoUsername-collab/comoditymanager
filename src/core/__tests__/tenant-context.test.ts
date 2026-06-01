import { describe, it, expect, beforeEach } from "vitest";
import {
  buildTenantContext,
  DEFAULT_TENANT,
  setTenantContext,
  getTenantContext,
  resetTenantContext,
  type TenantRecord,
} from "@/core/tenant/context";

describe("TenantContext", () => {
  beforeEach(() => {
    resetTenantContext();
  });

  describe("buildTenantContext", () => {
    it("builds context from DEV_FALLBACK_TENANT", () => {
      const ctx = buildTenantContext(DEFAULT_TENANT);
      expect(ctx.tenant.slug).toBe("__dev__");
      expect(ctx.plan.id).toBe("professional");
      expect(ctx.plan.mode).toBe("cloud");
    });

    it("has correct features for Professional plan", () => {
      const ctx = buildTenantContext(DEFAULT_TENANT);
      expect(ctx.hasFeature("gantt")).toBe(true);
      expect(ctx.hasFeature("calendar")).toBe(true);
      expect(ctx.hasFeature("priority_support")).toBe(true);
      expect(ctx.hasFeature("sla_guarantee")).toBe(false); // Business only
    });

    it("has correct modules for Professional plan", () => {
      const ctx = buildTenantContext(DEFAULT_TENANT);
      expect(ctx.hasModule("ical_sync")).toBe(true);
      expect(ctx.hasModule("advanced_reports")).toBe(true);
      // invoicing and whatsapp are Business-only
      expect(ctx.hasModule("invoicing")).toBe(false);
      expect(ctx.hasModule("whatsapp")).toBe(false);
      expect(ctx.hasModule("api_access")).toBe(false);
    });

    it("allows rooms up to Professional limit (30)", () => {
      const ctx = buildTenantContext(DEFAULT_TENANT);
      expect(ctx.canAddRoom(29)).toBe(true);
      expect(ctx.canAddRoom(30)).toBe(false);
    });

    it("does not show branding on Professional", () => {
      const ctx = buildTenantContext(DEFAULT_TENANT);
      expect(ctx.showBranding).toBe(false);
    });
  });

  describe("Free tenant", () => {
    const freeTenant: TenantRecord = {
      id: "test-free",
      slug: "pensiunea-test",
      displayName: "Pensiunea Test",
      planId: "free",
      activeModules: [],
      mode: "cloud",
      locale: "ro",
      country: "RO",
      timezone: "Europe/Bucharest",
      customDomain: null,
      status: "trial",
      trialEndsAt: "2025-08-01T00:00:00.000Z",
      createdAt: "2025-07-01T00:00:00.000Z",
    };

    it("limits rooms to 3", () => {
      const ctx = buildTenantContext(freeTenant);
      expect(ctx.canAddRoom(2)).toBe(true);
      expect(ctx.canAddRoom(3)).toBe(false);
      expect(ctx.canAddRoom(10)).toBe(false);
    });

    it("does not have Gantt", () => {
      const ctx = buildTenantContext(freeTenant);
      expect(ctx.hasFeature("gantt")).toBe(false);
    });

    it("shows platform branding", () => {
      const ctx = buildTenantContext(freeTenant);
      expect(ctx.showBranding).toBe(true);
    });

    it("has public_page module only", () => {
      const ctx = buildTenantContext(freeTenant);
      expect(ctx.hasModule("public_page")).toBe(true);
      expect(ctx.hasModule("invoicing")).toBe(false);
      expect(ctx.hasModule("ical_sync")).toBe(false);
    });
  });

  describe("add-on modules", () => {
    it("merges purchased add-ons with plan includes", () => {
      const tenant: TenantRecord = {
        ...DEFAULT_TENANT,
        planId: "essential",
        activeModules: ["invoicing", "ical_sync"], // purchased separately
      };

      const ctx = buildTenantContext(tenant);

      // Essential includes public_page
      expect(ctx.hasModule("public_page")).toBe(true);
      // Purchased add-ons
      expect(ctx.hasModule("invoicing")).toBe(true);
      expect(ctx.hasModule("ical_sync")).toBe(true);
      // Not purchased
      expect(ctx.hasModule("whatsapp")).toBe(false);
    });

    it("deduplicates modules", () => {
      const tenant: TenantRecord = {
        ...DEFAULT_TENANT,
        planId: "professional",
        activeModules: ["ical_sync"], // already in Professional, should not duplicate
      };

      const ctx = buildTenantContext(tenant);
      expect(ctx.allModules.filter((m) => m === "ical_sync")).toHaveLength(1);
    });
  });

  describe("singleton management", () => {
    it("falls back to DEV tenant when not set (development)", () => {
      const ctx = getTenantContext();
      expect(ctx.tenant.slug).toBe("__dev__");
    });

    it("returns set context after setTenantContext", () => {
      const tenant: TenantRecord = {
        ...DEFAULT_TENANT,
        id: "custom",
        slug: "pensiunea-mare",
        displayName: "Pensiunea Mare",
      };

      setTenantContext(tenant);
      const ctx = getTenantContext();
      expect(ctx.tenant.slug).toBe("pensiunea-mare");
    });

    it("resets to default after resetTenantContext", () => {
      setTenantContext({
        ...DEFAULT_TENANT,
        slug: "temporary",
      });

      resetTenantContext();
      const ctx = getTenantContext();
      expect(ctx.tenant.slug).toBe("__dev__");
    });
  });

  describe("Local mode tenant", () => {
    const localTenant: TenantRecord = {
      id: "local-001",
      slug: "pensiune-locala",
      displayName: "Pensiune Locala",
      planId: "local_professional",
      activeModules: [],
      mode: "local",
      locale: "ro",
      country: "MD",
      timezone: "Europe/Chisinau",
      customDomain: null,
      status: "active",
      trialEndsAt: null,
      createdAt: "2025-06-01T00:00:00.000Z",
    };

    it("is in local mode", () => {
      const ctx = buildTenantContext(localTenant);
      expect(ctx.plan.mode).toBe("local");
    });

    it("has Professional-level features", () => {
      const ctx = buildTenantContext(localTenant);
      expect(ctx.hasFeature("gantt")).toBe(true);
      expect(ctx.hasFeature("priority_support")).toBe(true);
    });

    it("includes invoicing and reports", () => {
      const ctx = buildTenantContext(localTenant);
      expect(ctx.hasModule("invoicing")).toBe(true);
      expect(ctx.hasModule("advanced_reports")).toBe(true);
    });

    it("does not include cloud-only modules", () => {
      const ctx = buildTenantContext(localTenant);
      expect(ctx.hasModule("whatsapp")).toBe(false);
      expect(ctx.hasModule("ical_sync")).toBe(false);
    });
  });

  describe("Bulgarian tenant", () => {
    it("supports BG locale and country", () => {
      const bgTenant: TenantRecord = {
        ...DEFAULT_TENANT,
        id: "bg-001",
        slug: "hotel-varna",
        displayName: "Hotel Varna",
        locale: "bg",
        country: "BG",
        timezone: "Europe/Sofia",
      };

      const ctx = buildTenantContext(bgTenant);
      expect(ctx.tenant.locale).toBe("bg");
      expect(ctx.tenant.country).toBe("BG");
      expect(ctx.tenant.timezone).toBe("Europe/Sofia");
    });
  });
});
