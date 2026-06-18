import { randomBytes } from "node:crypto";
import {
  guestAccessClosesOn,
  guestAccessOpensOn,
  isGuestAccessBookingStatusValid,
  isGuestAccessDateValid,
} from "@/domain/guest-app/access-rules";
import type {
  GuestAccessBookingSnapshot,
  GuestAccessResult,
} from "@/domain/guest-app/types";
import { getEffectiveToday } from "@/domain/simulation/sim-clock";
import {
  checkRateLimit,
  getClientIp,
  RATE_LIMIT_GUEST_ACCESS,
} from "@/lib/rate-limit";
import { runInPublicBookingMode } from "@/lib/tenant/scope";
import { withTenantId } from "@/lib/tenant/scope";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import { getGuestAppSettings, getGuestAppSettingsPublic } from "./settings";
import { getGuestAppPublicDb } from "./public-db";
import { isCheckinMigrationMissing } from "@/lib/checkin/migration";
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
      id, status, check_in, check_out, guest_name, guest_email, guest_phone, total_price,
      booking_rooms (
        rooms ( name, image_url )
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
  const roomImageUrls: string[] = [];
  const bookingRooms = data.booking_rooms as
    | { rooms: { name: string; image_url?: string | null } | { name: string; image_url?: string | null }[] | null }[]
    | null;
  for (const row of bookingRooms ?? []) {
    const r = row.rooms;
    const room = Array.isArray(r) ? r[0] : r;
    if (room?.name) roomLabels.push(room.name);
    if (room?.image_url) roomImageUrls.push(String(room.image_url));
  }

  let checkedInAt: string | null = null;
  let paymentStatus: GuestAccessBookingSnapshot["paymentStatus"] = null;
  let paymentAmountPaid: number | null = null;
  const checkinResult = await supabase
    .from("checkins")
    .select("checked_in_at, payment_status, payment_amount_paid")
    .eq("tenant_id", tenantId)
    .eq("booking_id", bookingId)
    .not("checked_in_at", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (checkinResult.error) {
    if (!isCheckinMigrationMissing(checkinResult.error.message)) {
      throw new Error(checkinResult.error.message);
    }
  } else if (checkinResult.data?.checked_in_at) {
    checkedInAt = String(checkinResult.data.checked_in_at);
    const ps = checkinResult.data.payment_status;
    if (ps === "paid" || ps === "partial" || ps === "unpaid") {
      paymentStatus = ps;
    }
    if (checkinResult.data.payment_amount_paid != null) {
      paymentAmountPaid = Number(checkinResult.data.payment_amount_paid);
    }
  }

  const totalRaw = data.total_price;
  const totalPrice =
    totalRaw != null && Number(totalRaw) > 0 ? Number(totalRaw) : null;

  return {
    id: String(data.id),
    status: String(data.status),
    checkIn: String(data.check_in),
    checkOut: String(data.check_out),
    guestName: String(data.guest_name),
    guestEmail: data.guest_email ? String(data.guest_email) : null,
    guestPhone: data.guest_phone ? String(data.guest_phone) : null,
    roomLabels,
    roomImageUrls,
    totalPrice,
    checkedInAt,
    paymentStatus,
    paymentAmountPaid,
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
    const ip = await getClientIp();
    const rl = checkRateLimit(
      `guest-access:${ip}`,
      RATE_LIMIT_GUEST_ACCESS.limit,
      RATE_LIMIT_GUEST_ACCESS.windowMs,
    );
    if (!rl.allowed) {
      return { ok: false, reason: "not_found" };
    }

    const accessCode = normalizeAccessCode(rawCode);
    if (!accessCode) return { ok: false, reason: "not_found" };

    const settings = await getGuestAppSettingsPublic();
    if (!settings.enabled) return { ok: false, reason: "disabled" };

    const { tenantId, supabase } = await getGuestAppPublicDb();
    const { data: accessRow, error } = await supabase
      .from("booking_guest_access")
      .select("booking_id, access_code, revoked_at, issued_at")
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
    const earlyAccessDays = 0;
    const opensOn =
      guestAccessOpensOn(booking.checkIn, earlyAccessDays) ??
      accessRow.issued_at?.slice(0, 10) ??
      today;
    const schedule = {
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      opensOn,
      closesOn: guestAccessClosesOn(booking.checkOut),
    };
    const dateReason = isGuestAccessDateValid(today, {
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      earlyAccessDays,
    });
    if (dateReason) {
      return { ok: false, reason: dateReason, schedule };
    }

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
