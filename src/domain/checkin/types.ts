/** Check-in domain types — pure, no DB / framework dependencies */

export type CheckinType = "reservation" | "walkin" | "group";
export type CheckinStatus = "complete" | "incomplete" | "blocked";
export type PaymentStatus = "paid" | "partial" | "unpaid";

export type CheckinFlag =
  | "no_document"
  | "unpaid"
  | "no_phone"
  | "group_partial"
  | "checkout_blocked"
  | "early_checkin";

export type CheckinDocRule = "required" | "recommended" | "optional";
export type CheckinPhoneRule = "required" | "recommended" | "optional";
export type CheckinPaymentRule = "full" | "partial" | "at_checkout";
export type GroupCheckinMode = "rep" | "individual" | "both";
export type DocumentType = "ci" | "pasaport" | "permis";

// ── Guest input (one per person) ───────────────────────────
export interface CheckinGuestInput {
  full_name: string;
  phone?: string | null;
  document_type?: DocumentType | null;
  document_number?: string | null;
  nationality?: string | null;
  birth_date?: string | null; // YYYY-MM-DD
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
  checkin_doc_rule: CheckinDocRule;
  checkin_phone_rule: CheckinPhoneRule;
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
  guest_phone: string | null;
  guest_email: string | null;
  num_adults: number;
  num_children: number;
}
