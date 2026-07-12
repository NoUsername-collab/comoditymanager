export type TenantOnboardingItemId =
  | "status_ok"
  | "owner_email"
  | "has_rooms"
  | "has_members"
  | "email_ready"
  | "domain_configured"
  | "plan_modules";

export type TenantOnboardingItem = {
  id: TenantOnboardingItemId;
  ok: boolean;
  required: boolean;
};

export type TenantOnboardingChecklist = {
  items: TenantOnboardingItem[];
  readyCount: number;
  totalRequired: number;
  isGoLiveReady: boolean;
};

export function buildTenantOnboardingChecklist(
  items: TenantOnboardingItem[],
): TenantOnboardingChecklist {
  const required = items.filter((i) => i.required);
  const readyCount = required.filter((i) => i.ok).length;
  return {
    items,
    readyCount,
    totalRequired: required.length,
    isGoLiveReady: required.every((i) => i.ok),
  };
}

export function onboardingProgressTone(
  ready: number,
  total: number,
): "ok" | "warn" | "bad" {
  if (total === 0) return "ok";
  const ratio = ready / total;
  if (ratio >= 1) return "ok";
  if (ratio >= 0.6) return "warn";
  return "bad";
}

/** Fast list heuristic — full checklist is on tenant detail. */
export function quickSetupIncomplete(tenant: {
  status: string;
  owner_email?: string | null;
  room_count: number;
  member_count: number;
  domain_hosts?: string[];
}): boolean {
  if (tenant.status !== "active" && tenant.status !== "trial") return true;
  if (!tenant.owner_email?.trim()) return true;
  if (tenant.room_count <= 0) return true;
  if (tenant.member_count <= 0) return true;
  if (!tenant.domain_hosts?.length) return true;
  return false;
}
