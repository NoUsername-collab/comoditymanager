import type { PublicLocale, PublicSiteConfig } from "@/features/public-site/domain/types";
import { PUBLIC_LOCALES } from "@/features/public-site/domain/types";
import { applyTemplateSectionKeys } from "@/features/public-site/domain/order-sections";
import type {
  LocaleCopy,
  PublicSiteStudioDraft,
} from "@/features/settings/ui/public-site-studio-draft";

/** Editor tabs, in the order an operator works through them. */
export const PUBLIC_SITE_EDITOR_TABS = ["design", "content", "contact", "publish"] as const;
export type PublicSiteEditorTab = (typeof PUBLIC_SITE_EDITOR_TABS)[number];

/** Which tab owns a server field error path (`hero.title`, `contact.email`, …). */
export function tabForFieldPath(path: string): PublicSiteEditorTab {
  if (path.startsWith("contact") || path.startsWith("bookingNotice")) return "contact";
  if (path.startsWith("seo") || path.startsWith("pages")) return "publish";
  if (path.startsWith("templateId") || path.startsWith("themeId") || path.startsWith("chrome.fontId")) {
    return "design";
  }
  return "content";
}

export function firstErrorTab(fieldErrors: Record<string, string>): PublicSiteEditorTab | null {
  const first = Object.keys(fieldErrors)[0];
  return first ? tabForFieldPath(first) : null;
}

/** Destinations a button can point at without typing a URL. */
export const PUBLIC_LINK_PRESETS = [
  { id: "calendar", href: "/calendar" },
  { id: "intro", href: "#public-intro" },
  { id: "steps", href: "#cum-functioneaza" },
] as const;
export type PublicLinkPresetId = (typeof PUBLIC_LINK_PRESETS)[number]["id"] | "custom";

export function linkPresetFor(href: string): PublicLinkPresetId {
  const value = href.trim();
  return PUBLIC_LINK_PRESETS.find((preset) => preset.href === value)?.id ?? "custom";
}

/** Strings a visitor reads on the homepage, gated by what is visible. */
function visibleCopyFields(draft: PublicSiteStudioDraft, copy: LocaleCopy): string[] {
  const fields = [copy.heroTitle, copy.heroSubtitle, copy.heroCtaPrimary];
  if (draft.introVisible) fields.push(copy.introTitle, copy.introLead);
  if (draft.benefitsVisible) {
    fields.push(copy.benefitsTitle);
    for (const item of copy.benefitItems) fields.push(item.title);
  }
  if (draft.stepsVisible) {
    fields.push(copy.stepsTitle);
    for (const item of copy.stepItems) fields.push(item.title);
  }
  if (draft.ctaVisible) fields.push(copy.ctaTitle, copy.ctaLabel);
  for (const item of copy.textItems) {
    if (draft.textVisible[item.id] !== false) fields.push(item.title, item.body);
  }
  return fields;
}

/** 0–100: share of visible homepage copy filled in for each language. */
export function studioLocaleProgress(
  draft: PublicSiteStudioDraft,
): Record<PublicLocale, number> {
  const progress = {} as Record<PublicLocale, number>;
  for (const locale of PUBLIC_LOCALES) {
    const fields = visibleCopyFields(draft, draft.copies[locale]);
    const filled = fields.filter((value) => value.trim().length > 0).length;
    progress[locale] = fields.length === 0 ? 100 : Math.round((filled / fields.length) * 100);
  }
  return progress;
}

function fillString(target: string, source: string): string {
  return target.trim() ? target : source;
}

/**
 * Fill only the empty fields of `to` with the text from `from`, so the operator
 * can translate in place instead of starting from a blank page.
 */
