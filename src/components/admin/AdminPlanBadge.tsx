import { getTenantContext } from "@/core/tenant/context";

const PLAN_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  free:         { bg: "var(--plan-free-bg)", text: "var(--plan-free-text)", label: "FREE" },
  essential:    { bg: "var(--plan-essential-bg)", text: "var(--plan-essential-text)", label: "ESSENTIAL" },
  professional: { bg: "var(--plan-professional-bg)", text: "var(--plan-professional-text)", label: "PRO" },
  business:     { bg: "var(--plan-business-bg)", text: "var(--plan-business-text)", label: "BUSINESS" },
};

export function AdminPlanBadge() {
  let planId = "free";
  try {
    const ctx = getTenantContext();
    planId = ctx.tenant.planId;
  } catch {
    // Tenant context not bound yet
  }

  const s = PLAN_STYLE[planId] ?? PLAN_STYLE.free;

  return (
    <span
      className="admin-hud__badge font-sans"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
}
