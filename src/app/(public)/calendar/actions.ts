"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createBookingRequest } from "@/services/bookings";
import { isAtLeastOneNight } from "@/domain/booking/conflict";
import { guestNamesFromForm } from "@/domain/guest-name";
import { loadGuestStayPreview } from "@/services/guest-stay-preview";
import { requireAdmin } from "@/lib/auth/require-admin";
import { CACHE_TAGS } from "@/lib/cache-tags";

function mustAcceptLegal(formData: FormData) {
  if (formData.get("accept_terms") !== "on") {
    throw new Error("Acceptă termenii și condițiile");
  }
  if (formData.get("accept_gdpr") !== "on") {
    throw new Error("Acceptă politica de confidențialitate (GDPR)");
  }
}

export async function previewGuestStayAction(input: {
  check_in: string;
  check_out: string;
  num_adults: number;
  num_children: number;
}) {
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
      error: e instanceof Error ? e.message : "Nu am putut calcula variantele",
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
  const preview = await loadGuestStayPreview(
    check_in,
    check_out,
    num_adults,
    num_children
  );
  const match = preview.options.find((o) => o.option_id === option_id);
  if (!match) {
    throw new Error(
      "Varianta aleasă nu mai e disponibilă. Actualizează datele și alege din nou."
    );
  }
  return match;
}

export async function submitGuestRequestAction(formData: FormData) {
  mustAcceptLegal(formData);

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
    throw new Error("Completează datele obligatorii");
  }
  if (!isAtLeastOneNight(check_in, check_out)) {
    throw new Error("Ședere minimă o noapte (check-out după check-in)");
  }
  if (!option_id) {
    throw new Error("Alege o variantă de cazare înainte de trimitere.");
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
    "--- Variantă aleasă de oaspete ---",
    selected.title,
    `Camere (rezervare provizorie): ${roomList}`,
    `Nopți: ${selected.nights}`,
    `Estimare total: ${selected.total_estimate_ron} RON`,
    "Camerele sunt reținute provizoriu până la confirmarea pensiunii. Prețul final poate fi ajustat.",
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
    throw new Error("Completează datele obligatorii");
  }
  if (!isAtLeastOneNight(check_in, check_out)) {
    throw new Error("Ședere minimă o noapte");
  }

  const notes = notesRaw
    ? `[Telefon] ${notesRaw}`
    : "[Telefon] Rezervare recepție";

  const id = await createBookingRequest({
    check_in,
    check_out,
    ...guest,
    guest_email: guest_email || "receptie@casaemil.local",
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
