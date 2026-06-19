/**
 * Snapshot-based check-in readiness for pending arrivals on the admin home board.
 * Pure function — no DB or framework imports.
 */

import { isIdentityStatusCritical } from "@/domain/guest/profile-data";
import type { GuestIdentityStatus } from "@/domain/guest/types";
import type {
  CheckinFlag,
  CheckinSettings,
  PaymentStatus,
  ValidationResult,
} from "./types";

export type PendingCheckinSnapshot = {
  checkInDate: string;
  totalPrice: number;
  guestPhone: string | null;
  guestIdentityStatus: GuestIdentityStatus | null;
  paymentStatus: PaymentStatus | null;
  paymentAmountPaid: number | null;
  roomNames: string[];
};

export type PendingCheckinReadiness = ValidationResult;

export type PendingReadinessNow = {
  today: string;
  currentHour: string;
};

function effectivePaid(snapshot: PendingCheckinSnapshot): number {
  if (snapshot.paymentAmountPaid != null) {
    return snapshot.paymentAmountPaid;
  }
  if (
    snapshot.paymentStatus === "paid" ||
    snapshot.paymentStatus === "online"
  ) {
    return snapshot.totalPrice;
  }
  return 0;
}

function paymentMeetsThreshold(
  paid: number,
  total: number,
  settings: CheckinSettings,
): boolean {
  if (settings.checkin_payment_rule === "at_checkout") return true;
  if (settings.checkin_payment_rule === "full") return paid >= total;
  const pct = total > 0 ? (paid / total) * 100 : 100;
  return pct >= settings.checkin_min_payment_pct;
}

function identityComplete(
  status: GuestIdentityStatus | null | undefined,
): boolean {
  return status === "complete";
}

function assessPayment(
  snapshot: PendingCheckinSnapshot,
  settings: CheckinSettings,
  flags: CheckinFlag[],
  blockers: string[],
): void {
  const totalDue = snapshot.totalPrice;
  const paid = effectivePaid(snapshot);

  if (totalDue <= 0) return;

  if (settings.checkin_payment_rule === "full" && paid < totalDue) {
    blockers.push(
      `Plata integrala obligatorie (restant: ${totalDue - paid})`,
    );
  } else if (settings.checkin_payment_rule === "partial") {
    const paidPct = totalDue > 0 ? (paid / totalDue) * 100 : 100;
    if (paidPct < settings.checkin_min_payment_pct) {
      blockers.push(
        `Minim ${settings.checkin_min_payment_pct}% din total obligatoriu`,
      );
    }
  } else if (paid < totalDue) {
    if (!flags.includes("unpaid")) flags.push("unpaid");
  }
}

function assessPhone(
  snapshot: PendingCheckinSnapshot,
  settings: CheckinSettings,
  flags: CheckinFlag[],
  blockers: string[],
): void {
  if (snapshot.guestPhone?.trim()) return;

  if (settings.checkin_phone_rule === "required") {
    blockers.push("Telefon de contact obligatoriu");
    if (!flags.includes("no_phone")) flags.push("no_phone");
  } else if (settings.checkin_phone_rule === "recommended") {
    if (!flags.includes("no_phone")) flags.push("no_phone");
  }
}

function assessIdentity(
  snapshot: PendingCheckinSnapshot,
  settings: CheckinSettings,
  flags: CheckinFlag[],
  blockers: string[],
): void {
  if (identityComplete(snapshot.guestIdentityStatus)) return;

  const cnpRule = settings.checkin_cnp_rule ?? "required";
  const identityMissing =
    !snapshot.guestIdentityStatus ||
    isIdentityStatusCritical(snapshot.guestIdentityStatus) ||
    snapshot.guestIdentityStatus === "partial";

  if (!identityMissing) return;

  if (cnpRule === "required") {
    blockers.push("CNP / identitate obligatorie");
    if (!flags.includes("no_cnp")) flags.push("no_cnp");
  } else if (cnpRule === "recommended") {
    if (!flags.includes("no_cnp")) flags.push("no_cnp");
  }

  if (settings.checkin_doc_rule === "required") {
    blockers.push("Document identitate obligatoriu");
    if (!flags.includes("no_document")) flags.push("no_document");
  } else if (settings.checkin_doc_rule === "recommended") {
    if (!flags.includes("no_document")) flags.push("no_document");
  }
}

function assessEarlyCheckin(
  snapshot: PendingCheckinSnapshot,
  settings: CheckinSettings,
  now: PendingReadinessNow,
  flags: CheckinFlag[],
  blockers: string[],
): void {
  if (now.today !== snapshot.checkInDate) return;
  if (!settings.checkin_time_from) return;
  if (now.currentHour >= settings.checkin_time_from) return;

  blockers.push(`Check-in posibil de la ora ${settings.checkin_time_from}`);
  if (!flags.includes("early_checkin")) flags.push("early_checkin");
}

function assessKeys(
  snapshot: PendingCheckinSnapshot,
  settings: CheckinSettings,
  flags: CheckinFlag[],
): void {
  if (settings.checkin_key_rule === "always") return;
  if (snapshot.roomNames.length === 0) return;

  const paid = effectivePaid(snapshot);
  const total = snapshot.totalPrice;

  if (settings.checkin_key_rule === "id_verified") {
    if (!identityComplete(snapshot.guestIdentityStatus)) {
      if (!flags.includes("keys_blocked_no_id")) {
        flags.push("keys_blocked_no_id");
      }
    }
    return;
  }

  if (settings.checkin_key_rule === "paid") {
    if (total <= 0) return;
    if (!paymentMeetsThreshold(paid, total, settings)) {
      if (!flags.includes("keys_blocked_unpaid")) {
        flags.push("keys_blocked_unpaid");
      }
    }
  }
}

/**
 * Assess whether a pending arrival is ready for check-in based on snapshot data
 * and tenant check-in settings.
 */
export function assessPendingCheckinReadiness(
  snapshot: PendingCheckinSnapshot,
  settings: CheckinSettings,
  now: PendingReadinessNow,
): PendingCheckinReadiness {
  const flags: CheckinFlag[] = [];
  const blockers: string[] = [];

  assessEarlyCheckin(snapshot, settings, now, flags, blockers);
  assessIdentity(snapshot, settings, flags, blockers);
  assessPhone(snapshot, settings, flags, blockers);
  assessPayment(snapshot, settings, flags, blockers);
  assessKeys(snapshot, settings, flags);

  if (blockers.length > 0) {
    return { status: "blocked", flags, blockers };
  }
  if (flags.length > 0) {
    return { status: "warning", flags, blockers: [] };
  }
  return { status: "ok", flags: [], blockers: [] };
}

export function snapshotFromQuestItem(item: {
  checkIn: string;
  totalPrice: number;
  guestPhone: string | null;
  guestIdentityStatus: GuestIdentityStatus | null;
  paymentStatus: PaymentStatus | null;
  paymentAmountPaid: number | null;
  roomNames: string[];
}): PendingCheckinSnapshot {
  return {
    checkInDate: item.checkIn,
    totalPrice: item.totalPrice,
    guestPhone: item.guestPhone,
    guestIdentityStatus: item.guestIdentityStatus,
    paymentStatus: item.paymentStatus,
    paymentAmountPaid: item.paymentAmountPaid,
    roomNames: item.roomNames,
  };
}

export function currentHourLocal(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
