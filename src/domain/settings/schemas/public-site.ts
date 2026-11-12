import { z } from "zod";
import { MEDIA_ALBUMS } from "@/domain/media/types";
import { GALLERY_LAYOUTS, PUBLIC_MENU_KINDS } from "@/features/public-site/domain/types";
import {
  MAX_MENU_CHILDREN,
  MAX_MENU_ITEMS,
  MAX_SITE_PAGES,
  menuKindNeedsRef,
  pageSlugProblem,
} from "@/features/public-site/domain/site-pages";
import { isSafeHttpUrl, isSafeNavHref } from "@/lib/security/html-escape";
import {
  formatZodError,
  formatZodFieldErrors,
  localizedTextSchema,
  optionalContactTextSchema,
  optionalEmailSchema,
  optionalSafeNavHrefSchema,
  optionalUrlSchema,
  type ParseResult,
} from "./shared";

const publicTemplateIdSchema = z.enum(["classic", "editorial", "immersive"]);
const publicThemeIdSchema = z.enum(["noir", "alpine", "mediterranean", "pearl", "slate", "forest"]);
const publicBookingNavPositionSchema = z.enum(["nav", "footer", "both", "hidden"]);

const publicHeroConfigSchema = z
  .object({
    badge: localizedTextSchema.optional(),
    title: localizedTextSchema.optional(),
    subtitle: localizedTextSchema.optional(),
    tagline: localizedTextSchema.optional(),
    ctaPrimary: localizedTextSchema.optional(),
    ctaSecondary: localizedTextSchema.optional(),
    ctaPrimaryHref: optionalSafeNavHrefSchema.optional(),
    ctaSecondaryHref: optionalSafeNavHrefSchema.optional(),
    imageUrl: optionalUrlSchema.optional(),
    imageAlt: localizedTextSchema.optional(),
    showCheckTimes: z.boolean().optional(),
  })
  .strip();

const publicContactConfigSchema = z
  .object({
    email: optionalEmailSchema.optional(),
    phone: optionalContactTextSchema.optional(),
    whatsapp: optionalContactTextSchema.optional(),
    telegram: optionalContactTextSchema.optional(),
    facebook: optionalUrlSchema.optional(),
    instagram: optionalUrlSchema.optional(),
  })
  .strip();

const publicFontIdSchema = z.enum([
  "theme",
  "serif",
  "sans",
  "playfair",
  "lora",
  "cormorant",
  "montserrat",
  "raleway",
  "nunito",
]);

const longLocalizedTextSchema = z
  .object({
    ro: z.string().max(20000).optional(),
    en: z.string().max(20000).optional(),
    bg: z.string().max(20000).optional(),
  })
  .strip();

/** A menu link: a page or section by id, a built-in page, or an address (`url`). */
const menuItemShape = {
  id: z.string().min(1).max(64),
  kind: z.enum(PUBLIC_MENU_KINDS),
  ref: z.string().max(500).optional(),
  label: localizedTextSchema.default({}),
};

function checkMenuRef(item: { kind: (typeof PUBLIC_MENU_KINDS)[number]; ref?: string }, ctx: z.RefinementCtx) {
  if (menuKindNeedsRef(item.kind) && !item.ref?.trim()) {
    ctx.addIssue({ code: "custom", path: ["ref"], message: "required" });
  }
  if (item.kind === "url" && item.ref && !isSafeNavHref(item.ref)) {
    ctx.addIssue({ code: "custom", path: ["ref"], message: "invalid_href" });
  }
}

const menuChildSchema = z
  .object(menuItemShape)
  .strip()
  .superRefine((item, ctx) => {
    if (item.kind === "group") ctx.addIssue({ code: "custom", path: ["kind"], message: "invalid" });
    checkMenuRef(item, ctx);
  });

const menuItemSchema = z
  .object({ ...menuItemShape, children: z.array(menuChildSchema).max(MAX_MENU_CHILDREN).optional() })
  .strip()
  .superRefine(checkMenuRef);

const publicChromeConfigSchema = z
  .object({
    logoUrl: optionalUrlSchema.optional(),
    headerSubtitle: localizedTextSchema.optional(),
    footerTagline: localizedTextSchema.optional(),
    showContactBar: z.boolean().optional(),
    fontId: publicFontIdSchema.optional(),
    accentColor: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i)
      .nullable()
      .optional(),
    navHome: localizedTextSchema.optional(),
    navPrivacy: localizedTextSchema.optional(),
    navTerms: localizedTextSchema.optional(),
    navBook: localizedTextSchema.optional(),
    menu: z.array(menuItemSchema).max(MAX_MENU_ITEMS).optional(),
  })
  .strip();

