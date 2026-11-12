import { describe, expect, it } from "vitest";
import type { PublicMenuItem, PublicSiteConfig } from "@/features/public-site/domain/types";
import { buildPublicSiteConfigFromInput } from "@/domain/public-site/resolve-config";
import { EMPTY_PENSION_CONTACT } from "@/domain/settings/pension-identity";
import { parsePublicSiteSettingsInput } from "@/domain/settings/schemas/public-site";
import {
  addMenuItem,
  canIndentMenuItem,
  indentMenuItem,
  menuToSave,
  moveMenuItem,
  outdentMenuItem,
  removeMenuItem,
  setMenuLabel,
  withMenuTarget,
} from "@/features/public-site/editor/model/menu-draft";
import { setSectionField } from "@/features/public-site/editor/model/section-draft";
import { createSitePageDraft, setPageText } from "@/features/public-site/editor/model/site-page-draft";
import {
  buildPublicSiteStudioDraft,
  mergeStudioToInput,
  patchStudioPage,
  patchStudioSection,
  removeStudioPage,
  removeStudioSection,
  sectionsOf,
  type PublicSiteStudioDraft,
} from "@/features/public-site/editor/model/studio-draft";
import { studioLocaleProgress } from "@/features/public-site/editor/model/editor-model";
import { setTranslation, translationGroups } from "@/features/public-site/editor/model/translation";

const item = (id: string, extra: Partial<PublicMenuItem> = {}): PublicMenuItem => ({
  id,
  kind: "home",
  label: {},
  ...extra,
});
const ids = (menu: PublicMenuItem[]) =>
  menu.map((row) => (row.children ? `${row.id}[${row.children.map((c) => c.id).join(",")}]` : row.id)).join(" ");

describe("editing the menu", () => {
  const menu = [item("a"), item("b"), item("c")];

  it("moves links within their list", () => {
    expect(ids(moveMenuItem(menu, "b", -1))).toBe("b a c");
    expect(ids(moveMenuItem(menu, "a", -1))).toBe("a b c");
  });

  it("puts a link into the submenu above it and takes it out again", () => {
    const nested = indentMenuItem(indentMenuItem(menu, "b"), "c");
    expect(ids(nested)).toBe("a[b,c]");
    expect(canIndentMenuItem(nested, "a")).toBe(false);
    expect(ids(moveMenuItem(nested, "c", -1))).toBe("a[c,b]");
    expect(ids(outdentMenuItem(nested, "b"))).toBe("a[c] b");
    expect(ids(removeMenuItem(nested, "b"))).toBe("a[c]");
    expect(ids(removeMenuItem(removeMenuItem(nested, "b"), "c"))).toBe("a");
  });

  it("adds into a submenu and labels one language", () => {
    const withSub = addMenuItem([item("g", { kind: "group" })], item("x"), "g");
    expect(ids(withSub)).toBe("g[x]");
    const labelled = setMenuLabel(setMenuLabel(withSub, "x", "ro", "Acasă"), "x", "en", "Home");
    expect(labelled[0]!.children![0]!.label).toEqual({ ro: "Acasă", en: "Home" });
  });

  it("keeps a typed address when switching to a link elsewhere, drops it otherwise", () => {
    const url = withMenuTarget(item("u"), "url");
    expect(url).toMatchObject({ kind: "url", ref: "" });
    expect(withMenuTarget({ ...url, ref: "https://a.ro" }, "url").ref).toBe("https://a.ro");
    expect(withMenuTarget({ ...url, ref: "https://a.ro" }, "page:p1")).toMatchObject({ kind: "page", ref: "p1" });
    expect(withMenuTarget({ ...url, ref: "https://a.ro" }, "privacy")).not.toHaveProperty("ref");
  });

  it("saves only finished links", () => {
    const saved = menuToSave([
      item("a"),
      item("p", { kind: "page", ref: "" }),
      item("g", { kind: "group", children: [item("u", { kind: "url", ref: "  https://a.ro " }), item("q", { kind: "page" })] }),
    ]);
    expect(saved).toEqual([
      item("a"),
      item("g", { kind: "group", children: [item("u", { kind: "url", ref: "https://a.ro" })] }),
    ]);
  });
});

const config: PublicSiteConfig = {
  id: "ps-1",
  version: 3,
  templateId: "classic",
  themeId: "noir",
  published: true,
  bookingEnabled: true,
  bookingNavPosition: "nav",
  usePrimaryContact: true,
  hero: { title: { ro: "Casa" }, subtitle: {}, imageUrl: null },
  contact: { email: null, phone: null },
  seo: {},
  bookingNotice: { enabled: true, title: {}, items: [], footer: {} },
  chrome: { menu: [{ id: "home", kind: "home", label: {} }] },
  pages: {},
  untranslatedCopy: {},
  sections: [
    {
      id: "11111111-1111-4111-8111-111111111111",
      sectionType: "intro",
      sortOrder: 10,
      visible: true,
      payload: { title: { ro: "Despre" }, lead: { ro: "Text" } },
    },
  ],
  sitePages: [],
  displayName: "Casa Test",
  checkInTime: "14:00",
  checkOutTime: "11:00",
  stayOffers: [],
  place: { address: null, lat: null, lng: null },
  media: [],
};

