import { z } from "zod";

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "invalid_date");

export const guestPrecheckinInputSchema = z.object({
  accessCode: z.string().min(8).max(32),
  lastName: z.string().trim().min(1).max(100),
  firstName: z.string().trim().min(1).max(100),
  phone: z.string().trim().min(1).max(32),
  email: z.union([z.literal(""), z.string().trim().max(254).email()]).optional(),
  documentType: z.enum(["ci", "pasaport", "permis"]).optional(),
  documentNumber: z.string().trim().max(64).optional(),
  nationalId: z.string().trim().max(32).optional(),
  birthDate: z.union([z.literal(""), isoDateSchema]).optional(),
  nationality: z.string().trim().max(64).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const guestGreenStayInputSchema = z.object({
  accessCode: z.string().min(8).max(32),
  skipDate: isoDateSchema,
  note: z.string().trim().max(500).optional(),
});

export const guestFeedbackInputSchema = z.object({
  accessCode: z.string().min(8).max(32),
  stars: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000),
});
