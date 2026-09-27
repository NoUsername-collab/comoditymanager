import { describe, expect, it } from "vitest";
import {
  buildPublicSiteConfigFromInput,
  finalizePublicSiteConfig,
} from "@/domain/public-site/resolve-config";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";

const baseRow = {
  id: "ps-1",
  templateId: "classic" as const,
  themeId: "noir" as const,
  published: true,
  bookingEnabled: true,
  bookingNavPosition: "nav" as const,
  usePrimaryContact: true,
  hero: {},
  contact: { email: null, phone: null },
  seo: {},
  bookingNotice: {
    enabled: true,
    title: {},
    items: [],
    footer: {},
  },
  chrome: {},
  pages: {},
};

const fallbackSections = [
  {
    id: "intro-1",
    sectionType: "intro" as const,
    sortOrder: 10,
    visible: true,
    payload: { title: { ro: "Intro" } },
  },
];

describe("finalizePublicSiteConfig", () => {
  it("merges primary contact when usePrimaryContact is true", () => {
    const config = finalizePublicSiteConfig(baseRow, fallbackSections, {
      displayName: "Casa Test",
      checkInTime: "14:00",
      checkOutTime: "11:00",
      primaryContact: {
        email: "owner@test.ro",
        phone: "+40123456789",
        whatsapp: null,
        telegram: null,
        facebook: null,
        instagram: null,
      },
      fallbackSections,
      fallbackContactEmail: "fallback@test.ro",
    });

    expect(config.displayName).toBe("Casa Test");
    expect(config.contact.email).toBe("owner@test.ro");
    expect(config.contact.phone).toBe("+40123456789");
  });

  it("uses override contact when usePrimaryContact is false", () => {
    const config = finalizePublicSiteConfig(
      {
        ...baseRow,
        usePrimaryContact: false,
        contact: { email: "public@test.ro", phone: "+40999" },
      },
      fallbackSections,
      {
        displayName: "Casa Test",
        checkInTime: "14:00",
        checkOutTime: "11:00",
        primaryContact: {
          email: "owner@test.ro",
          phone: "+40123456789",
          whatsapp: null,
          telegram: null,
          facebook: null,
          instagram: null,
        },
        fallbackSections,
      },
    );

    expect(config.contact.email).toBe("public@test.ro");
    expect(config.contact.phone).toBe("+40999");
  });

  it("uses the identity logo and drops a stored chrome logo", () => {
    const config = finalizePublicSiteConfig(
      {
        ...baseRow,
        chrome: { logoUrl: "https://cdn.example/old.png" },
      },
      fallbackSections,
      {
        displayName: "Casa Test",
        checkInTime: "14:00",
        checkOutTime: "11:00",
        primaryContact: {
          email: null,
          phone: null,
          whatsapp: null,
          telegram: null,
          facebook: null,
          instagram: null,
        },
        fallbackSections,
        logoUrl: "https://cdn.example/new.png",
      },
    );

    expect(config.chrome.logoUrl).toBe("https://cdn.example/new.png");
  });

  it("shows no logo when identity has none", () => {
    const config = finalizePublicSiteConfig(
      {
        ...baseRow,
        chrome: { logoUrl: "https://cdn.example/old.png" },
      },
      fallbackSections,
      {
        displayName: "Casa Test",
        checkInTime: "14:00",
        checkOutTime: "11:00",
        primaryContact: {
          email: null,
          phone: null,
          whatsapp: null,
          telegram: null,
          facebook: null,
          instagram: null,
        },
        fallbackSections,
        logoUrl: null,
      },
    );

    expect(config.chrome.logoUrl).toBeNull();
  });
});

describe("buildPublicSiteConfigFromInput", () => {
  it("applies draft template and theme onto base config", () => {
    const base: PublicSiteConfig = {
      ...baseRow,
      displayName: "Casa Emil",
      checkInTime: "15:00",
      checkOutTime: "10:00",
      sections: fallbackSections,
      contact: {
        email: "a@test.ro",
        phone: null,
        whatsapp: null,
        telegram: null,
        facebook: null,
        instagram: null,
      },
      stayOffers: [],
      place: { address: null, lat: null, lng: null },
    };

    const preview = buildPublicSiteConfigFromInput(
      base,
      {
        templateId: "editorial",
        themeId: "alpine",
        published: false,
        bookingEnabled: false,
        bookingNavPosition: "hidden",
        usePrimaryContact: true,
        hero: { title: { ro: "Draft title" } },
        contact: {},
        seo: {},
        bookingNotice: {
          enabled: true,
          title: {},
          items: [],
          footer: {},
        },
        chrome: {},
        pages: {},
        sections: [{ sectionType: "intro", sortOrder: 10, visible: false, payload: {} }],
      },
      {
        email: "a@test.ro",
        phone: null,
        whatsapp: null,
        telegram: null,
        facebook: null,
        instagram: null,
      },
    );

    expect(preview.templateId).toBe("editorial");
    expect(preview.themeId).toBe("alpine");
    expect(preview.bookingEnabled).toBe(false);
    expect(preview.sections[0]?.visible).toBe(false);
  });
});
