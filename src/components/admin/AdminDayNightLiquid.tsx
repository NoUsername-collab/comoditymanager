/** Blob-uri decorative — paletă zi + noapte amestecate (liquid). */
export function AdminDayNightLiquid({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={["admin-dn-liquid", className].filter(Boolean).join(" ")} aria-hidden>
      <span className="admin-dn-liquid__blob admin-dn-liquid__blob--day-sun" />
      <span className="admin-dn-liquid__blob admin-dn-liquid__blob--day-sky" />
      <span className="admin-dn-liquid__blob admin-dn-liquid__blob--day-mist" />
      <span className="admin-dn-liquid__blob admin-dn-liquid__blob--night-deep" />
      <span className="admin-dn-liquid__blob admin-dn-liquid__blob--night-violet" />
      <span className="admin-dn-liquid__blob admin-dn-liquid__blob--night-moon" />
      <span className="admin-dn-liquid__blob admin-dn-liquid__blob--twilight" />
    </div>
  );
}
