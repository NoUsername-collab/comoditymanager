export const GUEST_MATCH_PRIORITY = [
  "phone_email",
  "phone",
  "email",
  "name",
] as const;

export type GuestMatchPriority = (typeof GUEST_MATCH_PRIORITY)[number];

export const GUEST_SEARCH_SORT = {
  flaggedFirst: true,
  thenUpdatedAtDesc: true,
} as const;
