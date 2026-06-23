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
import { countCereriNoi } from "@/services/bookings/queries";

const DEFAULT_APPEARANCE: ThemeSettings = {
  theme: "noir",
  mode: "night",
};

export type AdminShellContext = {
  staff: Awaited<ReturnType<typeof requireStaff>>;
  pension: PensionSettings | null;
  cereriCount: number;
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
 * cereri badge count, and nav permission flags — no duplicate getPensionSettings /
 * getStaffShellAccess round-trips.
 */
export const loadAdminShellContext = cache(async (): Promise<AdminShellContext> => {
  const staffPromise = requireStaff();
  await bindTenantContextFromRequest();

  const [staff, pension, cereriCount] = await Promise.all([
    staffPromise,
    getPensionSettings().catch(() => null),
    countCereriNoi().catch(() => 0),
  ]);

  const teamPermissions = pensionTeamPermissions(pension);
  const locationUnlocked = await locationAccessibleForMemberRole(
    staff.memberRole,
    teamPermissions,
  );

  return {
    staff,
    pension,
    cereriCount,
    isAdmin: staff.role === "admin",
    locationUnlocked,
    statisticsAccess:
      canStaffPermission(staff.memberRole, "reports_tools", teamPermissions) &&
      canAccessStatistics(staff.memberRole, pensionStatisticsVisibility(pension)),
    appearanceSettings: pension
      ? pensionAppearanceSettings(pension)
      : DEFAULT_APPEARANCE,
    teamPermissions,
    checkInTime: pension?.default_check_in_time ?? "14:00",
    checkOutTime: pension?.default_check_out_time ?? "11:00",
  };
});
