/** DB row types for checkins — mirrors Supabase schema. */

import type {
  CheckinStatus,
  CheckinType,
  StoredPaymentStatus,
  DocumentType,
} from "@/domain/checkin/types";

export interface CheckinRow {
  id: string;
  tenant_id: string;
  booking_id: string;
  type: CheckinType;
  status: CheckinStatus;
  checked_in_at: string;
  checked_in_by: string | null;
  payment_status: StoredPaymentStatus;
  payment_amount_paid: number;
  deposit_amount: number;
  key_handed: boolean;
  flags: string[];
  notes: string | null;
  created_at: string;
}

export interface CheckinGuestRow {
  id: string;
  tenant_id: string;
  checkin_id: string;
  guest_id: string | null;
  full_name: string;
  last_name: string | null;
  first_name: string | null;
  phone: string | null;
  national_id: string | null;
  document_type: DocumentType | null;
  document_series: string | null;
  document_number: string | null;
  nationality: string | null;
  birth_date: string | null;
  room_label: string | null;
  is_representative: boolean;
  checked_in_at: string | null;
}

export const CHECKIN_ROW_SELECT =
  "id, tenant_id, booking_id, type, status, checked_in_at, checked_in_by, payment_status, payment_amount_paid, deposit_amount, key_handed, flags, notes, created_at";

export const CHECKIN_GUEST_ROW_SELECT_MINIMAL =
  "id, tenant_id, checkin_id, guest_id, full_name, phone, document_type, document_number, nationality, birth_date, is_representative, checked_in_at";

export const CHECKIN_GUEST_ROW_SELECT =
  "id, tenant_id, checkin_id, guest_id, full_name, last_name, first_name, phone, national_id, document_type, document_series, document_number, nationality, birth_date, room_label, is_representative, checked_in_at";
