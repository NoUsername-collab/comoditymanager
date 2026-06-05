"use server";

import { revalidatePublicBookingSurfaces } from "@/lib/cache/revalidate-admin";
import { getTranslations } from "next-intl/server";
import { createBookingRequest } from "@/services/bookings";
import { findGuestAutofillMatch } from "@/services/guests";
import { isAtLeastOneNight } from "@/domain/booking/conflict";
import { assertValidGuestPhone } from "@/domain/guest/normalize";
import { guestNamesFromForm } from "@/domain/guest-name";
import { loadGuestStayPreview } from "@/services/guest-stay-preview";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMIT_BOOKING_SUBMIT,
  RATE_LIMIT_BOOKING_PREVIEW,
} from "@/lib/rate-limit";

async function assertRateLimit(preset: { limit: number; windowMs: number }, action: string) {
  const ip = await getClientIp();
  const result = checkRateLimit(`${action}:${ip}`, preset.limit, preset.windowMs);
  if (!result.allowed) {
    const seconds = Math.ceil(result.retryAfterMs / 1000);
    throw new Error(`rate_limit.too_many_requests:${seconds}`);
  }
}

async function mustAcceptLegal(formData: FormData) {
  const t = await getTranslations("errors");
  if (formData.get("accept_terms") !== "on") {
    throw new Error(t("acceptTerms"));
  }
  if (formData.get("accept_gdpr") !== "on") {
    throw new Error(t("acceptGdpr"));
  }
}

export async function previewGuestStayAction(input: {
  check_in: string;
  check_out: string;
  num_adults: number;
  num_children: number;
}) {
  const t = await getTranslations("errors");
  try {
    await assertRateLimit(RATE_LIMIT_BOOKING_PREVIEW, "preview");
    const preview = await loadGuestStayPreview(
      input.check_in,
      input.check_out,
      input.num_adults,
      input.num_children
    );
    return { ok: true as const, preview };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : t("previewFailed"),
    };
  }
}

async function assertSelectedOptionStillValid(
  check_in: string,
  check_out: string,
  option_id: string,
  num_adults: number,
  num_children: number
) {
  const t = await getTranslations("errors");
  const preview = await loadGuestStayPreview(
    check_in,
    check_out,
    num_adults,
    num_children
  );
  const match = preview.options.find((o) => o.option_id === option_id);
  if (!match) {
    throw new Error(t("variantUnavailable"));
  }
  return match;
}

