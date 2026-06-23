import { describe, expect, it } from "vitest";
import {
  areBuildingsColored,
  buildSetupProgressItems,
  isEmailChannelConfigured,
  isIdentityConfigured,
  setupProgressSummary,
  SETUP_PROGRESS_IDS,
} from "../progress";

describe("isIdentityConfigured", () => {
  it("requires at least two characters", () => {
    expect(isIdentityConfigured("")).toBe(false);
    expect(isIdentityConfigured("A")).toBe(false);
    expect(isIdentityConfigured("Casa Emil")).toBe(true);
  });
});

describe("isEmailChannelConfigured", () => {
  it("is true when sender or reply-to is set", () => {
    expect(isEmailChannelConfigured({ emailReplyTo: "a@b.ro" })).toBe(true);
    expect(isEmailChannelConfigured({ emailFromName: "Casa" })).toBe(true);
    expect(isEmailChannelConfigured({ emailFromAddress: "noreply@b.ro" })).toBe(
      true,
    );
    expect(isEmailChannelConfigured({})).toBe(false);
  });
});

describe("areBuildingsColored", () => {
  it("passes when there are no buildings", () => {
    expect(areBuildingsColored([])).toBe(true);
  });

  it("fails when an active building lacks color", () => {
    expect(
      areBuildingsColored([{ color_hex: null, is_active: true }]),
    ).toBe(false);
    expect(
      areBuildingsColored([{ color_hex: "#059669", is_active: true }]),
    ).toBe(true);
  });
});

describe("buildSetupProgressItems", () => {
  it("builds onboarding checklist for owners", () => {
    const items = buildSetupProgressItems({
      includeOnboarding: true,
      includeMfa: true,
      displayName: "Casa Emil",
      pensionEmail: "contact@casa.ro",
      rawPaletteKey: "emerald",
      appearanceSaved: true,
      buildings: [{ color_hex: "#059669", is_active: true }],
      emailReplyTo: "reply@casa.ro",
      mfaVerified: true,
    });

    expect(items).toHaveLength(6);
    expect(items.every((item) => item.done)).toBe(true);
    expect(items.map((item) => item.id)).toEqual([
      SETUP_PROGRESS_IDS.IDENTITY,
      SETUP_PROGRESS_IDS.CONTACT,
      SETUP_PROGRESS_IDS.THEME,
      SETUP_PROGRESS_IDS.BUILDINGS,
      SETUP_PROGRESS_IDS.EMAIL,
      SETUP_PROGRESS_IDS.MFA,
    ]);
  });

  it("marks incomplete items when data is missing", () => {
    const items = buildSetupProgressItems({
      includeOnboarding: true,
      includeMfa: false,
      displayName: "A",
      pensionEmail: null,
      rawPaletteKey: "pension",
      appearanceSaved: false,
      buildings: [{ color_hex: null, is_active: true }],
      mfaVerified: false,
    });

    const byId = Object.fromEntries(items.map((item) => [item.id, item.done]));
    expect(byId.identity).toBe(false);
    expect(byId.contact).toBe(false);
    expect(byId.theme).toBe(false);
    expect(byId.buildings).toBe(false);
    expect(byId.email).toBe(false);
  });
});

describe("setupProgressSummary", () => {
  it("computes percent complete", () => {
    const items = buildSetupProgressItems({
      includeOnboarding: true,
      includeMfa: false,
      displayName: "Casa Emil",
      pensionEmail: "a@b.ro",
      rawPaletteKey: "emerald",
      appearanceSaved: true,
      buildings: [],
      emailReplyTo: "reply@b.ro",
    });

    const summary = setupProgressSummary(items);
    expect(summary.completed).toBe(5);
    expect(summary.total).toBe(5);
    expect(summary.percent).toBe(100);
  });
});
