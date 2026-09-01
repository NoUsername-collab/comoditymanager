import { getBookingRulesSettings } from "@/services/booking-rules-settings";
import {
  DEFAULT_CHECKIN_SETTINGS,
  getCheckinSettings,
} from "@/services/checkin";
import { isFactoryResetEnabled } from "@/services/database-reset";
import { resolveTransactionalEmailIdentity } from "@/services/email-identity";
import {
  DEFAULT_EMAIL_SETTINGS,
  getEmailSettings,
} from "@/services/email-settings";
import { ensureGuestAppSettingsRow } from "@/services/guest-app/mutations";
import { listLocationStructure } from "@/services/location-structure";
import { getPensionIdentity } from "@/services/pension-identity";
import {
  getPensionSettings,
  pensionStatisticsVisibility,
} from "@/services/pension-settings";
import { loadMonthComparison } from "@/services/month-comparison";
import { loadStatisticsReport } from "@/services/statistics";
import {
  getPublicSiteAdminBundle,
  getPublicSiteConfigForAdmin,
} from "@/services/public-site/queries";
import {
  ensureBuildingPoliciesFromLegacy,
  listRoomOptions,
  listRoomTypes,
} from "@/services/room-catalog";
import { resolveSetupIssues } from "@/services/setup-issues";
import { listStaffAccountsForCurrentTenant } from "@/services/staff-accounts";
import { listTenantDomains } from "@/services/tenant-domains";
import { getTenantFiscalSettings } from "@/services/tenant-fiscal-settings";
import { listActiveTenantMembers } from "@/services/tenant-members";
import {
  getActiveTenantIdForData,
  resolveRequestTenant,
} from "@/lib/tenant/active";
import type { TenantMemberRole } from "@/domain/tenant/types";

export async function loadSettingsOverviewData(opts: {
  email: string | null | undefined;
  memberRole: TenantMemberRole | null;
}) {
  const [setupIssues, identity, publicConfig, emailSettings] = await Promise.all([
    resolveSetupIssues({
      email: opts.email,
      memberRole: opts.memberRole,
    }),
    getPensionIdentity().catch(() => null),
    getPublicSiteConfigForAdmin().catch(() => null),
    getEmailSettings().catch(() => null),
  ]);
  return { setupIssues, identity, publicConfig, emailSettings };
}

export async function loadPensionIdentity() {
  return getPensionIdentity();
}

export async function loadBookingRulesSettings() {
  return getBookingRulesSettings().catch(() => null);
}

export async function loadStaffMembersPage() {
  const tenant = await resolveRequestTenant();
  const members = tenant ? await listActiveTenantMembers(tenant.id) : [];
  return { tenant, members };
}

export async function loadSettingsEmailPage() {
  const [emailSettings, emailIdentity] = await Promise.all([
    getEmailSettings().catch(() => DEFAULT_EMAIL_SETTINGS),
    resolveTransactionalEmailIdentity().catch(() => null),
  ]);
  return { emailSettings, emailIdentity };
}

export async function loadSettingsFiscalPage() {
  const [bookingRules, checkinSettings, tenantFiscalSettings, tenant] =
    await Promise.all([
      getBookingRulesSettings().catch(() => null),
      getCheckinSettings().catch(() => DEFAULT_CHECKIN_SETTINGS),
      getTenantFiscalSettings().catch(() => null),
      resolveRequestTenant(),
    ]);
  return { bookingRules, checkinSettings, tenantFiscalSettings, tenant };
}

export async function loadPublicSiteThemeForAdmin() {
  return getPublicSiteConfigForAdmin();
}

export async function loadPublicSiteAdminBundle() {
  return getPublicSiteAdminBundle().catch(() => null);
}

export async function loadGuestAppSettingsPage() {
  const tenant = await resolveRequestTenant();
  if (!tenant) return { tenant: null, settings: null };
  const settings = await ensureGuestAppSettingsRow(tenant.id).catch(() => null);
  return { tenant, settings };
}

export async function loadSettingsDomainsPage() {
  const [tenant, domains] = await Promise.all([
    resolveRequestTenant(),
    getActiveTenantIdForData().then((id) => listTenantDomains(id)),
  ]);
  return { tenant, domains };
}

export async function loadSettingsLocationPage() {
  const [staffAccounts, pensionResult] = await Promise.all([
    listStaffAccountsForCurrentTenant(),
    (async () => {
      try {
        return {
          settings: await getPensionSettings(),
          error: null as string | null,
        };
      } catch (e) {
        return {
          settings: null as Awaited<ReturnType<typeof getPensionSettings>>,
          error: e instanceof Error ? e.message : "generic",
        };
      }
    })(),
  ]);
  return {
    staffAccounts,
    pensionResult,
    factoryResetEnabled: isFactoryResetEnabled(),
  };
}

export async function loadLocationSetupCatalog() {
  try {
    const [catalogTypes, catalogOptions] = await Promise.all([
      listRoomTypes(true),
      listRoomOptions(true),
    ]);
    return { ok: true as const, catalogTypes, catalogOptions };
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : "catalogUnavailable",
    };
  }
}

export async function loadLocationStructurePage() {
  const structuresPromise = listLocationStructure();
  const [structuresResult, catalogResult, policyEntriesResult] =
    await Promise.allSettled([
      structuresPromise,
      listRoomOptions(true),
      structuresPromise.then((loadedStructures) =>
        Promise.all(
          loadedStructures.map(async (s) => {
            try {
              const policies = await ensureBuildingPoliciesFromLegacy(
                s.building.id,
                s.building.ac_mode,
              );
              return [s.building.id, policies] as const;
            } catch {
              return [
                s.building.id,
                [] as Awaited<
                  ReturnType<typeof ensureBuildingPoliciesFromLegacy>
                >,
              ] as const;
            }
          }),
        ),
      ),
    ]);

  if (structuresResult.status === "rejected") {
    throw structuresResult.reason;
  }

  const policiesByBuilding: Record<
    string,
    Awaited<ReturnType<typeof ensureBuildingPoliciesFromLegacy>>
  > = {};
  if (policyEntriesResult.status === "fulfilled") {
    for (const [buildingId, policies] of policyEntriesResult.value) {
      policiesByBuilding[buildingId] = policies;
    }
  }

  return {
    structures: structuresResult.value,
    catalogOptions:
      catalogResult.status === "fulfilled" ? catalogResult.value : [],
    policiesByBuilding,
  };
}

export async function loadStatisticsPageAccess() {
  const pension = await getPensionSettings().catch(() => null);
  return {
    pension,
    visibility: pensionStatisticsVisibility(pension),
  };
}

export async function loadStatisticsMonthCompare() {
  return loadMonthComparison().catch(() => null);
}

export async function loadStatisticsReportPage() {
  return loadStatisticsReport()
    .then((value) => ({ status: "fulfilled" as const, value }))
    .catch((reason) => ({ status: "rejected" as const, reason }));
}