export async function submitGuestRequestAction(formData: FormData) {
  const t = await getTranslations("errors");
  const tServer = await getTranslations("public.serverActions");

  try {
    await assertRateLimit(RATE_LIMIT_BOOKING_SUBMIT, "submit");
    await mustAcceptLegal(formData);

    const check_in = String(formData.get("check_in") ?? "");
    const check_out = String(formData.get("check_out") ?? "");
    const guest = guestNamesFromForm(formData);
    const guest_email = String(formData.get("guest_email") ?? "");
    const guest_phone = String(formData.get("guest_phone") ?? "");
    const num_adults_raw = Number(formData.get("num_adults") ?? 1);
    const num_children_raw = Number(formData.get("num_children") ?? 0);
    const num_adults = Number.isFinite(num_adults_raw) && num_adults_raw >= 1 ? Math.floor(num_adults_raw) : 1;
    const num_children = Number.isFinite(num_children_raw) && num_children_raw >= 0 ? Math.floor(num_children_raw) : 0;
    const has_minor = formData.get("has_minor") === "on";
    const minor_age = String(formData.get("minor_age") ?? "");
    const notesRaw = String(formData.get("notes") ?? "").trim();
    const option_id = String(formData.get("selected_option_id") ?? "");

    if (!check_in || !check_out || !guest_email || !guest_phone.trim()) {
      return { ok: false as const, error: t("fillRequired") };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest_email.trim())) {
      return { ok: false as const, error: t("invalidEmail") };
    }
    try {
      assertValidGuestPhone(guest_phone);
    } catch {
      return { ok: false as const, error: t("invalidPhone") };
    }
    if (!isAtLeastOneNight(check_in, check_out)) {
      return { ok: false as const, error: t("minOneNight") };
    }
    if (!option_id) {
      return { ok: false as const, error: t("selectVariant") };
    }

    const selected = await assertSelectedOptionStillValid(
      check_in,
      check_out,
      option_id,
      num_adults,
      num_children
    );

    const roomList = selected.rooms
      .map((r) => `${r.name} (${r.building_name})`)
      .join(", ");
    const variantBlock = [
      tServer("selectedVariantHeader"),
      selected.title,
      tServer("selectedVariantRooms", { roomList }),
      tServer("selectedVariantNights", { nights: selected.nights }),
      tServer("selectedVariantEstimate", { total: selected.total_estimate_ron }),
      tServer("selectedVariantNote"),
    ].join("\n");

    const notes = notesRaw
      ? `${notesRaw}\n\n${variantBlock}`
      : variantBlock;

    const bookingId = await createBookingRequest({
      check_in,
      check_out,
      ...guest,
      guest_email,
      guest_phone,
      num_adults,
      num_children,
      has_minor,
      minor_age,
      notes,
      total_price: selected.total_estimate_ron,
      room_ids: selected.rooms.map((r) => r.id),
    });

    // Notify pension owner(s) — reads email from DB, not env var
    // Non-blocking — never delays user response
    (async () => {
      try {
        const { requireTenantIdForData } = await import("@/lib/tenant/guards");
        const { getTenantNotificationEmails, getTenantDisplayName } = await import(
          "@/services/tenants"
        );
        const tenantId = await requireTenantIdForData();
        const [emails, pensionName] = await Promise.all([
          getTenantNotificationEmails(tenantId),
          getTenantDisplayName(tenantId),
        ]);
        if (emails.length === 0) return;
        const { platformSiteUrl } = await import("@/lib/platform/branding");
        const { headers } = await import("next/headers");
        const h = await headers();
        const host = h.get("x-forwarded-host") ?? h.get("host");
        const baseUrl = platformSiteUrl(host);
        const { notifyOwnerNewRequest } = await import("@/lib/email/notify");
        // Send to ALL tenant owners/admins
        for (const ownerEmail of emails) {
          notifyOwnerNewRequest({
            ownerEmail,
            pensionName,
            guestName: `${guest.guest_last_name ?? ""} ${guest.guest_first_name ?? ""}`.trim() || guest.guest_name,
            guestEmail: guest_email,
            guestPhone: guest_phone || null,
            checkIn: check_in,
            checkOut: check_out,
            adults: num_adults,
            children: num_children,
            rooms: selected.rooms.map((r) => r.name),
            bookingId: bookingId ?? "unknown",
            baseUrl,
          }).catch(() => {});
        }
      } catch { /* email/import failure — non-fatal */ }
    })();

    revalidatePublicBookingSurfaces({ disponibilitate: true });
    return { ok: true as const };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : t("genericError"),
    };
  }
}

/** Rezervare introdusă de admin (telefon, recepție). */
export async function submitPhoneBookingAction(formData: FormData) {
  const t = await getTranslations("errors");
  const tServer = await getTranslations("public.serverActions");
  await requireAdmin();

  const check_in = String(formData.get("check_in") ?? "");
  const check_out = String(formData.get("check_out") ?? "");
  const guest = guestNamesFromForm(formData);
  const guest_email = String(formData.get("guest_email") ?? "");
  const guest_phone = String(formData.get("guest_phone") ?? "");
  const num_adults = Number(formData.get("num_adults") ?? 1);
  const num_children = Number(formData.get("num_children") ?? 0);
  const notesRaw = String(formData.get("notes") ?? "").trim();
  const confirm_now = formData.get("confirm_now") === "on";

  if (!check_in || !check_out || !guest_phone.trim()) {
    throw new Error(t("fillRequired"));
  }
  if (!isAtLeastOneNight(check_in, check_out)) {
    throw new Error(t("minOneNight"));
  }
  try {
    assertValidGuestPhone(guest_phone);
  } catch {
    throw new Error(t("invalidPhone"));
  }

  const notes = notesRaw
    ? tServer("phoneNoteWithDetails", { notes: notesRaw })
    : tServer("phoneNoteDefault");

  const id = await createBookingRequest({
    check_in,
    check_out,
    ...guest,
    guest_email: guest_email || tServer("receptionFallbackEmail"),
    guest_phone,
    num_adults,
    num_children,
    has_minor: false,
    minor_age: "",
    notes,
  });

  revalidatePublicBookingSurfaces({ receptie: true });

  if (confirm_now) {
    return { ok: true as const, bookingId: id, redirectConfirm: true };
  }
  return { ok: true as const, bookingId: id };
}

export async function suggestExistingGuestAction(input: {
  guest_last_name?: string;
  guest_first_name?: string;
  guest_email?: string;
  guest_phone?: string;
}) {
  await requireAdmin();
  const t = await getTranslations("errors");
  try {
    const match = await findGuestAutofillMatch(input);
    return { ok: true as const, match };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : t("genericError"),
    };
  }
}
