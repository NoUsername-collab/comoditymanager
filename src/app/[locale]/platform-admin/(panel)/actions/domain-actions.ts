"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { runPlatformAdminAction } from "@/lib/platform-admin/platform-action";
import { logPlatformAdminActivity } from "@/lib/platform-admin/platform-activity-log";
import type { TenantDomainRoutingKind } from "@/lib/tenant/domain-routing";
import { getPlatformTenantById } from "@/services/platform-admin";
import {
  addCustomTenantDomain,
  markTenantDomainVerified,
  removeCustomTenantDomain,
} from "@/services/tenant-domains";

type DomainActionResult = { success: boolean; error?: string };

const DOMAIN_RE =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

function domainsCacheTag(tenantId: string): string {
  return `tenant-${tenantId}-domains`;
}

export async function platformAddTenantDomainAction(
  tenantId: string,
  domain: string,
  routingKind: TenantDomainRoutingKind = "custom_public"
): Promise<DomainActionResult> {
  const normalized = domain.toLowerCase().trim();
  if (!tenantId?.trim()) {
    return { success: false, error: "Tenant invalid." };
  }
  if (!DOMAIN_RE.test(normalized)) {
    return { success: false, error: "Domeniu invalid." };
  }

  const run = await runPlatformAdminAction(async (session) => {
    const tenant = await getPlatformTenantById(tenantId);
    if (!tenant) {
      throw new Error("Tenant negasit.");
    }

    const domainId = await addCustomTenantDomain(
      tenantId,
      normalized,
      routingKind
    );

    revalidateTag(domainsCacheTag(tenantId), "max");
    revalidatePath(`/platform-admin/tenants/${tenantId}`);

    await logPlatformAdminActivity({
      tenantId,
      actor: session,
      action: "platform.tenant_domain_added",
      entityId: domainId,
      summary: `Domeniu adaugat: ${normalized} (${routingKind})`,
      metadata: { domain: normalized, routingKind },
    });

    return true;
  });

  if (!run.success) {
    return { success: false, error: run.error };
  }
  return { success: true };
}

export async function platformRemoveTenantDomainAction(
  tenantId: string,
  domainId: string
): Promise<DomainActionResult> {
  if (!tenantId?.trim() || !domainId?.trim()) {
    return { success: false, error: "Date invalide." };
  }

  const run = await runPlatformAdminAction(async (session) => {
    const tenant = await getPlatformTenantById(tenantId);
    if (!tenant) {
      throw new Error("Tenant negasit.");
    }

    await removeCustomTenantDomain(domainId, tenantId);

    revalidateTag(domainsCacheTag(tenantId), "max");
    revalidatePath(`/platform-admin/tenants/${tenantId}`);

    await logPlatformAdminActivity({
      tenantId,
      actor: session,
      action: "platform.tenant_domain_removed",
      entityId: domainId,
      summary: `Domeniu sters (id ${domainId})`,
      metadata: { domainId },
    });

    return true;
  });

  if (!run.success) {
    return { success: false, error: run.error };
  }
  return { success: true };
}

export async function platformVerifyTenantDomainAction(
  tenantId: string,
  domainId: string
): Promise<DomainActionResult> {
  if (!tenantId?.trim() || !domainId?.trim()) {
    return { success: false, error: "Date invalide." };
  }

  const run = await runPlatformAdminAction(async (session) => {
    const tenant = await getPlatformTenantById(tenantId);
    if (!tenant) {
      throw new Error("Tenant negasit.");
    }

    await markTenantDomainVerified(domainId, tenantId);

    revalidateTag(domainsCacheTag(tenantId), "max");
    revalidatePath(`/platform-admin/tenants/${tenantId}`);

    await logPlatformAdminActivity({
      tenantId,
      actor: session,
      action: "platform.tenant_domain_verified",
      entityId: domainId,
      summary: `Domeniu marcat verificat (id ${domainId})`,
      metadata: { domainId },
    });

    return true;
  });

  if (!run.success) {
    return { success: false, error: run.error };
  }
  return { success: true };
}
