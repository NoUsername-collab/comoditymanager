"use client";

import { AdminLiquidShader } from "@/components/admin/AdminLiquidShader";

/** Liquid decorativ — shader WebGL + blob-uri CSS ca fallback. */
export function AdminDayNightLiquid({
  className = "",
  hero = false,
}: {
  className?: string;
  /** Variantă mai intensă pe hero Acasă. */
  hero?: boolean;
}) {
  return (
    <div
      className={[
        "admin-liquid-shell",
        hero && "admin-liquid-shell--hero",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden
    >
      <AdminLiquidShader
        className="admin-liquid-shell__shader"
        intensity={hero ? 0.92 : 0.32}
      />
      <div className="admin-dn-liquid admin-dn-liquid--fallback">
        <span className="admin-dn-liquid__blob admin-dn-liquid__blob--day-sun" />
        <span className="admin-dn-liquid__blob admin-dn-liquid__blob--day-sky" />
        <span className="admin-dn-liquid__blob admin-dn-liquid__blob--day-mist" />
        <span className="admin-dn-liquid__blob admin-dn-liquid__blob--night-deep" />
        <span className="admin-dn-liquid__blob admin-dn-liquid__blob--night-violet" />
        <span className="admin-dn-liquid__blob admin-dn-liquid__blob--night-moon" />
        <span className="admin-dn-liquid__blob admin-dn-liquid__blob--twilight" />
      </div>
    </div>
  );
}
