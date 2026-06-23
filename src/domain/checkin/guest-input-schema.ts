import { z } from "zod";
import type { CheckinGuestInput } from "./types";

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()
  .optional();

export const checkinGuestInputSchema = z
  .object({
    full_name: z.string().max(200),
    last_name: z.string().max(100).nullable().optional(),
    first_name: z.string().max(100).nullable().optional(),
    phone: z.string().max(32).nullable().optional(),
    national_id: z.string().max(32).nullable().optional(),
    national_id_type: z
      .enum(["cnp", "idnp", "egn", "amka", "szemelyi_szam"])
      .nullable()
      .optional(),
    document_type: z.string().max(32).nullable().optional(),
    document_series: z.string().max(16).nullable().optional(),
    document_number: z.string().max(32).nullable().optional(),
    nationality: z.string().max(64).nullable().optional(),
    birth_date: isoDateSchema,
    doc_expiry_date: isoDateSchema,
    room_label: z.string().max(64).nullable().optional(),
    is_representative: z.boolean().optional(),
    guest_id: z.string().uuid().nullable().optional(),
    identity_status: z.string().max(32).nullable().optional(),
    present_at_checkin: z.boolean().optional(),
    keys_only: z.boolean().optional(),
  })
  .strict();

export const checkinGuestsArraySchema = z
  .array(checkinGuestInputSchema)
  .min(1)
  .max(50);

export function parseCheckinGuestsJson(
  json: string,
): { ok: true; guests: CheckinGuestInput[] } | { ok: false } {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false };
  }
  const parsed = checkinGuestsArraySchema.safeParse(raw);
  if (!parsed.success) return { ok: false };
  return { ok: true, guests: parsed.data as CheckinGuestInput[] };
}
