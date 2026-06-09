/**
 * Compute flags from a stored check-in record + current settings.
 * Used for display in Gantt, dashboard, and booking detail.
 * Pure function — no DB dependencies.
 */

import type {
  CheckinFlag,
  CheckinSettings,
  PaymentStatus,
} from "./types";

export interface StoredCheckin {
  status: string;
  payment_status: PaymentStatus;
  payment_amount_paid: number;
  flags: string[];
  type: string;
}

export interface StoredCheckinGuest {
  document_number: string | null;
  phone: string | null;
  checked_in_at: string | null;
}

/**
 * Re-derive flags from the current state of a check-in record.
 * This is idempotent — you can call it any time to get the current flags.
 */
export function computeFlags(
  checkin: StoredCheckin,
  guests: StoredCheckinGuest[],
  settings: CheckinSettings,
): CheckinFlag[] {
  const flags: CheckinFlag[] = [];

  // ── DOCUMENT ──────────────────────────────────────────────
  if (settings.checkin_doc_rule !== "optional") {
    const missingDoc = guests.some((g) => !g.document_number);
    if (missingDoc) {
      flags.push("no_document");
    }
  }

  // ── PHONE ─────────────────────────────────────────────────
  if (settings.checkin_phone_rule !== "optional") {
    const missingPhone = guests.some((g) => !g.phone);
    if (missingPhone) {
      flags.push("no_phone");
    }
  }

  // ── PAYMENT ───────────────────────────────────────────────
  if (
    checkin.payment_status === "unpaid" ||
    checkin.payment_status === "partial"
  ) {
    flags.push("unpaid");
  }

  // ── GROUP PARTIAL ─────────────────────────────────────────
  if (checkin.type === "group") {
    const notYetIn = guests.filter((g) => !g.checked_in_at);
    if (notYetIn.length > 0) {
      flags.push("group_partial");
    }
  }

  return flags;
}

/** Map a flag to its severity level for UI display */
export function flagSeverity(
  flag: CheckinFlag,
): "error" | "warning" | "info" {
  switch (flag) {
    case "unpaid":
    case "checkout_blocked":
      return "error";
    case "no_document":
    case "no_cnp":
    case "invalid_cnp":
    case "no_phone":
    case "early_checkin":
      return "warning";
    case "group_partial":
      return "info";
    default:
      return "warning";
  }
}

/** Map a flag to its emoji icon for compact display */
export function flagIcon(flag: CheckinFlag): string {
  switch (flag) {
    case "no_document":
    case "no_cnp":
    case "invalid_cnp":
      return "⚠️"; // ⚠️
    case "unpaid":
      return "💳"; // 💳
    case "no_phone":
      return "📞"; // 📞
    case "group_partial":
      return "👥"; // 👥
    case "checkout_blocked":
      return "🔴"; // 🔴
    case "early_checkin":
      return "⏰"; // ⏰
    default:
      return "❓"; // ❓
  }
}
