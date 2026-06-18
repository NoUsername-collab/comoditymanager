import { z } from "zod";
import {
  formatZodError,
  optionalEmailSchema,
  type ParseResult,
} from "./shared";

export const emailSettingsPartialSchema = z
  .object({
    email_enabled: z.boolean().optional(),
    email_notify_new_request: z.boolean().optional(),
    email_notify_confirmation: z.boolean().optional(),
    email_notify_cancellation: z.boolean().optional(),
    email_notify_daily_summary: z.boolean().optional(),
    email_from_name: z
      .union([z.literal(""), z.string().trim().max(120)])
      .transform((v) => (v === "" ? null : v))
      .optional(),
    email_from_address: optionalEmailSchema.optional(),
    email_reply_to: optionalEmailSchema.optional(),
    email_custom_footer: z
      .union([z.literal(""), z.string().max(4000)])
      .transform((v) => (v === "" ? null : v))
      .optional(),
  })
  .strict();

export type EmailSettingsPartialParsed = z.infer<
  typeof emailSettingsPartialSchema
>;

export function parseEmailSettingsPartial(
  input: unknown,
): ParseResult<EmailSettingsPartialParsed> {
  const result = emailSettingsPartialSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, error: formatZodError(result.error) };
  }
  return { ok: true, data: result.data };
}
