import { describe, it, expect } from "vitest";
import {
  PLAN_CONFIGS,
  type PlanId,
  type CloudPlan,
  type ModuleId,
} from "@/core/config/plans";

describe("PLAN_CONFIGS", () => {
  it("defines all 10 plan tiers (4 cloud + 3 local + 3 hybrid)", () => {
    expect(Object.keys(PLAN_CONFIGS)).toHaveLength(10);
  });

  it("has 4 cloud plans", () => {
    const cloudPlans = Object.values(PLAN_CONFIGS).filter(
      (p) => p.mode === "cloud"
    );
    expect(cloudPlans).toHaveLength(4);
  });

  it("has 3 local plans", () => {
    const localPlans = Object.values(PLAN_CONFIGS).filter(
      (p) => p.mode === "local"
    );
    expect(localPlans).toHaveLength(3);
  });

  it("has 3 hybrid plans", () => {
    const hybridPlans = Object.values(PLAN_CONFIGS).filter(
      (p) => p.mode === "hybrid"
    );
    expect(hybridPlans).toHaveLength(3);
  });

  describe("Starter plan", () => {
    const starter = PLAN_CONFIGS.starter;

    it("limits rooms to 3", () => {
      expect(starter.maxRooms).toBe(3);
    });

    it("shows Rezova branding", () => {
      expect(starter.showBranding).toBe(true);
    });

    it("has basic features only", () => {
      expect(starter.coreFeatures).toContain("calendar");
      expect(starter.coreFeatures).toContain("guest_files");
      expect(starter.coreFeatures).toContain("bookings");
      expect(starter.coreFeatures).not.toContain("gantt");
    });

    it("has no included modules", () => {
      expect(starter.includedModules).toHaveLength(0);
    });

    it("limited to 1 property", () => {
      expect(starter.maxProperties).toBe(1);
    });
  });

  describe("Standard plan", () => {
    const standard = PLAN_CONFIGS.standard;

    it("has unlimited rooms", () => {
      expect(standard.maxRooms).toBe(Infinity);
    });

    it("hides Rezova branding", () => {
      expect(standard.showBranding).toBe(false);
    });

    it("includes Gantt", () => {
      expect(standard.coreFeatures).toContain("gantt");
    });

    it("includes public_page module", () => {
      expect(standard.includedModules).toContain("public_page");
    });

    it("does NOT include iCal or invoicing", () => {
      expect(standard.includedModules).not.toContain("ical_sync");
      expect(standard.includedModules).not.toContain("invoicing");
    });
  });

  describe("Pro plan (recommended)", () => {
    const pro = PLAN_CONFIGS.pro;

    it("includes iCal sync", () => {
      expect(pro.includedModules).toContain("ical_sync");
    });

    it("includes invoicing", () => {
      expect(pro.includedModules).toContain("invoicing");
    });

    it("includes WhatsApp", () => {
      expect(pro.includedModules).toContain("whatsapp");
    });

    it("has priority support", () => {
      expect(pro.coreFeatures).toContain("priority_support");
    });

    it("has custom domain", () => {
      expect(pro.coreFeatures).toContain("custom_domain");
    });
  });

  describe("Business plan", () => {
    const business = PLAN_CONFIGS.business;

    it("includes ALL modules", () => {
      const allModules: ModuleId[] = [
        "public_page", "ical_sync", "invoicing", "advanced_reports",
        "whatsapp", "multi_property", "white_label", "api_access",
      ];
      for (const m of allModules) {
        expect(business.includedModules).toContain(m);
      }
    });

    it("supports 5 properties", () => {
      expect(business.maxProperties).toBe(5);
    });

    it("has SLA guarantee", () => {
      expect(business.coreFeatures).toContain("sla_guarantee");
    });
  });

  describe("plan feature hierarchy", () => {
    const plans: CloudPlan[] = ["starter", "standard", "pro", "business"];

    it("each plan has at least as many features as the previous", () => {
      for (let i = 1; i < plans.length; i++) {
        const prev = PLAN_CONFIGS[plans[i - 1]];
        const curr = PLAN_CONFIGS[plans[i]];
        for (const f of prev.coreFeatures) {
          expect(curr.coreFeatures).toContain(f);
        }
      }
    });

    it("each plan has at least as many modules as the previous", () => {
      for (let i = 1; i < plans.length; i++) {
        const prev = PLAN_CONFIGS[plans[i - 1]];
        const curr = PLAN_CONFIGS[plans[i]];
        for (const m of prev.includedModules) {
          expect(curr.includedModules).toContain(m);
        }
      }
    });
  });

  describe("local plans mirror cloud features", () => {
    it("local_basic has same features as Standard cloud", () => {
      const localBasic = PLAN_CONFIGS.local_basic;
      const standard = PLAN_CONFIGS.standard;
      expect(localBasic.coreFeatures).toEqual(standard.coreFeatures);
    });

    it("local_pro has same features as Pro cloud", () => {
      const localPro = PLAN_CONFIGS.local_pro;
      const pro = PLAN_CONFIGS.pro;
      expect(localPro.coreFeatures).toEqual(pro.coreFeatures);
    });
  });
});
