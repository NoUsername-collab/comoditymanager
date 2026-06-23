import { describe, expect, it } from "vitest";
import { parseGuestAppSettingsInput } from "@/domain/settings/schemas/guest-app";
import { parsePublicSiteSettingsInput } from "@/domain/settings/schemas/public-site";
import { parseEmailSettingsPartial } from "@/domain/settings/schemas/email";
import { DEFAULT_GUEST_APP_SETTINGS } from "@/domain/guest-app/defaults";

describe("settings schemas", () => {
  it("accepts valid guest app settings", () => {
    const result = parseGuestAppSettingsInput(DEFAULT_GUEST_APP_SETTINGS);
    expect(result.ok).toBe(true);
  });

  it("rejects guest app settings with unknown feature id", () => {
    const result = parseGuestAppSettingsInput({
      ...DEFAULT_GUEST_APP_SETTINGS,
      features: [{ id: "bogus", state: "live", sortOrder: 1 }],
    });
    expect(result.ok).toBe(false);
  });

  it("accepts valid public site settings", () => {
    const result = parsePublicSiteSettingsInput({
      templateId: "classic",
      themeId: "noir",
      published: true,
      bookingEnabled: true,
      bookingNavPosition: "nav",
      usePrimaryContact: true,
      hero: {},
      contact: {},
      seo: {},
      sections: [],
    });
    expect(result.ok).toBe(true);
  });

  it("rejects javascript: URLs in public site hero", () => {
    const result = parsePublicSiteSettingsInput({
      templateId: "classic",
      themeId: "noir",
      published: true,
      bookingEnabled: true,
      bookingNavPosition: "nav",
      usePrimaryContact: true,
      hero: { ctaPrimaryHref: "javascript:alert(1)" },
      contact: {},
      seo: {},
      sections: [],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects javascript: contact URLs", () => {
    const result = parsePublicSiteSettingsInput({
      templateId: "classic",
      themeId: "noir",
      published: true,
      bookingEnabled: true,
      bookingNavPosition: "nav",
      usePrimaryContact: true,
      hero: {},
      contact: { facebook: "javascript:alert(1)" },
      seo: {},
      sections: [],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects invalid email reply_to", () => {
    const result = parseEmailSettingsPartial({
      email_reply_to: "not-an-email",
    });
    expect(result.ok).toBe(false);
  });

  it("normalizes empty email fields to null", () => {
    const result = parseEmailSettingsPartial({
      email_reply_to: "",
      email_from_address: "",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.email_reply_to).toBeNull();
      expect(result.data.email_from_address).toBeNull();
    }
  });
});
