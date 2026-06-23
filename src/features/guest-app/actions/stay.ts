"use server";

import { revalidatePath } from "next/cache";
import { resolveGuestAccessByCode } from "@/services/guest-app/access";
import { getGuestAppPublicDb } from "@/services/guest-app/public-db";
import { withTenantId } from "@/lib/tenant/scope";
import { runInPublicBookingMode } from "@/lib/tenant/scope";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMIT_GUEST_STAY_ACTION,
} from "@/lib/rate-limit";
import {
  guestFeedbackInputSchema,
  guestGreenStayInputSchema,
  guestPrecheckinInputSchema,
} from "@/domain/guest-app/stay-action-schemas";

export type GuestStayActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function assertGuestStayActionRateLimit(): Promise<GuestStayActionResult | null> {
  const ip = await getClientIp();
  const rl = checkRateLimit(
    `guest-stay:${ip}`,
    RATE_LIMIT_GUEST_STAY_ACTION.limit,
    RATE_LIMIT_GUEST_STAY_ACTION.windowMs,
  );
  if (!rl.allowed) {
    return { ok: false, error: "rateLimited" };
  }
  return null;
}

async function withGuestSession(accessCode: string) {
  return runInPublicBookingMode(async () => {
    const session = await resolveGuestAccessByCode(accessCode);
    if (!session.ok) {
      return { ok: false as const, error: "guestApp.access.errors.notFound" };
    }
    return { ok: true as const, session };
  });
}

export async function submitGuestPrecheckinAction(input: {
  accessCode: string;
  lastName: string;
  firstName: string;
  phone: string;
  email?: string;
  documentType?: string;
  documentNumber?: string;
  nationalId?: string;
  birthDate?: string;
  nationality?: string;
  notes?: string;
}): Promise<GuestStayActionResult> {
  const rateLimited = await assertGuestStayActionRateLimit();
  if (rateLimited) return rateLimited;

  const parsed = guestPrecheckinInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const gate = await withGuestSession(parsed.data.accessCode);
  if (!gate.ok) return { ok: false, error: gate.error };

  const {
    lastName,
    firstName,
    phone,
    email,
    documentType,
    documentNumber,
    nationalId,
    birthDate,
    nationality,
    notes,
  } = parsed.data;

  const docType = documentType ?? null;
  const birthDateValue = birthDate?.trim() || null;

  try {
    const { tenantId, supabase } = await getGuestAppPublicDb();
    const { error } = await supabase.from("guest_precheckin_submissions").upsert(
      withTenantId(tenantId, {
        booking_id: gate.session.booking.id,
        guest_last_name: lastName,
        guest_first_name: firstName,
        guest_phone: phone,
        guest_email: email?.trim() || null,
        document_type: docType,
        document_number: documentNumber?.trim() || null,
        national_id: nationalId?.trim() || null,
        birth_date: birthDateValue,
        nationality: nationality?.trim() || null,
        notes: notes?.trim() || null,
        submitted_at: new Date().toISOString(),
      }),
      { onConflict: "booking_id" },
    );

    if (error) {
      if (error.message.includes("guest_precheckin_submissions")) {
        return { ok: false, error: "migration" };
      }
      return { ok: false, error: "generic" };
    }

    revalidatePath(`/stay/${gate.session.accessCode}`);
    revalidatePath(`/stay/${gate.session.accessCode}/check-in`);
    return { ok: true };
  } catch {
    return { ok: false, error: "generic" };
  }
}

export async function submitGuestGreenStayAction(input: {
  accessCode: string;
  skipDate: string;
  note?: string;
}): Promise<GuestStayActionResult> {
  const rateLimited = await assertGuestStayActionRateLimit();
  if (rateLimited) return rateLimited;

  const parsed = guestGreenStayInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const gate = await withGuestSession(parsed.data.accessCode);
  if (!gate.ok) return { ok: false, error: gate.error };

  if (gate.session.settings.content.greenStay?.enabled === false) {
    return { ok: false, error: "disabled" };
  }

  const { skipDate, note } = parsed.data;

  try {
    const { tenantId, supabase } = await getGuestAppPublicDb();
    const { error } = await supabase.from("guest_green_stay_requests").upsert(
      withTenantId(tenantId, {
        booking_id: gate.session.booking.id,
        skip_date: skipDate,
        note: note?.trim() || null,
        status: "pending",
      }),
      { onConflict: "booking_id,skip_date" },
    );

    if (error) {
      if (error.message.includes("guest_green_stay_requests")) {
        return { ok: false, error: "migration" };
      }
      return { ok: false, error: "generic" };
    }

    revalidatePath(`/stay/${gate.session.accessCode}`);
    revalidatePath(`/stay/${gate.session.accessCode}/green-stay`);
    return { ok: true };
  } catch {
    return { ok: false, error: "generic" };
  }
}

export async function submitGuestFeedbackAction(input: {
  accessCode: string;
  stars: number;
  comment: string;
}): Promise<GuestStayActionResult> {
  const rateLimited = await assertGuestStayActionRateLimit();
  if (rateLimited) return rateLimited;

  const parsed = guestFeedbackInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const gate = await withGuestSession(parsed.data.accessCode);
  if (!gate.ok) return { ok: false, error: gate.error };

  const { stars, comment } = parsed.data;

  try {
    const { tenantId, supabase } = await getGuestAppPublicDb();
    const { error } = await supabase.from("guest_feedback").upsert(
      withTenantId(tenantId, {
        booking_id: gate.session.booking.id,
        stars,
        comment,
        submitted_at: new Date().toISOString(),
      }),
      { onConflict: "booking_id" },
    );

    if (error) {
      if (error.message.includes("guest_feedback")) {
        return { ok: false, error: "migration" };
      }
      return { ok: false, error: "generic" };
    }

    revalidatePath(`/stay/${gate.session.accessCode}`);
    return { ok: true };
  } catch {
    return { ok: false, error: "generic" };
  }
}
