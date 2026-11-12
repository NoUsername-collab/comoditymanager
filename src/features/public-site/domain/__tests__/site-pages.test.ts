import { describe, expect, it } from "vitest";
import { defaultPublicChrome } from "@/features/public-site/domain/chrome";
import { resolvePublicNavItems } from "@/features/public-site/domain/nav-items";
import {
  freePageSlug,
  normalizePublicMenu,
  pageSlugProblem,
  sectionAnchor,
  slugifyPageName,
} from "@/features/public-site/domain/site-pages";
import type { PublicMenuItem, PublicSiteConfig, PublicSitePage } from "@/features/public-site/domain/types";

describe("page addresses", () => {
  it("makes an address from a name, without diacritics", () => {
    expect(slugifyPageName("Activități & Trasee")).toBe("activitati-trasee");
    expect(slugifyPageName("  Șură — Țuică!  ")).toBe("sura-tuica");
    expect(slugifyPageName("Ресторант")).toBe("");
  });

  it("says why an address cannot be used", () => {
    expect(pageSlugProblem("", [])).toBe("empty");
    expect(pageSlugProblem("Restaurant", [])).toBe("format");
    expect(pageSlugProblem("a--b", [])).toBe("format");
    expect(pageSlugProblem("calendar", [])).toBe("reserved");
    expect(pageSlugProblem("en", [])).toBe("reserved");
    expect(pageSlugProblem("restaurant", ["restaurant"])).toBe("taken");
    expect(pageSlugProblem("restaurant", ["spa"])).toBeNull();
  });

  it("finds a free address", () => {
    expect(freePageSlug("Restaurant", [])).toBe("restaurant");
    expect(freePageSlug("Restaurant", ["restaurant"])).toBe("restaurant-2");
    expect(freePageSlug("Calendar", [])).toBe("calendar-1");
    expect(freePageSlug("Ресторант", [])).toBe("pagina");
  });

  it("gives each section an anchor", () => {
    expect(sectionAnchor("3f2a9c1e-0000-4000-8000-000000000001")).toBe("s-3f2a9c1e0000");
  });
});

describe("normalizePublicMenu", () => {
  it("starts with the first page and privacy when nothing is stored", () => {
    expect(normalizePublicMenu(undefined).map((item) => item.kind)).toEqual(["home", "privacy"]);
    expect(normalizePublicMenu([])).toEqual([]);
  });

  it("drops unknown kinds, links without a target and a second level", () => {
    const menu = normalizePublicMenu([
      { id: "a", kind: "home", label: { ro: "Acasă", fr: "x" } },
      { id: "b", kind: "teleport", label: {} },
      { id: "c", kind: "page", label: {} },
      {
        id: "d",
        kind: "group",
        label: { ro: "Descoperă" },
        children: [
          { id: "e", kind: "url", ref: "https://example.com", label: { ro: "Hartă" }, children: [{ id: "f", kind: "home" }] },
          { id: "g", kind: "group", label: {} },
        ],
      },
    ]);
    expect(menu).toEqual([
      { id: "a", kind: "home", label: { ro: "Acasă" } },
      {
        id: "d",
        kind: "group",
        label: { ro: "Descoperă" },
        children: [{ id: "e", kind: "url", ref: "https://example.com", label: { ro: "Hartă" } }],
      },
    ]);
  });
});

describe("the menu on the site", () => {
  const restaurant: PublicSitePage = {
    id: "p1",
    slug: "restaurant",
    title: { ro: "Restaurant" },
    lead: {},
    seoDescription: {},
    imageUrl: null,
    visible: true,
    sortOrder: 0,
    sections: [
      { id: "s-menu-1", sectionType: "text", sortOrder: 0, visible: true, payload: { title: { ro: "Meniul zilei" } } },
    ],
  };
  const hiddenSpa: PublicSitePage = { ...restaurant, id: "p2", slug: "spa", title: { ro: "Spa" }, visible: false, sections: [] };
  const site = (menu: PublicMenuItem[]) =>
    ({
      chrome: { ...defaultPublicChrome(), navHome: { ro: "Acasă" }, menu },
      bookingEnabled: true,
      bookingNavPosition: "footer",
      sections: [
        { id: "s-intro-1", sectionType: "intro", sortOrder: 0, visible: true, payload: { title: { ro: "Despre noi" } } },
      ],
      sitePages: [restaurant, hiddenSpa],
    }) as unknown as PublicSiteConfig;

  it("links pages and sections by their name, and leaves out hidden ones", () => {
    const items = resolvePublicNavItems(
      site([
        { id: "1", kind: "page", ref: "p1", label: {} },
        { id: "2", kind: "page", ref: "p2", label: {} },
        { id: "3", kind: "section", ref: "s-intro-1", label: {} },
        { id: "4", kind: "section", ref: "s-menu-1", label: { ro: "Azi" } },
        { id: "5", kind: "page", ref: "gone", label: { ro: "Vechi" } },
      ]),
      "ro",
    );
    expect(items).toEqual([
      { key: "1", href: "/restaurant", label: "Restaurant" },
      { key: "3", href: `/#${"s-sintro1"}`, label: "Despre noi" },
      { key: "4", href: `/restaurant#${"s-smenu1"}`, label: "Azi" },
    ]);
  });

  it("opens a group's submenu and leaves out a group with nothing in it", () => {
    const items = resolvePublicNavItems(
      site([
        {
          id: "g",
          kind: "group",
          label: { ro: "Descoperă" },
          children: [
            { id: "c1", kind: "page", ref: "p1", label: {} },
            { id: "c2", kind: "url", ref: "https://maps.example.com", label: { ro: "Hartă" } },
          ],
        },
        { id: "empty", kind: "group", label: { ro: "Gol" }, children: [{ id: "c3", kind: "page", ref: "p2", label: {} }] },
        { id: "nameless", kind: "group", label: {}, children: [{ id: "c4", kind: "home", label: {} }] },
      ]),
      "ro",
    );
    expect(items).toEqual([
      {
        key: "g",
        href: undefined,
        label: "Descoperă",
        children: [
          { key: "c1", href: "/restaurant", label: "Restaurant" },
          { key: "c2", href: "https://maps.example.com", label: "Hartă", external: true },
        ],
      },
    ]);
  });

  it("links the calendar only while bookings are on", () => {
    const menu: PublicMenuItem[] = [{ id: "cal", kind: "calendar", label: { ro: "Rezervă" } }];
    expect(resolvePublicNavItems(site(menu), "ro").map((item) => item.href)).toEqual(["/calendar"]);
    const off = { ...site(menu), bookingEnabled: false } as PublicSiteConfig;
    expect(resolvePublicNavItems(off, "ro")).toEqual([]);
  });
});
