import {
  anchoredSectionType,
  PUBLIC_INTRO_HREF,
  PUBLIC_STEPS_HREF,
} from "@/features/public-site/domain/anchors";
import type {
  PublicLocale,
  PublicSiteConfig,
  PublicStockCopy,
} from "@/features/public-site/domain/types";
import { PUBLIC_LOCALES } from "@/features/public-site/domain/types";
import { HOMEPAGE_COPY_KEYS } from "@/features/public-site/editor/model/copy-fields";
import {
  addSectionItem,
  findSectionDraft,
  orderSectionsForTemplate,
  sectionField,
  sectionKeyForRendered,
  sectionProgressSlots,
  sectionTextSlots,
  setSectionField,
  setSectionSlot,
} from "@/features/public-site/editor/model/section-draft";
import type {
  LocaleCopy,
  PublicSiteStudioDraft,
} from "@/features/public-site/editor/model/studio-draft";

/** Editor tabs: the page itself, how it looks, and everything around it. */
export const PUBLIC_SITE_EDITOR_TABS = ["content", "design", "settings"] as const;
export type PublicSiteEditorTab = (typeof PUBLIC_SITE_EDITOR_TABS)[number];

/** Which tab owns a server field error path (`hero.title`, `contact.email`, …). */
export function tabForFieldPath(path: string): PublicSiteEditorTab {
  if (
    path.startsWith("contact") ||
    path.startsWith("bookingNotice") ||
    path.startsWith("seo") ||
    path.startsWith("pages")
  ) {
    return "settings";
  }
  if (path.startsWith("templateId") || path.startsWith("themeId") || path.startsWith("chrome.fontId") ||
    path.startsWith("chrome.accentColor")) {
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
  { id: "intro", href: PUBLIC_INTRO_HREF },
  { id: "steps", href: PUBLIC_STEPS_HREF },
] as const;
type PublicLinkPresetId = (typeof PUBLIC_LINK_PRESETS)[number]["id"] | "custom";

export function linkPresetFor(href: string): PublicLinkPresetId {
  const value = href.trim();
  return PUBLIC_LINK_PRESETS.find((preset) => preset.href === value)?.id ?? "custom";
}

/** One piece of copy, addressed the same way in every language (`<section>.items.<row>.title`). */
type CopyField = { path: string; value: string };

/** Strings a visitor reads on the homepage, gated by what is visible. */
function visibleCopyFields(
  draft: PublicSiteStudioDraft,
  copy: LocaleCopy,
  locale: PublicLocale,
): CopyField[] {
  return [
    { path: "heroTitle", value: copy.heroTitle },
    { path: "heroSubtitle", value: copy.heroSubtitle },
    { path: "heroCtaPrimary", value: copy.heroCtaPrimary },
    ...draft.sections
      .filter((section) => section.visible)
      .flatMap((section) => sectionProgressSlots(section, locale)),
  ];
}

/**
 * 0–100: share of visible homepage copy written in each language. Text copied
 * from another language counts only once the operator has changed it. So does a
 * default text (from `stock`) when the same field says something of the
 * operator's own in another language: it no longer describes the same place.
 */
export function studioLocaleProgress(
  draft: PublicSiteStudioDraft,
  stock?: PublicStockCopy,
): Record<PublicLocale, number> {
  const fieldsByLocale = Object.fromEntries(
    PUBLIC_LOCALES.map((locale) => [
      locale,
      new Map(
        visibleCopyFields(draft, draft.copies[locale], locale).map((field) => [
          field.path,
          field.value.trim(),
        ]),
      ),
    ]),
  ) as Record<PublicLocale, Map<string, string>>;
  const stockSets = Object.fromEntries(
    PUBLIC_LOCALES.map((locale) => [locale, new Set(stock?.[locale] ?? [])]),
  ) as Record<PublicLocale, Set<string>>;
  const ownTextElsewhere = (locale: PublicLocale, path: string) =>
    PUBLIC_LOCALES.some((other) => {
      if (other === locale) return false;
      const value = fieldsByLocale[other].get(path) ?? "";
      return value.length > 0 && !stockSets[other].has(value);
    });

  const progress = {} as Record<PublicLocale, number>;
  for (const locale of PUBLIC_LOCALES) {
    const copied = new Set(draft.copiedText[locale] ?? []);
    const fields = visibleCopyFields(draft, draft.copies[locale], locale);
    const filled = fields.filter((field) => {
      const value = field.value.trim();
      if (!value || copied.has(field.value)) return false;
      return !(stockSets[locale].has(value) && ownTextElsewhere(locale, field.path));
    }).length;
    progress[locale] = fields.length === 0 ? 100 : Math.round((filled / fields.length) * 100);
  }
  return progress;
}


/**
 * Fill only the empty homepage fields of `to` with the text from `from`, so the
 * operator can translate in place instead of starting from a blank page. What
 * was copied is remembered, so it keeps counting as untranslated. Returns
 * `draft` itself when there is nothing to fill.
 */
export function fillStudioLocaleFrom(
  draft: PublicSiteStudioDraft,
  from: PublicLocale,
  to: PublicLocale,
): PublicSiteStudioDraft {
  if (from === to) return draft;
  const source = draft.copies[from];
  const target = draft.copies[to];
  const copied = new Set(draft.copiedText[to] ?? []);
  let changed = false;

  function fill(current: string, value: string): string {
    if (current.trim() || !value.trim()) return current;
    copied.add(value);
    changed = true;
    return value;
  }

  const next: LocaleCopy = { ...target };
  for (const key of HOMEPAGE_COPY_KEYS) next[key] = fill(target[key], source[key]);

  const sections = draft.sections.map((section) => {
    const sourceSlots = new Map(sectionTextSlots(section, from).map((slot) => [slot.path, slot.value]));
    let updated = section;
    for (const slot of sectionTextSlots(section, to)) {
      const value = fill(slot.value, sourceSlots.get(slot.path) ?? "");
      if (value !== slot.value) updated = setSectionSlot(updated, to, slot.path, value);
    }
    return updated;
  });

  if (!changed) return draft;
  return {
    ...draft,
    copies: { ...draft.copies, [to]: next },
    sections,
    copiedText: { ...draft.copiedText, [to]: [...copied] },
  };
}

type PublicSiteReadinessId =
  | "heroImage"
  | "heroTitle"
  | "description"
  | "heroButton"
  | "heroLinks"
  | "rooms"
  | "searchText"
  | "privacy"
  | "contact"
  | "gallery"
  | "locales";

export type PublicSiteReadinessItem = {
  id: PublicSiteReadinessId;
  done: boolean;
  tab: PublicSiteEditorTab;
  /** The part to open on that tab: "hero", a section type, or a Settings part. */
  part?: string;
  /** Nice to have; never counted as "still to do" before publishing. */
  optional?: boolean;
};

/** Shorter than about a sentence, a search result's description looks unfinished. */
export const SEARCH_TEXT_MIN_LENGTH = 50;

/** Checklist shown before publishing. `config` is the resolved preview config. */
export function publicSiteReadiness(
  draft: PublicSiteStudioDraft,
  config: Pick<PublicSiteConfig, "contact" | "stayOffers">,
  stock?: PublicStockCopy,
): PublicSiteReadinessItem[] {
  const copy = draft.copies[draft.editLocale];
  const gallery = findSectionDraft(draft.sections, "gallery");
  const hasPhoto = Boolean(gallery?.items.some((item) => item.structure.url?.trim()));
  const contact = config.contact;
  const progress = studioLocaleProgress(draft, stock);
  const lands = (href: string) => {
    const target = anchoredSectionType(href);
    return !target || Boolean(findSectionDraft(draft.sections, target)?.visible);
  };

  return [
    { id: "heroImage", done: draft.heroImageUrl.trim().length > 0, tab: "content", part: "hero" },
    { id: "heroTitle", done: copy.heroTitle.trim().length > 0, tab: "content", part: "hero" },
    {
      id: "description",
      done:
        copy.heroSubtitle.trim().length > 0 ||
        sectionField(findSectionDraft(draft.sections, "intro"), draft.editLocale, "lead").trim()
          .length > 0,
      tab: "content",
      part: "hero",
    },
    // What Google shows under the title: the search description, or the hero
    // line it falls back to. A word or two reads as unfinished in the results.
    {
      id: "searchText",
      done: (copy.seoDescription.trim() || copy.heroSubtitle.trim()).length >= SEARCH_TEXT_MIN_LENGTH,
      tab: "settings",
      part: "google",
      optional: true,
    },
    // Every language: a page without it has no booking button at the top.
    {
      id: "heroButton",
      done: !draft.bookingEnabled || PUBLIC_LOCALES.every((locale) => draft.copies[locale].heroCtaPrimary.trim()),
      tab: "content",
      part: "hero",
    },
    {
      id: "heroLinks",
      done: lands(draft.heroCtaPrimaryHref) && lands(draft.heroCtaSecondaryHref),
      tab: "content",
      part: "hero",
    },
    { id: "rooms", done: !draft.bookingEnabled || config.stayOffers.length > 0, tab: "settings", part: "booking" },
    // The booking form collects personal data; the policy is not optional.
    { id: "privacy", done: copy.privacyBody.trim().length > 0, tab: "settings", part: "legal" },
    {
      id: "contact",
      done: Boolean(contact.phone || contact.email || contact.whatsapp),
      tab: "settings",
      part: "contact",
    },
    // A hidden gallery has nothing to check; "done" would read as "has a photo".
    ...(gallery?.visible
      ? [{ id: "gallery" as const, done: hasPhoto, tab: "content" as const, part: "gallery" }]
      : []),
    {
      id: "locales",
      done: PUBLIC_LOCALES.every((locale) => progress[locale] === 100),
      tab: "content",
      optional: true,
    },
  ];
}

/**
 * Where an opened part is in the preview, so the preview can scroll to it and
 * mark it. A hidden section is shown in the preview while it is being edited.
 */
export type PreviewFocus = {
  selector: string;
  /** Position of the section in the page, to show it while it is hidden. */
  sectionIndex?: number;
  hidden: boolean;
};

export function previewFocusFor(
  key: string | null,
  draft: Pick<PublicSiteStudioDraft, "sections" | "showContactBar">,
): PreviewFocus | null {
  if (!key) return null;
  if (key === "hero") return { selector: ".pub-hero", hidden: false };
  if (key === "chrome") return { selector: ".public-header", hidden: false };
  if (key === "contactBar") {
    return { selector: ".pub-contact-bar", hidden: !draft.showContactBar };
  }
  const index = draft.sections.findIndex((section) => section.key === key);
  const section = draft.sections[index];
  if (!section) return null;
  // Rendered sections are counted per type, hidden ones included (see TemplateSections).
  const nth = draft.sections.slice(0, index).filter((row) => row.type === section.type).length;
  return {
    selector: `[data-pub-section="${section.type}"][data-pub-nth="${nth}"]`,
    sectionIndex: index,
    hidden: !section.visible,
  };
}

/** Which editor card a click inside the live preview belongs to. */
export function editKeyFromPreviewTarget(
  target: Element,
  draft: Pick<PublicSiteStudioDraft, "sections">,
): string | null {
  const section = target.closest<HTMLElement>("[data-pub-section]");
  if (section) {
    return sectionKeyForRendered(
      draft.sections,
      section.dataset.pubSection ?? "",
      Number(section.dataset.pubNth ?? 0),
    );
  }
  if (target.closest(".pub-hero")) return "hero";
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
type PublicStylePresetId = (typeof PUBLIC_STYLE_PRESETS)[number]["id"];

export type QuickStartAnswers = {
  heroTitle: string;
  heroSubtitle: string;
  introLead: string;
  heroImageUrl: string;
  galleryUrls: string[];
  styleId: PublicStylePresetId | null;
};

export function quickStartAnswersFrom(draft: PublicSiteStudioDraft): QuickStartAnswers {
  const copy = draft.copies[draft.editLocale];
  const preset = PUBLIC_STYLE_PRESETS.find(
    (row) => row.templateId === draft.templateId && row.themeId === draft.themeId,
  );
  return {
    heroTitle: copy.heroTitle,
    heroSubtitle: copy.heroSubtitle,
    introLead: sectionField(findSectionDraft(draft.sections, "intro"), draft.editLocale, "lead"),
    heroImageUrl: draft.heroImageUrl,
    galleryUrls: (findSectionDraft(draft.sections, "gallery")?.items ?? [])
      .map((item) => item.structure.url ?? "")
      .filter((url) => url.trim()),
    styleId: preset?.id ?? null,
  };
}

/**
 * Write quick-start answers into the draft (current language only). Photos are
 * appended to the gallery, which is switched on once it has any.
 */
export function applyQuickStart(
  draft: PublicSiteStudioDraft,
  answers: QuickStartAnswers,
  newItemId: () => string,
): PublicSiteStudioDraft {
  const locale = draft.editLocale;
  const preset = PUBLIC_STYLE_PRESETS.find((row) => row.id === answers.styleId);
  const intro = answers.introLead.trim();

  let sections = draft.sections.map((section) => {
    if (section.type === "intro" && intro) return setSectionField(section, locale, "lead", intro);
    if (section.type !== "gallery") return section;
    const known = new Set(section.items.map((item) => item.structure.url));
    let gallery = section;
    for (const raw of answers.galleryUrls) {
      const url = raw.trim();
      if (!url || known.has(url)) continue;
      known.add(url);
      gallery = addSectionItem(gallery, { url }, newItemId());
    }
    return gallery.items.length > section.items.length ? { ...gallery, visible: true } : gallery;
  });
  if (preset && preset.templateId !== draft.templateId) {
    sections = orderSectionsForTemplate(sections, preset.templateId);
  }

  const copies = { ...draft.copies };
  copies[locale] = {
    ...copies[locale],
    heroTitle: answers.heroTitle.trim() || copies[locale].heroTitle,
    heroSubtitle: answers.heroSubtitle.trim() || copies[locale].heroSubtitle,
  };

  return {
    ...draft,
    copies,
    sections,
    templateId: preset?.templateId ?? draft.templateId,
    themeId: preset?.themeId ?? draft.themeId,
    heroImageUrl: answers.heroImageUrl.trim() || draft.heroImageUrl,
  };
}

/** A site nobody has set up yet: never published, no photos. */
export function isFreshPublicSite(draft: PublicSiteStudioDraft): boolean {
  return (
    !draft.published &&
    !draft.heroImageUrl.trim() &&
    !findSectionDraft(draft.sections, "gallery")?.items.some((item) => item.structure.url?.trim())
  );
}
