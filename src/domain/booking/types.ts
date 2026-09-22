/** Business types — no Supabase dependency (easy to test / move). */

export type BookingStatus = "cerere_noua" | "confirmata" | "anulata";

export interface DateRange {
  checkIn: string; // ISO date YYYY-MM-DD
  checkOut: string;
}