export function fillStudioLocaleFrom(
  draft: PublicSiteStudioDraft,
  from: PublicLocale,
  to: PublicLocale,
): PublicSiteStudioDraft {
  if (from === to) return draft;
  const source = draft.copies[from];
  const target = draft.copies[to];
  const next = { ...target } as LocaleCopy;

  for (const key of Object.keys(source) as (keyof LocaleCopy)[]) {
    const value = source[key];
    if (typeof value === "string") {
      (next as Record<string, unknown>)[key] = fillString(target[key] as string, value);
    }
  }

  next.benefitItems = source.benefitItems.map((item, index) => ({
    icon: item.icon,
    title: fillString(target.benefitItems[index]?.title ?? "", item.title),
    text: fillString(target.benefitItems[index]?.text ?? "", item.text),
  }));
  next.stepItems = source.stepItems.map((item, index) => ({
    title: fillString(target.stepItems[index]?.title ?? "", item.title),
    text: fillString(target.stepItems[index]?.text ?? "", item.text),
  }));
  next.textItems = source.textItems.map((item) => {
    const match = target.textItems.find((row) => row.id === item.id);
    return {
      id: item.id,
      title: fillString(match?.title ?? "", item.title),
      lead: fillString(match?.lead ?? "", item.lead),
      body: fillString(match?.body ?? "", item.body),
    };
  });
  const captions = { ...target.galleryCaptions };
  for (const [id, caption] of Object.entries(source.galleryCaptions)) {
    captions[id] = fillString(captions[id] ?? "", caption);
  }
  next.galleryCaptions = captions;

  return { ...draft, copies: { ...draft.copies, [to]: next } };
}

export type PublicSiteReadinessId =
  | "heroImage"
  | "heroTitle"
  | "description"
  | "contact"
  | "gallery"
  | "locales";

export type PublicSiteReadinessItem = {
  id: PublicSiteReadinessId;
  done: boolean;
  tab: PublicSiteEditorTab;
};

/** Checklist shown before publishing. `config` is the resolved preview config. */
export function publicSiteReadiness(
  draft: PublicSiteStudioDraft,
  config: Pick<PublicSiteConfig, "contact">,
): PublicSiteReadinessItem[] {
  const copy = draft.copies[draft.editLocale];
  const hasPhoto = draft.galleryItems.some((item) => item.url.trim().length > 0);
  const contact = config.contact;
  const progress = studioLocaleProgress(draft);

  return [
    { id: "heroImage", done: draft.heroImageUrl.trim().length > 0, tab: "content" },
    { id: "heroTitle", done: copy.heroTitle.trim().length > 0, tab: "content" },
    {
      id: "description",
      done: copy.heroSubtitle.trim().length > 0 || copy.introLead.trim().length > 0,
      tab: "content",
    },
    {
      id: "contact",
      done: Boolean(contact.phone || contact.email || contact.whatsapp),
      tab: "contact",
    },
    { id: "gallery", done: !draft.galleryVisible || hasPhoto, tab: "content" },
    {
      id: "locales",
      done: PUBLIC_LOCALES.every((locale) => progress[locale] === 100),
      tab: "content",
    },
  ];
}

/** Editor card key for the n-th rendered section of a type (`text` → `text:<id>`). */
export function editKeyForSection(
  sectionType: string,
  nth: number,
  sectionOrder: string[],
): string | null {
  if (sectionType !== "text") return sectionOrder.includes(sectionType) ? sectionType : null;
  return sectionOrder.filter((key) => key.startsWith("text:"))[nth] ?? null;
}

/** Which editor card a click inside the live preview belongs to. */
export function editKeyFromPreviewTarget(
  target: Element,
  sectionOrder: string[],
): string | null {
  const section = target.closest<HTMLElement>("[data-pub-section]");
  if (section) {
    return editKeyForSection(
      section.dataset.pubSection ?? "",
      Number(section.dataset.pubNth ?? 0),
      sectionOrder,
    );
  }
  if (target.closest(".pub-hero")) return "hero";
  if (target.closest(".pub-section--stays")) return "stays";
  if (target.closest(".pub-section--place")) return "place";
  if (target.closest(".pub-contact-bar")) return "contactBar";
  if (target.closest(".public-header, .public-footer")) return "chrome";
  return null;
}

