import { z } from "zod";
import { DEFAULT_GUEST_LOYALTY_PROGRAM } from "@/domain/guest-app/loyalty";
import { formatZodError, hexColorSchema, optionalEmailSchema, optionalUrlSchema, type ParseResult } from "./shared";

const guestAppFeatureIdSchema = z.enum([
  "hotel_info",
  "gallery",
  "online_checkin",
  "wifi",
  "services",
  "facilities",
  "travel_tips",
  "green_stay",
  "online_payment",
]);

const guestAppFeatureStateSchema = z.enum(["live", "mock", "hidden"]);

const guestAppThemeSourceSchema = z.enum([
  "inherit",
  "custom",
  "noir",
  "alpine",
  "mediterranean",
  "pearl",
  "slate",
  "forest",
]);

const guestAppFeatureDefSchema = z
  .object({
    id: guestAppFeatureIdSchema,
    state: guestAppFeatureStateSchema,
    sortOrder: z.number().int().min(0).max(9999),
  })
  .strict();

const guestAppAppearanceSchema = z
  .object({
    themeId: guestAppThemeSourceSchema.optional(),
    primaryColor: hexColorSchema.optional(),
    accentColor: hexColorSchema.optional(),
    logoUrl: optionalUrlSchema.optional(),
  })
  .strict();

const guestAppWifiContentSchema = z
  .object({
    networkName: z.string().max(128).optional(),
    password: z.string().max(256).optional(),
    instructions: z.string().max(2000).optional(),
  })
  .strict();

const guestAppHotelContentSchema = z
  .object({
    shortDescription: z.string().max(2000).optional(),
    longDescription: z.string().max(10000).optional(),
    address: z.string().max(500).optional(),
    phone: z.string().max(64).optional(),
    email: optionalEmailSchema.optional(),
    website: optionalUrlSchema.optional(),
  })
  .strict();

const guestAppListItemSchema = z
  .object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    icon: z.string().max(64).optional(),
  })
  .strict();

const guestAppGreenStayContentSchema = z
  .object({
    enabled: z.boolean().optional(),
    description: z.string().max(2000).optional(),
  })
  .strict();

const guestAppContentSchema = z
  .object({
    hotel: guestAppHotelContentSchema.optional(),
    wifi: guestAppWifiContentSchema.optional(),
    travelTips: z.array(z.string().max(500)).max(50).optional(),
    facilities: z.array(guestAppListItemSchema).max(50).optional(),
    services: z.array(guestAppListItemSchema).max(50).optional(),
    greenStay: guestAppGreenStayContentSchema.optional(),
  })
  .strict();

const guestLoyaltyProgramSchema = z
  .object({
    enabled: z.boolean(),
    nightsForPerk: z.number().int().min(0).max(365),
    perkTitle: z.string().max(120),
    perkDescription: z.string().max(2000),
  })
  .strict();

const guestAppSettingsInputSchema = z
  .object({
    enabled: z.boolean(),
    usePrimaryContact: z.boolean(),
    appearance: guestAppAppearanceSchema,
    features: z.array(guestAppFeatureDefSchema).min(1).max(20),
    content: guestAppContentSchema,
    loyalty: guestLoyaltyProgramSchema.default(DEFAULT_GUEST_LOYALTY_PROGRAM),
  })
  .strict();

export type GuestAppSettingsInputParsed = z.infer<
  typeof guestAppSettingsInputSchema
>;

export function parseGuestAppSettingsInput(
  input: unknown,
): ParseResult<GuestAppSettingsInputParsed> {
  const result = guestAppSettingsInputSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, error: formatZodError(result.error) };
  }
  return { ok: true, data: result.data };
}
