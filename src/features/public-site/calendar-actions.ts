"use server";

import { after } from "next/server";
import { revalidatePublicBookingSurfaces } from "@/lib/cache/revalidate-admin";
import { getTranslations } from "next-intl/server";
import { createBookingRequest } from "@/services/bookings";
import { assertRoomsAvailableForStay } from "@/services/bookings/availability";
import { isAtLeastOneNight } from "@/domain/booking/conflict";
import { assertValidGuestPhone } from "@/domain/guest/normalize";
import { guestNamesFromForm } from "@/domain/guest-name";
import { loadGuestStayPreview } from "@/services/guest-stay-preview";
import { getRoomsByIds } from "@/services/rooms-admin";
import { stayNightCount } from "@/lib/stay-dates";
import { quoteStayForRooms } from "@/services/stay-quote";
import {
  parsePartyInput,
  partyFromFormData,
  type Party,
} from "@/domain/availability/party";
import {
  enforceRateLimit,
  getClientIp,
  RATE_LIMIT_BOOKING_SUBMIT,
  RATE_LIMIT_BOOKING_PREVIEW,
} from "@/lib/rate-limit";
import { runInPublicBookingMode } from "@/lib/tenant/scope";

async function assertRateLimit(preset: { limit: number; windowMs: number }, action: string) {
  const ip = await getClientIp();
  const result = await enforceRateLimit(`${action}:${ip}`, preset.limit, preset.windowMs);
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
  party: Party;
}) {
  const t = await getTranslations("errors");
  try {
    await assertRateLimit(RATE_LIMIT_BOOKING_PREVIEW, "preview");
    const party = parsePartyInput(input.party);
    if (!party) return { ok: false as const, error: t("childAgesRequired") };
    const preview = await runInPublicBookingMode(() =>
      loadGuestStayPreview(input.check_in, input.check_out, party)
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
      const party = partyFromFormData(formData);
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
      if (!party) {
        return { ok: false as const, error: t("childAgesRequired") };
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

      // Price and fit come from the server, never from the form: a visitor could send any value.
      // The rooms must host this family under the child rules and the free extra beds / cots.
      let total_estimate_ron: number;
      try {
        ({ total: total_estimate_ron } = await quoteStayForRooms({
          party,
          roomIds,
          checkIn: check_in,
          checkOut: check_out,
        }));
      } catch {
        return { ok: false as const, error: t("variantUnavailable") };
      }
      const nights = stayNightCount(check_in, check_out);

      const roomList = rooms
        .map((r) => `${r.name} (${r.building_name})`)
        .join(", ");
      const variantBlock = [
        tServer("selectedVariantHeader"),
        roomList,
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
        party,
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
          const { getEmailSettings } = await import("@/services/email-settings");
          const [emails, pensionName, emailSettings] = await Promise.all([
            getTenantNotificationEmails(tenantId),
            getTenantDisplayName(tenantId),
            getEmailSettings().catch(() => null),
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
                adults: party.adults,
                children: party.childAges.length,
                rooms: rooms.map((r) => r.name),
                bookingId: bookingId ?? "unknown",
                baseUrl,
                emailSettings: emailSettings ?? undefined,
              })
            )
          );
        } catch {
          /* email failure — non-fatal */
        }
      });

      revalidatePublicBookingSurfaces({ availability: true });
      return { ok: true as const };
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : t("genericError"),
      };
    }
  });
}
