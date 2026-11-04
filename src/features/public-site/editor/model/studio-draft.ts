import { PUBLIC_INTRO_HREF } from "@/features/public-site/domain/anchors";
import { coercePublicLocale, pickOwnLocalized, writeLocalizedMap } from "@/features/public-site/domain/localized";
import {
  alignNoticeDraft,
  bookingNoticeToDraft,
  mergeBookingNoticeFromLocales,
  type BookingNoticeDraft,
} from "@/features/public-site/domain/booking-notice";
import {
  normalizeBenefitIcon,
} from "@/features/public-site/domain/benefit-icons";
import type {
  PublicFontId,
  PublicLocale,
  PublicSiteConfig,
  PublicSiteSettingsInput,
} from "@/features/public-site/domain/types";
import { PUBLIC_LOCALES } from "@/features/public-site/domain/types";
import {
  CHROME_COPY,
  HERO_COPY,
  PAGES_COPY,
  readFlatCopy,
  SECTION_COPY,
  SEO_COPY,
  SEO_FALLBACK,
  writeCopyGroup,
  type FlatCopy,
} from "@/features/public-site/editor/model/copy-fields";
import {
  findSection,
  publicSectionKey,
  textSectionKey,
} from "@/features/public-site/domain/order-sections";

type GalleryDraftItem = { id: string; url: string };
/**
 * Benefit and step rows carry an editor-only id, shared by the same row in every
 * language, so removing a row in one language removes that row everywhere.
 */
export type CopyLineDraft = { id: string; icon: string; title: string; text: string };
export type StepLineDraft = { id: string; title: string; text: string };

export type TextLineDraft = { id: string; title: string; lead: string; body: string };

/** One language's copy: single-line fields from copy-fields, plus rows with structure. */
export type LocaleCopy = FlatCopy & {
  benefitItems: CopyLineDraft[];
  stepItems: StepLineDraft[];
  galleryCaptions: Record<string, string>;
  textItems: TextLineDraft[];
  noticeDraft: BookingNoticeDraft;
};

export type PublicSiteStudioDraft = {
  editLocale: PublicLocale;
  templateId: PublicSiteSettingsInput["templateId"];
  themeId: PublicSiteSettingsInput["themeId"];
  published: boolean;
  bookingEnabled: boolean;
  bookingNavPosition: PublicSiteSettingsInput["bookingNavPosition"];
  usePrimaryContact: boolean;
  heroImageUrl: string;
  logoUrl: string;
  ogImageUrl: string;
  fontId: PublicFontId;
  showContactBar: boolean;
  showStayOffers: boolean;
  showStayPrices: boolean;
  showPlace: boolean;
  showNavHome: boolean;
  showNavPrivacy: boolean;
  showNavTerms: boolean;
  showCheckTimes: boolean;
  heroCtaPrimaryHref: string;
  heroCtaSecondaryHref: string;
  ctaHref: string;
  contactEmail: string;
  contactPhone: string;
  contactWhatsapp: string;
  contactTelegram: string;
  contactFacebook: string;
  contactInstagram: string;
  galleryItems: GalleryDraftItem[];
  galleryVisible: boolean;
  introVisible: boolean;
  benefitsVisible: boolean;
  stepsVisible: boolean;
  ctaVisible: boolean;
  textVisible: Record<string, boolean>;
  sectionOrder: string[];
  copies: Record<PublicLocale, LocaleCopy>;
  /** Per language: copy path → text pasted in from another language, not yet translated. */
  copiedText: Partial<Record<PublicLocale, Record<string, string>>>;
};

let galleryDraftSeq = 0;
export function nextGalleryDraftId(): string {
  galleryDraftSeq += 1;
  return `gallery-draft-${galleryDraftSeq}`;
}

let itemDraftSeq = 0;
function nextItemDraftId(prefix: "benefit" | "step"): string {
  itemDraftSeq += 1;
  return `${prefix}-draft-${itemDraftSeq}`;
}