const publicPagesConfigSchema = z
  .object({
    comingSoonTitle: localizedTextSchema.optional(),
    comingSoonLead: localizedTextSchema.optional(),
    termsTitle: localizedTextSchema.optional(),
    termsLead: localizedTextSchema.optional(),
    termsBody: longLocalizedTextSchema.optional(),
    privacyTitle: localizedTextSchema.optional(),
    privacyLead: localizedTextSchema.optional(),
    privacyBody: longLocalizedTextSchema.optional(),
    calendarTitle: localizedTextSchema.optional(),
    calendarLead: localizedTextSchema.optional(),
    seoCalendarTitle: localizedTextSchema.optional(),
    seoCalendarDescription: localizedTextSchema.optional(),
    seoTermsTitle: localizedTextSchema.optional(),
    seoTermsDescription: localizedTextSchema.optional(),
    seoPrivacyTitle: localizedTextSchema.optional(),
    seoPrivacyDescription: localizedTextSchema.optional(),
    ogImageUrl: optionalUrlSchema.optional(),
  })
  .strip();

const publicSeoConfigSchema = z
  .object({
    metaTitle: localizedTextSchema.optional(),
    metaDescription: localizedTextSchema.optional(),
  })
  .strip();

const bookingNoticePresetSchema = z.enum([
  "noPay",
  "hold",
  "hours",
  "confirm",
  "reply",
  "payOnSite",
  "idCheck",
  "breakfast",
  "parking",
  "pets",
  "children",
  "cancel",
  "custom",
]);
const bookingNoticeIconSchema = z.enum([
  "check",
  "timer",
  "clock",
  "info",
  "phone",
  "card",
  "key",
  "meal",
  "park",
  "paw",
]);

const publicBookingNoticeItemSchema = z
  .object({
    id: z.string().min(1).max(64),
    preset: bookingNoticePresetSchema,
    icon: bookingNoticeIconSchema,
    title: localizedTextSchema,
    text: localizedTextSchema,
  })
  .strict();

const publicBookingNoticeSchema = z
  .object({
    enabled: z.boolean(),
    title: localizedTextSchema,
    items: z.array(publicBookingNoticeItemSchema).max(8),
    footer: localizedTextSchema,
  })
  .strict();

const publicBenefitItemSchema = z
  .object({
    icon: z.string().max(64).optional(),
    title: localizedTextSchema,
    text: localizedTextSchema,
  })
  .strict();


const publicStepItemSchema = z
  .object({
    title: localizedTextSchema,
    text: localizedTextSchema,
  })
  .strict();

const MAX_SECTION_ITEMS = 100;

/** Title and lead every section has. Unknown keys are dropped, not refused. */
const sectionCopyShape = {
  title: localizedTextSchema.optional(),
  lead: localizedTextSchema.optional(),
};

/** How a section looks over the page layout; values left out follow the page. */
const sectionStyleSchema = z
  .object({
    look: z.enum(["classic", "editorial", "immersive"]).optional(),
    background: z.enum(["plain", "soft", "accent", "contrast"]).optional(),
    width: z.enum(["narrow", "wide", "full"]).optional(),
    align: z.enum(["start", "center"]).optional(),
  })
  .strip();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sectionInputSchema<T extends string, P extends z.ZodObject<any>>(sectionType: T, payload: P) {
  return z
    .object({
      id: z.string().uuid().optional(),
      sectionType: z.literal(sectionType),
      sortOrder: z.number().int().min(0).max(9999),
      visible: z.boolean(),
      payload: payload.extend({ style: sectionStyleSchema.optional() }),
    })
    .strict();
}

const bodyPayloadSchema = z
  .object({
    ...sectionCopyShape,
    body: localizedTextSchema.optional(),
    imageUrl: z
      .string()
      .max(2048)
      .refine((v) => isSafeHttpUrl(v), { message: "invalid_url" })
      .optional(),
    imageAlt: localizedTextSchema.optional(),
  })
  .strip();

