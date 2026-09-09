"use client";

import { useTranslations } from "next-intl";
import type { StaffStayIntent } from "@/features/bookings/staff-stay-actions";

export function StaffStayIntentToggle({
  value,
  onChange,
  appearance,
}: {
  value: StaffStayIntent;
  onChange: (next: StaffStayIntent) => void;
  appearance: "admin" | "reception";
}) {
  const t = useTranslations("admin.gantt.quick");
  const root =
    appearance === "reception"
      ? "staff-stay-intent staff-stay-intent--reception"
      : "staff-stay-intent";

  return (
    <div className={root} role="group" aria-label={t("intentLabel")}>
      <button
        type="button"
        className={[
          "staff-stay-intent__btn",
          value === "cerere" && "staff-stay-intent__btn--on",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-pressed={value === "cerere"}
        onClick={() => onChange("cerere")}
      >
        <span className="staff-stay-intent__label">{t("radial.request")}</span>
        <span className="staff-stay-intent__hint">{t("radial.unconfirmed")}</span>
      </button>
      <button
        type="button"
        className={[
          "staff-stay-intent__btn",
          value === "direct" && "staff-stay-intent__btn--on",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-pressed={value === "direct"}
        onClick={() => onChange("direct")}
      >
        <span className="staff-stay-intent__label">{t("radial.direct")}</span>
        <span className="staff-stay-intent__hint">{t("radial.confirmed")}</span>
      </button>
    </div>
  );
}
