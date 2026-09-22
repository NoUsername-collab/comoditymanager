import { describe, expect, it } from "vitest";
import { SETUP_ISSUE_IDS } from "@/domain/setup-issues/types";
import {
  computeSettingsCompletion,
  hasIdentityContact,
} from "../settings-completion";

describe("hasIdentityContact", () => {
  it("returns true when email or phone is set", () => {
    expect(
      hasIdentityContact({
        email: "a@b.ro",
        phone: null,
        whatsapp: null,
        telegram: null,
        facebook: null,
        instagram: null,
      }),
    ).toBe(true);
    expect(
      hasIdentityContact({
        email: null,
        phone: "+40",
        whatsapp: null,
        telegram: null,
        facebook: null,
        instagram: null,
      }),
    ).toBe(true);
    expect(
      hasIdentityContact({
        email: null,
        phone: null,
        whatsapp: null,
        telegram: null,
        facebook: null,
        instagram: null,
      }),
    ).toBe(false);
  });
});

describe("computeSettingsCompletion", () => {
  it("marks setup issues as incomplete checklist items", () => {
    const summary = computeSettingsCompletion({
      displayName: "Test Pension",
      setupIssues: [
        {
          id: SETUP_ISSUE_IDS.THEME_NOT_CONFIGURED,
          severity: "warning",
          labelKey: "themeNotConfigured",
          settingsPath: "/admin/settings/appearance",
        },
      ],
      identityContact: {
        email: "hotel@test.ro",
        phone: null,
        whatsapp: null,
        telegram: null,
        facebook: null,
        instagram: null,
      },
      publicSite: {
        published: true,
        bookingEnabled: true,
        hasContact: true,
        hasGallery: false,
        hasHeroImage: false,
      },
    });

    const theme = summary.items.find((item) => item.id === "theme");
    expect(theme?.done).toBe(false);
    expect(summary.percent).toBeLessThan(100);
    expect(summary.completeCount).toBeGreaterThan(0);
  });

  it("includes public site items when snapshot is provided", () => {
    const summary = computeSettingsCompletion({
      displayName: "Casa Test",
      setupIssues: [],
      identityContact: {
        email: "hotel@test.ro",
        phone: "+40",
        whatsapp: null,
        telegram: null,
        facebook: null,
        instagram: null,
      },
      publicSite: {
        published: false,
        bookingEnabled: false,
        hasContact: false,
        hasGallery: false,
        hasHeroImage: false,
      },
    });

    expect(summary.items.some((item) => item.id === "public-published")).toBe(true);
    expect(summary.percent).toBeLessThan(100);
  });

  it("marks inventory complete only when rooms exist", () => {
    const withoutRooms = computeSettingsCompletion({
      displayName: "Casa Test",
      setupIssues: [],
      identityContact: {
        email: "hotel@test.ro",
        phone: "+40",
        whatsapp: null,
        telegram: null,
        facebook: null,
        instagram: null,
      },
      publicSite: null,
      roomCount: 0,
    });
    expect(withoutRooms.items.find((item) => item.id === "inventory")?.done).toBe(false);
    expect(withoutRooms.items.find((item) => item.id === "inventory")?.href).toBe(
      "/admin/onboarding",
    );

    const withRooms = computeSettingsCompletion({
      displayName: "Casa Test",
      setupIssues: [],
      identityContact: {
        email: "hotel@test.ro",
        phone: "+40",
        whatsapp: null,
        telegram: null,
        facebook: null,
        instagram: null,
      },
      publicSite: null,
      roomCount: 3,
    });
    expect(withRooms.items.find((item) => item.id === "inventory")?.done).toBe(true);
    expect(withRooms.items.find((item) => item.id === "inventory")?.href).toBe("/admin/rooms");
  });
});
