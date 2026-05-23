"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { updatePensionSettings } from "@/services/pension-settings";
import { logAdminActivityFromSession } from "@/services/activity-log";

export async function updateSettingsAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const display_name = String(formData.get("display_name") ?? "");
  const default_check_in_time = String(formData.get("default_check_in_time") ?? "14:00");
  const default_check_out_time = String(formData.get("default_check_out_time") ?? "11:00");
  const total_extra_beds_max = Number(formData.get("total_extra_beds_max") ?? 0);
  const admin_palette_source = String(
    formData.get("admin_palette_source") ?? "catalog"
  ) as "catalog" | "season_auto" | "season_manual";
  const admin_palette_key = String(formData.get("admin_palette_key") ?? "pension");
  const admin_day_night = String(formData.get("admin_day_night") ?? "night") as
    | "day"
    | "night";

  if (!id) throw new Error("Setările pensiunii nu sunt configurate");

  await updatePensionSettings(id, {
    display_name,
    default_check_in_time,
    default_check_out_time,
    total_extra_beds_max,
    admin_palette_source,
    admin_palette_key,
    admin_day_night,
  });

  await logAdminActivityFromSession({
    action: "settings.updated",
    entityType: "settings",
    entityId: id,
    summary: `Setări: ${display_name}`,
    metadata: {
      default_check_in_time,
      default_check_out_time,
      total_extra_beds_max,
      admin_palette_source,
      admin_palette_key,
      admin_day_night,
    },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/");
  redirect("/admin/settings?saved=1");
}