let seq = 0;
const newKey = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`;

function withRestaurant(draft: PublicSiteStudioDraft): PublicSiteStudioDraft {
  const page = createSitePageDraft({ name: "Restaurant", model: "restaurant", locale: "ro", takenSlugs: [], newKey });
  return {
    ...draft,
    pages: [...draft.pages, page],
    menu: addMenuItem(draft.menu, { id: "m-rest", kind: "page", ref: page.key, label: {} }),
  };
}

function saveAndReload(draft: PublicSiteStudioDraft, from: PublicSiteConfig = config) {
  const input = mergeStudioToInput({ config: from, draft });
  const parsed = parsePublicSiteSettingsInput(input);
  if (!parsed.ok) throw new Error(JSON.stringify(parsed.fieldErrors));
  const saved = buildPublicSiteConfigFromInput(from, input, EMPTY_PENSION_CONTACT);
  return { input, saved, reloaded: buildPublicSiteStudioDraft(saved, "ro") };
}

describe("own pages", () => {
  it("start from a model, at a free address, in the menu", () => {
    const draft = withRestaurant(withRestaurant(buildPublicSiteStudioDraft(config, "ro")));
    // The second one was made before the first was in the list: both ask for "restaurant".
    expect(draft.pages.map((page) => page.copy.ro.title)).toEqual(["Restaurant", "Restaurant"]);
    const page = draft.pages[0]!;
    expect(page.sections.map((section) => section.type)).toEqual(["text", "gallery", "faq"]);
    expect(page.sections[1]!.settings.albums).toBe("food");
    expect(draft.menu.map((row) => row.kind)).toEqual(["home", "page", "page"]);
  });

  it("are saved with their sections, pass the schema and come back after a reload", () => {
    let draft = withRestaurant(buildPublicSiteStudioDraft(config, "ro"));
    const page = draft.pages[0]!;
    draft = patchStudioPage(draft, page.key, (row) => setPageText(row, "ro", "lead", "Bucătărie de casă"));
    draft = patchStudioSection(draft, page.sections[0]!.key, (section) =>
      setSectionField(section, "ro", "title", "Meniul zilei"),
    );
    const { input, saved, reloaded } = saveAndReload(draft);

    expect(input.sitePages).toHaveLength(1);
    expect(input.sitePages[0]).toMatchObject({ slug: "restaurant", title: { ro: "Restaurant" }, visible: true });
    expect(input.chrome.menu).toEqual([
      { id: "home", kind: "home", label: {} },
      { id: "m-rest", kind: "page", ref: page.key, label: {} },
    ]);
    expect(saved.sitePages[0]!.sections.map((section) => section.sectionType)).toEqual(["text", "gallery", "faq"]);
    // The first page keeps its own sections only.
    expect(saved.sections.map((section) => section.sectionType)).toEqual(draft.sections.map((section) => section.type));
    expect(saved.sections.map((section) => section.sectionType)).not.toContain("faq");

    const back = reloaded.pages[0]!;
    expect(back.key).toBe(page.key);
    expect(back.copy.ro.lead).toBe("Bucătărie de casă");
    expect(sectionsOf(reloaded, page.key)[0]!.copy.ro.fields.title).toBe("Meniul zilei");
  });

  it("refuse an address the site uses or another page has", () => {
    const draft = withRestaurant(withRestaurant(buildPublicSiteStudioDraft(config, "ro")));
    const input = mergeStudioToInput({ config, draft });
    const parsed = parsePublicSiteSettingsInput(input);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.fieldErrors?.["sitePages.1.slug"]).toBeDefined();

    const reserved = patchStudioPage(withRestaurant(buildPublicSiteStudioDraft(config, "ro")), draft.pages[0]!.key, (p) => p);
    const calendar = { ...reserved, pages: reserved.pages.map((p) => ({ ...p, slug: "calendar" })) };
    expect(parsePublicSiteSettingsInput(mergeStudioToInput({ config, draft: calendar })).ok).toBe(false);
  });

  it("take their sections and menu links with them when removed", () => {
    let draft = withRestaurant(buildPublicSiteStudioDraft(config, "ro"));
    const page = draft.pages[0]!;
    const faq = page.sections[2]!;
    draft = {
      ...draft,
      menu: addMenuItem(draft.menu, { id: "m-faq", kind: "section", ref: faq.key, label: { ro: "Întrebări" } }),
    };
    const withoutFaq = removeStudioSection(draft, faq.key);
    expect(sectionsOf(withoutFaq, page.key).map((section) => section.type)).toEqual(["text", "gallery"]);
    expect(withoutFaq.menu.map((row) => row.id)).toEqual(["home", "m-rest"]);

    const removed = removeStudioPage(draft, page.key);
    expect(removed.pages).toEqual([]);
    expect(removed.menu.map((row) => row.id)).toEqual(["home"]);
  });

  it("count towards a language and are translated side by side", () => {
    let draft = withRestaurant(buildPublicSiteStudioDraft(config, "ro"));
    const page = draft.pages[0]!;
    const before = studioLocaleProgress(draft).en;
    const group = translationGroups(draft, "ro", "en").find((row) => row.id === `page.${page.key}`);
    expect(group?.page?.title).toBe("Restaurant");
    expect(group?.rows.map((row) => row.field)).toEqual(["page.title"]);

    draft = setTranslation(draft, "en", `page.${page.key}.title`, "Restaurant");
    expect(draft.pages[0]!.copy.en.title).toBe("Restaurant");
    expect(studioLocaleProgress(draft).en).toBeGreaterThan(before);
  });
});
