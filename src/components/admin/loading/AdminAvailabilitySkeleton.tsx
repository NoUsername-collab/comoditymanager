export function AdminAvailabilitySkeleton() {
  return (
    <div
      className="admin-route-skeleton admin-route-skeleton--availability"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="admin-route-skeleton__toolbar" />
      <div className="admin-route-skeleton__kpi-grid">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="admin-route-skeleton__card admin-route-skeleton__kpi" />
        ))}
      </div>
      <div className="admin-route-skeleton__heat-grid">
        {Array.from({ length: 35 }, (_, i) => (
          <div key={i} className="admin-route-skeleton__card admin-route-skeleton__heat-cell" />
        ))}
      </div>
    </div>
  );
}
