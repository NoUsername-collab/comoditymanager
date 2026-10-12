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
  const contact = {
    email: "hotel@test.ro",
    phone: null,
    whatsapp: null,
    telegram: null,
    facebook: null,
    instagram: null,
  };

  it("lists the setup steps in order, without cosmetic ones", () => {
    const summary = computeSettingsCompletion({
      displayName: "Casa Test",
      setupIssues: [],
      identityContact: contact,
      publicSite: {
        published: false,
        bookingEnabled: true,
        hasContact: true,
        hasGallery: false,
        hasHeroImage: false,
      },
      roomCount: 2,
    });

    expect(summary.items.map((item) => item.id)).toEqual([
      "identity",
      "inventory",
      "public-published",
      "email",
      "mfa",
    ]);
    expect(summary.publicItems.map((item) => item.id)).toEqual([
      "public-contact",
      "public-booking",
    ]);
  });

  it("points next to the first step not done", () => {
    const summary = computeSettingsCompletion({
      displayName: "Casa Test",
      setupIssues: [],
      identityContact: contact,
      emailReplyTo: "hotel@test.ro",
      includeMfa: false,
      publicSite: {
        published: false,
        bookingEnabled: false,
        hasContact: false,
        hasGallery: false,
        hasHeroImage: false,
      },
      roomCount: 1,
    });

    expect(summary.next?.id).toBe("public-published");
    expect(summary.completeCount).toBe(3);
    expect(summary.totalCount).toBe(4);
  });

  it("needs a contact email before the identity step is done", () => {
    const summary = computeSettingsCompletion({
      displayName: "Casa Test",
      setupIssues: [
        {
          id: SETUP_ISSUE_IDS.CONTACT_EMAIL_MISSING,
          severity: "warning",
          labelKey: "contactEmailMissing",
          settingsPath: "/admin/settings/identity",
        },
      ],
      identityContact: { ...contact, email: null },
      publicSite: null,
    });

    expect(summary.items.find((item) => item.id === "identity")?.done).toBe(false);
    expect(summary.next?.id).toBe("identity");
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
