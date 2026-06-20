"use server";

import { after } from "next/server";
import { revalidatePublicBookingSurfaces } from "@/lib/cache/revalidate-admin";
import { getTranslations } from "next-intl/server";
import { createBookingRequest } from "@/services/bookings";
import { assertRoomsAvailableForStay } from "@/services/bookings/availability";
import { findGuestAutofillMatch } from "@/services/guests";
import { isAtLeastOneNight } from "@/domain/booking/conflict";
import { assertValidGuestPhone } from "@/domain/guest/normalize";
import { guestNamesFromForm } from "@/domain/guest-name";
import { loadGuestStayPreview } from "@/services/guest-stay-preview";
import { getRoomsByIds } from "@/services/rooms-admin";
import { stayNightCount } from "@/lib/stay-dates";
import { requireAnyStaff } from "@/lib/auth/require-admin";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMIT_BOOKING_SUBMIT,
  RATE_LIMIT_BOOKING_PREVIEW,
} from "@/lib/rate-limit";
import { runInPublicBookingMode } from "@/lib/tenant/scope";

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
    const preview = await runInPublicBookingMode(() =>
      loadGuestStayPreview(
        input.check_in,
        input.check_out,
        input.num_adults,
        input.num_children
      )
    );
    return { ok: true as const, preview };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : t("previewFailed"),
    };
  }
}

function parseSelectedRoomIds(optionId: string): string[] {
  return [...new Set(optionId.split(",").map((id) => id.trim()).filter(Boolean))];
}

export async function submitGuestRequestAction(formData: FormData) {
  const [t, tServer] = await Promise.all([
    getTranslations("errors"),
    getTranslations("public.serverActions"),
  ]);

  return runInPublicBookingMode(async () => {
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

      const roomIds = parseSelectedRoomIds(option_id);
      if (roomIds.length === 0) {
        return { ok: false as const, error: t("selectVariant") };
      }

      const [, rooms] = await Promise.all([
        assertRoomsAvailableForStay(check_in, check_out, roomIds),
        getRoomsByIds(roomIds),
      ]);
      if (rooms.length !== roomIds.length) {
        return { ok: false as const, error: t("variantUnavailable") };
      }

      const selectedTitle = String(formData.get("selected_title") ?? "").trim();
      const totalFromForm = Number(formData.get("selected_total_estimate"));
      const nights = stayNightCount(check_in, check_out);
      const total_estimate_ron =
        Number.isFinite(totalFromForm) && totalFromForm > 0
          ? totalFromForm
          : rooms.reduce((sum, room) => sum + Number(room.price_per_night), 0) *
            nights;

      const roomList = rooms
        .map((r) => `${r.name} (${r.building_name})`)
        .join(", ");
      const variantBlock = [
        tServer("selectedVariantHeader"),
        selectedTitle || roomList,
        tServer("selectedVariantRooms", { roomList }),
        tServer("selectedVariantNights", { nights }),
        tServer("selectedVariantEstimate", { total: total_estimate_ron }),
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
        total_price: total_estimate_ron,
        room_ids: roomIds,
        skipAvailabilityCheck: true,
      });

      after(async () => {
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
          const guestDisplayName =
            `${guest.guest_last_name ?? ""} ${guest.guest_first_name ?? ""}`.trim() ||
            guest.guest_name;
          await Promise.all(
            emails.map((ownerEmail) =>
              notifyOwnerNewRequest({
                ownerEmail,
                pensionName,
                guestName: guestDisplayName,
                guestEmail: guest_email,
                guestPhone: guest_phone || null,
                checkIn: check_in,
                checkOut: check_out,
                adults: num_adults,
                children: num_children,
                rooms: rooms.map((r) => r.name),
                bookingId: bookingId ?? "unknown",
                baseUrl,
              })
            )
          );
        } catch {
          /* email failure — non-fatal */
        }
      });

      after(() => {
        revalidatePublicBookingSurfaces({ disponibilitate: true });
      });
      return { ok: true as const };
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : t("genericError"),
      };
    }
  });
}

/** Rezervare introdusă de admin (telefon, recepție). */
export async function submitPhoneBookingAction(formData: FormData) {
  const [[t, tServer]] = await Promise.all([
    Promise.all([
      getTranslations("errors"),
      getTranslations("public.serverActions"),
    ]),
    requireAnyStaff(),
  ]);

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

  after(() => {
    revalidatePublicBookingSurfaces({ receptie: true });
  });

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
  const [, t] = await Promise.all([
    requireAnyStaff(),
    getTranslations("errors"),
  ]);
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
