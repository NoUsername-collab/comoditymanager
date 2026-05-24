export type ActivityEntityType =
  | "booking"
  | "building"
  | "room"
  | "floor"
  | "settings"
  | "session"
  | "pension"
  | "guest";

export type ActivityAction =
  | "booking.request_created"
  | "booking.confirmed"
  | "booking.cancelled"
  | "booking.shifted"
  | "booking.room_moved"
  | "booking.rebooked"
  | "guest.created"
  | "guest.updated"
  | "guest.merged"
  | "building.created"
  | "building.deleted"
  | "building.price_updated"
  | "floor.created"
  | "room.created"
  | "room.updated"
  | "room.deleted"
  | "settings.updated"
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
};
