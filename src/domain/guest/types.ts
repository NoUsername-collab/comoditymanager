export type GuestTag = "vip" | "recurrent";

export const GUEST_TAGS: readonly GuestTag[] = ["vip", "recurrent"] as const;

export type GuestFlagLevel = "normal" | "watchlist" | "blacklist";

export type GuestProfileRow = {
  guest_id: string;
  stars_avg: number;
  flag_level: GuestFlagLevel;
  blacklist_reason: string | null;
  blacklisted_at: string | null;
  blacklisted_by: string | null;
  blacklisted_by_email: string | null;
  unblacklisted_at: string | null;
  unblacklisted_by: string | null;
  unblacklisted_by_email: string | null;
  manual_note: string | null;
  completed_stays: number;
  total_nights: number;
  last_stay_check_out: string | null;
  review_count: number;
  created_at: string;
  updated_at: string;
};

export type GuestBookingFlagSummary = Pick<
  GuestProfileRow,
  | "guest_id"
  | "stars_avg"
  | "flag_level"
  | "blacklist_reason"
  | "review_count"
  | "completed_stays"
  | "total_nights"
  | "last_stay_check_out"
  | "manual_note"
>;

export type GuestStayReviewRow = {
  booking_id: string;
  guest_id: string;
  stars: number;
  positive_note: string | null;
  negative_note: string | null;
  positive_stars: number | null;
  negative_stars: number | null;
  reviewed_at: string;
  reviewed_by: string | null;
  reviewed_by_email: string | null;
  updated_at: string;
};

export type GuestDocType = "ci" | "passport" | "foreign_id" | "other";
export type GuestIdentityStatus = "draft" | "partial" | "complete";
export type GuestSex = "M" | "F";
export type GuestNationalIdType = "cnp" | "idnp" | "egn" | "amka" | "szemelyi_szam";

export type GuestIdentityInput = {
  doc_type: GuestDocType | null;
  doc_series: string | null;
  doc_number: string | null;
  doc_issued_by: string | null;
  doc_issue_date: string | null;
  doc_expiry_date: string | null;
  national_id_type: GuestNationalIdType | null;
  national_id: string | null;
  /** @deprecated Use national_id with national_id_type='cnp' */
  cnp: string | null;
  birth_date: string | null;
  birth_place: string | null;
  nationality: string | null;
  address: string | null;
  city: string | null;
  county: string | null;
  country: string | null;
  sex: GuestSex | null;
};

export type GuestRow = {
  id: string;
  last_name: string;
  first_name: string;
  display_name: string;
  phone: string | null;
  phone_normalized: string | null;
  email: string | null;
  email_normalized: string | null;
  notes: string | null;
  tags: GuestTag[];
  profile: GuestProfileRow | null;
  created_at: string;
  updated_at: string;

  // Identity fields
  identity_status: GuestIdentityStatus;
  doc_type: GuestDocType | null;
  doc_series: string | null;
  doc_number: string | null;
  doc_issued_by: string | null;
  doc_issue_date: string | null;
  doc_expiry_date: string | null;
  national_id_type: GuestNationalIdType | null;
  national_id: string | null;
  /** @deprecated Use national_id with national_id_type='cnp' */
  cnp: string | null;
  birth_date: string | null;
  birth_place: string | null;
  nationality: string | null;
  address: string | null;
  city: string | null;
  county: string | null;
  country: string | null;
  sex: GuestSex | null;
};

export type GuestListItem = Pick<
  GuestRow,
  | "id"
  | "display_name"
  | "phone"
  | "email"
  | "tags"
  | "identity_status"
  | "created_at"
  | "updated_at"
> & {
  profile: GuestBookingFlagSummary | null;
  booking_count: number;
  last_stay_check_out: string | null;
};

export type GuestSearchFilter =
  | "all"
  | "recent"
  | "flagged"
  | "blacklist"
  | "watchlist"
  | "rated"
  | "unreviewed"
  | "returning";

export type GuestSearchResult = {
  items: GuestListItem[];
  query: string;
  filter: GuestSearchFilter;
  page: number;
  pageSize: number;
  hasMore: boolean;
  hasPrevious: boolean;
  mode: "highlights" | "results";
};

export type GuestHighlights = {
  blacklist: GuestListItem[];
  returning: GuestListItem[];
  rated: GuestListItem[];
  recent: GuestListItem[];
};

export type GuestBookingInput = {
  guest_last_name: string;
  guest_first_name: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
};
