/**
 * Guest Deduplication Scoring Engine.
 *
 * Multi-layer matching to prevent duplicate guest records.
 * Each match produces a score (0–100) and a confidence tier:
 *
 *   Tier 1 — HARD MATCH (100 pts):
 *     Same national_id (CNP/IDNP/EGN/AMKA/Személyi szám).
 *     These are unique-for-life codes, guaranteed 1:1 person.
 *
 *   Tier 2 — STRONG MATCH (70–90 pts):
 *     Same phone + same last name
 *     Same email + same last name
 *     Same doc_number + same doc_type
 *
 *   Tier 3 — PROBABLE MATCH (40–60 pts):
 *     Same first_name + last_name + birth_date
 *     Same phone, different name (shared family phone?)
 *     Same last_name + same city + same birth year
 *
 * The engine returns scored candidates — the UI decides what to show.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type DedupMatchTier = "hard" | "strong" | "probable";

export type DedupMatchReason =
  | "national_id"
  | "phone_lastname"
  | "email_lastname"
  | "doc_number_type"
  | "name_birthdate"
  | "phone_different_name"
  | "lastname_city_birthyear";

export type DedupCandidate = {
  guestId: string;
  displayName: string;
  phone: string | null;
  email: string | null;
  nationalId: string | null;
  nationalIdType: string | null;
  birthDate: string | null;
  city: string | null;
  score: number;
  tier: DedupMatchTier;
  reasons: DedupMatchReason[];
};

export type DedupInput = {
  /** Exclude this guest from results (self) */
  excludeGuestId?: string;
  lastName: string;
  firstName: string;
  phone: string | null;
  phoneNormalized: string | null;
  email: string | null;
  emailNormalized: string | null;
  nationalId: string | null;
  nationalIdType: string | null;
  docNumber: string | null;
  docType: string | null;
  birthDate: string | null;
  city: string | null;
};

export type DedupGuestRow = {
  id: string;
  display_name: string;
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
};

// ─── Scoring ─────────────────────────────────────────────────────────────────

function normalizeStr(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function sameStr(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeStr(a);
  const nb = normalizeStr(b);
  return na.length > 0 && nb.length > 0 && na === nb;
}

function extractBirthYear(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const year = parseInt(birthDate.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

/**
 * Score a single candidate row against the input.
 * Returns null if no meaningful match.
 */
export function scoreDedupCandidate(
  input: DedupInput,
  row: DedupGuestRow
): DedupCandidate | null {
  if (input.excludeGuestId && row.id === input.excludeGuestId) return null;

  let score = 0;
  let tier: DedupMatchTier = "probable";
  const reasons: DedupMatchReason[] = [];

  // ── Tier 1: National ID match (100 pts) ──
  const inputNid = (input.nationalId ?? "").replace(/[\s\-]/g, "");
  const rowNid = (row.national_id ?? row.cnp ?? "").replace(/[\s\-]/g, "");

  if (inputNid.length > 0 && rowNid.length > 0 && inputNid === rowNid) {
    score = 100;
    tier = "hard";
    reasons.push("national_id");

    return {
      guestId: row.id,
      displayName: row.display_name,
      phone: row.phone,
      email: row.email,
      nationalId: row.national_id ?? row.cnp,
      nationalIdType: row.national_id_type,
      birthDate: row.birth_date,
      city: row.city,
      score,
      tier,
      reasons,
    };
  }

  // ── Tier 2: Strong matches ──

  // Phone + last name (85 pts)
  if (
    input.phoneNormalized &&
    row.phone_normalized &&
    input.phoneNormalized === row.phone_normalized &&
    sameStr(input.lastName, row.last_name)
  ) {
    score = Math.max(score, 85);
    tier = "strong";
    reasons.push("phone_lastname");
  }

  // Email + last name (80 pts)
  if (
    input.emailNormalized &&
    row.email_normalized &&
    input.emailNormalized === row.email_normalized &&
    sameStr(input.lastName, row.last_name)
  ) {
    score = Math.max(score, 80);
    tier = tier === "strong" ? "strong" : "strong";
    reasons.push("email_lastname");
  }

  // Doc number + doc type (75 pts)
  if (
    input.docNumber &&
    row.doc_number &&
    input.docType &&
    row.doc_type &&
    input.docNumber.trim().toUpperCase() === row.doc_number.trim().toUpperCase() &&
    input.docType === row.doc_type
  ) {
    score = Math.max(score, 75);
    tier = "strong";
    reasons.push("doc_number_type");
  }

  // ── Tier 3: Probable matches ──

  // Name + birth date (60 pts)
  if (
    sameStr(input.firstName, row.first_name) &&
    sameStr(input.lastName, row.last_name) &&
    input.birthDate &&
    row.birth_date &&
    input.birthDate === row.birth_date
  ) {
    score = Math.max(score, 60);
    if (tier !== "strong") tier = "probable";
    reasons.push("name_birthdate");
  }

  // Phone match, different last name — family phone? (45 pts)
  if (
    input.phoneNormalized &&
    row.phone_normalized &&
    input.phoneNormalized === row.phone_normalized &&
    !sameStr(input.lastName, row.last_name)
  ) {
    score = Math.max(score, 45);
    if (tier !== "strong") tier = "probable";
    reasons.push("phone_different_name");
  }

  // Last name + city + birth year (40 pts)
  const inputYear = extractBirthYear(input.birthDate);
  const rowYear = extractBirthYear(row.birth_date);
  if (
    sameStr(input.lastName, row.last_name) &&
    sameStr(input.city, row.city) &&
    inputYear != null &&
    rowYear != null &&
    inputYear === rowYear
  ) {
    // Only if we haven't already matched on name+birthdate
    if (!reasons.includes("name_birthdate")) {
      score = Math.max(score, 40);
      if (tier !== "strong") tier = "probable";
      reasons.push("lastname_city_birthyear");
    }
  }

  if (score === 0) return null;

  return {
    guestId: row.id,
    displayName: row.display_name,
    phone: row.phone,
    email: row.email,
    nationalId: row.national_id ?? row.cnp,
    nationalIdType: row.national_id_type,
    birthDate: row.birth_date,
    city: row.city,
    score,
    tier,
    reasons,
  };
}

/**
 * Score multiple candidates against an input and return sorted results.
 * Only returns candidates above the minimum threshold (default 40).
 */
export function scoreDedupCandidates(
  input: DedupInput,
  rows: DedupGuestRow[],
  minScore = 40
): DedupCandidate[] {
  const results: DedupCandidate[] = [];

  for (const row of rows) {
    const candidate = scoreDedupCandidate(input, row);
    if (candidate && candidate.score >= minScore) {
      results.push(candidate);
    }
  }

  // Sort by score descending, then by display name
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.displayName.localeCompare(b.displayName);
  });

  return results;
}

/**
 * Determine the recommended action for a dedup candidate.
 */
export function dedupAction(candidate: DedupCandidate): "auto_merge" | "suggest_merge" | "warn" {
  if (candidate.tier === "hard") return "auto_merge";
  if (candidate.tier === "strong" && candidate.score >= 80) return "suggest_merge";
  return "warn";
}
