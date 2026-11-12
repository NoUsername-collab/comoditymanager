import { describe, expect, it } from "vitest";
import type { PublicSiteConfig } from "@/features/public-site/domain/types";
import {
  readSectionStyle,
  sectionLook,
  styleFromSettings,
  styleSettingKey,
  styleToSettings,
  writeSectionStyle,
} from "@/features/public-site/domain/section-style";
import {
  buildPublicSiteStudioDraft,
  mergeStudioToInput,
  patchStudioSection,
  type PublicSiteStudioDraft,
} from "@/features/public-site/editor/model/studio-draft";
import { findSectionDraft } from "@/features/public-site/editor/model/section-draft";
import { buildPublicSiteConfigFromInput } from "@/domain/public-site/resolve-config";
import { EMPTY_PENSION_CONTACT } from "@/domain/settings/pension-identity";
import { parsePublicSiteSettingsInput } from "@/domain/settings/schemas/public-site";

const config: PublicSiteConfig = {
  id: "ps-1",
  version: 3,
  templateId: "classic",
  themeId: "noir",
  published: false,
  bookingEnabled: true,
  bookingNavPosition: "nav",
  usePrimaryContact: true,
  hero: { title: { ro: "Casa" }, subtitle: {}, imageUrl: null },
  contact: { email: null, phone: null },
  seo: {},
  bookingNotice: { enabled: true, title: {}, items: [], footer: {} },
  chrome: {},
  pages: {},
  untranslatedCopy: {},
  sections: [
    {
      id: "intro-1",
      sectionType: "intro",
      sortOrder: 10,
      visible: true,
      payload: { title: { ro: "Despre" }, lead: { ro: "Text" } },
    },
  ],
  displayName: "Casa Test",
  checkInTime: "14:00",
  checkOutTime: "11:00",
  stayOffers: [],
  place: { address: null, lat: null, lng: null },
  media: [],
};

function setStyle(draft: PublicSiteStudioDraft, style: Record<string, string>) {
  const key = findSectionDraft(draft.sections, "intro")!.key;
  return patchStudioSection(draft, key, (section) => ({
    ...section,
    settings: {
      ...section.settings,
      ...Object.fromEntries(Object.entries(style).map(([k, v]) => [styleSettingKey(k as "look"), v])),
    },
  }));
}

function saveAndReload(draft: PublicSiteStudioDraft, from: PublicSiteConfig = config) {
  const input = mergeStudioToInput({ config: from, draft });
  const parsed = parsePublicSiteSettingsInput(input);
  expect(parsed.ok).toBe(true);
  const saved = buildPublicSiteConfigFromInput(from, input, EMPTY_PENSION_CONTACT);
  return { input, saved, reloaded: buildPublicSiteStudioDraft(saved, "ro") };
}

const introPayload = (input: ReturnType<typeof mergeStudioToInput>) =>
  input.sections.find((row) => row.sectionType === "intro")!.payload as Record<string, unknown>;

describe("section style", () => {
  it("reads unknown or missing values as following the page", () => {
    expect(readSectionStyle(undefined)).toEqual({ look: "auto", background: "auto", width: "auto", align: "auto" });
    expect(readSectionStyle({ look: "editorial", background: "neon", width: 3 })).toEqual({
      look: "editorial",
      background: "auto",
      width: "auto",
      align: "auto",
    });
  });

  it("stores only what differs from the page", () => {
    expect(writeSectionStyle(readSectionStyle({}))).toBeNull();
    expect(writeSectionStyle(readSectionStyle({ background: "accent", align: "center" }))).toEqual({
      background: "accent",
      align: "center",
    });
  });

  it("takes the page layout unless the section has its own", () => {
    expect(sectionLook(readSectionStyle({}), "immersive")).toBe("immersive");
    expect(sectionLook(readSectionStyle({ look: "classic" }), "immersive")).toBe("classic");
  });

  it("goes through the editor settings unchanged", () => {
    const style = readSectionStyle({ look: "immersive", background: "contrast", width: "full", align: "start" });
    expect(styleFromSettings(styleToSettings(style))).toEqual(style);
  });

  it("is saved, passes the schema and comes back after a reload", () => {
    const draft = setStyle(buildPublicSiteStudioDraft(config, "ro"), {
      look: "editorial",
      background: "soft",
      width: "narrow",
    });
    const { input, reloaded } = saveAndReload(draft);
    expect(introPayload(input).style).toEqual({ look: "editorial", background: "soft", width: "narrow" });

    const intro = findSectionDraft(reloaded.sections, "intro")!;
    expect(styleFromSettings(intro.settings)).toEqual({
      look: "editorial",
      background: "soft",
      width: "narrow",
      align: "auto",
    });
  });

  it("drops the stored style when every choice goes back to the page", () => {
    const styled = saveAndReload(setStyle(buildPublicSiteStudioDraft(config, "ro"), { background: "accent" }));
    const reset = setStyle(styled.reloaded, { background: "auto" });
    const { input } = saveAndReload(reset, styled.saved);
    expect(introPayload(input)).not.toHaveProperty("style");
  });

  it("is refused by the schema when a value is unknown", () => {
    const input = mergeStudioToInput({ config, draft: buildPublicSiteStudioDraft(config, "ro") });
    const intro = input.sections.find((row) => row.sectionType === "intro")!;
    (intro.payload as Record<string, unknown>).style = { background: "neon" };
    expect(parsePublicSiteSettingsInput(input).ok).toBe(false);
  });
});
