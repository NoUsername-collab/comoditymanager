/** Check-in domain types — pure, no DB / framework dependencies */

export type CheckinType = "reservation" | "walkin" | "group";
export type CheckinStatus = "complete" | "incomplete" | "blocked";
export type PaymentStatus = "paid" | "partial" | "unpaid" | "online";

/** DB check constraint — `online` is UI-only mock, stored as `paid`. */
export type StoredPaymentStatus = "paid" | "partial" | "unpaid";

export const CHECKIN_PAYMENT_OPTIONS: PaymentStatus[] = [
  "paid",
  "partial",
  "unpaid",
  "online",
];

export function paymentAmountForStatus(
  status: PaymentStatus,
  totalPrice: number,
  partialAmount: number
): number {
  if (status === "paid" || status === "online") return totalPrice;
  if (status === "partial") return partialAmount;
  return 0;
}

export function normalizePaymentStatusForDb(
  status: PaymentStatus
): StoredPaymentStatus {
  return status === "online" ? "paid" : status;
}

/** Empty strings must become null before writing to Postgres `date` columns. */
export function optionalDateForDb(
  value: string | null | undefined
): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export type CheckinFlag =
  | "no_document"
  | "no_cnp"
  | "invalid_cnp"
  | "unpaid"
  | "no_phone"
  | "group_partial"
  | "checkout_blocked"
  | "early_checkin";

export type CheckinDocRule = "required" | "recommended" | "optional";
export type CheckinPhoneRule = "required" | "recommended" | "optional";
export type CheckinCnpRule = "required" | "recommended" | "optional";
export type CheckinPaymentRule = "full" | "partial" | "at_checkout";
export type GroupCheckinMode = "rep" | "individual" | "both";
export type DocumentType = "ci" | "pasaport" | "permis";

// ── Guest input (one per person) ───────────────────────────
export interface CheckinGuestInput {
  /** Compat — derivat din last_name + first_name dacă lipsesc */
  full_name: string;
  last_name?: string | null;
  first_name?: string | null;
  phone?: string | null;
  /** CNP (RO) sau alt cod personal */
  national_id?: string | null;
  national_id_type?: "cnp" | "idnp" | "egn" | "amka" | "szemelyi_szam" | null;
  document_type?: DocumentType | null;
  document_series?: string | null;
  document_number?: string | null;
  nationality?: string | null;
  birth_date?: string | null; // YYYY-MM-DD
  room_label?: string | null;
  is_representative?: boolean;
  guest_id?: string | null;
}

// ── Form data submitted by operator ────────────────────────
export interface CheckinFormData {
  type: CheckinType;
  booking_id: string;
  guests: CheckinGuestInput[];
  payment_status: PaymentStatus;
  payment_amount_paid?: number;
  deposit_amount?: number;
  key_handed?: boolean;
  notes?: string;
}

// ── Owner-configurable check-in settings ───────────────────
export interface CheckinSettings {
  pension_display_name: string;
  checkin_doc_rule: CheckinDocRule;
  checkin_phone_rule: CheckinPhoneRule;
  checkin_cnp_rule: CheckinCnpRule;
  checkin_payment_rule: CheckinPaymentRule;
  checkin_min_payment_pct: number;
  checkin_deposit: boolean;
  checkin_deposit_amount: number;
  walkin_allowed: boolean;
  group_checkin_mode: GroupCheckinMode;
  checkin_time_from: string | null; // "HH:MM"
  checkout_time_until: string | null;
  late_checkout_allowed: boolean;
  late_checkout_fee: number;
  early_checkin_allowed: boolean;
  early_checkin_fee: number;
  /** Secțiunea I — Fișă ocupare capacitate cazare (OPANAF 381/2026) */
  fisa_property_address: string | null;
  fisa_owner_cui: string | null;
  fisa_tourism_license: string | null;
}

// ── Validation result ──────────────────────────────────────
export interface ValidationResult {
  status: "ok" | "warning" | "blocked";
  flags: CheckinFlag[];
  blockers: string[];
}

// ── Minimal booking info needed for validation ─────────────
export interface BookingForCheckin {
  id: string;
  status: string;
  total_price: number;
  check_in: string;  // YYYY-MM-DD
  check_out: string;
  guest_name: string;
  guest_last_name?: string | null;
  guest_first_name?: string | null;
  guest_phone: string | null;
  guest_email: string | null;
  num_adults: number;
  num_children: number;
  room_names?: string[];
}
