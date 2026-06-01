import { getTenantContext } from "@/core/tenant/context";

const PLAN_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  free:         { bg: "#374151", text: "#9ca3af", label: "FREE" },
  essential:    { bg: "#1e3a5f", text: "#60a5fa", label: "ESSENTIAL" },
  professional: { bg: "#3b1f6e", text: "#a78bfa", label: "PRO" },
  business:     { bg: "#713f12", text: "#fbbf24", label: "BUSINESS" },
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