/** Ready-made look: one layout + one palette, named the way an owner thinks. */
export const PUBLIC_STYLE_PRESETS = [
  { id: "mountain", templateId: "classic", themeId: "alpine" },
  { id: "elegant", templateId: "editorial", themeId: "noir" },
  { id: "seaside", templateId: "immersive", themeId: "mediterranean" },
  { id: "boutique", templateId: "editorial", themeId: "pearl" },
  { id: "forest", templateId: "classic", themeId: "forest" },
  { id: "modern", templateId: "classic", themeId: "slate" },
] as const satisfies readonly {
  id: string;
  templateId: PublicSiteStudioDraft["templateId"];
  themeId: PublicSiteStudioDraft["themeId"];
}[];
export type PublicStylePresetId = (typeof PUBLIC_STYLE_PRESETS)[number]["id"];

export type QuickStartAnswers = {
  heroTitle: string;
  heroSubtitle: string;
  introLead: string;
  heroImageUrl: string;
  galleryUrls: string[];
  styleId: PublicStylePresetId | null;
  contactPhone: string;
  contactEmail: string;
};

export function quickStartAnswersFrom(draft: PublicSiteStudioDraft): QuickStartAnswers {
  const copy = draft.copies[draft.editLocale];
  const preset = PUBLIC_STYLE_PRESETS.find(
    (row) => row.templateId === draft.templateId && row.themeId === draft.themeId,
  );
  return {
    heroTitle: copy.heroTitle,
    heroSubtitle: copy.heroSubtitle,
    introLead: copy.introLead,
    heroImageUrl: draft.heroImageUrl,
    galleryUrls: draft.galleryItems.map((item) => item.url).filter((url) => url.trim()),
    styleId: preset?.id ?? null,
    contactPhone: draft.contactPhone,
    contactEmail: draft.contactEmail,
  };
}

/**
 * Write quick-start answers into the draft (current language only). Photos are
 * appended to the gallery, which is switched on once it has any.
 */
export function applyQuickStart(
  draft: PublicSiteStudioDraft,
  answers: QuickStartAnswers,
  newGalleryId: () => string,
): PublicSiteStudioDraft {
  const locale = draft.editLocale;
  const preset = PUBLIC_STYLE_PRESETS.find((row) => row.id === answers.styleId);
  const known = new Set(draft.galleryItems.map((item) => item.url));
  const added = answers.galleryUrls
    .map((url) => url.trim())
    .filter((url) => {
      if (!url || known.has(url)) return false;
      known.add(url);
      return true;
    })
    .map((url) => ({ id: newGalleryId(), url }));

  const copies = { ...draft.copies };
  for (const loc of PUBLIC_LOCALES) {
    const captions = { ...copies[loc].galleryCaptions };
    for (const item of added) captions[item.id] = "";
    copies[loc] = { ...copies[loc], galleryCaptions: captions };
  }
  copies[locale] = {
    ...copies[locale],
    heroTitle: answers.heroTitle.trim() || copies[locale].heroTitle,
    heroSubtitle: answers.heroSubtitle.trim() || copies[locale].heroSubtitle,
    introLead: answers.introLead.trim() || copies[locale].introLead,
  };

  const galleryItems = [...draft.galleryItems, ...added];
  return {
    ...draft,
    copies,
    templateId: preset?.templateId ?? draft.templateId,
    sectionOrder:
      preset && preset.templateId !== draft.templateId
        ? applyTemplateSectionKeys(draft.sectionOrder, preset.templateId)
        : draft.sectionOrder,
    themeId: preset?.themeId ?? draft.themeId,
    heroImageUrl: answers.heroImageUrl.trim() || draft.heroImageUrl,
    galleryItems,
    galleryVisible: draft.galleryVisible || added.length > 0,
    contactPhone: answers.contactPhone.trim() || draft.contactPhone,
    contactEmail: answers.contactEmail.trim() || draft.contactEmail,
  };
}

/** A site nobody has set up yet: never published, no photos. */
export function isFreshPublicSite(draft: PublicSiteStudioDraft): boolean {
  return (
    !draft.published &&
    !draft.heroImageUrl.trim() &&
    !draft.galleryItems.some((item) => item.url.trim())
  );
}
