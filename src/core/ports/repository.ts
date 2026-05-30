/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  REZOVA — Core Repository Ports (Hexagonal Architecture)       ║
 * ║                                                                ║
 * ║  These interfaces define HOW data is accessed, not WHERE.      ║
 * ║  Implementations live in adapters/:                            ║
 * ║    • adapters/supabase/  → Cloud mode (Supabase PostgreSQL)    ║
 * ║    • adapters/sqlite/    → Local mode  (SQLite + Google Drive) ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

// ─── Shared primitives ───────────────────────────────────────────
export type ID = string;
export type ISODate = string;   // "YYYY-MM-DD"
export type ISODateTime = string; // "YYYY-MM-DDTHH:mm:ss.sssZ"

export type QueryResult<T> = {
  data: T;
  error: string | null;
};

export type MutationResult = {
  success: boolean;
  error: string | null;
};

export type PaginationOpts = {
  offset?: number;
  limit?: number;
};

export type SortOpts = {
  column: string;
  ascending?: boolean;
};

// ─── Building ────────────────────────────────────────────────────
export interface BuildingRecord {
  id: ID;
  name: string;
  sort_order: number;
  color_hex: string | null;
  ac_mode: "all_rooms" | "none" | "per_room";
  is_active: boolean;
  default_price_per_night: number;
}

export interface IBuildingRepository {
  list(): Promise<QueryResult<BuildingRecord[]>>;
  getById(id: ID): Promise<QueryResult<BuildingRecord | null>>;
  create(input: Omit<BuildingRecord, "id">): Promise<QueryResult<{ id: ID }>>;
  update(id: ID, input: Partial<BuildingRecord>): Promise<MutationResult>;
  delete(id: ID): Promise<MutationResult>;
}

// ─── Room ────────────────────────────────────────────────────────
export interface RoomRecord {
  id: ID;
  building_id: ID;
  floor_id: ID | null;
  name: string;
  room_type: string;
  capacity_base: number;
  allows_extra_beds: boolean;
  max_extra_beds_per_room: number;
  has_ac: boolean;
  price_per_night: number;
  is_active: boolean;
  sort_order: number;
}

export interface IRoomRepository {
  listActive(): Promise<QueryResult<RoomRecord[]>>;
  listByBuilding(buildingId: ID): Promise<QueryResult<RoomRecord[]>>;
  getById(id: ID): Promise<QueryResult<RoomRecord | null>>;
  create(input: Omit<RoomRecord, "id">): Promise<QueryResult<{ id: ID }>>;
  update(id: ID, input: Partial<RoomRecord>): Promise<MutationResult>;
  delete(id: ID): Promise<MutationResult>;
}

// ─── Guest ───────────────────────────────────────────────────────
export interface GuestRecord {
  id: ID;
  last_name: string;
  first_name: string;
  display_name: string;
  phone: string | null;
  phone_normalized: string | null;
  email: string | null;
  email_normalized: string | null;
  notes: string | null;
  tags: string[];
  identity_status: "draft" | "partial" | "verified";
  doc_type: string | null;
  national_id_type: string | null;
  national_id: string | null;
  nationality: string | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface GuestSearchOpts {
  query?: string;
  filter?: "all" | "flagged" | "vip" | "returning";
  pagination?: PaginationOpts;
  sort?: SortOpts;
}

export interface IGuestRepository {
  search(opts: GuestSearchOpts): Promise<QueryResult<GuestRecord[]>>;
  getById(id: ID): Promise<QueryResult<GuestRecord | null>>;
  create(input: Omit<GuestRecord, "id" | "created_at" | "updated_at">): Promise<QueryResult<{ id: ID }>>;
  update(id: ID, input: Partial<GuestRecord>): Promise<MutationResult>;
  merge(keepId: ID, mergeId: ID): Promise<MutationResult>;
  delete(id: ID): Promise<MutationResult>;
}

// ─── Booking ─────────────────────────────────────────────────────
export type BookingStatusValue =
  | "neconfirmata"
  | "confirmata"
  | "cazata"
  | "finalizata"
  | "anulata";

export interface BookingRecord {
  id: ID;
  check_in: ISODate;
  check_out: ISODate;
  status: BookingStatusValue;
  guest_name: string;
  guest_last_name: string | null;
  guest_first_name: string | null;
  guest_email: string;
  guest_phone: string | null;
  guest_id: ID | null;
  num_adults: number;
  num_children: number;
  total_price: number | null;
  room_ids: ID[];
  actual_check_in_at: ISODateTime | null;
  actual_check_out_at: ISODateTime | null;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface BookingSearchOpts {
  status?: BookingStatusValue[];
  dateRange?: { from: ISODate; to: ISODate };
  roomIds?: ID[];
  guestId?: ID;
  pagination?: PaginationOpts;
  sort?: SortOpts;
}

export interface IBookingRepository {
  list(opts: BookingSearchOpts): Promise<QueryResult<BookingRecord[]>>;
  getById(id: ID): Promise<QueryResult<BookingRecord | null>>;
  create(input: Omit<BookingRecord, "id" | "created_at" | "updated_at">): Promise<QueryResult<{ id: ID }>>;
  updateStatus(id: ID, status: BookingStatusValue): Promise<MutationResult>;
  update(id: ID, input: Partial<BookingRecord>): Promise<MutationResult>;
  delete(id: ID): Promise<MutationResult>;
}

// ─── Pension Settings ────────────────────────────────────────────
export interface PensionSettingsRecord {
  id: ID;
  display_name: string;
  default_check_in_time: string;   // "HH:mm"
  default_check_out_time: string;  // "HH:mm"
  total_extra_beds_max: number;
  admin_palette_key: string;
  admin_day_night: "day" | "night";
}

export interface IPensionSettingsRepository {
  get(): Promise<QueryResult<PensionSettingsRecord | null>>;
  update(id: ID, input: Partial<PensionSettingsRecord>): Promise<MutationResult>;
}

// ─── Activity Log ────────────────────────────────────────────────
export interface ActivityRecord {
  id: ID;
  action: string;
  entity_type: string;
  entity_id: ID | null;
  actor_email: string;
  details: Record<string, unknown> | null;
  created_at: ISODateTime;
}

export interface IActivityLogRepository {
  log(entry: Omit<ActivityRecord, "id" | "created_at">): Promise<MutationResult>;
  list(opts: { limit?: number; entityType?: string }): Promise<QueryResult<ActivityRecord[]>>;
}

// ─── Floor ───────────────────────────────────────────────────────
export interface FloorRecord {
  id: ID;
  building_id: ID;
  name: string;
  level_number: number | null;
  sort_order: number;
  is_active: boolean;
}

export interface IFloorRepository {
  listByBuilding(buildingId: ID): Promise<QueryResult<FloorRecord[]>>;
  create(input: Omit<FloorRecord, "id">): Promise<QueryResult<{ id: ID }>>;
  update(id: ID, input: Partial<FloorRecord>): Promise<MutationResult>;
  delete(id: ID): Promise<MutationResult>;
}

// ─── Aggregate Data Provider ─────────────────────────────────────
/**
 * Single entry point for all data operations.
 * Cloud mode → SupabaseDataProvider
 * Local mode → SQLiteDataProvider
 */
export interface IDataProvider {
  buildings: IBuildingRepository;
  rooms: IRoomRepository;
  guests: IGuestRepository;
  bookings: IBookingRepository;
  settings: IPensionSettingsRepository;
  activityLog: IActivityLogRepository;
  floors: IFloorRepository;
}
