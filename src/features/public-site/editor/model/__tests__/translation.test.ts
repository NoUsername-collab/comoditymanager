import { describe, expect, it } from "vitest";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";
import {
  missingCount,
  rowMissing,
  setTranslation,
  translationGroups,
} from "@/features/public-site/editor/model/translation";
import {
  buildPublicSiteStudioDraft,
  mergeStudioToInput,
} from "@/features/public-site/editor/model/studio-draft";
import { fillStudioLocaleFrom } from "@/features/public-site/editor/model/editor-model";

const config: PublicSiteConfig = {
  id: "ps-1",
  version: 1,
  templateId: "classic",
  themeId: "noir",
  published: true,
  bookingEnabled: true,
  bookingNavPosition: "nav",
  usePrimaryContact: true,
  hero: { title: { ro: "Casa Ana", en: "Casa Ana" }, subtitle: { ro: "Liniște la munte" }, imageUrl: null },
  contact: { email: null, phone: null },
  seo: {},
  bookingNotice: { enabled: false, title: {}, items: [], footer: {} },
  chrome: {},
  pages: {},
  untranslatedCopy: {},
  sections: [
    {
      id: "faq-1",
      sectionType: "faq",
      sortOrder: 10,
      visible: true,
      payload: {
        title: { ro: "Întrebări" },
        items: [{ question: { ro: "Animale?" }, answer: { ro: "Da, mici." } }],
      },
    },
    {
      id: "intro-1",
      sectionType: "intro",
      sortOrder: 20,
      visible: false,
      payload: { title: { ro: "Despre noi" } },
    },
  ],
  displayName: "Casa Ana",
  checkInTime: "14:00",
  checkOutTime: "11:00",
  stayOffers: [],
  place: { address: null, lat: null, lng: null },
  media: [],
};

describe("translating side by side", () => {
  it("lists what has words in either language, the top first, hidden sections left out", () => {
    const draft = buildPublicSiteStudioDraft(config, "en");
    const groups = translationGroups(draft, "ro", "en");
    expect(groups[0]?.part).toBe("hero");
    const hero = groups[0]!.rows;
    expect(hero.find((row) => row.field === "heroSubtitle")).toMatchObject({
      source: "Liniște la munte",
      target: "",
    });
    const faq = groups.find((group) => group.section?.type === "faq")!;
    expect(faq.rows.map((row) => [row.field, row.itemIndex, row.source])).toEqual([
      ["title", undefined, "Întrebări"],
      ["question", 1, "Animale?"],
      ["answer", 1, "Da, mici."],
    ]);
    expect(groups.some((group) => group.section?.type === "intro")).toBe(false);
  });

  it("counts a pasted, untouched text as still to translate", () => {
    const pasted = fillStudioLocaleFrom(buildPublicSiteStudioDraft(config, "en"), "ro", "en");
    const groups = translationGroups(pasted, "ro", "en");
    const subtitle = groups[0]!.rows.find((row) => row.field === "heroSubtitle")!;
    expect(subtitle).toMatchObject({ target: "Liniște la munte", copied: true });
    expect(rowMissing(subtitle)).toBe(true);

    const translated = setTranslation(pasted, "en", subtitle.path, "Quiet in the mountains");
    const after = translationGroups(translated, "ro", "en")[0]!.rows.find((row) => row.field === "heroSubtitle")!;
    expect(after).toMatchObject({ target: "Quiet in the mountains", copied: false });
    expect(rowMissing(after)).toBe(false);
  });

  it("writes a translation where its own screen would, and the save keeps both languages", () => {
    let draft = buildPublicSiteStudioDraft(config, "ro");
    const faq = translationGroups(draft, "ro", "en").find((group) => group.section?.type === "faq")!;
    const before = missingCount([faq]);
    for (const row of faq.rows) draft = setTranslation(draft, "en", row.path, `EN ${row.source}`);
    expect(missingCount(translationGroups(draft, "ro", "en").filter((g) => g.id === faq.id))).toBe(0);
    expect(before).toBe(3);

    const saved = mergeStudioToInput({ config, draft }).sections.find((s) => s.sectionType === "faq")!;
    expect(saved.payload.title).toEqual({ ro: "Întrebări", en: "EN Întrebări" });
    expect((saved.payload.items as { answer: Record<string, string> }[])[0]?.answer).toEqual({
      ro: "Da, mici.",
      en: "EN Da, mici.",
    });
    // The language being edited elsewhere in the studio is not changed.
    expect(draft.editLocale).toBe("ro");
  });

  it("counts a default text left in place as untranslated when the source is the operator's own", () => {
    const draft = buildPublicSiteStudioDraft(
      { ...config, hero: { ...config.hero, subtitle: { ro: "Liniște la munte", en: "A warm welcome" } } },
      "en",
    );
    const stock = { ro: ["Bun venit"], en: ["A warm welcome"], bg: [] };
    const subtitle = translationGroups(draft, "ro", "en", stock)[0]!.rows.find((row) => row.field === "heroSubtitle")!;
    expect(subtitle).toMatchObject({ stock: true, copied: false });
    expect(rowMissing(subtitle)).toBe(true);
  });
});
