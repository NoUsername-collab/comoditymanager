/**
 * Guest deduplication service — queries the database for potential
 * duplicate guests and scores them against a reference input.
 */

import {
  normalizeEmail,
  normalizePhone,
  isPlaceholderEmail,
} from "@/domain/guest/normalize";
import {
  scoreDedupCandidates,
  type DedupCandidate,
  type DedupGuestRow,
  type DedupInput,
} from "@/domain/guest/dedup-score";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── DB columns for candidate rows ──────────────────────────────────────────

const DEDUP_SELECT = `
  id, display_name, last_name, first_name,
  phone, phone_normalized, email, email_normalized,
  national_id, national_id_type, cnp,
  doc_number, doc_type,
  birth_date, city
`;

// ─── Search for potential duplicates ─────────────────────────────────────────

/**
 * Search the guests table for rows that could match the input on any axis.
 * Returns raw rows — scoring happens in the domain layer.
 */
async function searchCandidateRows(
  input: DedupInput,
  limit = 20
): Promise<DedupGuestRow[]> {
  const supabase = await createAdminClient();
  const orParts: string[] = [];

  // National ID match (highest priority)
  const nid = (input.nationalId ?? "").replace(/[\s\-]/g, "");
  if (nid) {
    orParts.push(`national_id.eq.${nid}`);
    orParts.push(`cnp.eq.${nid}`);
  }

  // Phone match
  if (input.phoneNormalized) {
    orParts.push(`phone_normalized.eq.${input.phoneNormalized}`);
  }

  // Email match
  if (input.emailNormalized && !isPlaceholderEmail(input.emailNormalized)) {
    orParts.push(`email_normalized.eq.${input.emailNormalized}`);
  }

  // Doc number match (if we have both number and type)
  if (input.docNumber) {
    orParts.push(`doc_number.eq.${input.docNumber.trim().toUpperCase()}`);
  }

  if (orParts.length === 0) return [];

  let query = supabase
    .from("guests")
    .select(DEDUP_SELECT)
    .or(orParts.join(","))
    .limit(limit);

  if (input.excludeGuestId) {
    query = query.neq("id", input.excludeGuestId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []) as DedupGuestRow[];
}

/**
 * Additionally search by name + birth date for Tier 3 matches.
 * Only run when we have both name and birth date.
 */
async function searchByNameBirthDate(
  input: DedupInput,
  excludeIds: Set<string>,
  limit = 10
): Promise<DedupGuestRow[]> {
  if (!input.lastName || !input.birthDate) return [];

  const supabase = await createAdminClient();
  let query = supabase
    .from("guests")
    .select(DEDUP_SELECT)
    .ilike("last_name", input.lastName.trim())
    .eq("birth_date", input.birthDate)
    .limit(limit);

  if (input.excludeGuestId) {
    query = query.neq("id", input.excludeGuestId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  // Filter out already-found rows
  return ((data ?? []) as DedupGuestRow[]).filter(
    (row) => !excludeIds.has(row.id)
  );
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Find and score potential duplicate guests for a given input.
 * This is the main entry point for the dedup system.
 */
export async function findDedupCandidates(
  input: DedupInput
): Promise<DedupCandidate[]> {
  // Phase 1: Search by exact field matches (national_id, phone, email, doc)
  const primaryRows = await searchCandidateRows(input);
  const seenIds = new Set(primaryRows.map((r) => r.id));

  // Phase 2: Search by name + birth date (Tier 3)
  const nameRows = await searchByNameBirthDate(input, seenIds);
  const allRows = [...primaryRows, ...nameRows];

  if (allRows.length === 0) return [];

  // Phase 3: Score all candidates
  return scoreDedupCandidates(input, allRows);
}

/**
 * Build a DedupInput from booking-level data (used at booking creation).
 */
export function dedupInputFromBooking(input: {
  guestLastName: string;
  guestFirstName: string;
  guestEmail: string;
  guestPhone: string;
  excludeGuestId?: string;
}): DedupInput {
  const phoneNorm = normalizePhone(input.guestPhone);
  const emailNorm = normalizeEmail(input.guestEmail);

  return {
    excludeGuestId: input.excludeGuestId,
    lastName: input.guestLastName,
    firstName: input.guestFirstName,
    phone: input.guestPhone || null,
    phoneNormalized: phoneNorm,
    email: input.guestEmail || null,
    emailNormalized:
      emailNorm && !isPlaceholderEmail(emailNorm) ? emailNorm : null,
    nationalId: null,
    nationalIdType: null,
    docNumber: null,
    docType: null,
    birthDate: null,
    city: null,
  };
}

/**
 * Build a DedupInput from a full guest record (used on guest detail page).
 */
export function dedupInputFromGuest(guest: {
  id: string;
  last_name: string;
  first_name: string;
  phone: string | null;
  phone_normalized: string | null;
  email: string | null;
  email_normalized: string | null;
  national_id: string | null;
  national_id_type: string | null;
  cnp: string | null;
  doc_number: string | null;
  doc_type: string | null;
  birth_date: string | null;
  city: string | null;
}): DedupInput {
  return {
    excludeGuestId: guest.id,
    lastName: guest.last_name,
    firstName: guest.first_name,
    phone: guest.phone,
    phoneNormalized: guest.phone_normalized,
    email: guest.email,
    emailNormalized: guest.email_normalized,
    nationalId: guest.national_id ?? guest.cnp,
    nationalIdType: guest.national_id_type,
    docNumber: guest.doc_number,
    docType: guest.doc_type,
    birthDate: guest.birth_date,
    city: guest.city,
  };
}
