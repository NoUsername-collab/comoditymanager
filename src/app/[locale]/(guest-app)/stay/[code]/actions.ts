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

  const gate = await withGuestSession(input.accessCode);
  if (!gate.ok) return { ok: false, error: gate.error };

  const lastName = input.lastName.trim();
  const firstName = input.firstName.trim();
  const phone = input.phone.trim();
  if (!lastName || !firstName) return { ok: false, error: "nameRequired" };
  if (!phone) return { ok: false, error: "phoneRequired" };

  const docType =
    input.documentType === "ci" ||
    input.documentType === "pasaport" ||
    input.documentType === "permis"
      ? input.documentType
      : null;

  const birthDate = input.birthDate?.trim() || null;

  try {
    const { tenantId, supabase } = await getGuestAppPublicDb();
    const { error } = await supabase.from("guest_precheckin_submissions").upsert(
      withTenantId(tenantId, {
        booking_id: gate.session.booking.id,
        guest_last_name: lastName,
        guest_first_name: firstName,
        guest_phone: phone,
        guest_email: input.email?.trim() || null,
        document_type: docType,
        document_number: input.documentNumber?.trim() || null,
        national_id: input.nationalId?.trim() || null,
        birth_date: birthDate,
        nationality: input.nationality?.trim() || null,
        notes: input.notes?.trim() || null,
        submitted_at: new Date().toISOString(),
      }),
      { onConflict: "booking_id" },
    );

    if (error) {
      if (error.message.includes("guest_precheckin_submissions")) {
        return { ok: false, error: "migration" };
      }
      return { ok: false, error: error.message };
    }

    revalidatePath(`/stay/${gate.session.accessCode}`);
    revalidatePath(`/stay/${gate.session.accessCode}/check-in`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "generic",
    };
  }
}

export async function submitGuestGreenStayAction(input: {
  accessCode: string;
  skipDate: string;
  note?: string;
}): Promise<GuestStayActionResult> {
  const rateLimited = await assertGuestStayActionRateLimit();
  if (rateLimited) return rateLimited;

  const gate = await withGuestSession(input.accessCode);
  if (!gate.ok) return { ok: false, error: gate.error };

  if (gate.session.settings.content.greenStay?.enabled === false) {
    return { ok: false, error: "disabled" };
  }

  const skipDate = input.skipDate.trim();
  if (!skipDate) {
    return { ok: false, error: "dateRequired" };
  }

  try {
    const { tenantId, supabase } = await getGuestAppPublicDb();
    const { error } = await supabase.from("guest_green_stay_requests").upsert(
      withTenantId(tenantId, {
        booking_id: gate.session.booking.id,
        skip_date: skipDate,
        note: input.note?.trim() || null,
        status: "pending",
      }),
      { onConflict: "booking_id,skip_date" },
    );

    if (error) {
      if (error.message.includes("guest_green_stay_requests")) {
        return { ok: false, error: "migration" };
      }
      return { ok: false, error: error.message };
    }

    revalidatePath(`/stay/${gate.session.accessCode}`);
    revalidatePath(`/stay/${gate.session.accessCode}/green-stay`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "generic",
    };
  }
}

export async function submitGuestFeedbackAction(input: {
  accessCode: string;
  stars: number;
  comment: string;
}): Promise<GuestStayActionResult> {
  const rateLimited = await assertGuestStayActionRateLimit();
  if (rateLimited) return rateLimited;

  const gate = await withGuestSession(input.accessCode);
  if (!gate.ok) return { ok: false, error: gate.error };

  const stars = Math.round(input.stars);
  if (stars < 1 || stars > 5) return { ok: false, error: "invalidStars" };

  const comment = input.comment.trim();

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
      return { ok: false, error: error.message };
    }

    revalidatePath(`/stay/${gate.session.accessCode}`);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "generic",
    };
  }
}
