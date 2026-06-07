"use client";

import { useAdminTheme } from "@/components/admin/AdminAppearanceProvider";
import { useTranslations } from "next-intl";

export function AdminDayNightSwitch() {
  const tCommon = useTranslations("admin.common");
  const { mode, setMode } = useAdminTheme();

  return (
    <div
      className="admin-dn-switch"
      role="group"
      aria-label={tCommon("adminTheme")}
    >
      <button
        type="button"
        className={[
          "admin-dn-switch__btn",
          mode === "day" && "admin-dn-switch__btn--active",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-pressed={mode === "day"}
        aria-label={tCommon("day")}
        title={tCommon("day")}
        onClick={() => setMode("day")}
      >
        <span className="admin-dn-switch__icon" aria-hidden>
          ☀
        </span>
      </button>
      <button
        type="button"
        className={[
          "admin-dn-switch__btn",
          mode === "night" && "admin-dn-switch__btn--active",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-pressed={mode === "night"}
        aria-label={tCommon("night")}
        title={tCommon("night")}
        onClick={() => setMode("night")}
      >
        <span className="admin-dn-switch__icon" aria-hidden>
          ☽
        </span>
      </button>
    </div>
  );
}
