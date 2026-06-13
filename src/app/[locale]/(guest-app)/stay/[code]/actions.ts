"use server";

import { revalidatePath } from "next/cache";
import { resolveGuestAccessByCode } from "@/services/guest-app/access";
import { getGuestAppPublicDb } from "@/services/guest-app/public-db";
import { withTenantId } from "@/lib/tenant/scope";
import { runInPublicBookingMode } from "@/lib/tenant/scope";

export type GuestStayActionResult =
  | { ok: true }
  | { ok: false; error: string };

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
  phone: string;
  email?: string;
  documentType?: string;
  documentNumber?: string;
  notes?: string;
}): Promise<GuestStayActionResult> {
  const gate = await withGuestSession(input.accessCode);
  if (!gate.ok) return { ok: false, error: gate.error };

  const phone = input.phone.trim();
  if (!phone) return { ok: false, error: "phoneRequired" };

  const docType =
    input.documentType === "ci" ||
    input.documentType === "pasaport" ||
    input.documentType === "permis"
      ? input.documentType
      : null;

  try {
    const { tenantId, supabase } = await getGuestAppPublicDb();
    const { error } = await supabase.from("guest_precheckin_submissions").upsert(
      withTenantId(tenantId, {
        booking_id: gate.session.booking.id,
        guest_phone: phone,
        guest_email: input.email?.trim() || null,
        document_type: docType,
        document_number: input.documentNumber?.trim() || null,
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
