"use server";

import { revalidatePath } from "next/cache";
import type { PlanId } from "@/core/config/plans";
import { runPlatformAdminAction } from "@/lib/platform-admin/platform-action";
import { logPlatformAdminActivity } from "@/lib/platform-admin/platform-activity-log";
import {
  isValidTenantSlug,
  slugifyTenantName,
} from "@/lib/platform-admin/tenant-slug";
import { provisionPlatformTenant } from "@/services/platform-provision";

export type ProvisionTenantActionResult =
  | { success: true; tenantId: string; slug: string }
  | { success: false; error: string };

export async function provisionTenantAction(input: {
  displayName: string;
  slug: string;
  ownerEmail: string;
  ownerPassword: string;
  locale: "ro" | "en" | "bg";
  country: "RO" | "MD" | "BG";
  planId?: PlanId;
}): Promise<ProvisionTenantActionResult> {
  const displayName = input.displayName.trim();
  const slugInput = input.slug.trim().toLowerCase();
  const slug = slugInput || slugifyTenantName(displayName);

  if (!isValidTenantSlug(slug)) {
    return {
      success: false,
      error: "Slug invalid (2-50 caractere, litere mici, cifre, cratime).",
    };
  }

  const run = await runPlatformAdminAction(async (session) => {
    const result = await provisionPlatformTenant({
      ...input,
      slug,
    });

    await logPlatformAdminActivity({
      tenantId: result.tenantId,
      actor: session,
      action: "platform.tenant_provisioned",
      summary: `Tenant provisionat: ${result.slug}`,
      metadata: {
        slug: result.slug,
        displayName,
        ownerEmail: input.ownerEmail.trim().toLowerCase(),
        planId: input.planId ?? "free",
      },
    });

    revalidatePath("/platform-admin");
    revalidatePath("/platform-admin/tenants");
    revalidatePath(`/platform-admin/tenants/${result.tenantId}`);

    return result;
  });

  if (!run.success) {
    return { success: false, error: run.error ?? "Provision esuat." };
  }
  if (!run.data) {
    return { success: false, error: "Provision esuat." };
  }

  return {
    success: true,
    tenantId: run.data.tenantId,
    slug: run.data.slug,
  };
}