import { z } from "zod";
import { isSafeHttpUrl } from "@/lib/security/html-escape";
import {
  formatZodError,
  localizedTextSchema,
  optionalEmailSchema,
  optionalSafeNavHrefSchema,
  optionalUrlSchema,
  type ParseResult,
} from "./shared";

const publicTemplateIdSchema = z.enum(["classic", "editorial", "immersive"]);
const publicThemeIdSchema = z.enum(["noir", "alpine", "mediterranean"]);
const publicBookingNavPositionSchema = z.enum(["nav", "footer", "both", "hidden"]);
const publicSectionTypeSchema = z.enum([
  "intro",
  "benefits",
  "gallery",
  "text",
  "cta",
  "steps",
]);

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
    showCheckTimes: z.boolean().optional(),
  })
  .strict();

const publicContactConfigSchema = z
  .object({
    email: optionalEmailSchema.optional(),
    phone: z.string().max(64).optional(),
    whatsapp: z.string().max(64).optional(),
    telegram: z.string().max(64).optional(),
    facebook: optionalUrlSchema.optional(),
    instagram: optionalUrlSchema.optional(),
  })
  .strict();

const publicSeoConfigSchema = z
  .object({
    metaTitle: localizedTextSchema.optional(),
    metaDescription: localizedTextSchema.optional(),
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
    category: z.string().max(64).optional(),
  })
  .strict();

const publicStepItemSchema = z
  .object({
    title: localizedTextSchema,
    text: localizedTextSchema,
  })
  .strict();

const publicSectionPayloadSchema = z
  .object({
    title: localizedTextSchema.optional(),
    lead: localizedTextSchema.optional(),
    body: localizedTextSchema.optional(),
    items: z
      .array(
        z.union([
          publicBenefitItemSchema,
          publicGalleryItemSchema,
          publicStepItemSchema,
        ]),
      )
      .max(100)
      .optional(),
    ctaLabel: localizedTextSchema.optional(),
    ctaHref: optionalSafeNavHrefSchema.optional(),
    ctaSecondaryLabel: localizedTextSchema.optional(),
    ctaSecondaryHref: optionalSafeNavHrefSchema.optional(),
  })
  .strict();

const publicSiteSectionInputSchema = z
  .object({
    sectionType: publicSectionTypeSchema,
    sortOrder: z.number().int().min(0).max(9999),
    visible: z.boolean(),
    payload: publicSectionPayloadSchema,
  })
  .strict();

export const publicSiteSettingsInputSchema = z
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
    return { ok: false, error: formatZodError(result.error) };
  }
  return { ok: true, data: result.data };
}
