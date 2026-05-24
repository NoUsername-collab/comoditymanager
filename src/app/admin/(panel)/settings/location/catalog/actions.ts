"use server";

import { revalidatePath } from "next/cache";
import { requireLocationAdmin } from "@/lib/auth/require-staff";
import {
  createRoomOption,
  createRoomType,
  updateRoomOption,
  updateRoomType,
} from "@/services/room-catalog";
import { logAdminActivityFromSession } from "@/services/activity-log";

export async function createRoomTypeAction(formData: FormData) {
  await requireLocationAdmin();
  const name = String(formData.get("name") ?? "");
  const capacity_base = Number(formData.get("capacity_base") ?? 2);
  const base_price_per_night = Number(formData.get("base_price_per_night") ?? 0);
  const sort_order = Number(formData.get("sort_order") ?? 0);
  const default_option_ids = formData.getAll("default_option_ids").map(String);

  if (!name.trim()) throw new Error("Numele tipului e obligatoriu");

  const created = await createRoomType({
    name,
    capacity_base,
    base_price_per_night,
    sort_order,
    default_option_ids,
  });

  await logAdminActivityFromSession({
    action: "settings.operational_updated",
    entityType: "settings",
    entityId: created.id,
    summary: `Tip cameră nou: ${name}`,
  });

  revalidatePath("/admin/settings/location");
  revalidatePath("/admin/rooms");
}

export async function updateRoomTypeAction(formData: FormData) {
  await requireLocationAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "");
  const capacity_base = Number(formData.get("capacity_base") ?? 2);
  const base_price_per_night = Number(formData.get("base_price_per_night") ?? 0);
  const sort_order = Number(formData.get("sort_order") ?? 0);
  const is_active = formData.get("is_active") === "on";
  const default_option_ids = formData.getAll("default_option_ids").map(String);

  if (!id) throw new Error("ID lipsă");

  await updateRoomType(id, {
    name,
    capacity_base,
    base_price_per_night,
    sort_order,
    is_active,
    default_option_ids,
  });

  revalidatePath("/admin/settings/location");
  revalidatePath("/admin/rooms");
}

export async function createRoomOptionAction(formData: FormData) {
  await requireLocationAdmin();
  const name = String(formData.get("name") ?? "");
  const description = String(formData.get("description") ?? "");
  const price_per_night_addon = Number(formData.get("price_per_night_addon") ?? 0);
  const sort_order = Number(formData.get("sort_order") ?? 0);

  if (!name.trim()) throw new Error("Numele opțiunii e obligatoriu");

  await createRoomOption({
    name,
    description,
    price_per_night_addon,
    sort_order,
  });

  revalidatePath("/admin/settings/location");
  revalidatePath("/admin/rooms");
}

export async function updateRoomOptionAction(formData: FormData) {
  await requireLocationAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "");
  const description = String(formData.get("description") ?? "");
  const price_per_night_addon = Number(formData.get("price_per_night_addon") ?? 0);
  const sort_order = Number(formData.get("sort_order") ?? 0);
  const is_active = formData.get("is_active") === "on";

  if (!id) throw new Error("ID lipsă");

  await updateRoomOption(id, {
    name,
    description,
    price_per_night_addon,
    sort_order,
    is_active,
  });

  revalidatePath("/admin/settings/location");
  revalidatePath("/admin/rooms");
}