/** Each section type accepts only its own payload: highlights can't arrive as photos. */
const publicSiteSectionInputSchema = z.discriminatedUnion("sectionType", [
  sectionInputSchema("intro", bodyPayloadSchema),
  sectionInputSchema("text", bodyPayloadSchema),
  sectionInputSchema(
    "benefits",
    z
      .object({
        ...sectionCopyShape,
        items: z.array(publicBenefitItemSchema).max(MAX_SECTION_ITEMS).optional(),
      })
      .strip(),
  ),
  sectionInputSchema(
    "gallery",
    z
      .object({
        ...sectionCopyShape,
        albums: z.array(z.enum(MEDIA_ALBUMS)).max(MEDIA_ALBUMS.length).optional(),
        layout: z.enum(GALLERY_LAYOUTS).optional(),
        limit: z.number().int().min(0).max(48).optional(),
      })
      .strip(),
  ),
  sectionInputSchema(
    "steps",
    z
      .object({
        ...sectionCopyShape,
        items: z.array(publicStepItemSchema).max(MAX_SECTION_ITEMS).optional(),
      })
      .strip(),
  ),
  sectionInputSchema(
    "cta",
    z
      .object({
        ...sectionCopyShape,
        ctaLabel: localizedTextSchema.optional(),
        ctaHref: optionalSafeNavHrefSchema.optional(),
        ctaSecondaryLabel: localizedTextSchema.optional(),
        ctaSecondaryHref: optionalSafeNavHrefSchema.optional(),
      })
      .strip(),
  ),
  sectionInputSchema(
    "stays",
    z
      .object({
        ...sectionCopyShape,
        showPrices: z.boolean().optional(),
        items: z
          .array(
            z
              .object({
                roomTypeId: z.string().min(1).max(64),
                text: localizedTextSchema.optional(),
              })
              .strip(),
          )
          .max(MAX_SECTION_ITEMS)
          .optional(),
      })
      .strip(),
  ),
  sectionInputSchema("place", z.object({}).strip()),
  sectionInputSchema(
    "reviews",
    z
      .object({
        ...sectionCopyShape,
        items: z
          .array(
            z
              .object({
                quote: localizedTextSchema,
                author: localizedTextSchema,
                rating: z.number().int().min(1).max(5).optional(),
              })
              .strip(),
          )
          .max(MAX_SECTION_ITEMS)
          .optional(),
      })
      .strip(),
  ),
  sectionInputSchema(
    "faq",
    z
      .object({
        ...sectionCopyShape,
        items: z
          .array(z.object({ question: localizedTextSchema, answer: localizedTextSchema }).strip())
          .max(MAX_SECTION_ITEMS)
          .optional(),
      })
      .strip(),
  ),
  sectionInputSchema(
    "amenities",
    z
      .object({
        ...sectionCopyShape,
        items: z
          .array(z.object({ icon: z.string().max(32).optional(), label: localizedTextSchema }).strip())
          .max(MAX_SECTION_ITEMS)
          .optional(),
      })
      .strip(),
  ),
  sectionInputSchema(
    "attractions",
    z
      .object({
        ...sectionCopyShape,
        items: z
          .array(
            z
              .object({
                name: localizedTextSchema,
                text: localizedTextSchema,
                distance: z.string().max(40).optional(),
              })
              .strip(),
          )
          .max(MAX_SECTION_ITEMS)
          .optional(),
      })
      .strip(),
  ),
  sectionInputSchema(
    "video",
    z
      .object({
        ...sectionCopyShape,
        url: z
          .string()
          .max(500)
          .refine((v) => v === "" || isSafeHttpUrl(v), { message: "invalid_url" })
          .optional(),
      })
      .strip(),
  ),
]);

const sitePageSchema = z
  .object({
    id: z.string().uuid(),
    slug: z.string().max(60),
    title: localizedTextSchema,
    lead: localizedTextSchema,
    seoDescription: localizedTextSchema,
    imageUrl: optionalUrlSchema,
    visible: z.boolean(),
    sortOrder: z.number().int().min(0).max(9999),
    sections: z.array(publicSiteSectionInputSchema).max(30),
  })
  .strict();

const untranslatedTextsSchema = z.array(z.string().max(5000)).max(300).optional();

const publicUntranslatedCopySchema = z
  .object({ ro: untranslatedTextsSchema, en: untranslatedTextsSchema, bg: untranslatedTextsSchema })
  .strip();

const publicSiteSettingsInputSchema = z
  .object({
    templateId: publicTemplateIdSchema,
    themeId: publicThemeIdSchema,
    published: z.boolean(),
    bookingEnabled: z.boolean(),
    bookingNavPosition: publicBookingNavPositionSchema,
    usePrimaryContact: z.boolean(),
    hero: publicHeroConfigSchema,
    contact: publicContactConfigSchema,
    seo: publicSeoConfigSchema,
    bookingNotice: publicBookingNoticeSchema,
    chrome: publicChromeConfigSchema.default({}),
    pages: publicPagesConfigSchema.default({}),
    untranslatedCopy: publicUntranslatedCopySchema.default({}),
    sections: z.array(publicSiteSectionInputSchema).max(50),
    sitePages: z.array(sitePageSchema).max(MAX_SITE_PAGES).default([]),
  })
  .strict()
  .superRefine((input, ctx) => {
    // Each page needs an address of its own that the app does not already use.
    input.sitePages.forEach((page, index) => {
      const others = input.sitePages.filter((_, other) => other !== index).map((row) => row.slug);
      const problem = pageSlugProblem(page.slug, others);
      if (problem) ctx.addIssue({ code: "custom", path: ["sitePages", index, "slug"], message: `slug_${problem}` });
    });
  });

export type PublicSiteSettingsInputParsed = z.infer<
  typeof publicSiteSettingsInputSchema
>;

export function parsePublicSiteSettingsInput(
  input: unknown,
): ParseResult<PublicSiteSettingsInputParsed> {
  const result = publicSiteSettingsInputSchema.safeParse(input);
  if (!result.success) {
    return {
      ok: false,
      error: formatZodError(result.error),
      fieldErrors: formatZodFieldErrors(result.error),
    };
  }
  return { ok: true, data: result.data };
}
