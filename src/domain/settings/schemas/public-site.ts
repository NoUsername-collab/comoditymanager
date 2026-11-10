import { z } from "zod";
import { isSafeHttpUrl } from "@/lib/security/html-escape";
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
    showNavHome: z.boolean().optional(),
    showNavPrivacy: z.boolean().optional(),
    showNavTerms: z.boolean().optional(),
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

const publicGalleryItemSchema = z
  .object({
    id: z.string().min(1).max(64),
    url: z
      .string()
      .max(2048)
      .refine((v) => isSafeHttpUrl(v), { message: "invalid_url" }),
    caption: localizedTextSchema.optional(),
    alt: localizedTextSchema.optional(),
    category: z.string().max(64).optional(),
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

function sectionInputSchema<T extends string, P extends z.ZodTypeAny>(sectionType: T, payload: P) {
  return z
    .object({
      id: z.string().uuid().optional(),
      sectionType: z.literal(sectionType),
      sortOrder: z.number().int().min(0).max(9999),
      visible: z.boolean(),
      payload,
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
        items: z.array(publicGalleryItemSchema).max(MAX_SECTION_ITEMS).optional(),
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
                imageUrl: z
                  .string()
                  .max(2048)
                  .refine((v) => isSafeHttpUrl(v), { message: "invalid_url" })
                  .optional(),
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
  })
  .strict();

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
