export type GuestTag = "vip" | "recurrent";

export const GUEST_TAGS: readonly GuestTag[] = ["vip", "recurrent"] as const;

export type GuestPositiveTrait =
  | "voios"
  | "glumet"
  | "linistit"
  | "miezul_serii"
  | "respectuos"
  | "ingrijit"
  | "plateste_la_timp"
  | "recomandat";

export type GuestNegativeTrait =
  | "betiv"
  | "galagios"
  | "recalcitrant"
  | "scandalagiu"
  | "cleptoman"
  | "nesimtit"
  | "zgomotos"
  | "mizerie"
  | "conflictual"
  | "neplata"
  | "pagube"
  | "incalca_reguli";

export type GuestFlagLevel = "normal" | "watchlist" | "blacklist";

export type GuestProfileRow = {
  guest_id: string;
  trust_score: number;
  loyalty_score: number;
  stars_avg: number;
  manual_positive_traits: GuestPositiveTrait[];
  manual_negative_traits: GuestNegativeTrait[];
  positive_traits: GuestPositiveTrait[];
  negative_traits: GuestNegativeTrait[];
  flag_level: GuestFlagLevel;
  blacklist_reason: string | null;
  blacklisted_at: string | null;
  blacklisted_by: string | null;
  blacklisted_by_email: string | null;
  unblacklisted_at: string | null;
  unblacklisted_by: string | null;
  unblacklisted_by_email: string | null;
  manual_trust_adjustment: number;
  manual_loyalty_adjustment: number;
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
  | "trust_score"
  | "loyalty_score"
  | "stars_avg"
  | "manual_positive_traits"
  | "manual_negative_traits"
  | "positive_traits"
  | "negative_traits"
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
  positive_traits: GuestPositiveTrait[];
  negative_traits: GuestNegativeTrait[];
  problem_details: string | null;
  trust_delta: number;
  loyalty_delta: number;
  reviewed_at: string;
  reviewed_by: string | null;
  reviewed_by_email: string | null;
  updated_at: string;
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
};

export type GuestListItem = Pick<
  GuestRow,
  | "id"
  | "display_name"
  | "phone"
  | "email"
  | "tags"
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
  | "loyal";

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
  loyal: GuestListItem[];
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
