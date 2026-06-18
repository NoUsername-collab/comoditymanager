import { z } from "zod";

export const localizedTextSchema = z
  .object({
    ro: z.string().max(5000).optional(),
    en: z.string().max(5000).optional(),
    bg: z.string().max(5000).optional(),
  })
  .strict();

export const optionalEmailSchema = z
  .union([z.literal(""), z.null(), z.string().email().max(254)])
  .transform((v) => (v === "" || v === null ? null : v));

export const optionalUrlSchema = z
  .union([z.literal(""), z.null(), z.string().url().max(2048)])
  .transform((v) => (v === "" || v === null ? null : v));

export const hexColorSchema = z
  .union([
    z.literal(""),
    z.null(),
    z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "invalid_hex_color"),
  ])
  .transform((v) => (v === "" || v === null ? null : v));

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join("; ");
}
