"use server";

import { revalidatePath } from "next/cache";
import { runPlatformAdminAction } from "@/lib/hospira-admin/platform-action";

const PLATFORM_ADMIN_PATHS = [
  "/hospira-admin",
  "/hospira-admin/tenants",
  "/hospira-admin/logs",
  "/hospira-admin/tools",
] as const;

type RevalidateResult = { success: boolean; paths?: string[]; error?: string };

/** Revalidate cached platform admin pages (dashboard, tenants, logs). */
export async function revalidatePlatformAdminCacheAction(): Promise<RevalidateResult> {
  const run = await runPlatformAdminAction(async () => {
    for (const path of PLATFORM_ADMIN_PATHS) {
      revalidatePath(path, "layout");
    }
    return [...PLATFORM_ADMIN_PATHS];
  });

  if (!run.success) {
    return { success: false, error: run.error };
  }
  return { success: true, paths: run.data };
}
