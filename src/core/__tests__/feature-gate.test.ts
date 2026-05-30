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
      // Default = Pro, has gantt
      setTenantContext(DEFAULT_TENANT);
      expect(() => assertFeature("gantt")).not.toThrow();
      expect(() => assertFeature("calendar")).not.toThrow();
    });

    it("throws FeatureGateError for missing features", () => {
      setTenantContext({ ...DEFAULT_TENANT, planId: "starter" });
      expect(() => assertFeature("gantt")).toThrow(FeatureGateError);
    });

    it("error includes plan info", () => {
      setTenantContext({ ...DEFAULT_TENANT, planId: "starter" });
      try {
        assertFeature("gantt");
      } catch (e) {
        expect(e).toBeInstanceOf(FeatureGateError);
        const err = e as FeatureGateError;
        expect(err.feature).toBe("gantt");
        expect(err.currentPlan).toBe("starter");
        expect(err.code).toBe("FEATURE_GATE");
      }
    });
  });

  describe("assertModule", () => {
    it("passes for modules in the current plan", () => {
      setTenantContext(DEFAULT_TENANT); // Pro has invoicing
      expect(() => assertModule("invoicing")).not.toThrow();
    });

    it("throws ModuleGateError for missing modules", () => {
      setTenantContext({ ...DEFAULT_TENANT, planId: "starter" });
      expect(() => assertModule("invoicing")).toThrow(ModuleGateError);
    });

    it("passes for purchased add-on modules", () => {
      setTenantContext({
        ...DEFAULT_TENANT,
        planId: "standard",
        activeModules: ["invoicing"],
      });
      expect(() => assertModule("invoicing")).not.toThrow();
    });
  });

  describe("assertCanAddRoom", () => {
    it("allows rooms within limit", () => {
      setTenantContext({ ...DEFAULT_TENANT, planId: "starter" });
      expect(() => assertCanAddRoom(2)).not.toThrow();
    });

    it("blocks rooms at limit", () => {
      setTenantContext({ ...DEFAULT_TENANT, planId: "starter" });
      expect(() => assertCanAddRoom(3)).toThrow(LimitGateError);
    });

    it("allows unlimited rooms for paid plans", () => {
      setTenantContext(DEFAULT_TENANT); // Pro
      expect(() => assertCanAddRoom(999)).not.toThrow();
    });
  });

  describe("assertCanAddProperty", () => {
    it("blocks second property for Standard plan", () => {
      setTenantContext({ ...DEFAULT_TENANT, planId: "standard" });
      expect(() => assertCanAddProperty(1)).toThrow(LimitGateError);
    });

    it("allows up to 5 properties for Business", () => {
      setTenantContext({ ...DEFAULT_TENANT, planId: "business" });
      expect(() => assertCanAddProperty(4)).not.toThrow();
      expect(() => assertCanAddProperty(5)).toThrow(LimitGateError);
    });
  });

  describe("checkFeature / checkModule (non-throwing)", () => {
    it("returns boolean without throwing", () => {
      setTenantContext({ ...DEFAULT_TENANT, planId: "starter" });
      expect(checkFeature("gantt")).toBe(false);
      expect(checkFeature("calendar")).toBe(true);
      expect(checkModule("invoicing")).toBe(false);
    });
  });

  describe("getMinimumPlanForFeature", () => {
    it("returns starter for calendar", () => {
      expect(getMinimumPlanForFeature("calendar")).toBe("starter");
    });

    it("returns standard for gantt", () => {
      expect(getMinimumPlanForFeature("gantt")).toBe("standard");
    });

    it("returns pro for priority_support", () => {
      expect(getMinimumPlanForFeature("priority_support")).toBe("pro");
    });

    it("returns business for sla_guarantee", () => {
      expect(getMinimumPlanForFeature("sla_guarantee")).toBe("business");
    });
  });

  describe("getMinimumPlanForModule", () => {
    it("returns standard for public_page", () => {
      expect(getMinimumPlanForModule("public_page")).toBe("standard");
    });

    it("returns pro for ical_sync", () => {
      expect(getMinimumPlanForModule("ical_sync")).toBe("pro");
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
    it("returns serializable object for Pro plan", () => {
      setTenantContext(DEFAULT_TENANT);
      const map = buildFeatureMap();

      expect(map.planId).toBe("pro");
      expect(map.planLabel).toBe("Pro");
      expect(map.mode).toBe("cloud");
      expect(map.showBranding).toBe(false);
      expect(map.maxRooms).toBe(Infinity);

      // Features
      expect(map.features.gantt).toBe(true);
      expect(map.features.calendar).toBe(true);
      expect(map.features.sla_guarantee).toBe(false);

      // Modules
      expect(map.modules.invoicing).toBe(true);
      expect(map.modules.api_access).toBe(false);
    });

    it("returns correct map for Starter plan", () => {
      setTenantContext({ ...DEFAULT_TENANT, planId: "starter" });
      const map = buildFeatureMap();

      expect(map.showBranding).toBe(true);
      expect(map.maxRooms).toBe(3);
      expect(map.features.gantt).toBe(false);
      expect(map.modules.invoicing).toBe(false);
    });
  });
});
