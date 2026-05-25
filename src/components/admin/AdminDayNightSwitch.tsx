"use client";

import { useAdminTheme } from "@/components/admin/AdminAppearanceProvider";

export function AdminDayNightSwitch() {
  const { mode, setMode } = useAdminTheme();

  return (
    <div
      className="admin-dn-switch"
      role="group"
      aria-label="Temă panou administrare"
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
        onClick={() => setMode("day")}
      >
        <span className="admin-dn-switch__icon" aria-hidden>
          ☀
        </span>
        Zi
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
        onClick={() => setMode("night")}
      >
        <span className="admin-dn-switch__icon" aria-hidden>
          ☽
        </span>
        Noapte
      </button>
    </div>
  );
}
