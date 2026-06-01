import { describe, it, expect } from "vitest";
import {
  PLAN_CONFIGS,
  type PlanId,
  type CloudPlan,
  type ModuleId,
} from "@/core/config/plans";
import { PLATFORM_NAME } from "@/lib/platform/branding";

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

  describe("Free plan", () => {
    const free = PLAN_CONFIGS.free;

    it("limits rooms to 3", () => {
      expect(free.maxRooms).toBe(3);
    });

    it("shows platform branding", () => {
      expect(free.showBranding).toBe(true);
    });

    it("has basic features only", () => {
      expect(free.coreFeatures).toContain("calendar");
      expect(free.coreFeatures).toContain("guest_files");
      expect(free.coreFeatures).toContain("bookings");
      expect(free.coreFeatures).not.toContain("gantt");
    });

    it("includes public_page module", () => {
      expect(free.includedModules).toContain("public_page");
    });

    it("limited to 1 property", () => {
      expect(free.maxProperties).toBe(1);
    });
  });

  describe("Essential plan", () => {
    const essential = PLAN_CONFIGS.essential;

    it("limits rooms to 10", () => {
      expect(essential.maxRooms).toBe(10);
    });

    it("shows platform branding", () => {
      expect(essential.showBranding).toBe(true);
    });

    it("includes Gantt", () => {
      expect(essential.coreFeatures).toContain("gantt");
    });

    it("includes public_page module", () => {
      expect(essential.includedModules).toContain("public_page");
    });

    it("does NOT include iCal or invoicing", () => {
      expect(essential.includedModules).not.toContain("ical_sync");
      expect(essential.includedModules).not.toContain("invoicing");
    });
  });

  describe("Professional plan", () => {
    const professional = PLAN_CONFIGS.professional;

    it("limits rooms to 30", () => {
      expect(professional.maxRooms).toBe(30);
    });

    it("hides platform branding", () => {
      expect(professional.showBranding).toBe(false);
    });

    it("includes iCal sync", () => {
      expect(professional.includedModules).toContain("ical_sync");
    });

    it("includes advanced_reports", () => {
      expect(professional.includedModules).toContain("advanced_reports");
    });

    it("does NOT include invoicing or whatsapp", () => {
      expect(professional.includedModules).not.toContain("invoicing");
      expect(professional.includedModules).not.toContain("whatsapp");
    });

    it("has priority support", () => {
      expect(professional.coreFeatures).toContain("priority_support");
    });

    it("has custom domain", () => {
      expect(professional.coreFeatures).toContain("custom_domain");
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
    const plans: CloudPlan[] = ["free", "essential", "professional", "business"];

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
    it("local_essential has same features as Essential cloud", () => {
      const localEssential = PLAN_CONFIGS.local_essential;
      const essential = PLAN_CONFIGS.essential;
      expect(localEssential.coreFeatures).toEqual(essential.coreFeatures);
    });

    it("local_professional has same features as Professional cloud", () => {
      const localProfessional = PLAN_CONFIGS.local_professional;
      const professional = PLAN_CONFIGS.professional;
      expect(localProfessional.coreFeatures).toEqual(professional.coreFeatures);
    });
  });
});
