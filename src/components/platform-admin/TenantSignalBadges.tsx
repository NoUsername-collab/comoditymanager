import type { EmailUsageAlertLevel } from "@/domain/email/usage-alert";

const ALERT_STYLES: Record<EmailUsageAlertLevel, string> = {
  ok: "bg-neutral-800 text-neutral-400",
  warning: "bg-amber-950/60 text-amber-400",
  exceeded: "bg-red-950/60 text-red-400",
  unlimited: "bg-neutral-800/50 text-neutral-500",
};

export function TenantEmailAlertBadge({
  alert,
  sent,
  cap,
  labels,
}: {
  alert: EmailUsageAlertLevel;
  sent: number;
  cap: number | null;
  labels: {
    warning: string;
    exceeded: string;
    unlimited: string;
  };
}) {
  if (alert === "ok" || alert === "unlimited") return null;

  const text =
    alert === "exceeded"
      ? labels.exceeded
      : cap != null
        ? labels.warning.replace("{sent}", String(sent)).replace("{cap}", String(cap))
        : labels.warning;

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${ALERT_STYLES[alert]}`}
    >
      {text}
    </span>
  );
}

export function TenantSetupBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-full bg-orange-950/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-orange-400">
      {label}
    </span>
  );
}
