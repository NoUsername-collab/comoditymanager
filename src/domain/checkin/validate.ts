/**
 * Pure validation — no DB, no framework imports.
 * Implements the pseudocode from dev spec section 06.
 */

import { guestsCollectingIdentity } from "./guest-layout";
import {
  evaluateCnpRule,
  guestHasValidCnp,
  isRomanianNationality,
} from "./identity-rules";
import type {
  CheckinFlag,
  CheckinFormData,
  CheckinSettings,
  BookingForCheckin,
  ValidationResult,
} from "./types";

/**
 * Validate a check-in attempt against the owner's configured rules.
 *
 * @param data       Form data collected from the operator
 * @param settings   Owner-configured check-in rules
 * @param booking    The booking being checked in
 * @param currentHour Current hour in HH:MM format (for early check-in detection)
 * @param today      Current date in YYYY-MM-DD (for date-based validation)
 * @returns          { status, flags, blockers }
 */
export function validateCheckin(
  data: CheckinFormData,
  settings: CheckinSettings,
  booking: BookingForCheckin,
  currentHour?: string,
  today?: string,
): ValidationResult {
  const flags: CheckinFlag[] = [];
  const blockers: string[] = [];
  const activeGuests = guestsCollectingIdentity(data.guests);

  if (activeGuests.length === 0) {
    blockers.push("Cel puțin un oaspete prezent la check-in");
  }

  // ── DATE CHECK ─────────────────────────────────────────────
  // Check-in is ONLY allowed on the check-in date itself.
  if (today && booking.check_in) {
    if (today !== booking.check_in) {
      blockers.push(
        `Check-in posibil doar in data de ${booking.check_in}`,
      );
    }
  }

  // ── CNP / identitate (ANAF + reguli proprietar) ───────────
  const cnpEval = evaluateCnpRule(
    activeGuests,
    settings.checkin_cnp_rule ?? "required",
  );
  blockers.push(...cnpEval.blockers);
  for (const f of cnpEval.flags) {
    if (!flags.includes(f)) flags.push(f);
  }

  // ── DOCUMENT ──────────────────────────────────────────────
  const allHaveDoc = activeGuests.every((g) => {
    if (isRomanianNationality(g.nationality) && guestHasValidCnp(g)) return true;
    return Boolean(g.document_number?.trim() || g.document_series?.trim());
  });
  if (!allHaveDoc) {
    if (settings.checkin_doc_rule === "required") {
      blockers.push("Document identitate obligatoriu");
    } else if (settings.checkin_doc_rule === "recommended") {
      flags.push("no_document");
    }
  }

  // ── PHONE ─────────────────────────────────────────────────
  const allHavePhone = activeGuests.every((g) => g.phone);
  if (!allHavePhone) {
    if (settings.checkin_phone_rule === "required") {
      blockers.push("Telefon de contact obligatoriu");
    } else if (settings.checkin_phone_rule === "recommended") {
      flags.push("no_phone");
    }
  }

  // ── PAYMENT ───────────────────────────────────────────────
  const totalDue = booking.total_price;
  const paid = data.payment_amount_paid ?? 0;

  if (totalDue > 0) {
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
      // payment_rule = "at_checkout" — just a flag, not blocked
      flags.push("unpaid");
    }
  }

  // ── WALK-IN CHECK ─────────────────────────────────────────
  if (data.type === "walkin" && !settings.walkin_allowed) {
    blockers.push(
      "Check-in direct nedisponibil pentru aceasta proprietate",
    );
  }

  // ── EARLY CHECK-IN (time-based) ───────────────────────────
  // On the check-in day, block if before the configured check-in hour.
  if (currentHour && settings.checkin_time_from) {
    if (currentHour < settings.checkin_time_from) {
      blockers.push(
        `Check-in posibil de la ora ${settings.checkin_time_from}`,
      );
    }
  }

  // ── RESULT ────────────────────────────────────────────────
  if (blockers.length > 0) {
    return { status: "blocked", flags, blockers };
  }
  if (flags.length > 0) {
    return { status: "warning", flags, blockers: [] };
  }
  return { status: "ok", flags: [], blockers: [] };
}
