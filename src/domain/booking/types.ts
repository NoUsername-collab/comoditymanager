/** Tipuri business — fără dependență de Supabase (ușor de testat / mutat) */

export type BookingStatus = "cerere_noua" | "confirmata" | "anulata";

export interface DateRange {
  checkIn: string; // ISO date YYYY-MM-DD
  checkOut: string;
}
