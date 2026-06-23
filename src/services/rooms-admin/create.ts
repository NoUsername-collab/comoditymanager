import {
  calculatePriceFromCatalog,
  getBuildingOptionPolicies,
  getRoomEnabledOptionIds,
  hasAcFromOptions,
  listRoomOptions,
  listRoomTypes,
  setRoomEnabledOptions,
} from "@/services/room-catalog";
import {
  buildBulkRoomNames,
  findDuplicateRoomNames,
  type BulkNamingMode,
} from "@/domain/room/bulk-names";
import { legacyRoomTypeFromCatalogSlug } from "@/domain/room/legacy-room-type";
import { withTenantId } from "@/lib/tenant/scope";

import {
  assertFloorInBuilding,
  requireBuildingInTenant,
  type CreateRoomInput,
} from "./shared";
import { listRoomNamesInScope } from "./list";

async function resolveRoomInsertFields(input: CreateRoomInput) {
  const [types, options, policies] = await Promise.all([
    listRoomTypes(),
    listRoomOptions(),
    getBuildingOptionPolicies(input.building_id),
  ]);
  const type = input.room_type_definition_id
    ? types.find((t) => t.id === input.room_type_definition_id) ?? null
    : null;

  const price =
    input.price_per_night > 0
      ? input.price_per_night
      : calculatePriceFromCatalog({
          type,
          buildingDefaultPrice: input.building_default_price ?? 0,
          options,
          policies,
          typeDefaultOptionIds: type?.default_option_ids ?? [],
          selectedOptionIds: input.enabled_option_ids,
        });

  const capacity = type?.capacity_base ?? input.capacity_base;
  const room_type = legacyRoomTypeFromCatalogSlug(type?.slug);
  const has_ac = hasAcFromOptions(options, input.enabled_option_ids);

  return { type, price, capacity, room_type, has_ac, options };
}

type ResolvedRoomInsertFields = Awaited<ReturnType<typeof resolveRoomInsertFields>>;

async function insertRoomRow(
  tenantId: string,
  supabase: Awaited<ReturnType<typeof requireBuildingInTenant>>["supabase"],
  input: CreateRoomInput,
  fields: ResolvedRoomInsertFields
): Promise<{ id: string }> {
  const { type, price, capacity, room_type, has_ac } = fields;
  const { data, error } = await supabase
    .from("rooms")
    .insert(
      withTenantId(tenantId, {
        building_id: input.building_id,
        floor_id: input.floor_id || null,
        name: input.name.trim(),
        room_type,
        room_type_definition_id: type?.id ?? null,
        capacity_base: capacity,
        allows_extra_beds: input.allows_extra_beds,
        max_extra_beds_per_room: input.allows_extra_beds
          ? input.max_extra_beds_per_room
          : 0,
        has_ac,
        price_per_night: price,
        sort_order: input.sort_order,
        is_active: true,
      })
    )
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await setRoomEnabledOptions(data.id, input.enabled_option_ids);
  return { id: data.id };
}

async function assertRoomNameAvailable(
  buildingId: string,
  floorId: string | null,
  name: string
): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("rooms.name_required");
  const existing = await listRoomNamesInScope(buildingId, floorId);
  const conflicts = findDuplicateRoomNames(existing, [trimmed]);
  if (conflicts.length > 0) {
    throw new Error(`rooms.duplicate_name:${trimmed}`);
  }
}

export async function createRoom(input: CreateRoomInput): Promise<{ id: string }> {
  const [fields, { tenantId, supabase }] = await Promise.all([
    Promise.all([
      resolveRoomInsertFields(input),
      assertFloorInBuilding(input.building_id, input.floor_id),
      assertRoomNameAvailable(input.building_id, input.floor_id, input.name),
    ]).then(([resolved]) => resolved),
    requireBuildingInTenant(input.building_id),
  ]);

  return insertRoomRow(tenantId, supabase, input, fields);
}

export async function createRoomsBulk(input: {
  building_id: string;
  floor_id: string | null;
  room_type_definition_id: string;
  count: number;
  name_prefix: string;
  start_number: number;
  naming_mode: BulkNamingMode;
  allows_extra_beds: boolean;
  max_extra_beds_per_room: number;
  enabled_option_ids: string[];
  price_per_night: number;
  sort_order_start: number;
  building_default_price?: number;
}): Promise<{ ids: string[] }> {
  if (input.count < 1 || input.count > 50) {
    throw new Error("rooms.bulk_count_must_be_between_1_and_50");
  }

  const proposedNames = buildBulkRoomNames(
    input.naming_mode,
    input.name_prefix,
    input.start_number,
    input.count
  );
  if (proposedNames.length !== input.count) {
    throw new Error("rooms.bulk_invalid_names");
  }

  const [, existing] = await Promise.all([
    assertFloorInBuilding(input.building_id, input.floor_id),
    listRoomNamesInScope(input.building_id, input.floor_id),
  ]);
  const conflicts = findDuplicateRoomNames(existing, proposedNames);
  if (conflicts.length > 0) {
    throw new Error(
      `rooms.bulk_duplicate_names:${conflicts.slice(0, 12).join("|")}`
    );
  }

  const templateInput: CreateRoomInput = {
    building_id: input.building_id,
    floor_id: input.floor_id,
    name: proposedNames[0]!,
    room_type_definition_id: input.room_type_definition_id,
    capacity_base: 2,
    allows_extra_beds: input.allows_extra_beds,
    max_extra_beds_per_room: input.max_extra_beds_per_room,
    enabled_option_ids: input.enabled_option_ids,
    price_per_night: input.price_per_night,
    sort_order: input.sort_order_start,
    building_default_price: input.building_default_price,
  };

  const [fields, { tenantId, supabase }] = await Promise.all([
    resolveRoomInsertFields(templateInput),
    requireBuildingInTenant(input.building_id),
  ]);

  const ids: string[] = [];
  for (let i = 0; i < input.count; i++) {
    const name = proposedNames[i]!;
    const room = await insertRoomRow(
      tenantId,
      supabase,
      {
        ...templateInput,
        name,
        sort_order: input.sort_order_start + i,
      },
      fields
    );
    ids.push(room.id);
  }
  return { ids };
}
