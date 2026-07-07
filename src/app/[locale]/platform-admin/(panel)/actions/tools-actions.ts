"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { runPlatformAdminAction } from "@/lib/platform-admin/platform-action";
import { tenantsToCsv } from "@/lib/platform-admin/tenant-csv";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";
import { buildTenantSiteUrl } from "@/lib/tenant/host";
import { createPublicAdminClient } from "@/lib/supabase/admin";
import {
  getPlatformTenantById,
  listAllTenants,
} from "@/services/platform-admin";

type ActionResult<T = void> = { success: boolean; error?: string; data?: T };

const TENANT_CACHE_TAGS: (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS][] = [
  CACHE_TAGS.pensionSettings,
  CACHE_TAGS.buildings,
  CACHE_TAGS.rooms,
  CACHE_TAGS.roomCatalog,
  CACHE_TAGS.roomOptionsByRoom,
  CACHE_TAGS.bookingCounts,
  CACHE_TAGS.checkins,
  CACHE_TAGS.publicSite,
];

/** Export all tenants as CSV for platform operators. */
export async function exportTenantsCsvAction(): Promise<
  ActionResult<{ csv: string; filename: string }>
> {
  const run = await runPlatformAdminAction(async () => {
    const tenants = await listAllTenants();
    const csv = tenantsToCsv(tenants);
    const date = new Date().toISOString().slice(0, 10);
    return { csv, filename: `platform-tenants-${date}.csv` };
  });

  if (!run.success) {
    return { success: false, error: run.error };
  }
  return { success: true, data: run.data };
}

/** Bust all tenant-scoped cache tags for one tenant. */
export async function revalidateTenantCacheAction(
  tenantId: string
): Promise<ActionResult> {
  if (!tenantId?.trim()) {
    return { success: false, error: "Tenant invalid." };
  }

  const run = await runPlatformAdminAction(async () => {
    const tenant = await getPlatformTenantById(tenantId);
    if (!tenant) {
      throw new Error("Tenant negăsit.");
    }

    for (const tag of TENANT_CACHE_TAGS) {
      revalidateTag(tenantTag(tenantId, tag), "max");
    }
    revalidateTag(`tenant-id-${tenantId}`, "max");
    revalidatePath(`/platform-admin/tenants/${tenantId}`);

    return true;
  });

  if (!run.success) {
    return { success: false, error: run.error };
  }
  return { success: true };
}

/** Generate a one-time magic login link for the tenant owner (Supabase admin API). */
export async function generateOwnerMagicLinkAction(
  tenantId: string
): Promise<ActionResult<{ link: string }>> {
  if (!tenantId?.trim()) {
    return { success: false, error: "Tenant invalid." };
  }

  const run = await runPlatformAdminAction(async () => {
    const tenant = await getPlatformTenantById(tenantId);
    if (!tenant) {
      throw new Error("Tenant negăsit.");
    }
    const email = tenant.owner_email?.trim();
    if (!email) {
      throw new Error("Tenantul nu are email proprietar.");
    }

    const supabase = createPublicAdminClient();
    const redirectTo = `${buildTenantSiteUrl(tenant.slug)}/admin`;

    const { data, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });

    if (error) {
      throw new Error(error.message);
    }

    const link = data.properties?.action_link;
    if (!link) {
      throw new Error("Link magic negenerat.");
    }

    return { link };
  });

  if (!run.success) {
    return { success: false, error: run.error };
  }
  return { success: true, data: run.data };
}