/** A new text section gets its database id now, so it keeps it across saves. */
function nextTextDraftId(): string {
  return crypto.randomUUID();
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const MAX_BENEFIT_ITEMS = 12;
export const MAX_STEP_ITEMS = 12;
export const MAX_TEXT_SECTIONS = 8;

// Loaded rows take their id from their saved position, identical in every language.
const EMPTY_BENEFITS: CopyLineDraft[] = [
  { id: "benefit-0", icon: "bed", title: "", text: "" },
  { id: "benefit-1", icon: "spark", title: "", text: "" },
  { id: "benefit-2", icon: "handshake", title: "", text: "" },
];

const EMPTY_STEPS: StepLineDraft[] = [
  { id: "step-0", title: "", text: "" },
  { id: "step-1", title: "", text: "" },
  { id: "step-2", title: "", text: "" },
];

function buildLocaleCopy(
  config: PublicSiteConfig,
  locale: PublicLocale,
  galleryItems: GalleryDraftItem[],
): LocaleCopy {
  const benefitsSection = findSection(config.sections, "benefits");
  const stepsSection = findSection(config.sections, "steps");
  const galleryFromConfig = findSection(config.sections, "gallery")?.payload.items ?? [];

  const benefitItems = (benefitsSection?.payload.items ?? []).map(
    (item, index) => ({
      id: `benefit-${index}`,
      icon: normalizeBenefitIcon(item.icon),
      title: pickOwnLocalized(item.title, locale),
      text: pickOwnLocalized(item.text, locale),
    }),
  );
  const stepItems = (stepsSection?.payload.items ?? []).map((item, index) => ({
    id: `step-${index}`,
    title: pickOwnLocalized(item.title, locale),
    text: pickOwnLocalized(item.text, locale),
  }));

  const galleryCaptions: Record<string, string> = {};
  for (const item of galleryItems) {
    const prev = galleryFromConfig.find((row) => row.id === item.id);
    galleryCaptions[item.id] = pickOwnLocalized(prev?.caption, locale);
  }

  return {
    ...readFlatCopy(config, locale),
    benefitItems: benefitItems.length > 0 ? benefitItems : EMPTY_BENEFITS.map((item) => ({ ...item })),
    stepItems: stepItems.length > 0 ? stepItems : EMPTY_STEPS.map((item) => ({ ...item })),
    galleryCaptions,
    textItems: config.sections
      .filter((section) => section.sectionType === "text")
      .map((section) => ({
        id: section.id,
        title: pickOwnLocalized(section.payload.title, locale),
        lead: pickOwnLocalized(section.payload.lead, locale),
        body: pickOwnLocalized(section.payload.body, locale),
      })),
    noticeDraft: bookingNoticeToDraft(config.bookingNotice, locale),
  };
}

function alignCopyStructure(source: LocaleCopy, target: LocaleCopy): LocaleCopy {
  return {
    ...target,
    benefitItems: source.benefitItems.map((item) => {
      const match = target.benefitItems.find((row) => row.id === item.id);
      return { id: item.id, icon: item.icon, title: match?.title ?? "", text: match?.text ?? "" };
    }),
    stepItems: source.stepItems.map((item) => {
      const match = target.stepItems.find((row) => row.id === item.id);
      return { id: item.id, title: match?.title ?? "", text: match?.text ?? "" };
    }),
    galleryCaptions: { ...target.galleryCaptions },
    textItems: source.textItems.map((item) => {
      const match = target.textItems.find((row) => row.id === item.id);
      return {
        id: item.id,
        title: match?.title ?? "",
        lead: match?.lead ?? "",
        body: match?.body ?? "",
      };
    }),
    noticeDraft: alignNoticeDraft(target.noticeDraft, source.noticeDraft),
  };
}

export function buildPublicSiteStudioDraft(
  config: PublicSiteConfig,
  locale: string,
): PublicSiteStudioDraft {
  const editLocale = coercePublicLocale(locale);
  const gallerySection = findSection(config.sections, "gallery");
  const visibility = new Map(
    config.sections.map((section) => [section.sectionType, section.visible]),
  );
  const galleryFromConfig = gallerySection?.payload.items ?? [];
  const galleryItems = galleryFromConfig.map((item, index) => ({
    id: item.id || `gallery-${index}`,
    url: item.url,
  }));

  const copies = Object.fromEntries(
    PUBLIC_LOCALES.map((loc) => [loc, buildLocaleCopy(config, loc, galleryItems)]),
  ) as Record<PublicLocale, LocaleCopy>;

  const textSections = config.sections.filter((section) => section.sectionType === "text");
  const textVisible: Record<string, boolean> = {};
  for (const section of textSections) {
    textVisible[section.id] = section.visible;
  }

  const sectionOrder = [...config.sections]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(publicSectionKey);
  const defaultOrder = ["intro", "benefits", "gallery", "steps", "cta"];
  const order = sectionOrder.length > 0 ? sectionOrder : defaultOrder;
  // Gallery is always saved, so the editor must be able to place it.
  if (!order.includes("gallery")) order.push("gallery");

  return {
    editLocale,
    templateId: config.templateId,
    themeId: config.themeId,
    published: config.published,
    bookingEnabled: config.bookingEnabled,
    bookingNavPosition: config.bookingNavPosition,
    usePrimaryContact: config.usePrimaryContact ?? true,
    heroImageUrl: config.hero.imageUrl ?? "",
    logoUrl: config.chrome?.logoUrl ?? "",
    ogImageUrl: config.pages?.ogImageUrl ?? "",
    fontId: config.chrome?.fontId ?? "theme",
    showContactBar: config.chrome?.showContactBar !== false,
    showStayOffers: config.chrome?.showStayOffers !== false,
    showStayPrices: config.chrome?.showStayPrices !== false,
    showPlace: config.chrome?.showPlace !== false,
    showNavHome: config.chrome?.showNavHome !== false,
    showNavPrivacy: config.chrome?.showNavPrivacy !== false,
    showNavTerms: config.chrome?.showNavTerms === true,
    showCheckTimes: config.hero.showCheckTimes !== false,
    heroCtaPrimaryHref: config.hero.ctaPrimaryHref ?? "/calendar",
    heroCtaSecondaryHref: config.hero.ctaSecondaryHref ?? PUBLIC_INTRO_HREF,
    ctaHref:
      findSection(config.sections, "cta")?.payload.ctaHref ??
      "/calendar",
    contactEmail: config.contact.email ?? "",
    contactPhone: config.contact.phone ?? "",
    contactWhatsapp: config.contact.whatsapp ?? "",
    contactTelegram: config.contact.telegram ?? "",
    contactFacebook: config.contact.facebook ?? "",
    contactInstagram: config.contact.instagram ?? "",
    galleryItems,
    galleryVisible: gallerySection?.visible ?? false,
    introVisible: visibility.get("intro") ?? true,
    benefitsVisible: visibility.get("benefits") ?? true,
    stepsVisible: visibility.get("steps") ?? true,
    ctaVisible: visibility.get("cta") ?? true,
    textVisible,
    sectionOrder: order,
    copies,
    copiedText: {},
  };
}

export function switchStudioLocale(
  draft: PublicSiteStudioDraft,
  nextLocale: PublicLocale,
): PublicSiteStudioDraft {
  if (draft.editLocale === nextLocale) return draft;
  const source = draft.copies[draft.editLocale];
  return {
    ...draft,
    editLocale: nextLocale,
    copies: {
      ...draft.copies,
      [nextLocale]: alignCopyStructure(source, draft.copies[nextLocale]),
    },
  };
}

export function syncStudioStructure(
  draft: PublicSiteStudioDraft,
  fromLocale: PublicLocale = draft.editLocale,
): PublicSiteStudioDraft {
  const source = draft.copies[fromLocale];
  const copies = { ...draft.copies };
  for (const locale of PUBLIC_LOCALES) {
    if (locale === fromLocale) continue;
    copies[locale] = alignCopyStructure(source, copies[locale]);
  }
  return { ...draft, copies };
}

export function patchStudioCopy(
  draft: PublicSiteStudioDraft,
  partial: Partial<LocaleCopy>,
): PublicSiteStudioDraft {
  const locale = draft.editLocale;
  return {
    ...draft,
    copies: {
      ...draft.copies,
      [locale]: { ...draft.copies[locale], ...partial },
    },
  };
}

function mapFromLocales(
  copies: Record<PublicLocale, LocaleCopy>,
  pick: (copy: LocaleCopy) => string,
): Partial<Record<PublicLocale, string>> {
  const values: Partial<Record<PublicLocale, string>> = {};
  for (const locale of PUBLIC_LOCALES) {
    values[locale] = pick(copies[locale]);
  }
  return values;
}

export function mergeStudioToInput(args: {
  config: PublicSiteConfig;
  draft: PublicSiteStudioDraft;
}): PublicSiteSettingsInput {
  const { config, draft } = args;
  const copies = draft.copies;
  const write = (
    previous: Parameters<typeof writeLocalizedMap>[0],
    pick: (copy: LocaleCopy) => string,
  ) => writeLocalizedMap(previous, mapFromLocales(copies, pick));

  const galleryFromConfig = findSection(config.sections, "gallery");
  const previousGallery = galleryFromConfig?.payload.items ?? [];
  const galleryItems = draft.galleryItems
    .filter((item) => item.url.trim().length > 0)
    .map((item, index) => {
      const prev = previousGallery.find((row) => row.id === item.id) ?? previousGallery[index];
      return {
        id: item.id || `gallery-${index}`,
        url: item.url.trim(),
        caption: write(prev?.caption, (copy) => copy.galleryCaptions[item.id] ?? ""),
      };
    });

  const baseSections = config.sections.filter((section) => section.sectionType !== "gallery");

  const baseMapped = baseSections.map((section) => {
      if (section.sectionType === "intro") {
        return {
          ...section,
          visible: draft.introVisible,
          payload: {
            ...section.payload,
            ...writeCopyGroup(SECTION_COPY.intro, section.payload, copies),
          },
        };
      }
      if (section.sectionType === "benefits") {
        const structure = copies[draft.editLocale].benefitItems;
        return {
          ...section,
          visible: draft.benefitsVisible,
          payload: {
            ...section.payload,
            ...writeCopyGroup(SECTION_COPY.benefits, section.payload, copies),
            items: structure.flatMap((item) => {
              const row = (copy: LocaleCopy) =>
                copy.benefitItems.find((candidate) => candidate.id === item.id);
              const hasCopy = PUBLIC_LOCALES.some(
                (locale) => row(copies[locale])?.title.trim() || row(copies[locale])?.text.trim(),
              );
              if (!hasCopy) return [];
              return [
                {
                  icon: normalizeBenefitIcon(item.icon),
                  title: write(undefined, (copy) => row(copy)?.title ?? ""),
                  text: write(undefined, (copy) => row(copy)?.text ?? ""),
                },
              ];
            }),
          },
        };
      }
      if (section.sectionType === "steps") {
        const structure = copies[draft.editLocale].stepItems;
        return {
          ...section,
          visible: draft.stepsVisible,
          payload: {
            ...section.payload,
            ...writeCopyGroup(SECTION_COPY.steps, section.payload, copies),
            items: structure.flatMap((item) => {
              const row = (copy: LocaleCopy) =>
                copy.stepItems.find((candidate) => candidate.id === item.id);
              const hasCopy = PUBLIC_LOCALES.some(
                (locale) => row(copies[locale])?.title.trim() || row(copies[locale])?.text.trim(),
              );
              if (!hasCopy) return [];
              return [
                {
                  title: write(undefined, (copy) => row(copy)?.title ?? ""),
                  text: write(undefined, (copy) => row(copy)?.text ?? ""),
                },
              ];
            }),
          },
        };
      }
      if (section.sectionType === "cta") {
        return {
          ...section,
          visible: draft.ctaVisible,
          payload: {
            ...section.payload,
            ...writeCopyGroup(SECTION_COPY.cta, section.payload, copies),
            ctaHref: draft.ctaHref.trim() || "/calendar",
          },
        };
      }
      if (section.sectionType === "text") {
        const exists = copies[draft.editLocale].textItems.some((row) => row.id === section.id);
        if (!exists) return null;
        return {
          ...section,
          visible: draft.textVisible[section.id] !== false,
          payload: {
            title: write(section.payload.title, (copy) =>
              copy.textItems.find((row) => row.id === section.id)?.title ?? "",
            ),
            lead: write(section.payload.lead, (copy) =>
              copy.textItems.find((row) => row.id === section.id)?.lead ?? "",
            ),
            body: write(section.payload.body, (copy) =>
              copy.textItems.find((row) => row.id === section.id)?.body ?? "",
            ),
          },
        };
      }
      return section;
    })
    .filter((section): section is NonNullable<typeof section> => Boolean(section));

  const knownTextIds = new Set(
    config.sections.filter((section) => section.sectionType === "text").map((section) => section.id),
  );
  const extraText = copies[draft.editLocale].textItems
    .filter((item) => !knownTextIds.has(item.id))
    .map((item, index) => ({
      id: item.id,
      sectionType: "text" as const,
      sortOrder: 60 + index * 10,
      visible: draft.textVisible[item.id] !== false,
      payload: {
        title: write({}, (copy) => copy.textItems.find((row) => row.id === item.id)?.title ?? ""),
        lead: write({}, (copy) => copy.textItems.find((row) => row.id === item.id)?.lead ?? ""),
        body: write({}, (copy) => copy.textItems.find((row) => row.id === item.id)?.body ?? ""),
      },
    }));

  const withGallery = [
    ...baseMapped,
    ...extraText,
    {
      id: galleryFromConfig?.id ?? "gallery",
      sectionType: "gallery" as const,
      sortOrder: galleryFromConfig?.sortOrder ?? 30,
      visible: draft.galleryVisible && galleryItems.length > 0,
      payload: {
        ...writeCopyGroup(SECTION_COPY.gallery, galleryFromConfig?.payload, copies),
        items: galleryItems,
      },
    },
  ];

  const rank = new Map(draft.sectionOrder.map((key, index) => [key, index]));
  const sections = withGallery
    .sort((a, b) => (rank.get(publicSectionKey(a)) ?? 99) - (rank.get(publicSectionKey(b)) ?? 99))
    .map((section, index) => {
      // Saved rows keep their id; built-in defaults (`default-intro`, …) are created fresh.
      const { id, ...rest } = section;
      return {
        ...rest,
        ...(id && UUID_PATTERN.test(id) ? { id } : {}),
        sortOrder: index * 10,
      };
    });

  const noticeDrafts = Object.fromEntries(
    PUBLIC_LOCALES.map((locale) => [locale, copies[locale].noticeDraft]),
  ) as Record<PublicLocale, BookingNoticeDraft>;

  return {
    templateId: draft.templateId,
    themeId: draft.themeId,
    published: draft.published,
    bookingEnabled: draft.bookingEnabled,
    bookingNavPosition: draft.bookingNavPosition,
    usePrimaryContact: draft.usePrimaryContact,
    hero: {
      ...config.hero,
      ...writeCopyGroup(HERO_COPY, config.hero, copies),
      ctaPrimaryHref: draft.heroCtaPrimaryHref.trim() || "/calendar",
      ctaSecondaryHref: draft.heroCtaSecondaryHref.trim() || PUBLIC_INTRO_HREF,
      imageUrl: draft.heroImageUrl.trim() || null,
      showCheckTimes: draft.showCheckTimes,
    },
    contact: {
      email: draft.contactEmail.trim() || null,
      phone: draft.contactPhone.trim() || null,
      whatsapp: draft.contactWhatsapp.trim() || null,
      telegram: draft.contactTelegram.trim() || null,
      facebook: draft.contactFacebook.trim() || null,
      instagram: draft.contactInstagram.trim() || null,
    },
    seo: writeCopyGroup(SEO_COPY, config.seo, copies, SEO_FALLBACK),
    bookingNotice: mergeBookingNoticeFromLocales(
      config.bookingNotice,
      noticeDrafts,
      draft.editLocale,
    ),
    chrome: {
      logoUrl: draft.logoUrl.trim() || null,
      showContactBar: draft.showContactBar,
      showStayOffers: draft.showStayOffers,
      showStayPrices: draft.showStayPrices,
      showPlace: draft.showPlace,
      fontId: draft.fontId,
      ...writeCopyGroup(CHROME_COPY, config.chrome, copies),
      showNavHome: draft.showNavHome,
      showNavPrivacy: draft.showNavPrivacy,
      showNavTerms: draft.showNavTerms,
    },
    pages: {
      ...writeCopyGroup(PAGES_COPY, config.pages, copies),
      ogImageUrl: draft.ogImageUrl.trim() || null,
    },
    sections,
  };
}

export function addStudioBenefit(draft: PublicSiteStudioDraft): PublicSiteStudioDraft {
  const current = draft.copies[draft.editLocale].benefitItems;
  if (current.length >= MAX_BENEFIT_ITEMS) return draft;
  return syncStudioStructure(
    patchStudioCopy(draft, {
      benefitItems: [
        ...current,
        { id: nextItemDraftId("benefit"), icon: "spark", title: "", text: "" },
      ],
    }),
  );
}

export function removeStudioBenefit(
  draft: PublicSiteStudioDraft,
  index: number,
): PublicSiteStudioDraft {
  return syncStudioStructure(
    patchStudioCopy(draft, {
      benefitItems: draft.copies[draft.editLocale].benefitItems.filter((_, i) => i !== index),
    }),
  );
}

export function addStudioStep(draft: PublicSiteStudioDraft): PublicSiteStudioDraft {
  const current = draft.copies[draft.editLocale].stepItems;
  if (current.length >= MAX_STEP_ITEMS) return draft;
  return syncStudioStructure(
    patchStudioCopy(draft, {
      stepItems: [...current, { id: nextItemDraftId("step"), title: "", text: "" }],
    }),
  );
}

export function removeStudioStep(draft: PublicSiteStudioDraft, index: number): PublicSiteStudioDraft {
  return syncStudioStructure(
    patchStudioCopy(draft, {
      stepItems: draft.copies[draft.editLocale].stepItems.filter((_, i) => i !== index),
    }),
  );
}

export function addStudioTextSection(draft: PublicSiteStudioDraft): PublicSiteStudioDraft {
  if (draft.copies[draft.editLocale].textItems.length >= MAX_TEXT_SECTIONS) return draft;
  const id = nextTextDraftId();
  const copies = { ...draft.copies };
  for (const locale of PUBLIC_LOCALES) {
    copies[locale] = {
      ...copies[locale],
      textItems: [...copies[locale].textItems, { id, title: "", lead: "", body: "" }],
    };
  }
  return {
    ...draft,
    copies,
    textVisible: { ...draft.textVisible, [id]: true },
    sectionOrder: [...draft.sectionOrder, textSectionKey(id)],
  };
}

export function removeStudioTextSection(
  draft: PublicSiteStudioDraft,
  id: string,
): PublicSiteStudioDraft {
  const copies = { ...draft.copies };
  for (const locale of PUBLIC_LOCALES) {
    copies[locale] = {
      ...copies[locale],
      textItems: copies[locale].textItems.filter((item) => item.id !== id),
    };
  }
  const { [id]: _removed, ...textVisible } = draft.textVisible;
  return {
    ...draft,
    copies,
    textVisible,
    sectionOrder: draft.sectionOrder.filter((key) => key !== textSectionKey(id)),
  };
}

/** The closing booking band always renders last on the page, after rooms and map. */
const PINNED_SECTION_KEYS = new Set(["cta"]);

/** Sections the operator can reorder, in their current order. */
export function movableSectionKeys(sectionOrder: string[]): string[] {
  return sectionOrder.filter((key) => !PINNED_SECTION_KEYS.has(key));
}

/** Swap a section with its movable neighbour; pinned sections stay at the end. */
export function moveStudioSection(
  draft: PublicSiteStudioDraft,
  key: string,
  direction: -1 | 1,
): PublicSiteStudioDraft {
  const movable = movableSectionKeys(draft.sectionOrder);
  const index = movable.indexOf(key);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= movable.length) return draft;
  [movable[index], movable[target]] = [movable[target]!, movable[index]!];
  const pinned = draft.sectionOrder.filter((row) => PINNED_SECTION_KEYS.has(row));
  return { ...draft, sectionOrder: [...movable, ...pinned] };
}
