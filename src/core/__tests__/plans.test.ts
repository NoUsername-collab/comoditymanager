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

  describe("Basic plan", () => {
    const free = PLAN_CONFIGS.free;

    it("does not cap rooms", () => {
      expect(free.maxRooms).toBe(Infinity);
      expect(free.priceEur).toBe(0);
      expect(free.label).toBe("Basic");
    });

    it("shows platform branding and does not send email", () => {
      expect(free.showBranding).toBe(true);
      expect(free.emailScope).toBe("none");
      expect(free.emailMonthlyCap).toBe(0);
      expect(free.coreFeatures).not.toContain("email_notifications");
    });

    it("includes Gantt and the basics", () => {
      expect(free.coreFeatures).toContain("calendar");
      expect(free.coreFeatures).toContain("guest_files");
      expect(free.coreFeatures).toContain("bookings");
      expect(free.coreFeatures).toContain("gantt");
    });

    it("includes public_page module", () => {
      expect(free.includedModules).toContain("public_page");
      expect(free.includedModules).not.toContain("invoicing");
    });

    it("limited to 1 property and 2 team members", () => {
      expect(free.maxProperties).toBe(1);
      expect(free.maxTeamMembers).toBe(2);
    });
  });

  describe("Light plan", () => {
    const essential = PLAN_CONFIGS.essential;

    it("is the 9 EUR invoice and confirmation plan", () => {
      expect(essential.priceEur).toBe(9);
      expect(essential.label).toBe("Light");
      expect(essential.maxRooms).toBe(Infinity);
      expect(essential.emailScope).toBe("confirmation");
      expect(essential.emailMonthlyCap).toBe(300);
    });

    it("keeps platform branding", () => {
      expect(essential.showBranding).toBe(true);
    });

    it("includes invoicing and not iCal", () => {
      expect(essential.includedModules).toContain("invoicing");
      expect(essential.includedModules).not.toContain("ical_sync");
      expect(essential.coreFeatures).not.toContain("heatmap");
      expect(essential.coreFeatures).not.toContain("custom_domain");
    });
  });

  describe("PRO plan", () => {
    const professional = PLAN_CONFIGS.professional;

    it("is 29 EUR with unlimited rooms", () => {
      expect(professional.priceEur).toBe(29);
      expect(professional.label).toBe("PRO");
      expect(professional.maxRooms).toBe(Infinity);
      expect(professional.maxTeamMembers).toBe(8);
      expect(professional.maxProperties).toBe(3);
      expect(professional.emailMonthlyCap).toBe(2_000);
      expect(professional.emailScope).toBe("stay");
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

    it("includes invoicing but NOT whatsapp (add-on only)", () => {
      expect(professional.includedModules).toContain("invoicing");
      expect(professional.includedModules).not.toContain("whatsapp");
      expect(professional.includedModules).not.toContain("api_access");
    });

    it("has custom domain and heatmap", () => {
      expect(professional.coreFeatures).toContain("custom_domain");
      expect(professional.coreFeatures).toContain("heatmap");
      expect(professional.coreFeatures).not.toContain("priority_support");
      expect(professional.coreFeatures).not.toContain("sla_guarantee");
    });
  });

  describe("Business plan", () => {
    const business = PLAN_CONFIGS.business;

    it("includes all bundled modules (whatsapp stays add-on only)", () => {
      const allModules: ModuleId[] = [
        "public_page", "ical_sync", "invoicing", "advanced_reports",
        "multi_property", "white_label", "api_access",
      ];
      for (const m of allModules) {
        expect(business.includedModules).toContain(m);
      }
      expect(business.includedModules).not.toContain("whatsapp");
    });

    it("supports 10 properties", () => {
      expect(business.maxProperties).toBe(10);
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

  describe("local plans keep the previous feature ladder", () => {
    it("local essential still includes heatmap and email", () => {
      const localEssential = PLAN_CONFIGS.local_essential;
      expect(localEssential.coreFeatures).toContain("heatmap");
      expect(localEssential.coreFeatures).toContain("email_notifications");
      expect(localEssential.emailScope).toBe("stay");
    });

    it("local professional still includes priority support", () => {
      const localProfessional = PLAN_CONFIGS.local_professional;
      expect(localProfessional.coreFeatures).toContain("priority_support");
      expect(localProfessional.coreFeatures).toContain("custom_domain");
    });
  });
});
