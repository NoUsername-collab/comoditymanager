/** DB row types for checkins — mirrors Supabase schema. */

import type {
  CheckinStatus,
  CheckinType,
  PaymentStatus,
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
  payment_status: PaymentStatus;
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
  phone: string | null;
  document_type: DocumentType | null;
  document_number: string | null;
  nationality: string | null;
  birth_date: string | null;
  is_representative: boolean;
  checked_in_at: string | null;
}

export const CHECKIN_ROW_SELECT =
  "id, tenant_id, booking_id, type, status, checked_in_at, checked_in_by, payment_status, payment_amount_paid, deposit_amount, key_handed, flags, notes, created_at";

export const CHECKIN_GUEST_ROW_SELECT =
  "id, tenant_id, checkin_id, guest_id, full_name, phone, document_type, document_number, nationality, birth_date, is_representative, checked_in_at";
