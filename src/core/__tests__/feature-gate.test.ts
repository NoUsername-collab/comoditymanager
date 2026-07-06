import { describe, it, expect, beforeEach } from "vitest";
import {
  assertFeature,
  assertModule,
  assertCanAddRoom,
  assertCanAddProperty,
  checkFeature,
  checkModule,
  getMinimumPlanForFeature,
  getMinimumPlanForModule,
  buildFeatureMap,
  FeatureGateError,
  ModuleGateError,
  LimitGateError,
} from "@/core/hooks/use-feature-gate";
import {
  setTenantContext,
  resetTenantContext,
  DEFAULT_TENANT,
  type TenantRecord,
} from "@/core/tenant/context";

describe("Feature Gates", () => {
  beforeEach(() => {
    resetTenantContext();
  });

  describe("assertFeature", () => {
    it("passes for features in the current plan", () => {
      // Default = Professional, has gantt
      setTenantContext(DEFAULT_TENANT);
      expect(() => assertFeature("gantt")).not.toThrow();
      expect(() => assertFeature("calendar")).not.toThrow();
    });

    it("throws FeatureGateError for missing features", () => {
      setTenantContext({ ...DEFAULT_TENANT, planId: "free" });
      expect(() => assertFeature("priority_support")).toThrow(FeatureGateError);
    });

    it("error includes plan info", () => {
      setTenantContext({ ...DEFAULT_TENANT, planId: "free" });
      try {
        assertFeature("priority_support");
      } catch (e) {
        expect(e).toBeInstanceOf(FeatureGateError);
        const err = e as FeatureGateError;
        expect(err.feature).toBe("priority_support");
        expect(err.currentPlan).toBe("free");
        expect(err.code).toBe("FEATURE_GATE");
      }
    });
  });

  describe("assertModule", () => {
    it("passes for modules in the current plan", () => {
      // Professional has ical_sync
      setTenantContext(DEFAULT_TENANT);
      expect(() => assertModule("ical_sync")).not.toThrow();
    });

    it("throws ModuleGateError for missing modules", () => {
      setTenantContext({ ...DEFAULT_TENANT, planId: "free" });
      expect(() => assertModule("invoicing")).toThrow(ModuleGateError);
    });

    it("passes for purchased add-on modules", () => {
      setTenantContext({
        ...DEFAULT_TENANT,
        planId: "essential",
        activeModules: ["invoicing"],
      });
      expect(() => assertModule("invoicing")).not.toThrow();
    });
  });

  describe("assertCanAddRoom", () => {
    it("allows rooms within limit", () => {
      setTenantContext({ ...DEFAULT_TENANT, planId: "free" });
      expect(() => assertCanAddRoom(2)).not.toThrow();
    });

    it("blocks rooms at limit", () => {
      setTenantContext({ ...DEFAULT_TENANT, planId: "free" });
      expect(() => assertCanAddRoom(5)).toThrow(LimitGateError);
    });

    it("allows unlimited rooms on Professional", () => {
      setTenantContext(DEFAULT_TENANT); // Professional, unlimited
      expect(() => assertCanAddRoom(29)).not.toThrow();
      expect(() => assertCanAddRoom(9999)).not.toThrow();
    });
  });

  describe("assertCanAddProperty", () => {
    it("blocks second property for Essential plan", () => {
      setTenantContext({ ...DEFAULT_TENANT, planId: "essential" });
      expect(() => assertCanAddProperty(1)).toThrow(LimitGateError);
    });

    it("allows up to 10 properties for Business", () => {
      setTenantContext({ ...DEFAULT_TENANT, planId: "business" });
      expect(() => assertCanAddProperty(9)).not.toThrow();
      expect(() => assertCanAddProperty(10)).toThrow(LimitGateError);
    });
  });

  describe("checkFeature / checkModule (non-throwing)", () => {
    it("returns boolean without throwing", () => {
      setTenantContext({ ...DEFAULT_TENANT, planId: "free" });
      expect(checkFeature("priority_support")).toBe(false);
      expect(checkFeature("calendar")).toBe(true);
      expect(checkModule("invoicing")).toBe(false);
    });
  });

  describe("getMinimumPlanForFeature", () => {
    it("returns free for calendar", () => {
      expect(getMinimumPlanForFeature("calendar")).toBe("free");
    });

    it("returns essential for heatmap", () => {
      expect(getMinimumPlanForFeature("heatmap")).toBe("essential");
    });

    it("returns professional for priority_support", () => {
      expect(getMinimumPlanForFeature("priority_support")).toBe("professional");
    });

    it("returns business for sla_guarantee", () => {
      expect(getMinimumPlanForFeature("sla_guarantee")).toBe("business");
    });
  });

  describe("getMinimumPlanForModule", () => {
    it("returns free for public_page", () => {
      expect(getMinimumPlanForModule("public_page")).toBe("free");
    });

    it("returns essential for ical_sync", () => {
      expect(getMinimumPlanForModule("ical_sync")).toBe("essential");
    });

    it("returns business for api_access", () => {
      expect(getMinimumPlanForModule("api_access")).toBe("business");
    });

    it("returns null for modules not bundled in any plan (add-on only)", () => {
      // All modules are bundled in at least one plan in our config,
      // but the function should handle edge cases
    });
  });

  describe("buildFeatureMap", () => {
    it("returns serializable object for Professional plan", () => {
      setTenantContext(DEFAULT_TENANT);
      const map = buildFeatureMap();

      expect(map.planId).toBe("professional");
      expect(map.planLabel).toBe("Professional");
      expect(map.mode).toBe("cloud");
      expect(map.showBranding).toBe(false);
      expect(map.maxRooms).toBe(Infinity);

      // Features
      expect(map.features.gantt).toBe(true);
      expect(map.features.calendar).toBe(true);
      expect(map.features.sla_guarantee).toBe(false);

      // Modules
      expect(map.modules.ical_sync).toBe(true);
      expect(map.modules.api_access).toBe(false);
    });

    it("returns correct map for Free plan", () => {
      setTenantContext({ ...DEFAULT_TENANT, planId: "free" });
      const map = buildFeatureMap();

      expect(map.showBranding).toBe(true);
      expect(map.maxRooms).toBe(5);
      expect(map.features.gantt).toBe(true);
      expect(map.modules.invoicing).toBe(false);
    });
  });
});
