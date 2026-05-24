export type GuestTag = "vip" | "recurrent";

export const GUEST_TAGS: readonly GuestTag[] = ["vip", "recurrent"] as const;

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
  booking_count: number;
  last_stay_check_out: string | null;
};

export type GuestBookingInput = {
  guest_last_name: string;
  guest_first_name: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
};
