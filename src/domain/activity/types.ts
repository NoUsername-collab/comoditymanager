export type ActivityEntityType =
  | "booking"
  | "building"
  | "checkin"
  | "room"
  | "floor"
  | "settings"
  | "session"
  | "pension"
  | "guest"
  | "staff";

export type ActivityAction =
  | "booking.request_created"
  | "booking.confirmed"
  | "booking.cancelled"
  | "booking.shifted"
  | "booking.room_moved"
  | "booking.rebooked"
  | "booking.flagged"
  | "booking.holder_reassigned"
  | "booking.checkin.set"
  | "booking.checkin.undo"
  | "booking.checkout.set"
  | "booking.checkout.undo"
  | "booking.dates_edited"
  | "invoice.issued"
  | "checkin.created"
  | "checkin.updated"
  | "occupancy.hold_created"
  | "occupancy.block_created"
  | "activity.undone"
  | "guest.created"
  | "guest.updated"
  | "guest.identity_updated"
  | "guest.merged"
  | "guest.reviewed"
  | "guest.flagged"
  | "guest.blacklisted"
  | "guest.unblacklisted"
  | "guest.adjusted"
  | "building.created"
  | "building.updated"
  | "building.deleted"
  | "building.price_updated"
  | "floor.created"
  | "floor.updated"
  | "floor.deleted"
  | "room.created"
  | "room.updated"
  | "room.deleted"
  | "settings.updated"
  | "settings.appearance_updated"
  | "settings.operational_updated"
  | "settings.public_site_updated"
  | "settings.guest_app_updated"
  | "settings.booking_rules_updated"
  | "location_admin.unlocked"
  | "location_admin.locked"
  | "staff.password_changed"
  | "staff.invited"
  | "staff.role_changed"
  | "staff.deactivated"
  | "staff.reactivated"
  | "auth.login"
  | "auth.logout";

export type ActivityLogEntry = {
  id: string;
  created_at: string;
  actor_id: string | null;
  actor_email: string | null;
  action: ActivityAction;
  entity_type: ActivityEntityType;
  entity_id: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  undoable: boolean;
  undone_at: string | null;
  undone_by: string | null;
  reverts_log_id: string | null;
};
