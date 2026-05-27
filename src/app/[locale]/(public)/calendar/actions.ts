"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createBookingRequest } from "@/services/bookings";
import { findGuestAutofillMatch } from "@/services/guests";
import { isAtLeastOneNight } from "@/domain/booking/conflict";
import { guestNamesFromForm } from "@/domain/guest-name";
import { loadGuestStayPreview } from "@/services/guest-stay-preview";
import { requireAdmin } from "@/lib/auth/require-admin";
import { CACHE_TAGS } from "@/lib/cache-tags";

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
  await mustAcceptLegal(formData);

  const check_in = String(formData.get("check_in") ?? "");
  const check_out = String(formData.get("check_out") ?? "");
  const guest = guestNamesFromForm(formData);
  const guest_email = String(formData.get("guest_email") ?? "");
  const guest_phone = String(formData.get("guest_phone") ?? "");
  const num_adults = Number(formData.get("num_adults") ?? 1);
  const num_children = Number(formData.get("num_children") ?? 0);
  const has_minor = formData.get("has_minor") === "on";
  const minor_age = String(formData.get("minor_age") ?? "");
  const notesRaw = String(formData.get("notes") ?? "").trim();
  const option_id = String(formData.get("selected_option_id") ?? "");

  if (!check_in || !check_out || !guest_email) {
    throw new Error(t("fillRequired"));
  }
  if (!isAtLeastOneNight(check_in, check_out)) {
    throw new Error(t("minOneNight"));
  }
  if (!option_id) {
    throw new Error(t("selectVariant"));
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

  await createBookingRequest({
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

  revalidateTag(CACHE_TAGS.bookingCounts, "max");
  revalidatePath("/calendar");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/calendar");
  revalidatePath("/admin/disponibilitate");
  return { ok: true as const };
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

  if (!check_in || !check_out) {
    throw new Error(t("fillRequired"));
  }
  if (!isAtLeastOneNight(check_in, check_out)) {
    throw new Error(t("minOneNight"));
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

  revalidateTag(CACHE_TAGS.bookingCounts, "max");
  revalidatePath("/receptie");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/calendar");

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
