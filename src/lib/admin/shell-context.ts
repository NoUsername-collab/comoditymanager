import { cache } from "react";
import type { ThemeSettings } from "@/lib/themes";
import { bindTenantContextFromRequest } from "@/lib/tenant/bind-request-context";
import { requireStaff } from "@/lib/auth/require-staff";
import { locationAccessibleForMemberRole } from "@/lib/auth/location-unlock";
import { canAccessStatistics } from "@/domain/settings/statistics-visibility";
import { canStaffPermission } from "@/domain/settings/team-permissions";
import {
  getPensionSettings,
  pensionAppearanceSettings,
  pensionStatisticsVisibility,
  pensionTeamPermissions,
  type PensionSettings,
} from "@/services/pension-settings";
import { countNewRequests } from "@/services/bookings/queries";
import { resolvePensionStayTimes } from "@/lib/constants";

const DEFAULT_APPEARANCE: ThemeSettings = {
  theme: "noir",
  mode: "night",
};

export type AdminShellContext = {
  staff: Awaited<ReturnType<typeof requireStaff>>;
  pension: PensionSettings | null;
  requestCount: number;
  isAdmin: boolean;
  locationUnlocked: boolean;
  statisticsAccess: boolean;
  appearanceSettings: ThemeSettings;
  teamPermissions: ReturnType<typeof pensionTeamPermissions>;
  checkInTime: string;
  checkOutTime: string;
};

/**
 * Single per-request admin shell payload: tenant bind, auth, pension settings,
 * new-request badge count, and nav permission flags — no duplicate getPensionSettings /
 * getStaffShellAccess round-trips.
 */
export const loadAdminShellContext = cache(async (): Promise<AdminShellContext> => {
  const staffPromise = requireStaff();
  await bindTenantContextFromRequest();

  const [staff, pension, requestCount] = await Promise.all([
    staffPromise,
    getPensionSettings().catch(() => null),
    countNewRequests().catch(() => 0),
  ]);

  const teamPermissions = pensionTeamPermissions(pension);
  const locationUnlocked = await locationAccessibleForMemberRole(
    staff.memberRole,
    teamPermissions,
  );

  const stayTimes = resolvePensionStayTimes(pension);

  return {
    staff,
    pension,
    requestCount,
    isAdmin: staff.role === "admin",
    locationUnlocked,
    statisticsAccess:
      canStaffPermission(staff.memberRole, "reports_tools", teamPermissions) &&
      canAccessStatistics(staff.memberRole, pensionStatisticsVisibility(pension)),
    appearanceSettings: pension
      ? pensionAppearanceSettings(pension)
      : DEFAULT_APPEARANCE,
    teamPermissions,
    checkInTime: stayTimes.checkIn,
    checkOutTime: stayTimes.checkOut,
  };
});
