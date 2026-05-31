"use server";

import { revalidatePath } from "next/cache";
import { PLAN_CONFIGS, type CoreFeature, type PlanId } from "@/core/config/plans";
import {
  allowedCustomRoutingKindsForPlan,
  type TenantDomainRoutingKind,
} from "@/lib/tenant/domain-routing";
import { platformDomainFromRequestHost } from "@/lib/tenant/host";
import { requireStaff } from "@/lib/auth/require-staff";
import { getActiveTenantIdForData } from "@/lib/tenant/active";
import {
  addCustomTenantDomain,
  markTenantDomainVerified,
  removeCustomTenantDomain,
} from "@/services/tenant-domains";
import { getTenantById } from "@/services/tenants";
import { headers } from "next/headers";

const DOMAIN_RE =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

function planHasFeature(planId: string, feature: CoreFeature): boolean {
  const plan = PLAN_CONFIGS[planId as PlanId];
  return plan?.coreFeatures.includes(feature) ?? false;
}

export async function addCustomDomainAction(formData: FormData) {
  const { role } = await requireStaff();
  if (role !== "admin") {
    return { ok: false as const, error: "admin_only" };
  }

  const tenantId = await getActiveTenantIdForData();
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    return { ok: false as const, error: "tenant_not_found" };
  }

  if (!planHasFeature(tenant.plan_id, "custom_domain")) {
    return { ok: false as const, error: "plan_not_allowed" };
  }

  const domain = String(formData.get("domain") ?? "")
    .toLowerCase()
    .trim();
  const routingKind = String(
    formData.get("routing_kind") ?? "custom_public"
  ) as TenantDomainRoutingKind;

  if (!DOMAIN_RE.test(domain)) {
    return { ok: false as const, error: "invalid_domain" };
  }

  const allowed = allowedCustomRoutingKindsForPlan(tenant.plan_id);
  if (!allowed.includes(routingKind)) {
    return { ok: false as const, error: "plan_not_allowed" };
  }

  const platform = platformDomainFromRequestHost(
    (await headers()).get("x-forwarded-host") ??
      (await headers()).get("host")
  );
  if (domain.endsWith(`.${platform}`) || domain === platform) {
    return { ok: false as const, error: "reserved_domain" };
  }

  try {
    await addCustomTenantDomain(tenantId, domain, routingKind);
    revalidatePath("/admin/settings/domains");
    return { ok: true as const };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "error";
    if (msg.includes("already registered")) {
      return { ok: false as const, error: "domain_taken" };
    }
    return { ok: false as const, error: "error" };
  }
}

export async function verifyCustomDomainAction(formData: FormData) {
  const { role } = await requireStaff();
  if (role !== "admin") {
    return { ok: false as const, error: "admin_only" };
  }

  const domainId = String(formData.get("domain_id") ?? "");
  const tenantId = await getActiveTenantIdForData();

  try {
    await markTenantDomainVerified(domainId, tenantId);
    revalidatePath("/admin/settings/domains");
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "error" };
  }
}

export async function removeCustomDomainAction(formData: FormData) {
  const { role } = await requireStaff();
  if (role !== "admin") {
    return { ok: false as const, error: "admin_only" };
  }

  const domainId = String(formData.get("domain_id") ?? "");
  const tenantId = await getActiveTenantIdForData();

  try {
    await removeCustomTenantDomain(domainId, tenantId);
    revalidatePath("/admin/settings/domains");
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "error" };
  }
}
