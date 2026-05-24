import type { ActivityAction } from "./types";

const ACTION_LABELS: Record<ActivityAction, string> = {
  "booking.request_created": "Cerere nouă (site)",
  "booking.confirmed": "Rezervare confirmată",
  "booking.cancelled": "Rezervare anulată",
  "booking.shifted": "Rezervare mutată",
  "booking.room_moved": "Mutare cameră (split)",
  "booking.rebooked": "Rebook client",
  "guest.created": "Client nou",
  "guest.updated": "Profil client actualizat",
  "guest.merged": "Profiluri combinate",
  "building.created": "Clădire adăugată",
  "building.deleted": "Clădire ștearsă",
  "building.price_updated": "Preț implicit clădire",
  "floor.created": "Etaj adăugat",
  "room.created": "Cameră adăugată",
  "room.updated": "Cameră actualizată",
  "room.deleted": "Cameră ștearsă",
  "settings.updated": "Setări pensiune",
  "auth.login": "Autentificare",
  "auth.logout": "Deconectare",
};

export function activityActionLabel(action: ActivityAction): string {
  return ACTION_LABELS[action] ?? action;
}
