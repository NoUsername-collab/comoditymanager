import type { ActivityAction } from "./types";

const ACTION_LABELS: Record<ActivityAction, string> = {
  "booking.request_created": "Cerere nouă (site)",
  "booking.confirmed": "Rezervare confirmată",
  "booking.cancelled": "Rezervare anulată",
  "booking.shifted": "Rezervare mutată",
  "booking.room_moved": "Mutare cameră (split)",
  "booking.rebooked": "Rebook client",
  "booking.flagged": "Rezervare marcată cu alertă",
  "booking.checkin.set": "Check-in recepție",
  "booking.checkin.undo": "Check-in anulat",
  "booking.checkout.set": "Check-out recepție",
  "booking.checkout.undo": "Check-out anulat",
  "guest.created": "Client nou",
  "guest.updated": "Profil client actualizat",
  "guest.merged": "Profiluri combinate",
  "guest.reviewed": "Review sejur client",
  "guest.flagged": "Client pus sub observație",
  "guest.blacklisted": "Client trecut în blacklist",
  "guest.unblacklisted": "Client scos din blacklist",
  "guest.adjusted": "Scor client ajustat",
  "building.created": "Clădire adăugată",
  "building.deleted": "Clădire ștearsă",
  "building.price_updated": "Preț implicit clădire",
  "floor.created": "Etaj adăugat",
  "room.created": "Cameră adăugată",
  "room.updated": "Cameră actualizată",
  "room.deleted": "Cameră ștearsă",
  "settings.updated": "Setări pensiune",
  "settings.appearance_updated": "Temă panou",
  "settings.operational_updated": "Setări operaționale",
  "location_admin.unlocked": "Administrare locație deblocată",
  "location_admin.locked": "Administrare locație închisă",
  "staff.password_changed": "Parolă staff schimbată",
  "auth.login": "Autentificare",
  "auth.logout": "Deconectare",
};

export function activityActionLabel(action: ActivityAction): string {
  return ACTION_LABELS[action] ?? action;
}
