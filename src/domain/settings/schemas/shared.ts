import { z } from "zod";
import { isSafeHttpUrl, isSafeNavHref } from "@/lib/security/html-escape";

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
  .union([
    z.literal(""),
    z.null(),
    z
      .string()
      .max(2048)
      .refine((v) => isSafeHttpUrl(v), { message: "invalid_url" }),
  ])
  .transform((v) => (v === "" || v === null ? null : v));

export const safeNavHrefSchema = z
  .string()
  .max(2048)
  .refine((v) => isSafeNavHref(v), { message: "invalid_href" });

export const optionalSafeNavHrefSchema = z
  .union([z.literal(""), z.null(), safeNavHrefSchema])
  .transform((v) => (v === "" || v === null ? null : v));

export const optionalContactTextSchema = z
  .union([z.literal(""), z.null(), z.string().max(64)])
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
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function formatZodError(error: z.ZodError): string {
  return error.issues.map((issue) => issue.message).join("; ");
}

/** Per-field messages keyed by dot-joined path (e.g. "contact.phone", "hero.title.ro"). */
export function formatZodFieldErrors(error: z.ZodError): Record<string, string> {
  const map: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!map[key]) map[key] = issue.message;
  }
  return map;
}
