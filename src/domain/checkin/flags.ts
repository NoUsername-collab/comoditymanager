/**
 * Compute flags from a stored check-in record + current settings.
 * Used for display in Gantt, dashboard, and booking detail.
 * Pure function — no DB dependencies.
 */

import type { CheckinFlag } from "./types";

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
    case "early_checkout":
    case "keys_blocked_no_id":
    case "keys_blocked_unpaid":
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
    case "early_checkout":
      return "⏰"; // ⏰
    case "keys_blocked_no_id":
      return "🔑"; // 🔑
    case "keys_blocked_unpaid":
      return "🔑"; // 🔑
    default:
      return "❓"; // ❓
  }
}
