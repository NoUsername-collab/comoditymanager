import { revalidateTag } from "next/cache";
import { CACHE_TAGS, tenantTag } from "@/lib/cache-tags";

const legacyTenantSettingsTag = (tenantId: string) => `tenant-${tenantId}-settings`;

/** Bust this tenant's pension/email/booking-rules caches without touching other tenants. */
export function bustPensionSettingsCache(tenantId: string) {
  revalidateTag(tenantTag(tenantId, CACHE_TAGS.pensionSettings), "max");
  revalidateTag(legacyTenantSettingsTag(tenantId), "max");
}
