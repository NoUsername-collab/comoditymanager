import { describe, it, expect } from "vitest";
import {
  getAllModules,
  registerModule,
  type ModuleDefinition,
} from "@/core/config/modules";

// ---------------------------------------------------------------------------
// Module Registry
// ---------------------------------------------------------------------------
describe("getAllModules", () => {
  it("returns an array of module definitions", () => {
    const modules = getAllModules();
    expect(Array.isArray(modules)).toBe(true);
    expect(modules.length).toBeGreaterThan(0);
  });

  it("each module has an id and name", () => {
    const modules = getAllModules();
    for (const mod of modules) {
      expect(mod).toHaveProperty("id");
      expect(mod).toHaveProperty("name");
      expect(typeof mod.id).toBe("string");
      expect(typeof mod.name).toBe("string");
    }
  });

  it("contains the built-in ical_sync module", () => {
    const modules = getAllModules();
    const icalSync = modules.find((m) => m.id === "ical_sync");
    expect(icalSync).toBeDefined();
    expect(icalSync!.name).toBe("iCal Sync");
  });

  it("contains the built-in invoicing module", () => {
    const modules = getAllModules();
    const invoicing = modules.find((m) => m.id === "invoicing");
    expect(invoicing).toBeDefined();
    expect(invoicing!.name).toBe("Facturare");
  });

  it("contains the built-in public_page module", () => {
    const modules = getAllModules();
    const publicPage = modules.find((m) => m.id === "public_page");
    expect(publicPage).toBeDefined();
    expect(publicPage!.publicRoutes).toBeDefined();
    expect(publicPage!.publicRoutes!.length).toBeGreaterThan(0);
  });

  it("built-in modules have expected admin nav items", () => {
    const modules = getAllModules();
    const icalSync = modules.find((m) => m.id === "ical_sync");
    expect(icalSync!.adminNavItems).toBeDefined();
    expect(icalSync!.adminNavItems!.length).toBeGreaterThan(0);
    expect(icalSync!.adminNavItems![0].href).toContain("/admin/");
  });

  it("modules with serverActions have non-empty action lists", () => {
    const modules = getAllModules();
    for (const mod of modules) {
      if (mod.serverActions) {
        expect(mod.serverActions.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("registerModule", () => {
  it("allows registering a new module that appears in getAllModules", () => {
    const testModule: ModuleDefinition = {
      id: "api_access" as any, // Use existing id to avoid polluting
      name: "API Access Test",
    };
    registerModule(testModule);
    const found = getAllModules().find((m) => m.name === "API Access Test");
    expect(found).toBeDefined();

    // Restore original
    registerModule({
      id: "api_access",
      name: "API Access",
      adminNavItems: [
        { label: "API", href: "/admin/settings/api", icon: "code", order: 90 },
      ],
      serverActions: ["generateApiKey", "revokeApiKey", "listApiKeys"],
    });
  });
});
