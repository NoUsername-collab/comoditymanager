import { accessCodeCandidates } from "@/domain/guest-app/access-code";
import { randomBytes } from "node:crypto";
import { cache } from "react";
import {
  formatLoyaltyReference,
  isLoyaltyReferenceFormat,
  LOYALTY_REF_ALPHABET,
  loyaltyNightsRemaining,
  loyaltyPerkUnlocked,
  normalizeLoyaltyReference,
} from "@/domain/guest-app/loyalty";
import {
  enforceRateLimit,
  getClientIp,
  RATE_LIMIT_GUEST_ACCESS,
} from "@/lib/rate-limit";
import { runInPublicBookingMode } from "@/lib/tenant/scope";
import { withTenantId } from "@/lib/tenant/scope";
import { getGuestAppPublicDb } from "./public-db";
import { getGuestAppSettings, getGuestAppSettingsPublic } from "./settings";
import { createPublicAdminClient } from "@/lib/supabase/admin";

export type GuestLoyaltySnapshot = {
  reference: string;
  guestId: string;
  guestName: string;
  completedStays: number;
  totalNights: number;
  perkUnlocked: boolean;
  nightsRemaining: number;
  nightsForPerk: number;
  perkTitle: string;
  perkDescription: string;
};

type GuestLoyaltyAccessResult =
  | { ok: true; snapshot: GuestLoyaltySnapshot }
  | {
      ok: false;
      reason: "disabled" | "not_found" | "blacklisted" | "no_guest";
    };

function generateReferenceCode(): string {
  const alphabet = LOYALTY_REF_ALPHABET;
  const bytes = randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += alphabet[bytes[i]! % alphabet.length];
  }
  return code;
}

async function loadGuestLoyaltyRow(
  tenantId: string,
  guestId: string,
): Promise<{
  guestName: string;
  completedStays: number;
  totalNights: number;
  flagLevel: string | null;
} | null> {
  const supabase = createPublicAdminClient();
  const { data: guest, error: guestError } = await supabase
    .from("guests")
    .select("id, display_name")
    .eq("tenant_id", tenantId)
    .eq("id", guestId)
    .maybeSingle();

  if (guestError) throw new Error(guestError.message);
  if (!guest) return null;

  const { data: profile, error: profileError } = await supabase
    .from("guest_profiles")
    .select("completed_stays, total_nights, flag_level")
    .eq("guest_id", guestId)
    .maybeSingle();

  if (profileError && !profileError.message.includes("guest_profiles")) {
    throw new Error(profileError.message);
  }

  return {
    guestName: String(guest.display_name ?? ""),
    completedStays: Number(profile?.completed_stays ?? 0),
    totalNights: Number(profile?.total_nights ?? 0),
    flagLevel: profile?.flag_level != null ? String(profile.flag_level) : null,
  };
}

function toSnapshot(
  referenceCode: string,
  guest: {
    guestName: string;
    completedStays: number;
    totalNights: number;
  },
  guestId: string,
  nightsForPerk: number,
  perkTitle: string,
  perkDescription: string,
): GuestLoyaltySnapshot {
  return {
    reference: formatLoyaltyReference(referenceCode),
    guestId,
    guestName: guest.guestName,
    completedStays: guest.completedStays,
    totalNights: guest.totalNights,
    perkUnlocked: loyaltyPerkUnlocked(guest.totalNights, nightsForPerk),
    nightsRemaining: loyaltyNightsRemaining(guest.totalNights, nightsForPerk),
    nightsForPerk,
    perkTitle,
    perkDescription,
  };
}

async function insertLoyaltyRef(
  tenantId: string,
  guestId: string,
): Promise<string | null> {
  const { supabase } = await getGuestAppPublicDb();
  for (let attempt = 0; attempt < 6; attempt++) {
    const referenceCode = generateReferenceCode();
    const { error } = await supabase.from("guest_loyalty_refs").upsert(
      withTenantId(tenantId, {
        guest_id: guestId,
        reference_code: referenceCode,
        issued_at: new Date().toISOString(),
        revoked_at: null,
      }),
      { onConflict: "tenant_id,guest_id" },
    );
    if (!error) return referenceCode;
    if (
      error.message.includes("reference_code") ||
      error.code === "23505"
    ) {
      continue;
    }
    throw new Error(error.message);
  }
  return null;
}

