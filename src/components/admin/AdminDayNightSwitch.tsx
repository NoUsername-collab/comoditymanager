"use client";

import { useAdminTheme } from "@/components/admin/AdminAppearanceProvider";

export function AdminDayNightSwitch() {
  const { theme, setTheme } = useAdminTheme();

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
          theme === "day" && "admin-dn-switch__btn--active",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-pressed={theme === "day"}
        onClick={() => setTheme("day")}
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
          theme === "night" && "admin-dn-switch__btn--active",
        ]
          .filter(Boolean)
          .join(" ")}
        aria-pressed={theme === "night"}
        onClick={() => setTheme("night")}
      >
        <span className="admin-dn-switch__icon" aria-hidden>
          ☽
        </span>
        Noapte
      </button>
    </div>
  );
}
