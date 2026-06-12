import { randomBytes } from "node:crypto";
import {
  isGuestAccessBookingStatusValid,
  isGuestAccessDateValid,
} from "@/domain/guest-app/access-rules";
import type {
  GuestAccessBookingSnapshot,
  GuestAccessResult,
} from "@/domain/guest-app/types";
import { getEffectiveToday } from "@/domain/simulation/sim-clock";
import { runInPublicBookingMode } from "@/lib/tenant/scope";
import { withTenantId } from "@/lib/tenant/scope";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import { getGuestAppSettings, getGuestAppSettingsPublic } from "./settings";
import { getGuestAppPublicDb } from "./public-db";
import { isGuestAppMigrationMissing } from "./map";

function normalizeAccessCode(raw: string): string {
  return raw.trim().toLowerCase();
}

function generateAccessCode(): string {
  return randomBytes(9).toString("base64url").slice(0, 12).toLowerCase();
}

async function loadBookingSnapshot(
  bookingId: string,
  tenantId: string,
): Promise<GuestAccessBookingSnapshot | null> {
  const supabase = createPublicAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id, status, check_in, check_out, guest_name,
      booking_rooms (
        rooms ( name )
      )
    `,
    )
    .eq("tenant_id", tenantId)
    .eq("id", bookingId)
    .maybeSingle();

  if (error) {
    if (isGuestAppMigrationMissing(error.message)) return null;
    throw new Error(error.message);
  }
  if (!data) return null;

  const roomLabels: string[] = [];
  const bookingRooms = data.booking_rooms as
    | { rooms: { name: string } | { name: string }[] | null }[]
    | null;
  for (const row of bookingRooms ?? []) {
    const r = row.rooms;
    const name = Array.isArray(r) ? r[0]?.name : r?.name;
    if (name) roomLabels.push(name);
  }

  return {
    id: String(data.id),
    status: String(data.status),
    checkIn: String(data.check_in),
    checkOut: String(data.check_out),
    guestName: String(data.guest_name),
    roomLabels,
  };
}

/**
 * Emite (sau re-emite) codul de acces pentru o rezervare confirmată.
 * Apelat la confirmare — un cod activ per booking.
 */
export async function issueGuestAccessForBooking(
  bookingId: string,
): Promise<string | null> {
  const { tenantId, supabase } = await getGuestAppPublicDb();
  const settings = await getGuestAppSettings();
  if (!settings.enabled) return null;

  const booking = await loadBookingSnapshot(bookingId, tenantId);
  if (!booking || booking.status !== "confirmata") return null;

  const accessCode = generateAccessCode();
  const { error } = await supabase.from("booking_guest_access").upsert(
    withTenantId(tenantId, {
      booking_id: bookingId,
      access_code: accessCode,
      issued_at: new Date().toISOString(),
      revoked_at: null,
    }),
    { onConflict: "booking_id" },
  );

  if (error) {
    if (error.message.includes("booking_guest_access")) return null;
    throw new Error(error.message);
  }

  return accessCode;
}

/**
 * Rezolvă sesiunea oaspete după cod — fără autentificare staff.
 */
export async function resolveGuestAccessByCode(
  rawCode: string,
): Promise<GuestAccessResult> {
  return runInPublicBookingMode(async () => {
    const accessCode = normalizeAccessCode(rawCode);
    if (!accessCode) return { ok: false, reason: "not_found" };

    const settings = await getGuestAppSettingsPublic();
    if (!settings.enabled) return { ok: false, reason: "disabled" };

    const { tenantId, supabase } = await getGuestAppPublicDb();
    const { data: accessRow, error } = await supabase
      .from("booking_guest_access")
      .select("booking_id, access_code, revoked_at")
      .eq("tenant_id", tenantId)
      .ilike("access_code", accessCode)
      .maybeSingle();

    if (error) {
      if (isGuestAppMigrationMissing(error.message)) {
        return { ok: false, reason: "setup_incomplete" };
      }
      throw new Error(error.message);
    }
    if (!accessRow) return { ok: false, reason: "not_found" };
    if (accessRow.revoked_at) return { ok: false, reason: "revoked" };

    const booking = await loadBookingSnapshot(String(accessRow.booking_id), tenantId);
    if (!booking) return { ok: false, reason: "not_found" };

    const statusReason = isGuestAccessBookingStatusValid(booking.status);
    if (statusReason) return { ok: false, reason: statusReason };

    const today = await getEffectiveToday();
    const dateReason = isGuestAccessDateValid(today, {
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      earlyAccessDays: 1,
    });
    if (dateReason) return { ok: false, reason: dateReason };

    return {
      ok: true,
      accessCode,
      booking,
      settings,
    };
  });
}

/** Revocă accesul (ex. anulare rezervare). */
export async function revokeGuestAccessForBooking(
  bookingId: string,
): Promise<void> {
  const { tenantId, supabase } = await getGuestAppPublicDb();
  await supabase
    .from("booking_guest_access")
    .update({ revoked_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("booking_id", bookingId)
    .is("revoked_at", null);
}

/** Cod activ pentru o rezervare (null dacă lipsește sau e revocat). */
export async function getGuestAccessCodeForBooking(
  bookingId: string,
): Promise<string | null> {
  const { tenantId, supabase } = await getGuestAppPublicDb();
  const { data, error } = await supabase
    .from("booking_guest_access")
    .select("access_code, revoked_at")
    .eq("tenant_id", tenantId)
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data || data.revoked_at) return null;
  return String(data.access_code);
}

export type GuestAccessLinkInfo = {
  accessCode: string;
  url: string;
};

/** Link guest app pentru rezervare confirmată — emite cod dacă lipsește. */
export async function resolveGuestAccessLinkForBooking(
  bookingId: string,
  baseUrl: string,
): Promise<GuestAccessLinkInfo | null> {
  const { buildGuestAppStayUrl } = await import("./url");
  let code = await getGuestAccessCodeForBooking(bookingId);
  if (!code) {
    code = await issueGuestAccessForBooking(bookingId);
  }
  if (!code) return null;
  return {
    accessCode: code,
    url: buildGuestAppStayUrl(baseUrl, code),
  };
}