/** Mint or return the property loyalty reference for a guest file. */
export async function issueLoyaltyRefForGuest(
  guestId: string,
): Promise<string | null> {
  const settings = await getGuestAppSettings();
  if (!settings.loyalty.enabled) return null;

  const { tenantId, supabase } = await getGuestAppPublicDb();
  const { data, error } = await supabase
    .from("guest_loyalty_refs")
    .select("reference_code, revoked_at")
    .eq("tenant_id", tenantId)
    .eq("guest_id", guestId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (data?.reference_code && !data.revoked_at) {
    return String(data.reference_code);
  }
  return insertLoyaltyRef(tenantId, guestId);
}

export async function getLoyaltyRefForGuest(
  guestId: string,
): Promise<string | null> {
  const { tenantId, supabase } = await getGuestAppPublicDb();
  const { data, error } = await supabase
    .from("guest_loyalty_refs")
    .select("reference_code, revoked_at")
    .eq("tenant_id", tenantId)
    .eq("guest_id", guestId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data?.reference_code || data.revoked_at) return null;
  return formatLoyaltyReference(String(data.reference_code));
}

/** Reception: new reference, previous URL stops working. */
export async function reissueLoyaltyRefForGuest(
  guestId: string,
): Promise<string | null> {
  const settings = await getGuestAppSettings();
  if (!settings.loyalty.enabled) return null;
  const { tenantId } = await getGuestAppPublicDb();
  return insertLoyaltyRef(tenantId, guestId);
}

function snapshotFromParts(
  referenceCode: string,
  guestId: string,
  guest: NonNullable<Awaited<ReturnType<typeof loadGuestLoyaltyRow>>>,
  nightsForPerk: number,
  perkTitle: string,
  perkDescription: string,
): GuestLoyaltyAccessResult {
  if (guest.flagLevel === "blacklist") {
    return { ok: false, reason: "blacklisted" };
  }
  return {
    ok: true,
    snapshot: toSnapshot(
      referenceCode,
      guest,
      guestId,
      nightsForPerk,
      perkTitle,
      perkDescription,
    ),
  };
}

export const resolveLoyaltyByReference = cache(
  async function resolveLoyaltyByReference(
    rawRef: string,
  ): Promise<GuestLoyaltyAccessResult> {
    return runInPublicBookingMode(async () => {
      const ip = await getClientIp();
      const rl = await enforceRateLimit(
        `guest-loyalty:${ip}`,
        RATE_LIMIT_GUEST_ACCESS.limit,
        RATE_LIMIT_GUEST_ACCESS.windowMs,
      );
      if (!rl.allowed) return { ok: false, reason: "not_found" };

      if (!isLoyaltyReferenceFormat(rawRef)) {
        return { ok: false, reason: "not_found" };
      }

      const settings = await getGuestAppSettingsPublic();
      if (!settings.enabled || !settings.loyalty.enabled) {
        return { ok: false, reason: "disabled" };
      }

      const code = normalizeLoyaltyReference(rawRef);
      const { tenantId, supabase } = await getGuestAppPublicDb();
      const { data, error } = await supabase
        .from("guest_loyalty_refs")
        .select("guest_id, reference_code, revoked_at")
        .eq("tenant_id", tenantId)
        .eq("reference_code", code)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data || data.revoked_at) return { ok: false, reason: "not_found" };

      const guestId = String(data.guest_id);
      const guest = await loadGuestLoyaltyRow(tenantId, guestId);
      if (!guest) return { ok: false, reason: "not_found" };

      return snapshotFromParts(
        String(data.reference_code),
        guestId,
        guest,
        settings.loyalty.nightsForPerk,
        settings.loyalty.perkTitle,
        settings.loyalty.perkDescription,
      );
    });
  },
);

export async function loadLoyaltySnapshotForGuest(
  guestId: string,
): Promise<GuestLoyaltySnapshot | null> {
  const settings = await getGuestAppSettingsPublic();
  if (!settings.enabled || !settings.loyalty.enabled) return null;
  const code = await issueLoyaltyRefForGuest(guestId);
  if (!code) return null;
  const { tenantId } = await getGuestAppPublicDb();
  const guest = await loadGuestLoyaltyRow(tenantId, guestId);
  if (!guest || guest.flagLevel === "blacklist") return null;
  const result = snapshotFromParts(
    code,
    guestId,
    guest,
    settings.loyalty.nightsForPerk,
    settings.loyalty.perkTitle,
    settings.loyalty.perkDescription,
  );
  return result.ok ? result.snapshot : null;
}

export const resolveLoyaltyFromStayAccessCode = cache(
  async function resolveLoyaltyFromStayAccessCode(
    rawCode: string,
  ): Promise<GuestLoyaltyAccessResult> {
    return runInPublicBookingMode(async () => {
      const settings = await getGuestAppSettingsPublic();
      if (!settings.enabled || !settings.loyalty.enabled) {
        return { ok: false, reason: "disabled" };
      }

      const accessCodes = accessCodeCandidates(rawCode);
      if (!accessCodes) return { ok: false, reason: "not_found" };

      const { tenantId, supabase } = await getGuestAppPublicDb();
      const { data: accessRow, error } = await supabase
        .from("booking_guest_access")
        .select("booking_id, revoked_at")
        .eq("tenant_id", tenantId)
        .in("access_code", accessCodes)
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!accessRow || accessRow.revoked_at) {
        return { ok: false, reason: "not_found" };
      }

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("guest_id")
        .eq("tenant_id", tenantId)
        .eq("id", String(accessRow.booking_id))
        .maybeSingle();

      if (bookingError) throw new Error(bookingError.message);
      const guestId = booking?.guest_id ? String(booking.guest_id) : null;
      if (!guestId) return { ok: false, reason: "no_guest" };

      const minted = await issueLoyaltyRefForGuest(guestId);
      if (!minted) return { ok: false, reason: "not_found" };

      const guest = await loadGuestLoyaltyRow(tenantId, guestId);
      if (!guest) return { ok: false, reason: "not_found" };

      return snapshotFromParts(
        minted,
        guestId,
        guest,
        settings.loyalty.nightsForPerk,
        settings.loyalty.perkTitle,
        settings.loyalty.perkDescription,
      );
    });
  },
);

